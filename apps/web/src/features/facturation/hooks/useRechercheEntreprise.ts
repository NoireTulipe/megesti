import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { rechercherEntreprises, rechercherParSiret, type EntrepriseResult } from '@megesti/shared'

function useDebounced(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function useRechercheEntreprise(query: string) {
  const debounced = useDebounced(query, 300)
  const isSiret   = /^\d{14}$/.test(debounced.replace(/\D/g, ''))

  return useQuery<EntrepriseResult[]>({
    queryKey: ['entreprise-search', debounced],
    queryFn: async () => {
      if (isSiret) {
        const r = await rechercherParSiret(debounced)
        return r ? [r] : []
      }
      return rechercherEntreprises(debounced)
    },
    enabled:          debounced.length >= 3,
    staleTime:        30_000,
    placeholderData:  [],
  })
}
