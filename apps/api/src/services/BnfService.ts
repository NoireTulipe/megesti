const BNF_SRU_URL = 'https://catalogue.bnf.fr/api/SRU'
const BNF_IMG_URL = 'https://catalogue.bnf.fr/couverture'
const TVA_LIVRE   = 0.055

export interface BnfLivreInfo {
  isbn:             string
  titre:            string
  auteursMention:   string | null   // texte libre "par X et Y", non lié aux auteurs tenant
  editeur:          string | null
  lieuPublication:  string | null
  anneePublication: number | null
  collection:       string | null
  collectionVolume: string | null
  resume:           string | null
  imageUrl:         string | null
  prixTTC:          number | null
  prixVenteHT:      number | null   // calculé selon franchiseTva du tenant
}

/** Extrait tous les datafields UNIMARC correspondant au tag donné */
function parseDatafields(xml: string, tag: string): Map<string, string>[] {
  const results: Map<string, string>[] = []
  const dfRe = new RegExp(
    `<mxc:datafield[^>]*\\btag="${tag}"[^>]*>([\\s\\S]*?)</mxc:datafield>`,
    'g',
  )
  const sfRe = /<mxc:subfield[^>]*\bcode="([^"]+)"[^>]*>([\s\S]*?)<\/mxc:subfield>/g

  let dfMatch: RegExpExecArray | null
  while ((dfMatch = dfRe.exec(xml)) !== null) {
    const inner = dfMatch[1] as string
    const fields = new Map<string, string>()
    sfRe.lastIndex = 0
    let sfMatch: RegExpExecArray | null
    while ((sfMatch = sfRe.exec(inner)) !== null) {
      const code  = sfMatch[1] as string
      const value = (sfMatch[2] as string)
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .trim()
      if (!fields.has(code)) fields.set(code, value)
    }
    results.push(fields)
  }
  return results
}

function first(xml: string, tag: string): Map<string, string> {
  return parseDatafields(xml, tag)[0] ?? new Map()
}

function parsePrixTTC(raw: string | undefined): number | null {
  if (!raw) return null
  const m = raw.match(/([\d]+[,.][\d]+)/)
  if (!m) return null
  const n = parseFloat((m[1] as string).replace(',', '.'))
  return isNaN(n) ? null : n
}

export async function lookupIsbn(
  isbn: string,
  franchiseTva: boolean,
): Promise<BnfLivreInfo | null> {
  const url =
    `${BNF_SRU_URL}?version=1.2&operation=searchRetrieve` +
    `&query=bib.anywhere%20adj%20%22${encodeURIComponent(isbn)}%22`

  const res = await fetch(url, {
    headers: { Accept: 'application/xml' },
    signal:  AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`BNF SRU HTTP ${res.status}`)

  const xml = await res.text()

  const nbMatch = xml.match(/<srw:numberOfRecords>(\d+)<\/srw:numberOfRecords>/)
  if (!nbMatch || nbMatch[1] === '0') return null

  const f010 = first(xml, '010')
  const f200 = first(xml, '200')
  const f214 = first(xml, '214')
  const f225 = first(xml, '225')
  const f330 = first(xml, '330')

  const images  = parseDatafields(xml, '856')
  const couv    = images.find(m => m.get('b')?.toLowerCase().includes('première'))
  const imageId = couv?.get('u')
  const imageUrl = imageId
    ? `${BNF_IMG_URL}?appName=NE&idImage=${imageId}&couverture=1`
    : null

  const prixTTC = parsePrixTTC(f010.get('d'))
  let prixVenteHT: number | null = null
  if (prixTTC !== null) {
    prixVenteHT = franchiseTva
      ? prixTTC
      : Math.round((prixTTC / (1 + TVA_LIVRE)) * 100) / 100
  }

  const anneeRaw       = f214.get('d')
  const anneePublication = anneeRaw ? (parseInt(anneeRaw, 10) || null) : null

  return {
    isbn:             f010.get('a') ?? isbn,
    titre:            f200.get('a') ?? '',
    auteursMention:   f200.get('f') ?? null,
    editeur:          f214.get('c') ?? null,
    lieuPublication:  f214.get('a') ?? null,
    anneePublication,
    collection:       f225.get('a') ?? null,
    collectionVolume: f225.get('v') ?? null,
    resume:           f330.get('a') ?? null,
    imageUrl,
    prixTTC,
    prixVenteHT,
  }
}
