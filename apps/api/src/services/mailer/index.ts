import { ConsoleMailer } from './console-mailer.js'
import { SmtpMailer } from './smtp-mailer.js'
import type { Mailer } from './types.js'

export type { Mailer, MessageEmail } from './types.js'
export { ConsoleMailer } from './console-mailer.js'
export { SmtpMailer } from './smtp-mailer.js'

/**
 * Construit le transport d'apres l'environnement.
 *
 * MAIL_TRANSPORT=smtp    -> envoi reel (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
 * MAIL_TRANSPORT=console -> ecriture dans les logs (defaut si non configure)
 *
 * Le defaut est volontairement la console : une configuration SMTP incomplete
 * ne doit jamais faire echouer silencieusement un envoi en production sans
 * qu'on s'en apercoive — on le voit dans les logs au demarrage.
 */
export function creerMailer(): Mailer {
  const transport = process.env['MAIL_TRANSPORT'] ?? 'console'
  if (transport !== 'smtp') return new ConsoleMailer()

  const host = process.env['SMTP_HOST']
  const user = process.env['SMTP_USER']
  const pass = process.env['SMTP_PASS']
  if (!host || !user || !pass) {
    console.warn('[mailer] MAIL_TRANSPORT=smtp mais SMTP_HOST/USER/PASS incomplet — repli sur la console')
    return new ConsoleMailer()
  }

  const port = Number(process.env['SMTP_PORT'] ?? 587)
  return new SmtpMailer({
    host,
    port,
    // 465 = TLS implicite ; 587 = STARTTLS, negocie par nodemailer.
    secure: process.env['SMTP_SECURE'] === 'true' || port === 465,
    user,
    pass,
    from: process.env['MAIL_FROM'] ?? `MeGesti <${user}>`,
  })
}

let instance: Mailer | null = null

/**
 * Transport partage. Construit une seule fois : nodemailer garde un pool de
 * connexions, en recreer un a chaque requete serait du gaspillage.
 */
export function mailer(): Mailer {
  instance ??= creerMailer()
  return instance
}

/**
 * A appeler au demarrage. Annonce le transport retenu et, en SMTP, verifie
 * reellement les identifiants — sans cela, une configuration incomplete ne se
 * decouvre qu'au premier client qui perd son mot de passe.
 */
export async function verifierMailer(log: {
  info: (msg: string) => void
  warn: (msg: string) => void
  error: (msg: string) => void
}): Promise<void> {
  const m = mailer()
  if (m.nom === 'console') {
    log.warn(
      "[mailer] transport CONSOLE : les e-mails sont ecrits dans les logs, pas envoyes. " +
      'Renseignez MAIL_TRANSPORT=smtp et SMTP_HOST/SMTP_USER/SMTP_PASS pour un envoi reel.',
    )
    return
  }
  const cible = `${process.env['SMTP_HOST']}:${process.env['SMTP_PORT'] ?? 587}`
  try {
    await (m as SmtpMailer).verifier()
    log.info(`[mailer] transport SMTP operationnel (${cible})`)
  } catch (err) {
    log.error(
      `[mailer] SMTP INJOIGNABLE ou identifiants refuses (${cible}) : ${
        err instanceof Error ? err.message : String(err)
      }. Les e-mails de reinitialisation N'ARRIVERONT PAS.`,
    )
  }
}
