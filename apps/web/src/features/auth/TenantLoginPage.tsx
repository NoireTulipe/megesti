import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import styles from './LoginPage.module.css'

interface TenantInfo {
  name: string
  slug: string
  logo: string | null
}

export function TenantLoginPage() {
  const { slug }   = useParams<{ slug: string }>()
  const login      = useAuthStore(s => s.login)
  const navigate   = useNavigate()

  const [tenant,   setTenant]   = useState<TenantInfo | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    if (!slug) return
    api.get<TenantInfo>(`/auth/tenant/${slug}`)
      .then(setTenant)
      .catch(() => setNotFound(true))
  }, [slug])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password, slug)
      navigate('/', { replace: true })
    } catch {
      setError('Email ou mot de passe incorrect.')
    } finally {
      setLoading(false)
    }
  }

  if (notFound) {
    return (
      <div className={styles.page}>
        <div className={styles.visual}>
          <img src="/img/logo-MeGesti.png" alt="Megesti" className={styles.visualLogo} />
        </div>
        <div className={styles.panel}>
          <div className={styles.card}>
            <div className={styles.brandSmall}>
              <img src="/img/logo-MeGesti-sans-texte.png" alt="Megesti" className={styles.brandIconImg} />
              <span className={styles.brandName}>MeGesti</span>
            </div>
            <h1 className={styles.title}>Espace introuvable.</h1>
            <p className={styles.subtitle}>
              L'espace <strong>{slug}</strong> n'existe pas ou n'est plus actif.
            </p>
            <button className={styles.btn} onClick={() => navigate('/login')}>
              Retour à la connexion
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>

      {/* ── Panneau visuel gauche ── */}
      <div className={styles.visual}>
        <img src="/img/logo-MeGesti.png" alt="Megesti" className={styles.visualLogo} />
        {tenant && (
          <>
            <h2 className={styles.visualTitle}>{tenant.name}</h2>
            <p className={styles.visualSub}>
              Bienvenue dans votre espace éditorial.
            </p>
          </>
        )}
        {!tenant && (
          <h2 className={styles.visualTitle}>Chargement…</h2>
        )}
      </div>

      {/* ── Panneau formulaire droit ── */}
      <div className={styles.panel}>
        <div className={styles.card}>

          <div className={styles.brandSmall}>
            <img src="/img/logo-MeGesti-sans-texte.png" alt="Megesti" className={styles.brandIconImg} />
            <span className={styles.brandName}>MeGesti</span>
          </div>

          {tenant ? (
            <>
              <h1 className={styles.title}>Bon retour.</h1>
              <p className={styles.subtitle}>
                Connectez-vous à l'espace <strong>{tenant.name}</strong>
              </p>
            </>
          ) : (
            <h1 className={styles.title}>Connexion…</h1>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="email">Adresse email</label>
              <input
                id="email"
                type="email"
                className={styles.input}
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@maisondedition.fr"
                required
                autoComplete="email"
                autoFocus
                disabled={!tenant}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">Mot de passe</label>
              <input
                id="password"
                type="password"
                className={styles.input}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                disabled={!tenant}
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.btn} disabled={loading || !tenant}>
              {loading ? 'Connexion…' : 'Accéder à mon espace →'}
            </button>
          </form>

          <p style={{ marginTop: 16, fontSize: 12, color: '#999', textAlign: 'center' }}>
            Pas votre espace ?{' '}
            <span
              style={{ color: '#666', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => navigate('/login')}>
              Connexion standard
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
