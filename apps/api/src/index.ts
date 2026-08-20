import { config as chargerEnv } from 'dotenv'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

/**
 * Charge apps/api/.env avant tout le reste.
 *
 * En developpement, `tsx --env-file=.env` s'en chargeait deja. En production,
 * `node dist/index.js` ne lisait rien : seules les variables injectees par PM2
 * existaient. Ajouter une variable au .env n'avait donc aucun effet en prod —
 * silencieusement. Le chemin est resolu depuis ce fichier (src/ ou dist/), pas
 * depuis le repertoire courant, pour ne pas dependre du cwd de PM2.
 *
 * dotenv n'ecrase jamais une variable deja definie : ce que PM2 fournit reste
 * prioritaire.
 */
chargerEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env') })

import { buildServer } from './server.js'
import { verifierMailer } from './services/mailer/index.js'

const PORT = Number(process.env['PORT'] ?? 3001)
const HOST = process.env['HOST'] ?? '0.0.0.0'

const app = await buildServer()

// Annonce le transport e-mail : une config incomplete doit se voir ici, pas
// le jour ou un client perd son mot de passe.
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
