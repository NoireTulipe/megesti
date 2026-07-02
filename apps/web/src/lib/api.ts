const BASE = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3001/api'

/** Résout une URL d'image (relative → absolue via le serveur API, absolue → telle quelle) */
export function getImageUrl(imageUrl: string | null): string | null {
  if (!imageUrl) return null
  if (imageUrl.startsWith('http')) return imageUrl
  // Les chemins /api/uploads/* sont déjà relatifs à la racine du serveur
  // On préfixe avec l'origine (hôte + port) extraite de VITE_API_URL
  const origin = BASE.replace(/\/api.*$/, '')
  return `${origin}${imageUrl}`
}

function getToken(): string | null {
  return localStorage.getItem('megesti_token')
}

export function setToken(token: string): void {
  localStorage.setItem('megesti_token', token)
}

export function clearToken(): void {
  localStorage.removeItem('megesti_token')
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const hasBody = init.body !== undefined
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })

  if (!res.ok) {
    handleUnauthorized(res.status, path)
    const body = await res.json().catch(() => ({ message: res.statusText }))
    throw new ApiError(res.status, body.message ?? res.statusText)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

/** Token invalide/expiré en cours de session : purge + retour au login (sauf sur les pages de connexion). */
function handleUnauthorized(status: number, path: string): void {
  if (status !== 401 || path.startsWith('/auth/login')) return
  clearToken()
  const { pathname } = window.location
  if (!pathname.startsWith('/login') && !pathname.startsWith('/t/')) {
    window.location.assign('/login')
  }
}

export const api = {
  get:    <T>(path: string)                      => request<T>(path),
  post:   <T>(path: string, body: unknown)       => request<T>(path, { method: 'POST',  body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown)       => request<T>(path, { method: 'PUT',   body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown)       => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string)                      => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, formData: FormData): Promise<T> => {
    const token = getToken()
    return fetch(`${BASE}${path}`, {
      method:  'POST',
      body:    formData,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then(async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText }))
        throw new ApiError(res.status, body.message ?? res.statusText)
      }
      return res.json() as Promise<T>
    })
  },
}
