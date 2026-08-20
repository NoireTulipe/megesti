/**
 * Abstraction d'envoi d'e-mails.
 *
 * Regle #3 du projet : jamais de dependance dure a un prestataire. Le code
 * applicatif ne connait que cette interface ; le transport reel (SMTP LWS,
 * relais tiers, sortie console en dev) se choisit par configuration.
 */

export interface MessageEmail {
  /** Destinataire unique — pas d'envoi groupe ici, ce sont des mails transactionnels. */
  to:      string
  subject: string
  /** Version texte, obligatoire : certains clients n'affichent que celle-ci. */
  text:    string
  html?:   string
}

export interface Mailer {
  /** Nom du transport, pour les logs. */
  readonly nom: string
  envoyer(message: MessageEmail): Promise<void>
}
