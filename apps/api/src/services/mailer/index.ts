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
