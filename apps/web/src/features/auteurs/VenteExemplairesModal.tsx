import { useState, useEffect } from 'react'
import { Overlay } from '@/components/ui/Overlay'
import { useCreateVenteExemplaire } from './hooks/useExemplairesAuteur'
import type { ContratAuteur } from './hooks/useContratsAuteur'
import type { Auteur } from './hooks/useAuteurs'
import { useFranchiseTVA } from '@/hooks/useFranchiseTVA'
import sty from './AuteursPage.module.css'
import formSty from './AuteurForm.module.css'

const MODE_PAIEMENT_LABELS: Record<string, string> = {
  VIREMENT: 'Virement',
  CHEQUE:   'Chèque',
  ESPECES:  'Espèces',
  CB:       'Carte bancaire',
  SUMUP:    'SumUp',
}

interface ArticleItem {
  article: {
    id:            string
    nom:           string
    prixVenteHT:   string | number
    stock:         number
  }
}

function getPrixAuteur(articleId: string, contrats: ContratAuteur[]): number | null {
  const specific = contrats.find((c) => c.articleId === articleId && c.prixAuteurHT)
  if (specific?.prixAuteurHT) return Number(specific.prixAuteurHT)
  const global = contrats.find((c) => !c.articleId && c.prixAuteurHT)
  if (global?.prixAuteurHT) return Number(global.prixAuteurHT)
  return null
}

interface SelectionRow {
  quantite: number
  prixHT:   string   // éditable par l'utilisateur
}

interface Props {
  auteur:   Auteur
  articles: ArticleItem[]
  contrats: ContratAuteur[]
  isOpen:   boolean
  onClose:  () => void
}

