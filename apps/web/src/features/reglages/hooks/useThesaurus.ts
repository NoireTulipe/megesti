import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface ThesaurusEntry {
  id:          string
  thesaurusId: string
  labelFr:     string
  labelEn:     string | null
  position:    number
  parentId:    string | null
}

export interface Thesaurus {
  id:          string
  nameFr:      string
  nameEn:      string | null
  descFr:      string | null
  entries:     ThesaurusEntry[]
}

const KEYS = {
  all:  () => ['thesauri'] as const,
}

export function useThesauri() {
  return useQuery({
    queryKey: KEYS.all(),
    queryFn:  () => api.get<Thesaurus[]>('/thesauri'),
  })
}

export function useCreateThesaurus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: { id: string; name: { fr: string; en?: string }; description?: { fr: string; en?: string } }) =>
      api.post<Thesaurus>('/thesauri', p),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useDeleteThesaurus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/thesauri/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useCreateThesaurusEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ thesaurusId, ...p }: {
      thesaurusId: string
      id:       string
      label:    { fr: string; en?: string }
      position: number
      parentId: string | null
    }) => api.post<ThesaurusEntry>(`/thesauri/${thesaurusId}/entries`, p),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}
