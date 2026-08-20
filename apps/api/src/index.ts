import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

/**
 * Charge apps/api/.env AVANT tout le reste.
 *
 * En developpement, `tsx --env-file=.env` s'en chargeait deja. En production,
 * `node dist/index.js` ne lisait rien : seules les variables injectees par PM2
 * existaient, donc ajouter une variable au .env n'avait aucun effet.
 *
 * API native de Node (>= 20.12) et non dotenv : dotenv est un paquet CommonJS
 * que tsup integre au bundle ESM avec un `require('fs')` inutilisable a
 * l'execution.
 *
 * Le chemin est resolu depuis ce fichier (src/ ou dist/), pas depuis le
 * repertoire courant, pour ne pas dependre du cwd de PM2. Les variables deja
 * definies dans l'environnement restent prioritaires.
 */
const cheminEnv = resolve(dirname(fileURLToPath(import.meta.url)), '../.env')
try {
  process.loadEnvFile(cheminEnv)
} catch {
  // Pas de .env (conteneur, CI, variables fournies par l'orchestrateur) : normal.
}

// Imports DYNAMIQUES : en ESM les imports statiques sont hisses et s'executeraient
// avant le chargement du .env ci-dessus. Les modules liraient alors un
// process.env incomplet.
const { buildServer }    = await import('./server.js')
const { verifierMailer } = await import('./services/mailer/index.js')

const PORT = Number(process.env['PORT'] ?? 3001)
const HOST = process.env['HOST'] ?? '0.0.0.0'

const app = await buildServer()

// Annonce le transport e-mail : une configuration incomplete doit se voir ici,
// pas le jour ou une cliente perd son mot de passe.
await verifierMailer({
  info:  (m) => app.log.info(m),
  warn:  (m) => app.log.warn(m),
  error: (m) => app.log.error(m),
})

try {
  await app.listen({ port: PORT, host: HOST })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
