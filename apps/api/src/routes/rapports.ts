import type { FastifyPluginAsync } from 'fastify'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { calculateRoyalties } from '@megesti/business'
import type { FormuleDA, ContexteVente, LigneVenteDA } from '@megesti/business'
import { occurrencesDansPeriode } from './charges.js'
import { calculerSoldeContrat } from '../services/droitsAuteur.js'

const QuerySchema = z.object({
  period: z.enum(['7d', '30d', '3m', '12m', 'all']).default('30d'),
  from:   z.string().optional(),
  to:     z.string().optional(),
})

function periodDates(period: string, fromStr?: string, toStr?: string) {
  const to  = toStr ? new Date(toStr) : new Date()
  to.setHours(23, 59, 59, 999)

  if (fromStr) {
    const from = new Date(fromStr)
    from.setHours(0, 0, 0, 0)
    const diffJours = (to.getTime() - from.getTime()) / 86_400_000
    return { from, to, granularite: diffJours <= 31 ? 'day' : diffJours <= 93 ? 'week' : 'month' } as const
  }

  const from = new Date()
  let granularite: 'day' | 'week' | 'month' = 'day'
  if (period === '7d')  { from.setDate(from.getDate() - 7); }
  if (period === '30d') { from.setDate(from.getDate() - 30); }
  if (period === '3m')  { from.setMonth(from.getMonth() - 3); granularite = 'week' }
  if (period === '12m') { from.setFullYear(from.getFullYear() - 1); granularite = 'month' }
  if (period === 'all') { from.setFullYear(2020, 0, 1); granularite = 'month' }
  from.setHours(0, 0, 0, 0)
  return { from, to, granularite }
}

