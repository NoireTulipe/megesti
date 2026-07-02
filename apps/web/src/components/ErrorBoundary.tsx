import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/** Filet de sécurité global : un crash de rendu affiche un écran de secours au lieu d'une page blanche. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  override render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '1rem',
        color: 'var(--ink)', padding: '2rem', background: 'var(--cream)',
      }}>
        <h1 style={{ fontSize: '1.6rem' }}>Oups, quelque chose s'est cassé</h1>
        <p style={{ maxWidth: 480, textAlign: 'center', color: 'var(--text-mid)' }}>
          Une erreur inattendue s'est produite. Recharge la page pour reprendre —
          si le problème persiste, contacte le support.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '0.6rem 1.4rem', borderRadius: 'var(--radius-btn)', border: 'none',
            background: 'var(--rose)', color: '#fff', fontSize: '1rem', cursor: 'pointer',
            boxShadow: 'var(--shadow-rose)',
          }}
        >
          Recharger la page
        </button>
      </div>
    )
  }
}
