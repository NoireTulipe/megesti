import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { api, isApiError } from '@/lib/api'
import { HelpButton } from '@/components/HelpButton'
import styles from './LoginPage.module.css'

const LONGUEUR_MINI = 8

/** Choix du nouveau mot de passe, depuis le lien reçu par e-mail. */
export function ReinitialiserMotDePassePage() {
  const [params]  = useSearchParams()
  const navigate  = useNavigate()
  const token     = params.get('token') ?? ''

  const [motDePasse,  setMotDePasse]  = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [erreur,  setErreur]  = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fait,    setFait]    = useState(false)

  const tropCourt = motDePasse.length > 0 && motDePasse.length < LONGUEUR_MINI
  const different = confirmation.length > 0 && motDePasse !== confirmation

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErreur(null)
    if (motDePasse.length < LONGUEUR_MINI) {
      setErreur(`Le mot de passe doit faire au moins ${LONGUEUR_MINI} caractères.`)
      return
    }
    if (motDePasse !== confirmation) {
      setErreur('Les deux mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, password: motDePasse })
      setFait(true)
      setTimeout(() => navigate('/login', { replace: true }), 2500)
    } catch (err: unknown) {
      // Le message de l'API est déjà explicite (« lien invalide ou expiré »).
      setErreur(isApiError(err) ? err.message : 'La réinitialisation a échoué. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.visual}>
        <img src="/img/logo-MeGesti.png" alt="Megesti" className={styles.visualLogo} />
        <h2 className={styles.visualTitle}>L'atelier<br />de l'éditeur</h2>
        <p className={styles.visualSub}>Choisissez votre nouveau mot de passe.</p>
      </div>

      <div className={styles.panel}>
        <div className={styles.card}>
          <div className={styles.brandSmall}>
            <img src="/img/logo-MeGesti-sans-texte.png" alt="" className={styles.brandIconImg} />
            <span className={styles.brandName}>MeGesti</span>
          </div>

          {!token ? (
            <>
              <h1 className={styles.title}>Lien incomplet</h1>
              <p className={styles.subtitle}>
                Ce lien ne contient pas de jeton de réinitialisation. Il a peut-être été
                tronqué par votre messagerie — recopiez-le en entier, ou demandez-en un nouveau.
              </p>
              <Link to="/mot-de-passe-oublie" className={styles.btn} style={{ textAlign: 'center', display: 'block' }}>
                Demander un nouveau lien
              </Link>
            </>
          ) : fait ? (
            <>
              <h1 className={styles.title}>C'est fait.</h1>
              <p className={styles.subtitle}>
                Votre mot de passe a été changé. Redirection vers la connexion…
              </p>
            </>
          ) : (
            <>
              <h1 className={styles.title}>
                Nouveau mot de passe
                <HelpButton slug="reinitialiser-mot-de-passe" size="sm" className={styles.aide} />
              </h1>
              <p className={styles.subtitle}>Au moins {LONGUEUR_MINI} caractères.</p>

              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="motDePasse">Nouveau mot de passe</label>
                  <input
                    id="motDePasse"
                    type="password"
                    className={styles.input}
                    value={motDePasse}
                    onChange={(e) => setMotDePasse(e.target.value)}
                    required
                    autoComplete="new-password"
                    autoFocus
                  />
                  {tropCourt && <p className={styles.error}>Encore {LONGUEUR_MINI - motDePasse.length} caractère(s).</p>}
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="confirmation">Confirmation</label>
                  <input
                    id="confirmation"
                    type="password"
                    className={styles.input}
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  {different && <p className={styles.error}>Les deux saisies diffèrent.</p>}
                </div>

                {erreur && <p className={styles.error}>{erreur}</p>}

                <button type="submit" className={styles.btn} disabled={loading || tropCourt || different}>
                  {loading ? 'Enregistrement…' : 'Changer mon mot de passe →'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