export function VenteExemplairesModal({ auteur, articles, contrats, isOpen, onClose }: Props) {
  const franchiseTVA = useFranchiseTVA()
  const createVente = useCreateVenteExemplaire()

  const [selections, setSelections] = useState<Record<string, SelectionRow>>({})
  const [modePaiement, setModePaiement] = useState<'CB' | 'ESPECES' | 'CHEQUE' | 'VIREMENT' | 'SUMUP'>('VIREMENT')
  const [error, setError] = useState<string | null>(null)

  // Initialise les prix à chaque ouverture
  useEffect(() => {
    if (!isOpen) return
    const init: Record<string, SelectionRow> = {}
    for (const { article } of articles) {
      const px = getPrixAuteur(article.id, contrats)
      init[article.id] = { quantite: 0, prixHT: px !== null ? String(px) : '' }
    }
    setSelections(init)
    setError(null)
  }, [isOpen, articles, contrats])

  if (!isOpen) return null

  const nomAffiche = auteur.pseudonyme ?? `${auteur.prenom} ${auteur.nom}`

  const lignesActives = Object.entries(selections).filter(([, row]) => row.quantite > 0)

  const totalHT = lignesActives.reduce((sum, [, row]) => {
    return sum + row.quantite * (parseFloat(row.prixHT) || 0)
  }, 0)

  const hasSelections = lignesActives.length > 0
  const hasMissingPrix = lignesActives.some(([, row]) => !row.prixHT || parseFloat(row.prixHT) <= 0)

  function setQty(articleId: string, delta: number) {
    setSelections((prev) => {
      const row = prev[articleId]
      const newQty = Math.max(0, (row?.quantite ?? 0) + delta)
      return { ...prev, [articleId]: { ...row, quantite: newQty } }
    })
  }

  function setPrix(articleId: string, val: string) {
    setSelections((prev) => ({ ...prev, [articleId]: { ...prev[articleId], prixHT: val } }))
  }

  async function handleSubmit() {
    setError(null)
    if (!hasSelections)    return
    if (hasMissingPrix) { setError('Renseigne un prix HT valide pour chaque article sélectionné.'); return }

    const lignes = lignesActives.map(([articleId, row]) => ({
      articleId,
      quantite:       row.quantite,
      prixUnitaireHT: parseFloat(row.prixHT),
    }))

    try {
      await createVente.mutateAsync({
        auteurId: auteur.id,
        modePaiement,
        lignes,
      })
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l\'enregistrement')
    }
  }

  return (
    <Overlay className={sty.backdrop} onClose={onClose}>
      <div
        className={sty.modal}
        style={{ width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column' }}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <button className={sty['modal-close']} onClick={onClose} aria-label="Fermer">✕</button>

        {/* Header */}
        <div style={{ padding: '28px 28px 20px', borderBottom: '1px solid var(--cream-dark)' }}>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: '1.15rem', color: 'var(--ink)', marginBottom: 4 }}>
            Vente d'exemplaires
          </div>
          <div style={{ fontSize: '0.83rem', color: 'var(--text-soft)' }}>
            à {nomAffiche}
          </div>
        </div>

        {/* Corps */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>

          {articles.length === 0 ? (
            <p style={{ color: 'var(--text-soft)', fontStyle: 'italic', fontSize: '0.85rem' }}>
              Aucun livre associé à cet auteur.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ fontSize: '0.7rem', color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <th style={{ textAlign: 'left',  paddingBottom: 10, fontWeight: 700 }}>Livre</th>
                  <th style={{ textAlign: 'center', paddingBottom: 10, fontWeight: 700, width: 100 }}>Qté</th>
                  <th style={{ textAlign: 'right',  paddingBottom: 10, fontWeight: 700, width: 110 }}>{franchiseTVA ? 'Prix' : 'Prix HT'}</th>
                </tr>
              </thead>
              <tbody>
                {articles.map(({ article }) => {
                  const row = selections[article.id] ?? { quantite: 0, prixHT: '' }
                  const hasPrixContrat = getPrixAuteur(article.id, contrats) !== null
                  const isSelected = row.quantite > 0
                  return (
                    <tr
                      key={article.id}
                      style={{
                        borderTop: '1px solid var(--cream-dark)',
                        background: isSelected ? 'var(--ink-faint)' : 'transparent',
                        transition: 'background 0.12s',
                      }}
                    >
                      <td style={{ padding: '10px 8px 10px 0' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink)' }}>{article.nom}</div>
                        {!hasPrixContrat && (
                          <div style={{ fontSize: '0.7rem', color: '#B45309', marginTop: 2 }}>
                            Prix non fixé au contrat
                          </div>
                        )}
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-soft)', marginTop: 1 }}>
                          Stock : {article.stock}
                        </div>
                      </td>
                      <td style={{ padding: '10px 4px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <button
                            type="button"
                            onClick={() => setQty(article.id, -1)}
                            style={btnSmallStyle}
                          >−</button>
                          <span style={{ minWidth: 22, textAlign: 'center', fontSize: '0.88rem', fontWeight: 600 }}>
                            {row.quantite}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQty(article.id, +1)}
                            style={btnSmallStyle}
                          >+</button>
                        </div>
                      </td>
                      <td style={{ padding: '10px 0 10px 4px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={row.prixHT}
                            onChange={(e) => setPrix(article.id, e.target.value)}
                            placeholder="0.00"
                            style={{
                              width: 72, textAlign: 'right', padding: '4px 6px',
                              border: `1.5px solid ${isSelected && (!row.prixHT || parseFloat(row.prixHT) <= 0) ? '#FCA5A5' : 'var(--cream-dark)'}`,
                              borderRadius: 7, fontSize: '0.82rem', background: '#fff',
                            }}
                          />
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-soft)', width: 20 }}>€</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid var(--cream-dark)', padding: '16px 28px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-soft)', display: 'block', marginBottom: 4 }}>
                Mode de paiement
              </label>
              <select
                value={modePaiement}
                onChange={(e) => setModePaiement(e.target.value as typeof modePaiement)}
                style={{ padding: '7px 10px', border: '1.5px solid var(--cream-dark)', borderRadius: 8, fontSize: '0.85rem', background: '#fff' }}
              >
                {Object.entries(MODE_PAIEMENT_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            {hasSelections && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-soft)' }}>{franchiseTVA ? 'Total' : 'Total HT'}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)' }}>
                  {totalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-soft)' }}>
                  {lignesActives.reduce((s, [, r]) => s + r.quantite, 0)} exemplaire(s)
                </div>
              </div>
            )}
          </div>

          {error && (
            <p style={{ fontSize: '0.78rem', color: '#DC2626', margin: 0 }}>⚠ {error}</p>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className={formSty.btnSecondary} onClick={onClose}>
              Annuler
            </button>
            <button
              type="button"
              className={formSty.btnPrimary}
              disabled={!hasSelections || createVente.isPending}
              onClick={handleSubmit}
            >
              {createVente.isPending ? 'Enregistrement…' : 'Enregistrer la vente'}
            </button>
          </div>
        </div>
      </div>
    </Overlay>
  )
}

const btnSmallStyle: React.CSSProperties = {
  width: 24, height: 24, border: '1.5px solid var(--cream-dark)',
  borderRadius: 6, background: '#fff', color: 'var(--ink)',
  cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  lineHeight: 1,
}
