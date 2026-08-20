import type { Mailer, MessageEmail } from './types.js'

/**
 * Transport de developpement : ecrit l'e-mail dans les logs au lieu de
 * l'envoyer. Permet de derouler tout le parcours sans configurer de SMTP.
 */
export class ConsoleMailer implements Mailer {
  readonly nom = 'console'

  async envoyer(message: MessageEmail): Promise<void> {
    console.log(
      [
        '',
        '──────── E-MAIL (transport console) ────────',
        `A       : ${message.to}`,
        `Sujet   : ${message.subject}`,
        '',
        message.text,
        '────────────────────────────────────────────',
        '',
      ].join('\n'),
    )
  }
}
