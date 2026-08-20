import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import type { Mailer, MessageEmail } from './types.js'

export interface ConfigSmtp {
  host: string
  port: number
  /** true pour le port 465 (TLS implicite), false pour 587 (STARTTLS). */
  secure: boolean
  user: string
  pass: string
  /** Expediteur affiche, ex. « MeGesti <contact@megesti.fr> ». */
  from: string
}

/**
 * Transport SMTP standard. Fonctionne avec n'importe quel serveur : la boite
 * du domaine, un relais transactionnel, ou un Postfix local. Seule la
 * configuration change — le code applicatif ne bouge pas.
 */
export class SmtpMailer implements Mailer {
  readonly nom = 'smtp'
  private readonly transporter: Transporter
  private readonly from: string

  constructor(config: ConfigSmtp) {
    this.from = config.from
    this.transporter = nodemailer.createTransport({
      host:   config.host,
      port:   config.port,
      secure: config.secure,
      auth:   { user: config.user, pass: config.pass },
    })
  }

  /** Verifie les identifiants et la connectivite. A appeler au demarrage. */
  async verifier(): Promise<void> {
    await this.transporter.verify()
  }

  async envoyer(message: MessageEmail): Promise<void> {
    await this.transporter.sendMail({
      from:    this.from,
      to:      message.to,
      subject: message.subject,
      text:    message.text,
      ...(message.html ? { html: message.html } : {}),
    })
  }
}
