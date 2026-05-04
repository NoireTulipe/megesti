/**
 * Construit une référence unique de paiement de droits d'auteur.
 *
 * Format : INITIALES-LIVRE4-ANNEE-ORDRE
 * Exemple : FB-KAZU-2026-001
 *
 * @param auteurNom   Nom complet de l'auteur (ex: "François Bonacci")
 * @param articleNom  Titre de l'article ou null si tous articles confondus
 * @param annee       Année du versement (ex: "2026")
 * @param numeroOrdre Numéro d'ordre du paiement pour ce contrat (>= 1)
 */
export function buildReference(
  auteurNom: string,
  articleNom: string | null,
  annee: string,
  numeroOrdre: number,
): string {
  // Initiales : 2 premières lettres des mots du nom
  const initiales = auteurNom
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2)

  // 4 premiers caractères alphanumériques du livre (ou TOUS)
  const livre4 = (articleNom ?? 'TOUS')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 4)
    .padEnd(4, 'X')

  const ordre = String(numeroOrdre).padStart(3, '0')

  return `${initiales}-${livre4}-${annee}-${ordre}`
}

/**
 * Extrait les 4 premières lettres alphanumériques d'un titre pour la référence.
 * Utilitaire exposé pour test et réutilisation.
 */
export function extractBookPrefix(titre: string): string {
  return titre
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 4)
}
