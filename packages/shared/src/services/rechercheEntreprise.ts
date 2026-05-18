// Recherche d'entreprises via l'API publique Recherche Entreprises (DINUM)
// Pas d'authentification requise, données INSEE/INPI fusionnées

const BASE = 'https://api.recherche-entreprises.fabrique.social.gouv.fr/api/v1'

export interface EntrepriseResult {
  nom:              string
  siren:            string
  siret:            string
  adresse:          string
  codePostal?:      string
  ville?:           string
  libelleActivite?: string
  formeJuridique?:  string
}

// Établissement retourné par l'API fabrique.social.gouv.fr
interface ApiEtablissement {
  siret?:                        string
  address?:                      string
  adresse?:                      string
  codePostalEtablissement?:      string
  libelleCommuneEtablissement?:  string
  activitePrincipaleEtablissement?: string
  [key: string]:                 unknown
}

interface ApiEntreprise {
  // Nom — l'API retourne "label" et non "nom"
  label?:                        string
  highlightLabel?:               string
  simpleLabel?:                  string
  nom?:                          string
  nom_raison_sociale?:           string
  // Identifiants
  siren?:                        string
  // Établissement siège (SIRET + adresse sont ici, pas à la racine)
  firstMatchingEtablissement?:   ApiEtablissement
  allMatchingEtablissements?:    ApiEtablissement[]
  // Activité et forme juridique
  activitePrincipale?:           string
  categorieJuridiqueUniteLegale?: string
  [key: string]:                 unknown
}

interface ApiResponse {
  entreprises?: ApiEntreprise[]
  [key: string]: unknown
}

function toResult(r: ApiEntreprise): EntrepriseResult {
  const etab = r.firstMatchingEtablissement ?? r.allMatchingEtablissements?.[0]
  return {
    nom:             r.label ?? r.highlightLabel ?? r.simpleLabel ?? r.nom ?? r.nom_raison_sociale ?? '',
    siren:           r.siren ?? '',
    siret:           etab?.siret ?? '',
    adresse:         etab?.address ?? etab?.adresse ?? '',
    codePostal:      etab?.codePostalEtablissement ?? undefined,
    ville:           etab?.libelleCommuneEtablissement ?? undefined,
    libelleActivite: r.activitePrincipale ?? etab?.activitePrincipaleEtablissement ?? undefined,
    formeJuridique:  r.categorieJuridiqueUniteLegale ?? undefined,
  }
}

export async function rechercherEntreprises(query: string): Promise<EntrepriseResult[]> {
  if (query.trim().length < 3) return []
  const res = await fetch(`${BASE}/search?query=${encodeURIComponent(query.trim())}&limit=8`)
  if (!res.ok) return []
  const data = await res.json() as ApiResponse
  return (data.entreprises ?? []).map(toResult)
}

export async function rechercherParSiret(siret: string): Promise<EntrepriseResult | null> {
  const clean = siret.replace(/\D/g, '')
  if (clean.length !== 14) return null
  const res = await fetch(`${BASE}/search?query=${clean}&limit=1`)
  if (!res.ok) return null
  const data = await res.json() as ApiResponse
  const r = (data.entreprises ?? [])[0]
  return r ? toResult(r) : null
}
