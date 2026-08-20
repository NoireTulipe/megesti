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

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Garde de type : évite de comparer des chaînes de message côté appelant. */
export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError
}

/**
 * Message d'erreur de connexion adapté au vrai motif d'échec.
 * Avant, tout échec affichait « mot de passe incorrect » — y compris un
 * blocage anti-force-brute (429), ce qui poussait l'utilisateur à s'acharner
 * avec des identifiants pourtant corrects.
 */
export function messageErreurConnexion(e: unknown): string {
  if (isApiError(e)) {
    if (e.status === 429) return 'Trop de tentatives. Patientez une minute avant de réessayer.'
    if (e.status === 403) return e.message
    if (e.status === 401) return 'Email ou mot de passe incorrect.'
    if (e.status >= 500)  return 'Le service est momentanément indisponible. Réessayez dans un instant.'
    return e.message
  }
  return 'Connexion impossible. Vérifiez votre connexion internet.'
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

/**
 * Pages accessibles sans être connecté. Un 401 survenu depuis l'une d'elles ne
 * doit jamais provoquer de redirection : cela éjecterait l'utilisateur en plein
 * parcours de réinitialisation de mot de passe.
 */
const PAGES_PUBLIQUES = ['/login', '/t/', '/mot-de-passe-oublie', '/reinitialiser-mot-de-passe']

/** Token invalide/expiré en cours de session : purge + retour au login. */
function handleUnauthorized(status: number, path: string): void {
  if (status !== 401 || path.startsWith('/auth/login')) return
  // Un jeton périmé est purgé dans tous les cas…
  clearToken()
  // …mais on ne redirige que depuis une page protégée.
  const { pathname } = window.location
  if (PAGES_PUBLIQUES.some((p) => pathname.startsWith(p))) return
  window.location.assign('/login')
}

export const api = {
  get:    <T>(path: string)                      => request<T>(path),
  post:   <T>(path: string, body: unknown)       => request<T>(path, { method: 'POST',  body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown)       => request<T>(path, { method: 'PUT',   body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown)       => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  // T par défaut : les routes DELETE répondent 204, request() renvoie undefined.
  delete: <T = undefined>(path: string)          => request<T>(path, { method: 'DELETE' }),
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
