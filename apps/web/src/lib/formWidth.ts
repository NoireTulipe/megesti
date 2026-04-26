import type { EntityType } from '@megesti/shared'

const key = (et: EntityType) => `megesti:formWidth:${et}`

export function getFormWidth(entityType: EntityType): number | undefined {
  try {
    const v = localStorage.getItem(key(entityType))
    return v ? parseInt(v, 10) : undefined
  } catch { return undefined }
}

export function setFormWidth(entityType: EntityType, width: number): void {
  try { localStorage.setItem(key(entityType), String(width)) } catch { /* rien */ }
}
