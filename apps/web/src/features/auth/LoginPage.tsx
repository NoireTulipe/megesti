import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import styles from './LoginPage.module.css'
import { messageErreurConnexion } from '@/lib/api'

export function LoginPage() {
  const login    = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (e: unknown) {
      setError(messageErreurConnexion(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>

      {/* ── Panneau visuel gauche ── */}
      <div className={styles.visual}>
        <img src="/img/logo-MeGesti.png" alt="Megesti" className={styles.visualLogo} />
        <h2 className={styles.visualTitle}>
          L'atelier<br />de l'éditeur
        </h2>
        <p className={styles.visualSub}>
          Gérez votre catalogue, vos auteurs,<br />
          vos ventes et vos droits en un seul endroit.
        </p>
      </div>

      {/* ── Panneau formulaire droit ── */}
      <div className={styles.panel}>
        <div className={styles.card}>

          <div className={styles.brandSmall}>
            <img src="/img/logo-MeGesti-sans-texte.png" alt="Megesti" className={styles.brandIconImg} />
            <span className={styles.brandName}>MeGesti</span>
          </div>

          <h1 className={styles.title}>Bon retour.</h1>
          <p className={styles.subtitle}>Connectez-vous à votre espace éditorial</p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="email">Adresse email</label>
              <input
                id="email"
                type="email"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@maisondedition.fr"
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">Mot de passe</label>
              <input
                id="password"
                type="password"
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.btn} disabled={loading}>
              {loading ? 'Connexion…' : 'Accéder à mon espace →'}
            </button>

            <p className={styles.subtitle} style={{ marginTop: 14, textAlign: 'center' }}>
              <Link to="/mot-de-passe-oublie">Mot de passe oublié ?</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
