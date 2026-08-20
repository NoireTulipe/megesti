import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, messageErreurConnexion } from '@/lib/api'
import styles from './LoginPage.module.css'

/**
 * Demande de réinitialisation.
 *
 * L'API répond toujours 200, même pour une adresse inconnue — sinon la page
 * permettrait de découvrir quels comptes existent. On affiche donc le même
 * message de confirmation dans tous les cas.
 */
export function MotDePasseOubliePage() {
  const [email,   setEmail]   = useState('')
  const [envoye,  setEnvoye]  = useState(false)
  const [erreur,  setErreur]  = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErreur(null)
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setEnvoye(true)
    } catch (err: unknown) {
      setErreur(messageErreurConnexion(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.visual}>
        <img src="/img/logo-MeGesti.png" alt="Megesti" className={styles.visualLogo} />
        <h2 className={styles.visualTitle}>L'atelier<br />de l'éditeur</h2>
        <p className={styles.visualSub}>
          Un lien de réinitialisation,<br />et vous reprenez où vous en étiez.
        </p>
      </div>

      <div className={styles.panel}>
        <div className={styles.card}>
          <div className={styles.brandSmall}>
            <img src="/img/logo-MeGesti-sans-texte.png" alt="" className={styles.brandIconImg} />
            <span className={styles.brandName}>MeGesti</span>
          </div>

          {envoye ? (
            <>
              <h1 className={styles.title}>C'est envoyé.</h1>
              <p className={styles.subtitle}>
                Si un compte existe pour <strong>{email}</strong>, vous recevrez un lien de
                réinitialisation dans quelques instants. Il est valable une heure.
              </p>
              <p className={styles.subtitle}>
                Pensez à regarder vos indésirables si rien n'arrive.
              </p>
              <Link to="/login" className={styles.btn} style={{ textAlign: 'center', display: 'block' }}>
                ← Retour à la connexion
              </Link>
            </>
          ) : (
            <>
              <h1 className={styles.title}>Mot de passe oublié ?</h1>
              <p className={styles.subtitle}>
                Indiquez votre adresse, nous vous envoyons un lien pour en choisir un nouveau.
              </p>

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

                {erreur && <p className={styles.error}>{erreur}</p>}

                <button type="submit" className={styles.btn} disabled={loading}>
                  {loading ? 'Envoi…' : 'Recevoir le lien →'}
                </button>
              </form>

              <p className={styles.subtitle} style={{ marginTop: 18, textAlign: 'center' }}>
                <Link to="/login">← Revenir à la connexion</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
