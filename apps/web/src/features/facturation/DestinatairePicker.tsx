import { useRef, useState, useEffect } from 'react'
import { type EntrepriseResult } from '@megesti/shared'
import { useRechercheEntreprise } from './hooks/useRechercheEntreprise'
import styles from './FacturationPage.module.css'

export interface DestinataireFilled {
  nom:     string
  siret:   string
  adresse: string
}

interface Props {
  onChange: (v: DestinataireFilled) => void
}

export function DestinatairePicker({ onChange }: Props) {
  const [nomInput,      setNomInput]      = useState('')
  const [siretInput,    setSiretInput]    = useState('')
  const [selected,      setSelected]      = useState<EntrepriseResult | null>(null)
  const [showDropdown,  setShowDropdown]  = useState(false)
  const containerRef  = useRef<HTMLDivElement>(null)
  const onChangeFn    = useRef(onChange)
  const lastAutoSiret = useRef('')
  onChangeFn.current  = onChange

  const siretClean      = siretInput.replace(/\D/g, '')
  const isSiretComplete = siretClean.length === 14
  const searchQuery     = isSiretComplete ? siretClean : nomInput

  const { data: results = [], isFetching } = useRechercheEntreprise(searchQuery)

  // Auto-sélection quand SIRET complet et résultat reçu
  useEffect(() => {
    if (!isSiretComplete) return
    const r = results[0]
    if (!r) return
    // siret retourné par l'API peut être vide → on garde ce que l'utilisateur a saisi
    const siret = r.siret || siretClean
    if (lastAutoSiret.current === siret) return
    lastAutoSiret.current = siret
    const filled = { nom: r.nom, siret, adresse: r.adresse }
    setSelected({ ...r, siret })
    setSiretInput(siret)
    onChangeFn.current(filled)
  }, [isSiretComplete, siretClean, results])

  // Fermeture dropdown au clic extérieur
  useEffect(() => {
    function close(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  function handleSelect(r: EntrepriseResult) {
    const siret = r.siret || r.siren
    lastAutoSiret.current = siret   // empêche le useEffect SIRET d'écraser ce choix
    const filled = { nom: r.nom, siret, adresse: r.adresse }
    setSelected({ ...r, siret })
    setSiretInput(siret)
    setNomInput(r.nom)
    setShowDropdown(false)
    onChangeFn.current(filled)
  }

  function handleReset() {
    setSelected(null)
    setSiretInput('')
    setNomInput('')
    lastAutoSiret.current = ''
    onChangeFn.current({ nom: '', siret: '', adresse: '' })
  }

  // ── Mode carte : société confirmée ────────────────────────────────────────────
  if (selected) {
    const localite = [selected.codePostal, selected.ville].filter(Boolean).join(' ')
    return (
      <div className={styles.destCard}>
        <div className={styles.destCardIcon}>✓</div>
        <div className={styles.destCardInfo}>
          <p className={styles.destCardNom}>{selected.nom}</p>
          <div className={styles.destCardRow}>
            {selected.formeJuridique && (
              <span className={styles.destCardTag}>{selected.formeJuridique}</span>
            )}
            <span className={styles.destCardMeta}>SIRET {selected.siret || selected.siren}</span>
          </div>
          {selected.adresse && (
            <span className={styles.destCardMeta}>
              {selected.adresse}{localite && !selected.adresse.includes(localite) ? `, ${localite}` : ''}
            </span>
          )}
          {selected.libelleActivite && (
            <span className={styles.destCardActivite}>{selected.libelleActivite}</span>
          )}
        </div>
        <button type="button" className={styles.destCardModify} onClick={handleReset}>
          Modifier
        </button>
      </div>
    )
  }

  // ── Mode recherche ─────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef}>
      <div className={styles.destGrid}>

        {/* Raison sociale */}
        <div className={styles.destField} style={{ position: 'relative' }}>
          <label className={styles.destLabel}>Raison sociale</label>
          <input
            className={styles.destInput}
            value={nomInput}
            onChange={e => {
              setNomInput(e.target.value)
              onChangeFn.current({ nom: e.target.value, siret: siretInput, adresse: '' })
              setShowDropdown(true)
            }}
            onFocus={() => { if (results.length > 0) setShowDropdown(true) }}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            placeholder="Société destinataire"
          />
          {showDropdown && !isSiretComplete && nomInput.length >= 3 && (
            <div className={styles.autocompleteDropdown}>
              {isFetching && (
                <div className={styles.autocompleteLoading}>Recherche…</div>
              )}
              {!isFetching && results.length === 0 && (
                <div className={styles.autocompleteEmpty}>Aucun résultat</div>
              )}
              {results.map(r => (
                <button
                  key={r.siret || r.siren}
                  type="button"
                  className={styles.autocompleteItem}
                  onMouseDown={() => handleSelect(r)}
                >
                  <div className={styles.autocompleteItemNom}>{r.nom}</div>
                  <div className={styles.autocompleteItemSub}>{r.siret} · {r.adresse}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* SIRET */}
        <div className={styles.destField}>
          <label className={styles.destLabel}>
            SIRET
            {isSiretComplete && !isFetching && <span className={styles.siretOk}> ✓</span>}
            {isSiretComplete && isFetching  && <span className={styles.siretLoading}> …</span>}
          </label>
          <input
            className={styles.destInput}
            value={siretInput}
            onChange={e => {
              lastAutoSiret.current = ''
              setSiretInput(e.target.value)
              onChangeFn.current({ nom: nomInput, siret: e.target.value, adresse: '' })
            }}
            placeholder="14 chiffres"
            maxLength={14}
          />
        </div>

      </div>
    </div>
  )
}
