import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Bulle {
  title?: string
  text:   string
  cta?:   { label: string; href?: string }
}

export interface MascoteDialogData {
  id:        string
  slug:      string
  imageName: string
  bulles:    Bulle[]
}

export function useMascoteDialog(slug: string) {
  return useQuery<MascoteDialogData>({
    queryKey:  ['mascote-dialog', slug],
    queryFn:   () => api.get<MascoteDialogData>(`/mascote-dialogs/${slug}`),
    staleTime: 10 * 60 * 1000, // 10 min — les dialogs changent peu
    retry:     false,           // pas de retry si slug inconnu
  })
}
