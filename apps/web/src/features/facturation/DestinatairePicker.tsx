import { useRef, useState, useEffect } from 'react'
import { type EntrepriseResult } from '@megesti/shared'
import { useRechercheEntreprise } from './hooks/useRechercheEntreprise'
import styles from './FacturationPage.module.css'

export interface DestinataireFilled {
  nom:     string
  siret:   string
  adresse: string
}

interface Props extends DestinataireFilled {
  onChange: (v: DestinataireFilled) => void
}

export function DestinatairePicker({ nom, siret, adresse, onChange }: Props) {
  const [nomQuery, setNomQuery]         = useState(nom)
  const [showDropdown, setShowDropdown] = useState(false)
  const containerRef                    = useRef<HTMLDivElement>(null)
  const onChangeFn                      = useRef(onChange)
  const lastAutoFilledSiret             = useRef('')
  onChangeFn.current = onChange

  const siretClean      = siret.replace(/\D/g, '')
  const isSiretComplete = siretClean.length === 14
  const searchQuery     = isSiretComplete ? siretClean : nomQuery

  const { data: results = [], isFetching } = useRechercheEntreprise(searchQuery)

  // Auto-remplissage quand le SIRET à 14 chiffres revient un résultat
  useEffect(() => {
    if (isSiretComplete && results.length > 0 && lastAutoFilledSiret.current !== siretClean) {
      lastAutoFilledSiret.current = siretClean
      const r = results[0]
      onChangeFn.current({ nom: r.nom, siret: r.siret, adresse: r.adresse })
      setNomQuery(r.nom)
    }
  }, [isSiretComplete, siretClean, results])

  // Fermeture du dropdown au clic extérieur
  useEffect(() => {
    function close(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  function handleSelect(r: EntrepriseResult) {
    onChangeFn.current({ nom: r.nom, siret: r.siret, adresse: r.adresse })
    setNomQuery(r.nom)
    setShowDropdown(false)
  }

  return (
    <div ref={containerRef}>
      <div className={styles.destGrid}>

        {/* Raison sociale */}
        <div className={styles.destField} style={{ position: 'relative' }}>
          <label className={styles.destLabel}>Raison sociale</label>
          <input
            className={styles.destInput}
            value={nomQuery}
            onChange={e => {
              setNomQuery(e.target.value)
              onChange({ nom: e.target.value, siret, adresse })
              setShowDropdown(true)
            }}
            onFocus={() => { if (results.length > 0) setShowDropdown(true) }}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            placeholder="Société destinataire"
            required
          />
          {showDropdown && !isSiretComplete && nomQuery.length >= 3 && (
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
            {isSiretComplete && <span className={styles.siretOk}>✓</span>}
          </label>
          <input
            className={styles.destInput}
            value={siret}
            onChange={e => {
              lastAutoFilledSiret.current = ''  // reset pour permettre un nouvel auto-fill
              onChange({ nom, siret: e.target.value, adresse })
            }}
            placeholder="14 chiffres"
            maxLength={14}
          />
        </div>

        {/* Adresse — apparaît après sélection */}
        {adresse && (
          <div className={`${styles.destField} ${styles.destAdresseRow}`}>
            <label className={styles.destLabel}>Adresse</label>
            <input
              className={styles.destInput}
              value={adresse}
              onChange={e => onChange({ nom, siret, adresse: e.target.value })}
              placeholder="Adresse du destinataire"
            />
          </div>
        )}

      </div>
    </div>
  )
}
