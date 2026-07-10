import type { PrismaClient } from '@prisma/client'
import { computeGenesisHash, computeVenteHash } from '@megesti/business'

export const caisseSecret: string = process.env['CAISSE_SECRET'] ?? (() => { throw new Error('CAISSE_SECRET manquant') })()

export type ModePaiement = 'CB' | 'ESPECES' | 'CHEQUE' | 'VIREMENT' | 'SUMUP' | 'PDV'

export interface LigneVenteInput {
  articleId:       string
  quantite:        number
  /**
   * Prix unitaire appliqué, TTC (prix public payé par le client).
   * Absent → prix de l'article. Le nom du champ est historique : il est
   * conservé pour compatibilité avec les payloads des apps déjà installées.
   */
  prixUnitaireHT?: number
}

export interface CreerVenteParams {
  id:            string
  tenantId:      string
  sessionId?:    string | null
  motifVenteId?: string | null
  auteurId?:     string | null
  modePaiement:  ModePaiement
  lignes:        LigneVenteInput[]
  debiterStock:  boolean
}

function httpError(statusCode: number, message: string): Error & { statusCode: number } {
  const err = new Error(message) as Error & { statusCode: number }
  err.statusCode = statusCode
  return err
}

/**
 * Création d'une vente : calcul lignes/TVA/totaux, numérotation séquentielle
 * par tenant, chaînage de hash (loi anti-fraude TVA) et débit de stock.
 *
 * La numérotation et la lecture du dernier hash sont sérialisées par un
 * advisory lock Postgres scopé au tenant (libéré automatiquement au commit) :
 * deux ventes simultanées ne peuvent ni forker la chaîne de hash, ni entrer
 * en collision sur (tenantId, numero). Un P2002 résiduel ne peut donc venir
 * que d'un vrai retry idempotent (même UUID client) → le 409 du error
 * handler global est correct.
 */
export async function creerVente(db: PrismaClient, params: CreerVenteParams) {
  const { tenantId } = params

  const articleIds = [...new Set(params.lignes.map((l) => l.articleId))]
  const articles = await db.article.findMany({
    where:   { id: { in: articleIds }, tenantId },
    include: { rayon: { select: { tauxTVA: true } } },
  })
  if (articles.length !== articleIds.length) throw httpError(404, 'Un ou plusieurs articles introuvables')

  // Garde matière première : jamais vendable, quel que soit le canal (web, mobile)
  const nonVendable = articles.find((a) => !a.vendable)
  if (nonVendable) throw httpError(400, `« ${nonVendable.nom} » est une matière première, non vendable`)

  const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { franchiseTva: true } })
  const tauxFactor = tenant?.franchiseTva ? 0 : 1

  const articleMap = new Map(articles.map((a) => [a.id, a]))

  let totalHT = 0, totalTVA = 0, totalTTC = 0
  const lignesData = params.lignes.map((l) => {
    const article = articleMap.get(l.articleId)
    if (!article) throw httpError(404, 'Article introuvable')
    // Convention MeGesti : le prix (saisi en caisse ou stocké sur l'article)
    // est le prix public TTC — ce que le client paie réellement, ce que le
    // terminal encaisse. Le HT est dérivé par division ; on n'ajoute JAMAIS
    // la TVA par-dessus le prix. Tenant en franchise de TVA : taux = 0 → HT = TTC.
    const prixTTC = l.prixUnitaireHT ?? Number(article.prixVenteHT)
    const taux    = Number(article.rayon.tauxTVA) / 100 * tauxFactor
    const ligneTTC = prixTTC * l.quantite
    const ligneHT  = ligneTTC / (1 + taux)
    totalHT  += ligneHT
    totalTVA += ligneTTC - ligneHT
    totalTTC += ligneTTC
    return {
      id:             crypto.randomUUID(),
      articleId:      l.articleId,
      quantite:       l.quantite,
      prixUnitaireHT: Math.round(prixTTC / (1 + taux) * 100) / 100,
      tauxTVA:        Number(article.rayon.tauxTVA),
      totalLigneHT:   Math.round(ligneHT  * 100) / 100,
      totalLigneTTC:  Math.round(ligneTTC * 100) / 100,
    }
  })

  const totalHTr  = Math.round(totalHT  * 100) / 100
  const totalTVAr = Math.round(totalTVA * 100) / 100
  const totalTTCr = Math.round(totalTTC * 100) / 100

  return db.$transaction(async (tx) => {
    // Sérialise numérotation + chaîne de hash pour ce tenant uniquement
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${tenantId}))`

    const agg = await tx.vente.aggregate({ where: { tenantId }, _max: { numero: true } })
    const numero = (agg._max.numero ?? 0) + 1

    const lastVente = await tx.vente.findFirst({
      where:   { tenantId, hash: { not: null } },
      orderBy: { numero: 'desc' },
      select:  { hash: true },
    })
    const previousHash = lastVente?.hash ?? computeGenesisHash(tenantId, caisseSecret)

    const dateVente = new Date()
    const hash = computeVenteHash(previousHash, {
      id: params.id, numero, tenantId, sessionId: params.sessionId ?? null,
      dateVente, modePaiement: params.modePaiement,
      totalHT: totalHTr, totalTVA: totalTVAr, totalTTC: totalTTCr,
    }, caisseSecret)

    const created = await tx.vente.create({
      data: {
        id: params.id, tenantId,
        sessionId:    params.sessionId    ?? null,
        motifVenteId: params.motifVenteId ?? null,
        auteurId:     params.auteurId     ?? null,
        numero, dateVente, modePaiement: params.modePaiement,
        totalHT: totalHTr, totalTVA: totalTVAr, totalTTC: totalTTCr,
        previousHash, hash,
        lignes: { create: lignesData },
      },
      include: {
        lignes:     { include: { article: { select: { id: true, nom: true } } } },
        motifVente: { select: { id: true, libelle: true } },
      },
    })

    if (params.debiterStock) {
      for (const l of params.lignes) {
        await tx.article.update({ where: { id: l.articleId }, data: { stock: { decrement: l.quantite } } })
      }
    }

    return created
  })
}
