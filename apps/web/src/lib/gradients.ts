/**
 * Gradients d'avatars et de couvertures — source unique.
 * Chaque famille d'entités garde son identité couleur :
 * chaud (auteurs, imprimeurs), sage (dépôts), encre (points de vente).
 * Le gradient est stable pour un même nom (hash simple).
 */

const WARM = [
  'linear-gradient(135deg,#C4907C,#D4A070)',
  'linear-gradient(135deg,#8B7BAB,#A090C0)',
  'linear-gradient(135deg,#6B8F71,#85A88A)',
  'linear-gradient(135deg,#C9933A,#D4A855)',
  'linear-gradient(135deg,#5B6E8A,#7090B8)',
]

const COVERS = [
  'linear-gradient(160deg,#C4907C,#8B7BAB)',
  'linear-gradient(160deg,#8B7BAB,#6B8F71)',
  'linear-gradient(160deg,#C9933A,#C4907C)',
  'linear-gradient(160deg,#6B8F71,#5B6E8A)',
  'linear-gradient(160deg,#5B6E8A,#C9933A)',
]

const SAGE = [
  'linear-gradient(135deg,#6B8F71,#85A88A)',
  'linear-gradient(135deg,#5B7A60,#7A9E80)',
  'linear-gradient(135deg,#4A7060,#6A9080)',
  'linear-gradient(135deg,#3A6050,#5A8070)',
]

const INK = [
  'linear-gradient(135deg,#3D5470,#5470A0)',
  'linear-gradient(135deg,#2A4A6A,#4A6A90)',
  'linear-gradient(135deg,#1E3A5F,#3A5F8A)',
  'linear-gradient(135deg,#304060,#506080)',
]

function hash(name: string): number {
  return [...name].reduce((a, c) => a + c.charCodeAt(0), 0)
}

function pick(palette: string[], name: string): string {
  return palette[hash(name) % palette.length] as string
}

/** Auteurs, imprimeurs, maisons d'édition — gamme chaude. */
export const avatarGradient = (name: string) => pick(WARM, name)
/** Couvertures de livres. */
export const coverGradient = (name: string) => pick(COVERS, name)
/** Dépôts libraires — identité sage. */
export const sageGradient = (name: string) => pick(SAGE, name)
/** Points de vente — identité encre. */
export const inkGradient = (name: string) => pick(INK, name)
