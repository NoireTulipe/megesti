/**
 * Test de charge concurrente sur POST /ventes — vérifie que la numérotation
 * séquentielle et la chaîne de hash tiennent sous 10 requêtes simultanées.
 *
 * ⚠ Crée 10 vraies ventes hors session (chaînées, inaltérables) : à lancer
 * sur un tenant de test, pas sur des données réelles.
 *
 * Usage :
 *   node scripts/test-race-ventes.mjs https://beta.exemple.fr email password [slug]
 */

const [url, email, password, slug] = process.argv.slice(2)
if (!url || !email || !password) {
  console.error('Usage: node test-race-ventes.mjs <API_URL> <email> <password> [slug]')
  process.exit(1)
}
const base = url.replace(/\/$/, '') + '/api'

async function req(path, options = {}, token) {
  const res = await fetch(base + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  const body = await res.json().catch(() => null)
  return { status: res.status, body }
}

// ── Login ──
const login = await req('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password, ...(slug ? { slug } : {}) }),
})
if (login.status !== 200) { console.error('Login KO', login); process.exit(1) }
const token = login.body.token
console.log('✓ Login')

// ── Prérequis : un motif actif + un article ──
const motifs = await req('/motifs-vente', {}, token)
const motif = motifs.body?.find?.(m => m.actif) ?? motifs.body?.[0]
if (!motif) { console.error('Aucun motif de vente — crée-en un d\'abord'); process.exit(1) }

const articles = await req('/articles?take=1', {}, token)
const article = articles.body?.[0]
if (!article) { console.error('Aucun article'); process.exit(1) }
console.log(`✓ Motif "${motif.libelle}" · Article "${article.nom}"`)

// ── 10 ventes en parallèle ──
const N = 10
const results = await Promise.all(
  Array.from({ length: N }, () =>
    req('/ventes', {
      method: 'POST',
      body: JSON.stringify({
        id: crypto.randomUUID(),
        motifVenteId: motif.id,
        modePaiement: 'ESPECES',
        lignes: [{ articleId: article.id, quantite: 1 }],
      }),
    }, token)
  )
)

const ok = results.filter(r => r.status === 201)
const ko = results.filter(r => r.status !== 201)
const numeros = ok.map(r => r.body.numero).sort((a, b) => a - b)
console.log(`\n${ok.length}/${N} créées · numéros : ${numeros.join(', ')}`)
if (ko.length) console.log('Échecs :', ko.map(r => `${r.status} ${r.body?.message}`))

// Numéros consécutifs sans trou ni doublon ?
const consecutifs = numeros.every((n, i) => i === 0 || n === numeros[i - 1] + 1)
console.log(consecutifs ? '✓ Numérotation consécutive, aucun trou' : '✗ TROU OU DOUBLON dans la numérotation !')

// ── Intégrité de la chaîne (nécessite un compte ADMIN) ──
const integrity = await req('/ventes/verify-integrity', {}, token)
console.log('Intégrité chaîne :', JSON.stringify(integrity.body))
