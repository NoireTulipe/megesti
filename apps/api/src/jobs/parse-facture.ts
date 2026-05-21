import { parseFacture } from '@megesti/shared'

export interface InfosFacture { nom: string; siret: string; montant: number }

export function extraireInfosFacture(contenu: string): InfosFacture {
  const f = parseFacture(contenu)
  return {
    nom:     f.emetteur.nom,
    siret:   f.emetteur.ref ?? '',
    montant: f.montantTTC,
  }
}
