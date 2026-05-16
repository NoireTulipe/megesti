import { Config } from '@/constants/Config'
import { useDevStore } from '@/store/devStore'

function devLog(level: 'info' | 'warn' | 'error', msg: string) {
  try { useDevStore.getState().addLog(level, msg) } catch {}
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

let _getToken: (() => string | null) | null = null

export function setTokenGetter(fn: () => string | null) {
  _getToken = fn
}

export function getToken(): string | null {
  return _getToken?.() ?? null
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const hasBody = options.body != null

  const res = await fetch(`${Config.apiBaseUrl}${path}`, {
    ...options,
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }))
    throw new ApiError(res.status, body.message ?? 'Erreur serveur')
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

async function uploadFile<T>(path: string, formData: FormData): Promise<T> {
  const token = getToken()
  const url = `${Config.apiBaseUrl}${path}`
  devLog('info', `[api.upload] URL: ${url} — token=${token ? 'présent' : 'ABSENT'}`)

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    })
  } catch (e: any) {
    devLog('error', `[api.upload] fetch NETWORK ERROR: ${e?.message}`)
    throw e
  }

  devLog('info', `[api.upload] Statut HTTP: ${res.status} ${res.statusText}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }))
    devLog('error', `[api.upload] Erreur serveur — ${res.status}: ${JSON.stringify(body)}`)
    throw new ApiError(res.status, body.message ?? 'Erreur serveur')
  }
  const data = await res.json()
  devLog('info', `[api.upload] Réponse: ${JSON.stringify(data)}`)
  return data
}

export const api = {
  get:    <T>(path: string) => request<T>(path),
  post:   <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch:  <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, formData: FormData) => uploadFile<T>(path, formData),
}
