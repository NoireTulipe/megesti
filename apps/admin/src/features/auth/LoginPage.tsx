import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store'
import { apiFetch }     from '../../api'

export function LoginPage() {
  const navigate = useNavigate()
  const login    = useAuthStore(s => s.login)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await apiFetch<{ token: string; nom: string; email: string }>('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      login(data.token, data.nom, data.email)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
      <div className="card" style={{ width: 380 }}>
        <div className="card-body">
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Megesti <span style={{ color: 'var(--primary)' }}>Admin</span></div>
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>Accès réservé à l'équipe Megesti</div>
          </div>
          <form onSubmit={handleSubmit}>
            {error && <div className="error-msg">{error}</div>}
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>
            <div className="form-group">
              <label>Mot de passe</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
