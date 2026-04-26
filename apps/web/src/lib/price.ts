export function parsePrice(value: string | number): number {
  if (typeof value === 'number') return value
  return parseFloat(value.replace(',', '.'))
}

export function formatPrice(value: string | number): string {
  const n = typeof value === 'string' ? parseFloat(value) : value
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}
