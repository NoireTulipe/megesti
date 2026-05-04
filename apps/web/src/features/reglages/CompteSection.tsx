import { useState } from 'react'
import { useMonTenant, useUpdateMonTenant } from './hooks/useMonTenant'
import styles from './CompteSection.module.css'

const PLAN_LABELS: Record<string, string> = {
  TRIAL:        'Essai gratuit',
  AUTEUR:       'Auteur',
  EDITEUR:      'Éditeur',
  EDITEUR_PLUS: 'Éditeur + salon',
}

export function CompteSection() {
  const { data: tenant, isLoading } = useMonTenant()
  const updateTenant = useUpdateMonTenant()

  const [name, setName]           = useState('')
  const [presentation, setPres]   = useState('')
  const [logoUrl, setLogoUrl]     = useState('')
  const [nameSaved, setNameSaved] = useState(false)
  const [presSaved, setPresSaved] = useState(false)
  const [logoSaved, setLogoSaved] = useState(false)

  // Init depuis le tenant chargé
  const [initialized, setInitialized] = useState(false)
  if (tenant && !initialized) {
    setName(tenant.name)
    setPres(tenant.presentation ?? '')
    setLogoUrl(tenant.logo ?? '')
    setInitialized(true)
  }

  async function handleSaveName() {
    if (!name.trim()) return
    await updateTenant.mutateAsync({ name: name.trim() })
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2000)
  }

  async function handleSavePres() {
    await updateTenant.mutateAsync({ presentation })
    setPresSaved(true)
    setTimeout(() => setPresSaved(false), 2000)
  }

  async function handleSaveLogo() {
    await updateTenant.mutateAsync({ logo: logoUrl || null })
    setLogoSaved(true)
    setTimeout(() => setLogoSaved(false), 2000)
  }

  if (isLoading) return <div className={styles.loading}>Chargement…</div>
  if (!tenant) return null

  const hasLogo = tenant.logo || logoUrl

  return (
    <div className={styles.section}>

      {/* ── Logo ── */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Logo</h3>
        <p className={styles.cardDesc}>Apparaît dans l'application et sur les factures. Fournissez l'URL de votre logo.</p>
        <div className={styles.logoRow}>
          <div className={styles.logoPreview}>
            {hasLogo ? (
              <img src={tenant.logo || logoUrl} alt="Logo" className={styles.logoImg}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            ) : (
              <div className={styles.logoPlaceholder}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#C4907C" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
            )}
          </div>
        </div>
        <div className={styles.fieldRow} style={{ marginTop: 14 }}>
          <input
            className={styles.input}
            type="url"
            value={logoUrl}
            onChange={e => setLogoUrl(e.target.value)}
            placeholder="https://votre-site.fr/logo.png"
          />
          <button
            className={styles.btnSave}
            onClick={handleSaveLogo}
            disabled={updateTenant.isPending || logoUrl === (tenant.logo ?? '')}
          >
            {logoSaved ? '✓ Enregistré' : updateTenant.isPending ? '…' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {/* ── Nom ── */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Nom de la maison d'édition</h3>
        <p className={styles.cardDesc}>Affiché dans l'en-tête et sur les documents officiels.</p>
        <div className={styles.fieldRow}>
          <input
            className={styles.input}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSaveName()}
          />
          <button
            className={styles.btnSave}
            onClick={handleSaveName}
            disabled={updateTenant.isPending || !name.trim() || name === tenant.name}
          >
            {nameSaved ? '✓ Enregistré' : updateTenant.isPending ? '…' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {/* ── Présentation ── */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Présentation</h3>
        <p className={styles.cardDesc}>Une courte description de votre ligne éditoriale, visible sur votre future page publique.</p>
        <textarea
          className={styles.textarea}
          rows={4}
          value={presentation}
          onChange={e => setPres(e.target.value)}
          placeholder="Maison d'édition indépendante fondée en… Nous publions…"
        />
        <div className={styles.fieldRow}>
          <span />
          <button
            className={styles.btnSave}
            onClick={handleSavePres}
            disabled={updateTenant.isPending || presentation === (tenant.presentation ?? '')}
          >
            {presSaved ? '✓ Enregistré' : updateTenant.isPending ? '…' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {/* ── Abonnement ── */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Abonnement</h3>
        <div className={styles.planRow}>
          <span className={styles.planBadge}>
            {PLAN_LABELS[tenant.plan] ?? tenant.plan}
          </span>
          <span className={styles.planHint}>
            {tenant.plan === 'TRIAL'
              ? 'Passez à la formule Éditeur pour débloquer toutes les fonctionnalités.'
              : 'Gérez votre abonnement depuis les paramètres Stripe (bientôt disponible).'}
          </span>
        </div>
      </div>

      {/* ── Accès auteurs ── */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Accès auteurs</h3>
        <p className={styles.cardDesc}>
          Donnez à vos auteurs l'accès à l'application mobile salon pour enregistrer leurs ventes.
          Disponible avec la formule <strong>Éditeur + salon</strong>.
        </p>
        <div className={styles.comingSoon}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>Bientôt disponible — vos auteurs pourront se connecter à l'app mobile avec un accès restreint.</span>
        </div>
      </div>

    </div>
  )
}
