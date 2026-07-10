import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'

// Dérive une clé 32 octets depuis la passphrase
function getEncryptionKey(): Buffer {
  const passphrase = process.env['ENCRYPTION_KEY']
  if (!passphrase || passphrase.length < 32) {
    throw new Error('ENCRYPTION_KEY manquante ou trop courte (min 32 caractères)')
  }
  return createHash('sha256').update(passphrase).digest()
}

/**
 * Chiffre un texte en AES-256-GCM.
 * Format : iv.tag.ciphertext (chacun en base64, séparés par '.')
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(12)  // IV aléatoire 12 octets pour GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  // Format : iv.tag.ciphertext en base64
  return `${iv.toString('base64')}.${authTag.toString('base64')}.${ciphertext.toString('base64')}`
}

/**
 * Déchiffre un texte chiffré avec encrypt().
 * Throw si le tag d'authentification ne correspond pas (donnée corrompue ou mauvaise clé).
 */
export function decrypt(payload: string): string {
  const key = getEncryptionKey()
  const [ivB64, tagB64, ciphertextB64] = payload.split('.')
  if (!ivB64 || !tagB64 || !ciphertextB64) {
    throw new Error('Format de payload chiffré invalide')
  }
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(tagB64, 'base64')
  const ciphertext = Buffer.from(ciphertextB64, 'base64')
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  try {
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    return plaintext.toString('utf8')
  } catch (err) {
    throw new Error(`Déchiffrement échoué (données corrompues ou mauvaise clé): ${(err as Error).message}`)
  }
}
