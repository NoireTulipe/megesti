import { useState, useEffect } from 'react'
import { usePdpConfig, useSavePdpConfig } from './hooks/useFacturation'
import styles from './PdpConfigSection.module.css'

export function PdpConfigSection() {
  const { data: cfg, isLoading } = usePdpConfig()
  const save = useSavePdpConfig()

  const [form, setForm] = useState({
    siret: '', adresseLigne1: '', adresseLigne2: '',
    codePostal: '', ville: '', numeroTVA: '',
    pdpClientId: '', pdpClientSecret: '',
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (cfg) {
      setForm({
        siret:          cfg.siret          ?? '',
        adresseLigne1:  cfg.adresseLigne1  ?? '',
        adresseLigne2:  cfg.adresseLigne2  ?? '',
        codePostal:     cfg.codePostal     ?? '',
        ville:          cfg.ville          ?? '',
        numeroTVA:      cfg.numeroTVA      ?? '',
        pdpClientId:    cfg.pdpClientId    ?? '',
        pdpClientSecret:'',  // jamais retourné par l'API
      })
    }
  }, [cfg])

  function set(key: keyof typeof form, val: string) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const payload: Record<string, string | null> = {
      siret:         form.siret         || null,
      adresseLigne1: form.adresseLigne1 || null,
      adresseLigne2: form.adresseLigne2 || null,
      codePostal:    form.codePostal    || null,
      ville:         form.ville         || null,
      numeroTVA:     form.numeroTVA     || null,
      pdpClientId:   form.pdpClientId   || null,
    }
    if (form.pdpClientSecret) payload.pdpClientSecret = form.pdpClientSecret
    await save.mutateAsync(payload)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (isLoading) return <p className={styles.loading}>Chargement…</p>

  return (
    <form className={styles.section} onSubmit={handleSave}>

      {/* Identité légale */}
      <div className={styles.group}>
        <h3 className={styles.groupTitle}>Identité légale de votre structure</h3>
        <p className={styles.groupDesc}>
          Ces informations apparaissent sur toutes vos factures électroniques.
        </p>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.label}>SIRET</label>
            <input className={styles.input} value={form.siret} onChange={e => set('siret', e.target.value)}
              placeholder="12345678900014" maxLength={14} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>N° TVA intracommunautaire</label>
            <input className={styles.input} value={form.numeroTVA} onChange={e => set('numeroTVA', e.target.value)}
              placeholder="FR12345678901" />
          </div>
          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label className={styles.label}>Adresse (ligne 1)</label>
            <input className={styles.input} value={form.adresseLigne1} onChange={e => set('adresseLigne1', e.target.value)}
              placeholder="12 rue des Lilas" />
          </div>
          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label className={styles.label}>Adresse (ligne 2)</label>
            <input className={styles.input} value={form.adresseLigne2} onChange={e => set('adresseLigne2', e.target.value)}
              placeholder="Bâtiment B — Boîte 3" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Code postal</label>
            <input className={styles.input} value={form.codePostal} onChange={e => set('codePostal', e.target.value)}
              placeholder="75001" maxLength={5} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Ville</label>
            <input className={styles.input} value={form.ville} onChange={e => set('ville', e.target.value)}
              placeholder="Paris" />
          </div>
        </div>
      </div>

      {/* Identifiants superpdp */}
      <div className={styles.group}>
        <h3 className={styles.groupTitle}>Connexion superpdp.tech</h3>
        <p className={styles.groupDesc}>
          Créez une application sur{' '}
          <a href="https://www.superpdp.tech" target="_blank" rel="noopener noreferrer" className={styles.link}>
            superpdp.tech
          </a>{' '}
          et renseignez les identifiants OAuth2 de votre entreprise. Le client_secret ne s'affiche
          qu'une seule fois sur superpdp — conservez-le précieusement.
        </p>

        {cfg?.pdpConfigured && (
          <div className={styles.configuredBadge}>
            Connexion superpdp configurée — les factures peuvent être émises
          </div>
        )}

        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.label}>Client ID</label>
            <input className={styles.input} value={form.pdpClientId}
              onChange={e => set('pdpClientId', e.target.value)}
              placeholder="cli_xxxxxxxxxxxxxxxx"
              autoComplete="off" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Client Secret</label>
            <input className={styles.input} type="password" value={form.pdpClientSecret}
              onChange={e => set('pdpClientSecret', e.target.value)}
              placeholder={cfg?.pdpConfigured ? '••••••••••••••••••••••••' : 'Renseigner le secret'}
              autoComplete="new-password" />
            <span className={styles.hint}>
              {cfg?.pdpConfigured
                ? 'Laissez vide pour conserver le secret actuel.'
                : 'Saisissez le secret une seule fois au moment de la configuration.'}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        {saved && <span className={styles.savedMsg}>Enregistré ✓</span>}
        <button type="submit" className={styles.btnSave} disabled={save.isPending}>
          {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  )
}
