import { generateUUID } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useCreateMouvement, type TypeMouvement } from './hooks/useMouvementsStock'
import type { Article } from '@/features/catalogue/types'
import styles from './AjustementStock.module.css'

type Mode = '=' | '+' | '-'

interface MotifSortie {
  type:    TypeMouvement
  label:   string
  emoji:   string
  frais:   boolean
  desc:    string
}

const MOTIFS_SORTIE: MotifSortie[] = [
  { type: 'SORTIE_DON',         label: 'Don',           emoji: '🎁', frais: true,  desc: 'Livres offerts (déductible)' },
  { type: 'SORTIE_PERTE',       label: 'Perte',         emoji: '📦', frais: true,  desc: 'Livres perdus ou égarés' },
  { type: 'SORTIE_VOL',         label: 'Vol',           emoji: '🚨', frais: true,  desc: 'Livres dérobés' },
  { type: 'SORTIE_DEGRADATION', label: 'Dégradation',   emoji: '💧', frais: true,  desc: 'Livres endommagés' },
]

interface Props {
  article: Article
  onClose: () => void
}

export function AjustementStock({ article, onClose }: Props) {
  const [mode,       setMode]       = useState<Mode>('=')
  const [quantite,   setQuantite]   = useState<number>(0)
  const [motifType,  setMotifType]  = useState<MotifSortie>(MOTIFS_SORTIE[0])
  const [noteLibre,  setNoteLibre]  = useState('')
  const [montantHT,  setMontantHT]  = useState<string>('')
  const create = useCreateMouvement()

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const stockActuel = article.stock

  const stockApres = (() => {
    if (mode === '=') return quantite
    if (mode === '+') return stockActuel + quantite
    return Math.max(0, stockActuel - quantite)
  })()

  const delta = stockApres - stockActuel

  const canSave = (() => {
    if (mode === '=') return quantite >= 0
    if (mode === '+') return quantite > 0
    return quantite > 0 && quantite <= stockActuel
  })()

  async function handleSave() {
    if (!canSave) return

    const isSortie = mode === '-'
    const motifFinal = noteLibre || (isSortie ? motifType.label : undefined)

    await create.mutateAsync({
      id:          generateUUID(),
      articleId:   article.id,
      type:        mode === '=' ? 'AJUSTEMENT' : mode === '+' ? 'ENTREE' : motifType.type,
      quantite:    isSortie ? quantite : undefined,
      stockCible:  mode !== '-' ? stockApres : undefined,
      motif:       motifFinal,
      montantHT:   montantHT ? parseFloat(montantHT.replace(',', '.')) : undefined,
      creeFrais:   isSortie && motifType.frais,
    })

    onClose()
  }

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
      {/* En-tête */}
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h3 className={styles.title}>Ajustement de stock</h3>
          <p className={styles.subtitle}>{article.nom}</p>
        </div>
        <button className={styles.closeBtn} onClick={onClose}><X size={15} /></button>
      </div>

      {/* Stock actuel */}
      <div className={styles.stockActuel}>
        <span className={styles.stockLabel}>Stock actuel</span>
        <span className={styles.stockVal}>{stockActuel}</span>
      </div>

      {/* Sélecteur de mode */}
      <div className={styles.modeRow}>
        {([
          { m: '-' as Mode, emoji: '−', label: 'Sortie',    color: '#ef4444' },
          { m: '=' as Mode, emoji: '=', label: 'Affecter',  color: '#3D5470' },
          { m: '+' as Mode, emoji: '+', label: 'Entrée',    color: '#6B8F71' },
        ] as { m: Mode; emoji: string; label: string; color: string }[]).map(({ m, emoji, label, color }) => (
          <button
            key={m}
            className={`${styles.modeBtn} ${mode === m ? styles.modeBtnActive : ''}`}
            style={mode === m ? { borderColor: color, background: `${color}18`, color } : {}}
            onClick={() => { setMode(m); setQuantite(0) }}
          >
            <span className={styles.modeEmoji}>{emoji}</span>
            <span className={styles.modeLabel}>{label}</span>
          </button>
        ))}
      </div>

      {/* Saisie de quantité */}
      <div className={styles.qteSection}>
        <label className={styles.qteLabel}>
          {mode === '=' ? 'Nouvelle valeur de stock' : mode === '+' ? 'Quantité à ajouter' : 'Quantité à retirer'}
        </label>
        <div className={styles.qteRow}>
          <button className={styles.qteBtn} onClick={() => setQuantite(q => Math.max(0, q - 1))}>•^'</button>
          <input
            className={styles.qteInput}
            type="number"
            min={0}
            max={mode === '-' ? stockActuel : undefined}
            value={quantite}
            onChange={e => setQuantite(Math.max(0, parseInt(e.target.value) || 0))}
            autoFocus
          />
          <button className={styles.qteBtn} onClick={() => setQuantite(q => q + 1)}>+</button>
        </div>
      </div>

      {/* Si sortie : motif */}
      {mode === '-' && (
        <div className={styles.motifSection}>
          <p className={styles.motifTitle}>Raison de la sortie</p>
          <div className={styles.motifGrid}>
            {MOTIFS_SORTIE.map(m => (
              <button
                key={m.type}
                className={`${styles.motifCard} ${motifType.type === m.type ? styles.motifCardActive : ''}`}
                onClick={() => setMotifType(m)}
              >
                <span className={styles.motifEmoji}>{m.emoji}</span>
                <span className={styles.motifLabel}>{m.label}</span>
                <span className={styles.motifDesc}>{m.desc}</span>
              </button>
            ))}
          </div>

          {motifType.frais && (
            <div className={styles.fraisNotice}>
              <span>•Y'•</span>
              <div>
                <p className={styles.fraisNoticeTitle}>Cette sortie sera enregistrée dans les frais</p>
                <div className={styles.fraisNoticeRow}>
                  <label className={styles.fraisNoticeLabel}>Valeur HT (optionnel)</label>
                  <div className={styles.fraisNoticeInput}>
                    <input
                      className={styles.montantInput}
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={montantHT}
                      onChange={e => setMontantHT(e.target.value)}
                    />
                    <span className={styles.montantUnit}>€</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Note libre */}
      <div className={styles.noteSection}>
        <label className={styles.noteLabel}>Note (optionnel)</label>
        <input
          className={styles.noteInput}
          type="text"
          placeholder="Observation, référence de livraison…"
          value={noteLibre}
          onChange={e => setNoteLibre(e.target.value)}
        />
      </div>

      {/* Prévisualisation */}
      {quantite > 0 || mode === '=' ? (
        <div className={styles.preview}>
          <div className={styles.previewRow}>
            <span className={styles.previewLabel}>Stock actuel</span>
            <span className={styles.previewStock}>{stockActuel}</span>
          </div>
          <div className={styles.previewArrow}>—</div>
          <div className={styles.previewRow}>
            <span className={styles.previewLabel}>Stock après</span>
            <span
              className={styles.previewStock}
              style={{ color: delta < 0 ? '#ef4444' : delta > 0 ? '#6B8F71' : 'var(--ink)' }}
            >
              {stockApres}
              {delta !== 0 && (
                <span className={styles.previewDelta}>{delta > 0 ? `+${delta}` : delta}</span>
              )}
            </span>
          </div>
        </div>
      ) : null}

      {/* Actions */}
      <div className={styles.actions}>
        <button className={styles.btnSecondary} onClick={onClose}>Annuler</button>
        <button
          className={styles.btnPrimary}
          onClick={handleSave}
          disabled={!canSave || create.isPending}
        >
          {create.isPending ? 'Enregistrement…' : 'Valider l\'ajustement'}
        </button>
      </div>
      </div>
    </div>,
    document.body
  )
}




