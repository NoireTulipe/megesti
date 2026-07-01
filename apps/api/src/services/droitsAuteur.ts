import type { PrismaClient } from '@prisma/client'
import { evaluateDA } from '@megesti/business'
import type { FormuleDA, ContexteVente } from '@megesti/business'

export interface SoldeContrat {
  contratId:         string
  auteurId:          string
  auteurNom:         string
  articleId:         string | null
  articleNom:        string | null
  periodicite:       string | null
  prochainVersement: Date | null
  totalDuBrut:       number  // droits générés sur toutes les ventes depuis datePriseEffet
  avance:            number  // à-valoir contractuel
  avanceAbsorbee:    number  // portion absorbée par les ventes
  avanceRestante:    number  // à-valoir non encore absorbé
  totalVerse:        number  // paiements DA déjà effectués (statut PAYE)
  solde:             number  // montant actuellement exigible
}

function getContexte(
  session: { salonId: string | null; pointDeVente: { commissionPourcent: unknown; commissionFixe: unknown } | null } | null
): ContexteVente {
  if (!session) return { vendeur: 'ME', avecCommission: false, typeVente: 'DIRECTE' }
  const pdv = session.pointDeVente
  return {
    vendeur:        'ME',
    avecCommission: !!(pdv?.commissionPourcent || pdv?.commissionFixe),
    typeVente:      session.salonId ? 'SALON' : 'DIRECTE',
    tauxCommission: pdv?.commissionPourcent ? Number(pdv.commissionPourcent) : undefined,
  }
}

export async function calculerSoldeContrat(
  contratId: string,
  tenantId:  string,
  db:        PrismaClient,
): Promise<SoldeContrat | null> {
  const contrat = await db.contratAuteur.findFirst({
    where:   { id: contratId, tenantId },
    include: {
      typeDA:  true,
      auteur:  { select: { id: true, prenom: true, nom: true } },
      article: { select: { id: true, nom: true } },
      paiements: { where: { statut: 'PAYE' }, select: { montant: true } },
    },
  })
  if (!contrat) return null

  const datePriseEffet = contrat.datePriseEffet ?? contrat.dateSignature ?? contrat.createdAt
  const formule        = contrat.typeDA.formule as unknown as FormuleDA

  // Filtre articles : contrat sur un article précis ou sur tous les articles de l'auteur
  const articleFilter = contrat.articleId
    ? { articleId: contrat.articleId }
    : { article: { auteurs: { some: { auteurId: contrat.auteurId } } } }

  const lignes = await db.ligneVente.findMany({
    where: {
      ...articleFilter,
      vente: { tenantId, statut: 'VALIDEE', dateVente: { gte: datePriseEffet }, auteurId: null },
    },
    select: {
      totalLigneHT:  true,
      totalLigneTTC: true,
      vente: {
        select: {
          session: {
            select: {
              salonId:      true,
              pointDeVente: { select: { commissionPourcent: true, commissionFixe: true } },
            },
          },
        },
      },
    },
  })

  let totalDuBrut = 0
  for (const ligne of lignes) {
    const ctx  = getContexte(ligne.vente.session)
    const regle = evaluateDA(formule, ctx)
    if (!regle) continue
    const tauxEff = regle.deductionCommission && ctx.tauxCommission
      ? Math.max(0, regle.taux - regle.deductionCommission * ctx.tauxCommission)
      : regle.taux
    const base   = regle.base === 'TTC' ? Number(ligne.totalLigneTTC) : Number(ligne.totalLigneHT)
    totalDuBrut += base * (tauxEff / 100)
  }
  totalDuBrut = arrondir(totalDuBrut)

  const avance         = Number(contrat.avance ?? 0)
  const avanceAbsorbee = arrondir(Math.min(totalDuBrut, avance))
  const avanceRestante = arrondir(Math.max(0, avance - avanceAbsorbee))
  const netApresAvance = arrondir(Math.max(0, totalDuBrut - avance))
  const totalVerse     = arrondir(contrat.paiements.reduce((s, p) => s + Number(p.montant), 0))
  const solde          = arrondir(Math.max(0, netApresAvance - totalVerse))

  return {
    contratId:         contrat.id,
    auteurId:          contrat.auteurId,
    auteurNom:         `${contrat.auteur.prenom} ${contrat.auteur.nom}`,
    articleId:         contrat.articleId,
    articleNom:        contrat.article?.nom ?? null,
    periodicite:       contrat.periodicite,
    prochainVersement: contrat.prochainVersement,
    totalDuBrut,
    avance,
    avanceAbsorbee,
    avanceRestante,
    totalVerse,
    solde,
  }
}

/** Calcule la prochaine date de versement après `depuis` selon la périodicité. */
export function prochaineDateVersement(
  periodicite:    string,
  datesFixesJSON: unknown,
  depuis:         Date = new Date(),
): Date | null {
  const base = new Date(depuis)

  if (periodicite === 'MENSUEL') {
    base.setMonth(base.getMonth() + 1, 1)
    return base
  }
  if (periodicite === 'TRIMESTRIEL') {
    base.setMonth(base.getMonth() + 3, 1)
    return base
  }
  if (periodicite === 'TOUS_LES_4_MOIS') {
    base.setMonth(base.getMonth() + 4, 1)
    return base
  }
  if (periodicite === 'SEMESTRIEL') {
    base.setMonth(base.getMonth() + 6, 1)
    return base
  }
  if (periodicite === 'ANNUEL') {
    base.setFullYear(base.getFullYear() + 1, 0, 1)
    return base
  }
  if (periodicite === 'DATES_FIXES' && Array.isArray(datesFixesJSON)) {
    const dates = datesFixesJSON as Array<{ mois: number; jour: number }>
    const now   = new Date()
    const candidates: Date[] = []
    for (const { mois, jour } of dates) {
      for (const annee of [now.getFullYear(), now.getFullYear() + 1]) {
        const c = new Date(annee, mois - 1, jour)
        if (c > now) candidates.push(c)
      }
    }
    candidates.sort((a, b) => a.getTime() - b.getTime())
    return candidates[0] ?? null
  }
  return null
}

function arrondir(v: number): number {
  return Math.round(v * 100) / 100
}
