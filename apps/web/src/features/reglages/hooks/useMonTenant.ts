import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface MonTenant {
  id:               string
  name:             string
  slug:             string
  plan:             string
  franchiseBaseVA:  boolean
  logo:             string | null
  siteWeb:          string | null
  presentation:     string | null
}

const KEYS = { tenant: () => ['monTenant'] as const }

export function useMonTenant() {
  return useQuery({
    queryKey: KEYS.tenant(),
    queryFn:  () => api.get<MonTenant>('/mon-tenant'),
  })
}

export function useUpdateMonTenant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<MonTenant>) => api.patch<MonTenant>('/mon-tenant', data),
    onSuccess:  (updated) => qc.setQueryData(KEYS.tenant(), updated),
  })
}

