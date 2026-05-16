import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import styles from './PdpConfigSection.module.css'

interface Identite {
  siret:        string | null
  adresseLigne1:string | null
  adresseLigne2:string | null
  codePostal:   string | null
  ville:        string | null
  pays:         string | null
  numeroTVA:    string | null
}

function useIdentite() {
  return useQuery({
    queryKey: ['facturation', 'identite'],
    queryFn:  () => api.get<Identite>('/facturation/identite'),
  })
}

function useSaveIdentite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Identite>) => api.patch('/facturation/identite', data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['facturation', 'identite'] }),
  })
}

export function PdpConfigSection() {
  const { data, isLoading } = useIdentite()
  const save = useSaveIdentite()

  const [form, setForm] = useState({
    siret: '', adresseLigne1: '', adresseLigne2: '',
    codePostal: '', ville: '', numeroTVA: '',
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (data) {
      setForm({
        siret:          data.siret          ?? '',
        adresseLigne1:  data.adresseLigne1  ?? '',
        adresseLigne2:  data.adresseLigne2  ?? '',
        codePostal:     data.codePostal     ?? '',
        ville:          data.ville          ?? '',
        numeroTVA:      data.numeroTVA      ?? '',
      })
    }
  }, [data])

  function set(key: keyof typeof form, val: string) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const payload: Partial<Identite> = {
      siret:         form.siret         || null,
      adresseLigne1: form.adresseLigne1 || null,
      adresseLigne2: form.adresseLigne2 || null,
      codePostal:    form.codePostal    || null,
      ville:         form.ville         || null,
      numeroTVA:     form.numeroTVA     || null,
    }
    await save.mutateAsync(payload)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (isLoading) return <p className={styles.loading}>Chargement…</p>

  return (
    <form className={styles.section} onSubmit={handleSave}>

      <div className={styles.intro}>
        <div className={styles.introIcon}>⚡</div>
        <div>
          <h3 className={styles.introTitle}>Facturation électronique</h3>
          <p className={styles.introDesc}>
            Ces informations apparaissent sur toutes vos factures.
            Le service de transmission est géré par MeGesti — vous n'avez rien d'autre à configurer.
          </p>
        </div>
      </div>

      <div className={styles.grid2}>
        <div className={styles.field}>
          <label className={styles.label}>SIRET <span className={styles.req}>*</span></label>
          <input className={styles.input} value={form.siret}
            onChange={e => set('siret', e.target.value)}
            placeholder="14 chiffres" maxLength={14} />
          <span className={styles.hint}>Identifiant légal de votre structure, obligatoire sur les factures.</span>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>N° TVA intracommunautaire</label>
          <input className={styles.input} value={form.numeroTVA}
            onChange={e => set('numeroTVA', e.target.value)}
            placeholder="FR12345678901" />
        </div>
        <div className={`${styles.field} ${styles.fieldFull}`}>
          <label className={styles.label}>Adresse</label>
          <input className={styles.input} value={form.adresseLigne1}
            onChange={e => set('adresseLigne1', e.target.value)}
            placeholder="12 rue des Éditeurs" />
        </div>
        <div className={`${styles.field} ${styles.fieldFull}`}>
          <label className={styles.label}>Complément d'adresse</label>
          <input className={styles.input} value={form.adresseLigne2}
            onChange={e => set('adresseLigne2', e.target.value)}
            placeholder="Bâtiment B, Boîte 3…" />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Code postal</label>
          <input className={styles.input} value={form.codePostal}
            onChange={e => set('codePostal', e.target.value)}
            placeholder="75001" maxLength={5} />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Ville</label>
          <input className={styles.input} value={form.ville}
            onChange={e => set('ville', e.target.value)}
            placeholder="Paris" />
        </div>
      </div>

      <div className={styles.actions}>
        {saved && <span className={styles.savedMsg}>✓ Enregistré</span>}
        <button type="submit" className={styles.btnSave} disabled={save.isPending}>
          {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  )
}