export const rapportRoutes: FastifyPluginAsync = async (app) => {
  const auth = { preHandler: app.authenticate }

  app.get('/ventes', auth, async (request) => {
    const { tenantId } = request.tenant
    const { period, from: fromStr, to: toStr } = QuerySchema.parse(request.query)
    const { from, to, granularite } = periodDates(period, fromStr, toStr)

    // DATE_TRUNC exige une constante SQL pour le premier argument — Prisma.raw, pas un paramètre bindé
    const trunc = Prisma.raw(granularite === 'week' ? `'week'` : granularite === 'month' ? `'month'` : `'day'`)

    const [summary, evolutionRaw, topArticlesRaw, caRayonRaw, caPDVRaw, caModeRaw, associationsRaw] =
      await Promise.all([

        // 1. Synthèse globale
        app.db.vente.aggregate({
          where: { tenantId, statut: 'VALIDEE', dateVente: { gte: from, lte: to } },
          _sum:   { totalTTC: true, totalHT: true },
          _count: { _all: true },
          _avg:   { totalTTC: true },
        }),

        // 2. Évolution CA
        app.db.$queryRaw<{ date: Date; ca: number; nb: bigint }[]>(Prisma.sql`
          SELECT
            DATE_TRUNC(${trunc}, "dateVente") AS date,
            CAST(SUM("totalTTC") AS FLOAT)   AS ca,
            COUNT(*)                          AS nb
          FROM "Vente"
          WHERE "tenantId" = ${tenantId}
            AND "statut"   = 'VALIDEE'
            AND "dateVente" >= ${from}
            AND "dateVente" <= ${to}
          GROUP BY DATE_TRUNC(${trunc}, "dateVente")
          ORDER BY date ASC
        `),

        // 3. Top articles (CA + quantité)
        app.db.$queryRaw<{ articleId: string; nom: string; rayonNom: string; quantite: bigint; ca: number }[]>(Prisma.sql`
          SELECT
            a."id"                             AS "articleId",
            a."nom",
            r."nom"                            AS "rayonNom",
            SUM(lv."quantite")                 AS quantite,
            CAST(SUM(lv."totalLigneTTC") AS FLOAT) AS ca
          FROM "LigneVente" lv
          JOIN "Vente"   v  ON lv."venteId"   = v."id"
          JOIN "Article" a  ON lv."articleId" = a."id"
          JOIN "Rayon"   r  ON a."rayonId"    = r."id"
          WHERE v."tenantId" = ${tenantId}
            AND v."statut"   = 'VALIDEE'
            AND v."dateVente" >= ${from}
            AND v."dateVente" <= ${to}
          GROUP BY a."id", a."nom", r."nom"
          ORDER BY ca DESC
          LIMIT 15
        `),

        // 4. CA par rayon
        app.db.$queryRaw<{ rayonId: string; nom: string; ca: number; quantite: bigint }[]>(Prisma.sql`
          SELECT
            r."id"                             AS "rayonId",
            r."nom",
            CAST(SUM(lv."totalLigneTTC") AS FLOAT) AS ca,
            SUM(lv."quantite")                 AS quantite
          FROM "LigneVente" lv
          JOIN "Vente"   v ON lv."venteId"   = v."id"
          JOIN "Article" a ON lv."articleId" = a."id"
          JOIN "Rayon"   r ON a."rayonId"    = r."id"
          WHERE v."tenantId" = ${tenantId}
            AND v."statut"   = 'VALIDEE'
            AND v."dateVente" >= ${from}
            AND v."dateVente" <= ${to}
          GROUP BY r."id", r."nom"
          ORDER BY ca DESC
        `),

        // 5. CA par point de vente
        app.db.$queryRaw<{ pdvId: string; nom: string; ca: number; nbVentes: bigint }[]>(Prisma.sql`
          SELECT
            pdv."id"                           AS "pdvId",
            pdv."nom",
            CAST(SUM(v."totalTTC") AS FLOAT)   AS ca,
            COUNT(v."id")                      AS "nbVentes"
          FROM "Vente" v
          JOIN "SessionCaisse" sc  ON v."sessionId"        = sc."id"
          JOIN "PointDeVente"  pdv ON sc."pointDeVenteId"  = pdv."id"
          WHERE v."tenantId" = ${tenantId}
            AND v."statut"   = 'VALIDEE'
            AND v."dateVente" >= ${from}
            AND v."dateVente" <= ${to}
          GROUP BY pdv."id", pdv."nom"
          ORDER BY ca DESC
        `),

        // 6. CA par mode de paiement
        app.db.$queryRaw<{ mode: string; ca: number; nb: bigint }[]>(Prisma.sql`
          SELECT
            "modePaiement"                     AS mode,
            CAST(SUM("totalTTC") AS FLOAT)     AS ca,
            COUNT(*)                           AS nb
          FROM "Vente"
          WHERE "tenantId"  = ${tenantId}
            AND "statut"    = 'VALIDEE'
            AND "dateVente" >= ${from}
            AND "dateVente" <= ${to}
          GROUP BY "modePaiement"
          ORDER BY ca DESC
        `),

        // 7. Associations panier
        app.db.$queryRaw<{ produit1: string; produit2: string; nb: bigint }[]>(Prisma.sql`
          SELECT
            a1."nom" AS "produit1",
            a2."nom" AS "produit2",
            COUNT(*) AS nb
          FROM "LigneVente" lv1
          JOIN "LigneVente" lv2
            ON  lv1."venteId"   = lv2."venteId"
            AND lv1."articleId" < lv2."articleId"
          JOIN "Vente"   v  ON lv1."venteId"    = v."id"
          JOIN "Article" a1 ON lv1."articleId"  = a1."id"
          JOIN "Article" a2 ON lv2."articleId"  = a2."id"
          WHERE v."tenantId"  = ${tenantId}
            AND v."statut"    = 'VALIDEE'
            AND v."dateVente" >= ${from}
            AND v."dateVente" <= ${to}
          GROUP BY a1."nom", a2."nom"
          ORDER BY nb DESC
          LIMIT 10
        `),
      ])

    const annulees = await app.db.vente.count({
      where: { tenantId, statut: 'ANNULEE', dateVente: { gte: from, lte: to } },
    })

    return {
      periode:  { from: from.toISOString(), to: to.toISOString(), granularite },
      summary: {
        totalTTC:    Number(summary._sum.totalTTC    ?? 0),
        totalHT:     Number(summary._sum.totalHT     ?? 0),
        nbVentes:    summary._count._all,
        nbAnnulees:  annulees,
        ticketMoyen: Number(summary._avg.totalTTC    ?? 0),
      },
      evolution:    evolutionRaw.map((r) => ({ date: r.date.toISOString(), ca: r.ca, nb: Number(r.nb) })),
      topArticles:  topArticlesRaw.map((r) => ({ ...r, quantite: Number(r.quantite) })),
      caParRayon:   caRayonRaw.map((r)   => ({ ...r, quantite: Number(r.quantite) })),
      caParPDV:     caPDVRaw.map((r)     => ({ ...r, nbVentes: Number(r.nbVentes) })),
      caParMode:    caModeRaw.map((r)    => ({ ...r, nb: Number(r.nb) })),
      associations: associationsRaw.map((r) => ({ ...r, nb: Number(r.nb) })),
    }
  })

  // ── Bilan comptable complet ──────────────────────────────────────────────────
  app.get('/bilan', auth, async (request) => {
    const { tenantId } = request.tenant
    const q = request.query as { from?: string; to?: string }

    const to   = q.to   ? new Date(q.to)   : new Date()
    const from = q.from ? new Date(q.from)  : new Date(new Date().getFullYear(), 0, 1)
    to.setHours(23, 59, 59, 999)
    from.setHours(0, 0, 0, 0)

    const [
      ventesDirectesModes, ventesHorsSessionParMotif, reversementsEncaisses, fraisPeriode,
      chargesPayees, chargesAVenir, reversementsEnAttente,
      articlesStock, caResult,
    ] = await Promise.all([
      // Ventes directes en session (pas PDV) par mode
      app.db.$queryRaw<{ mode: string; ca: number; nb: bigint }[]>(Prisma.sql`
        SELECT "modePaiement" AS mode, CAST(SUM("totalTTC") AS FLOAT) AS ca, COUNT(*) AS nb
        FROM "Vente"
        WHERE "tenantId" = ${tenantId} AND "statut" = 'VALIDEE'
          AND "modePaiement" != 'PDV'
          AND "sessionId" IS NOT NULL
          AND "dateVente" >= ${from} AND "dateVente" <= ${to}
        GROUP BY "modePaiement" ORDER BY ca DESC
      `),
      // Ventes hors session par motif
      app.db.$queryRaw<{ motifVenteId: string; libelle: string; ca: number; nb: bigint }[]>(Prisma.sql`
        SELECT mv."id" AS "motifVenteId", mv."libelle",
               CAST(SUM(v."totalTTC") AS FLOAT) AS ca, COUNT(*) AS nb
        FROM "Vente" v
        JOIN "MotifVente" mv ON v."motifVenteId" = mv."id"
        WHERE v."tenantId" = ${tenantId} AND v."statut" = 'VALIDEE'
          AND v."sessionId" IS NULL
          AND v."dateVente" >= ${from} AND v."dateVente" <= ${to}
        GROUP BY mv."id", mv."libelle" ORDER BY ca DESC
      `),

      // Reversements encaissés dans la période (avec données commission)
      app.db.reversement.findMany({
        where:   { tenantId, statut: 'ENCAISSE', dateEncaissement: { gte: from, lte: to } },
        include: { pointDeVente: { select: { nom: true, commissionFixe: true, commissionPourcent: true } } },
      }),
      // Frais sur la période (avec montant)
      app.db.frais.findMany({
        where: { tenantId, date: { gte: from, lte: to }, montantHT: { not: null } },
        orderBy: { date: 'asc' },
      }),
      // Charges ponctuelles payées dans la période (DEPENSE/PERTE seulement)
      app.db.charge.findMany({
        where: { tenantId, statut: 'PAYE', actif: true, type: { in: ['DEPENSE', 'PERTE'] }, datePaiement: { gte: from, lte: to } },
        orderBy: { datePaiement: 'asc' },
      }),
      // Charges ponctuelles prévues (DEPENSE/PERTE non payées) + abonnements actifs
      app.db.charge.findMany({
        where: { tenantId, actif: true, OR: [{ statut: 'PREVU', type: { in: ['DEPENSE', 'PERTE'] } }, { type: 'ABONNEMENT' }] },
        orderBy: { dateEffet: 'asc' },
      }),
      // Reversements en attente (tous)
      app.db.reversement.findMany({
        where:   { tenantId, statut: 'EN_ATTENTE' },
        include: { pointDeVente: { select: { nom: true, commissionFixe: true, commissionPourcent: true } } },
        orderBy: { dateCloture: 'asc' },
      }),
      // Articles en stock avec coût d'achat
      app.db.article.findMany({
        where:  { tenantId, stock: { gt: 0 }, actif: true },
        select: { id: true, stock: true, prixAchatHT: true, prixAchatLotHT: true, prixAchatLotQte: true },
      }),
      // CA + coût des ventes (COGS) global — toutes ventes (session + hors session)
      app.db.$queryRaw<{ caHT: number; caTTC: number; coutDesVentes: number }[]>(Prisma.sql`
        SELECT
          CAST(SUM(v."totalHT")  AS FLOAT) AS "caHT",
          CAST(SUM(v."totalTTC") AS FLOAT) AS "caTTC",
          CAST(SUM(
            CASE
              WHEN a."prixAchatLotHT"  IS NOT NULL AND a."prixAchatLotQte" IS NOT NULL AND a."prixAchatLotQte" > 0
                THEN (a."prixAchatLotHT" / a."prixAchatLotQte") * lv."quantite"
              WHEN a."prixAchatHT" IS NOT NULL THEN a."prixAchatHT" * lv."quantite"
              ELSE 0
            END
          ) AS FLOAT) AS "coutDesVentes"
        FROM "Vente" v
        JOIN "LigneVente" lv ON lv."venteId"   = v."id"
        JOIN "Article"    a  ON lv."articleId" = a."id"
        WHERE v."tenantId" = ${tenantId} AND v."statut" = 'VALIDEE'
          AND v."dateVente" >= ${from} AND v."dateVente" <= ${to}
      `),
    ])

    // ── Soldes réels des contrats (cumul depuis datePriseEffet − déjà versé) ──
    const contratsActifs = await app.db.contratAuteur.findMany({
      where:  { tenantId, actif: true },
      select: { id: true },
    })
    const soldesContrats = (await Promise.all(
      contratsActifs.map(c => calculerSoldeContrat(c.id, tenantId, app.db as any))
    )).filter(Boolean) as NonNullable<Awaited<ReturnType<typeof calculerSoldeContrat>>>[]

    const auteurSoldes = new Map<string, { nom: string; solde: number; brut: number }>()
    for (const s of soldesContrats) {
      if (s.solde <= 0) continue
      const prev = auteurSoldes.get(s.auteurId) ?? { nom: s.auteurNom, solde: 0, brut: 0 }
      auteurSoldes.set(s.auteurId, { nom: s.auteurNom, solde: prev.solde + s.solde, brut: prev.brut + s.totalDuBrut })
    }
    const totalDroitsOutstanding = [...auteurSoldes.values()].reduce((s, a) => s + a.solde, 0)

    // ── Droits d'auteurs effectivement payés dans la période ─────────────────
    const paiementsDAperiode = await app.db.paiementDA.findMany({
      where:  { tenantId, statut: 'PAYE', dateVersement: { gte: from, lte: to } },
      select: { auteurId: true, montant: true, auteur: { select: { prenom: true, nom: true } } },
    })

    // ── Helper commission reversement ─────────────────────────────────────────
    function commissionRev(r: { montantTTC: { toNumber: () => number } | string | number; montantAjuste: { toNumber: () => number } | string | number | null; pointDeVente: { commissionFixe: { toNumber: () => number } | string | number | null; commissionPourcent: { toNumber: () => number } | string | number | null } }): number {
      const brut = Number(r.montantTTC)
      if (r.montantAjuste !== null && r.montantAjuste !== undefined) return brut - Number(r.montantAjuste)
      const fixe = Number(r.pointDeVente.commissionFixe ?? 0)
      const pct  = Number(r.pointDeVente.commissionPourcent ?? 0)
      return fixe + brut * pct / 100
    }

    // ── Calcul droits d'auteurs sur la période ────────────────────────────────
    const sessionsAvecVentes = await app.db.sessionCaisse.findMany({
      where: { tenantId, ventes: { some: { statut: 'VALIDEE', dateVente: { gte: from, lte: to } } } },
      include: {
        pointDeVente: { select: { commissionFixe: true, commissionPourcent: true } },
        ventes: {
          where: { statut: 'VALIDEE', dateVente: { gte: from, lte: to } },
          include: {
            lignes: {
              include: {
                article: {
                  include: {
                    // Même correction que sessions-caisse : passer par auteurs → contrats
                    // pour attraper les contrats globaux (articleId = null)
                    auteurs: {
                      include: {
                        auteur: {
                          include: {
                            contrats: {
                              where: { actif: true },
                              include: { typeDA: true },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    const auteurDroits = new Map<string, { nom: string; montantNet: number; montantBrut: number }>()

    for (const session of sessionsAvecVentes) {
      const avecCommission = !!(session.pointDeVente.commissionPourcent || session.pointDeVente.commissionFixe)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const typeVente: ContexteVente['typeVente'] = (session as any).salonId ? 'SALON' : 'DIRECTE'
      const contexte: ContexteVente = { vendeur: 'ME', avecCommission, typeVente }

      const contratLignes = new Map<string, { meta: { auteurId: string; nom: string; avance: number; avanceDue: number; formule: FormuleDA }; lignes: LigneVenteDA[] }>()
      for (const vente of session.ventes) {
        for (const ligne of vente.lignes) {
          for (const articleAuteur of ligne.article.auteurs) {
            const auteur = articleAuteur.auteur
            const contrats = auteur.contrats.filter(
              c => c.articleId === null || c.articleId === ligne.articleId
            )
            for (const contrat of contrats) {
              if (!contratLignes.has(contrat.id)) {
                contratLignes.set(contrat.id, {
                  meta: {
                    auteurId:  auteur.id,
                    nom:       `${auteur.prenom} ${auteur.nom}`.trim(),
                    avance:    Number(contrat.avance ?? 0),
                    avanceDue: Number(contrat.avanceDue),
                    formule:   contrat.typeDA.formule as unknown as FormuleDA,
                  },
                  lignes: [],
                })
              }
              contratLignes.get(contrat.id)!.lignes.push({
                articleId: ligne.articleId, quantite: ligne.quantite,
                totalLigneHT: Number(ligne.totalLigneHT), totalLigneTTC: Number(ligne.totalLigneTTC),
              })
            }
          }
        }
      }

      for (const [, { meta, lignes }] of contratLignes) {
        const res = calculateRoyalties(lignes, meta.formule, contexte, meta.avanceDue, meta.avance)
        const prev = auteurDroits.get(meta.auteurId) ?? { nom: meta.nom, montantNet: 0, montantBrut: 0 }
        auteurDroits.set(meta.auteurId, { nom: prev.nom || meta.nom, montantNet: prev.montantNet + res.montantNet, montantBrut: prev.montantBrut + res.montantBrut })
      }
    }

    // ── Abonnements : séparer occurrences passées (payées) et futures (prévues) ──
    const now = new Date()
    // chargesAVenir contient les DEPENSE/PERTE PREVU + tous les ABONNEMENT actifs
    const abonnements = chargesAVenir.filter(c => c.type === 'ABONNEMENT' && c.periodicite)
    const chargesPonctuellesAVenir = chargesAVenir.filter(c => c.type !== 'ABONNEMENT')

    // Occurrences d'abonnements dans la période
    const aboPaye: { id: string; libelle: string; montantHT: number; date: Date }[] = []
    const aboPrevu: { id: string; libelle: string; montantHT: number; date: Date }[] = []

    for (const abo of abonnements) {
      const occurrences = occurrencesDansPeriode(abo.dateEffet, abo.periodicite!, from, to)
      for (const d of occurrences) {
        const entry = { id: abo.id, libelle: abo.libelle, montantHT: Number(abo.montantHT), date: d }
        if (d <= now) aboPaye.push(entry)
        else          aboPrevu.push(entry)
      }
    }

    // ── Agrégats finaux ───────────────────────────────────────────────────────
    const caHT        = caResult[0]?.caHT        ?? 0
    const caTTC       = caResult[0]?.caTTC       ?? 0
    const coutDesVentes = caResult[0]?.coutDesVentes ?? 0

    const totalFrais           = fraisPeriode.reduce((s, f) => s + Number(f.montantHT ?? 0), 0)
    const totalChargesPayees   = chargesPayees.reduce((s, c) => s + Number(c.montantHT), 0)
                               + aboPaye.reduce((s, e) => s + e.montantHT, 0)
    const totalDroits          = [...auteurDroits.values()].reduce((s, a) => s + a.montantNet, 0)
    const totalChargesAVenir   = chargesPonctuellesAVenir.reduce((s, c) => s + Number(c.montantHT), 0)
                               + aboPrevu.reduce((s, e) => s + e.montantHT, 0)
    const totalDAPaies         = paiementsDAperiode.reduce((s, p) => s + Number(p.montant), 0)
    const commissionsEncaissees = reversementsEncaisses.reduce((s, r) => s + commissionRev(r), 0)
    const commissionsEnAttente  = reversementsEnAttente.reduce((s, r) => s + commissionRev(r), 0)

    const totalVentesHorsSession = ventesHorsSessionParMotif.reduce((s, m) => s + m.ca, 0)

    // Entrées : CA brut (ventes directes + hors session + reversements bruts)
    const totalEntreesEff  = ventesDirectesModes.reduce((s, v) => s + v.ca, 0)
                           + totalVentesHorsSession
                           + reversementsEncaisses.reduce((s, r) => s + Number(r.montantTTC), 0)
    // Sorties effectives : frais + charges + DA payés + commissions PDV encaissés
    const totalSortiesEff  = totalFrais + totalChargesPayees + totalDAPaies + commissionsEncaissees
    // Entrées prévues : reversements bruts en attente
    const totalEntreesPrev = reversementsEnAttente.reduce((s, r) => s + Number(r.montantTTC), 0)
    // Sorties prévues : solde DA réel (non payé) + charges + commissions PDV en attente
    const totalSortiesPrev = totalDroitsOutstanding + totalChargesAVenir + commissionsEnAttente

    const valeurStock = articlesStock.reduce((s, a) => {
      const u = a.prixAchatLotHT && a.prixAchatLotQte && Number(a.prixAchatLotQte) > 0
        ? Number(a.prixAchatLotHT) / Number(a.prixAchatLotQte)
        : a.prixAchatHT ? Number(a.prixAchatHT) : 0
      return s + u * a.stock
    }, 0)

    const resultatNet = caHT - coutDesVentes - totalFrais - totalChargesPayees - totalDroits

    // ── Groupage des charges payées par catégorie PCG ─────────────────────────
    type CatKey = 'ACHATS' | 'SERVICES' | 'IMPOTS_TAXES' | 'AUTRES_CHARGES' | 'CHARGES_EXCEPT'
    const parCategorie: Record<CatKey, number> = {
      ACHATS: 0, SERVICES: 0, IMPOTS_TAXES: 0, AUTRES_CHARGES: 0, CHARGES_EXCEPT: 0,
    }
    for (const c of chargesPayees) {
      const cat = (c.categorie as CatKey) ?? 'AUTRES_CHARGES'
      parCategorie[cat] = (parCategorie[cat] ?? 0) + Number(c.montantHT)
    }
    // Les abonnements payés vont dans SERVICES (leur catégorie naturelle)
    for (const e of aboPaye) {
      parCategorie.SERVICES += e.montantHT
    }

    const chargesDetail = [
      ...chargesPayees.map(c => ({ libelle: c.libelle, montantHT: Number(c.montantHT), type: c.type, categorie: c.categorie, date: c.datePaiement?.toISOString() ?? null })),
      ...aboPaye.map(e => ({ libelle: e.libelle, montantHT: e.montantHT, type: 'ABONNEMENT' as const, categorie: 'SERVICES' as const, date: e.date.toISOString() })),
    ]

    return {
      periode: { from: from.toISOString(), to: to.toISOString() },
      pnl: { caHT, caTTC, coutDesVentes, totalFrais, totalChargesPayees, totalDroits, resultatNet },
      entreesEffectives: {
        ventesDirectes:        ventesDirectesModes.reduce((s, v) => s + v.ca, 0),
        ventesHorsSession:     totalVentesHorsSession,
        reversementsEncaisses: reversementsEncaisses.reduce((s, r) => s + Number(r.montantTTC), 0),
        total: totalEntreesEff,
        detail: {
          ventesParMode:    ventesDirectesModes.map(v => ({ mode: v.mode, ca: v.ca, nb: Number(v.nb) })),
          ventesParMotif:   ventesHorsSessionParMotif.map(m => ({ motifVenteId: m.motifVenteId, libelle: m.libelle, ca: m.ca, nb: Number(m.nb) })),
          reversements:     reversementsEncaisses.map(r => ({ pdvNom: r.pointDeVente.nom, montant: Number(r.montantTTC), dateEncaissement: r.dateEncaissement?.toISOString() ?? null })),
        },
      },
      sortiesEffectives: {
        frais:    totalFrais,
        charges:  totalChargesPayees,
        droitsAuteursPaies:      totalDAPaies,
        commissionsReversements: commissionsEncaissees,
        parCategorie,
        total: totalSortiesEff,
        detail: {
          frais:   fraisPeriode.map(f => ({ type: f.type, motif: f.motif, montantHT: Number(f.montantHT ?? 0), date: f.date.toISOString() })),
          charges: chargesDetail,
          droitsAuteursPaies: paiementsDAperiode.map(p => ({
            auteurId: p.auteurId,
            nomAuteur: `${p.auteur.prenom} ${p.auteur.nom}`.trim(),
            montant: Number(p.montant),
          })),
          commissionsReversements: reversementsEncaisses
            .filter(r => commissionRev(r) > 0)
            .map(r => ({ pdvNom: r.pointDeVente.nom, montantBrut: Number(r.montantTTC), commission: commissionRev(r) })),
        },
      },
      entreesPrevues: {
        reversementsEnAttente: totalEntreesPrev, total: totalEntreesPrev,
        detail: reversementsEnAttente.map(r => ({
          pdvNom: r.pointDeVente.nom,
          montant: Number(r.montantTTC),
          commission: commissionRev(r),
          dateCloture: r.dateCloture.toISOString(),
        })),
      },
      sortiesPrevues: {
        droitsAuteurs:           totalDroitsOutstanding,
        chargesAVenir:           totalChargesAVenir,
        commissionsReversements: commissionsEnAttente,
        total: totalSortiesPrev,
        detail: {
          droits: [...auteurSoldes.entries()].map(([auteurId, d]) => ({ auteurId, nomAuteur: d.nom, montantNet: d.solde, montantBrut: d.brut })),
          charges: [
            ...chargesPonctuellesAVenir.map(c => ({ id: c.id, libelle: c.libelle, montantHT: Number(c.montantHT), type: c.type, datePrevu: c.dateEffet.toISOString() })),
            ...aboPrevu.map(e => ({ id: e.id, libelle: e.libelle, montantHT: e.montantHT, type: 'ABONNEMENT', datePrevu: e.date.toISOString() })),
          ].sort((a, b) => new Date(a.datePrevu).getTime() - new Date(b.datePrevu).getTime()),
        },
      },
      stock: { valeurEstimee: valeurStock, nbArticles: articlesStock.length },
      bilan: {
        actif: {
          stock: valeurStock,
          creancesClients: totalEntreesPrev,
          tresorerie: Math.max(0, totalEntreesEff - totalSortiesEff),
          total: valeurStock + totalEntreesPrev + Math.max(0, totalEntreesEff - totalSortiesEff),
        },
        passif: {
          droitsAuteurs: totalDroitsOutstanding,
          chargesAPayer: totalChargesAVenir,
          resultatNet,
          total: totalDroitsOutstanding + totalChargesAVenir + resultatNet,
        },
      },
    }
  })
}
