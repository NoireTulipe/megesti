import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { EntityType } from '@megesti/shared'

export interface CustomFieldDef {
  id:          string
  entityType:  EntityType | null
  rayonId:     string | null
  labelFr:     string
  labelEn:     string | null
  fieldType:   string
  position:    number
  required:    boolean
  category:    string | null
  halfWidth:   boolean
  placeholder: string | null
  validation:  { type: string; pattern?: string; message: string } | null
  thesaurusId: string | null
  options:     { value: string; label: { fr: string; en?: string } }[] | null
}

export interface CreateCustomFieldPayload {
  id:          string
  entityType?: EntityType | null
  rayonId?:    string | null
  label:       { fr: string; en?: string }
  fieldType:   string
  position:    number
  required:    boolean
  category:    string | null
  halfWidth?:  boolean
  placeholder?: string | null
  thesaurusId: string | null
  options:     { value: string; label: { fr: string; en?: string } }[] | null
}

export interface UpdateCustomFieldPayload {
  id:          string
  labelFr?:    string
  required?:   boolean
  category?:   string | null
  position?:   number
  halfWidth?:  boolean
  placeholder?: string | null
  validation?: { type: string; pattern?: string; message: string } | null
}

const KEYS = {
  all:      () => ['custom-fields'] as const,
  byEntity: (et: EntityType) => ['custom-fields', 'entity', et] as const,
  byRayon:  (id: string)     => ['custom-fields', 'rayon',  id] as const,
}

export function useCustomFields(entityType: EntityType, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: KEYS.byEntity(entityType),
    queryFn:  () => api.get<CustomFieldDef[]>(`/custom-fields?entityType=${entityType}`),
    enabled:  opts?.enabled !== false,
  })
}

export function useCustomFieldsByRayon(rayonId: string, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: KEYS.byRayon(rayonId),
    queryFn:  () => api.get<CustomFieldDef[]>(`/custom-fields?rayonId=${rayonId}`),
    enabled:  opts?.enabled !== false && !!rayonId,
  })
}

export function useCreateCustomField() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: CreateCustomFieldPayload) => api.post<CustomFieldDef>('/custom-fields', p),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useUpdateCustomField() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateCustomFieldPayload) =>
      api.patch<CustomFieldDef>(`/custom-fields/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useDeleteCustomField() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/custom-fields/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}
