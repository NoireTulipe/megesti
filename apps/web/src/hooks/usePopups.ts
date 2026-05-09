import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type PopupMode = 'SHOW_ONCE' | 'DISMISSIBLE' | 'ALWAYS_CLOSABLE' | 'ALWAYS_BLOCKING'

export interface PopupSlide {
  imageName: string
  title?:    string
  text:      string
  ctaLabel?: string
  ctaHref?:  string
}

export interface PopupData {
  id:          string
  mode:        PopupMode
  dismissText: string
  slides:      PopupSlide[]
  targetPages: string[]
}

export function usePopups(currentPage: string) {
  return useQuery<PopupData[]>({
    queryKey:  ['popups-pending', currentPage],
    queryFn:   () => api.get<PopupData[]>(`/popups/pending?page=${encodeURIComponent(currentPage)}`),
    staleTime: 2 * 60 * 1000,
    retry:     false,
  })
}

export function useMarkPopupVu() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post(`/popups/${id}/vu`, {}),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['popups-pending'] }),
  })
}
