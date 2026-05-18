// Recherche d'entreprises via l'API publique Recherche Entreprises (DINUM)
// Pas d'authentification requise, données INSEE/INPI fusionnées

const BASE = 'https://api.recherche-entreprises.fabrique.social.gouv.fr/api/v1'

export interface EntrepriseResult {
  nom:              string
  siren:            string
  siret:            string   // siret du siège social
  adresse:          string
  codePostal?:      string
  ville?:           string
  libelleActivite?: string   // libellé NAF
  formeJuridique?:  string
}

interface ApiEntreprise {
  nom?:                       string
  nom_raison_sociale?:        string
  denominationSociale?:       string
  denomination?:              string
  name?:                      string
  nomCommercial?:             string
  raison_sociale?:            string
  siren?:                     string
  siret?:                     string
  siretSiegeSocial?:          string
  adresse?:                   string
  address?:                   string
  codePostal?:                string
  code_postal?:               string
  ville?:                     string
  city?:                      string
  libelleActivitePrincipale?: string
  libelleNaf?:                string
  libelle_naf?:               string
  categorieJuridique?:        string
  forme_juridique?:           string
  [key: string]:              unknown
}

interface ApiResponse {
  entreprises?: ApiEntreprise[]
  [key: string]: unknown
}

function toResult(r: ApiEntreprise): EntrepriseResult {
  // eslint-disable-next-line no-console
  console.debug('[rechercheEntreprise] raw:', JSON.stringify(r))
  const nom =
    r.nom ?? r.nom_raison_sociale ?? r.denominationSociale ?? r.denomination ??
    r.name ?? r.nomCommercial ?? r.raison_sociale ?? ''
  return {
    nom,
    siren:           r.siren ?? '',
    siret:           r.siret ?? r.siretSiegeSocial ?? '',
    adresse:         r.adresse ?? r.address ?? '',
    codePostal:      r.codePostal ?? r.code_postal ?? undefined,
    ville:           r.ville ?? r.city ?? undefined,
    libelleActivite: r.libelleActivitePrincipale ?? r.libelleNaf ?? r.libelle_naf ?? undefined,
    formeJuridique:  r.forme_juridique ?? r.categorieJuridique ?? undefined,
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
