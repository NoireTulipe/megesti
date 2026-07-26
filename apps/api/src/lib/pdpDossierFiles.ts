import path from 'node:path'
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { encryptBuffer, decryptBuffer } from './crypto.js'

// Répertoire PRIVÉ : jamais servi par @fastify/static (contrairement à UPLOAD_DIR).
// Les fichiers y sont de toute façon chiffrés AES-256-GCM (défense en profondeur).
function getPrivateDir(): string {
  return process.env['PRIVATE_DIR'] ?? path.join(process.cwd(), 'private-uploads')
}

function dossierDir(tenantId: string): string {
  return path.join(getPrivateDir(), 'pdp-dossiers', tenantId)
}

export type CniFace = 'recto' | 'verso'

/** Chiffre et écrit une pièce d'identité. Retourne le chemin absolu du fichier. */
export async function savePieceIdentite(tenantId: string, face: CniFace, contenu: Buffer): Promise<string> {
  const dir = dossierDir(tenantId)
  await mkdir(dir, { recursive: true })
  const filePath = path.join(dir, `cni-${face}.enc`)
  await writeFile(filePath, encryptBuffer(contenu))
  return filePath
}

/** Lit et déchiffre une pièce d'identité. */
export async function readPieceIdentite(filePath: string): Promise<Buffer> {
  return decryptBuffer(await readFile(filePath))
}

/** Supprime définitivement les pièces d'identité d'un tenant (purge RGPD post-KYB). */
export async function purgePiecesIdentite(tenantId: string): Promise<void> {
  await rm(dossierDir(tenantId), { recursive: true, force: true })
}
