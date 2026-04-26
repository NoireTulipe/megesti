import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const KEYS = {
  entity: (entityId: string) => ['custom-field-values', entityId] as const,
}

export function useCustomFieldValues(entityId: string | undefined, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: KEYS.entity(entityId ?? ''),
    queryFn:  () => api.get<Record<string, string | null>>(
      `/custom-field-values?entityId=${entityId}`
    ),
    enabled: opts?.enabled !== false && !!entityId,
  })
}

export function useSaveCustomFieldValues() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ entityId, values }: {
      entityId: string
      values:   { definitionId: string; value: string | null }[]
    }) => api.put<void>('/custom-field-values', { entityId, values }),
    onSuccess: (_data, { entityId }) => {
      qc.invalidateQueries({ queryKey: KEYS.entity(entityId) })
    },
  })
}
