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
        fontFamily: 'system-ui, sans-serif', color: '#3D5470', padding: '2rem',
      }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Oups, quelque chose s'est cassé</h1>
        <p style={{ maxWidth: 480, textAlign: 'center', color: '#6b7280' }}>
          Une erreur inattendue s'est produite. Recharge la page pour reprendre —
          si le problème persiste, contacte le support.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '0.6rem 1.4rem', borderRadius: 8, border: 'none',
            background: '#C4907C', color: '#fff', fontSize: '1rem', cursor: 'pointer',
          }}
        >
          Recharger la page
        </button>
      </div>
    )
  }
}
