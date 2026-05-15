import { generateUUID } from '@/lib/utils'
import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useMotifVente, useCreateMotifVente } from './hooks/useMotifVente'
import { useCreateVenteHorsSession } from './hooks/useVentes'
import type { ModePaiement, CartLigne } from './hooks/useVentes'
import { useArticles } from '@/features/catalogue/hooks/useArticles'
import { useRayons }   from '@/features/catalogue/hooks/useRayons'
import { useFranchiseTVA } from '@/hooks/useFranchiseTVA'
import styles from './VentesPage.module.css'

const MODES: { key: ModePaiement; label: string }[] = [
  { key: 'CB',       label: 'CB' },
  { key: 'ESPECES',  label: 'Espèces' },
  { key: 'CHEQUE',   label: 'Chèque' },
  { key: 'VIREMENT', label: 'Virement' },
]

function fEur(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

interface Props {
  isOpen:  boolean
  onClose: () => void
}

export function VenteHorsSessionModal({ isOpen, onClose }: Props) {
  const [motifId,       setMotifId]       = useState('')
  const [newMotifLabel, setNewMotifLabel] = useState('')
  const [showAddMotif,  setShowAddMotif]  = useState(false)
  const [cart,          setCart]          = useState<CartLigne[]>([])
  const [mode,          setMode]          = useState<ModePaiement>('CB')
  const [rayonId,       setRayonId]       = useState<string | null>(null)
  const [search,        setSearch]        = useState('')
  const [pending,       setPending]       = useState(false)
  const [success,       setSuccess]       = useState(false)

  const { data: motifs   = [] } = useMotifVente()
  const { data: articles = [] } = useArticles()
  const { data: rayons   = [] } = useRayons()
  const franchiseTVA             = useFranchiseTVA()
  const createVente              = useCreateVenteHorsSession()
  const createMotif              = useCreateMotifVente()

  // Lock body scroll
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, motifId])

  const filteredArticles = useMemo(() => {
    let list = articles.filter(a => a.actif)
    if (rayonId) list = list.filter(a => a.rayonId === rayonId)
    if (search)  list = list.filter(a => a.nom.toLowerCase().includes(search.toLowerCase()))
    return list
  }, [articles, rayonId, search])

  function addToCart(art: typeof articles[number]) {
    setCart(prev => {
      const ex = prev.find(l => l.articleId === art.id)
      if (ex) return prev.map(l => l.articleId === art.id ? { ...l, quantite: l.quantite + 1 } : l)
      return [...prev, { articleId: art.id, nom: art.nom, prixUnitaireHT: parseFloat(art.prixVenteHT), tauxTVA: 0, quantite: 1 }]
    })
  }

  function removeFromCart(id: string) { setCart(prev => prev.filter(l => l.articleId !== id)) }
  function setQty(id: string, q: number) {
    if (q <= 0) return removeFromCart(id)
    setCart(prev => prev.map(l => l.articleId === id ? { ...l, quantite: q } : l))
  }

  const totalHT  = cart.reduce((s, l) => s + (l.prixEffectif ?? l.prixUnitaireHT) * l.quantite, 0)
  const totalTTC = franchiseTVA ? totalHT : cart.reduce((s, l) => {
    const art = articles.find(a => a.id === l.articleId)
    const taux = art?.rayon?.tauxTVA ? parseFloat(art.rayon.tauxTVA) / 100 : 0
    return s + (l.prixEffectif ?? l.prixUnitaireHT) * l.quantite * (1 + taux)
  }, 0)

  async function handleAddMotif() {
    if (!newMotifLabel.trim()) return
    const created = await createMotif.mutateAsync(newMotifLabel.trim())
    setMotifId(created.id)
    setNewMotifLabel('')
    setShowAddMotif(false)
  }

  async function handleValider() {
    if (!motifId || cart.length === 0 || pending) return
    setPending(true)
    try {
      await createVente.mutateAsync({
        id: generateUUID(),
        motifVenteId: motifId,
        modePaiement: mode,
        lignes: cart.map(l => ({
          articleId: l.articleId,
          quantite:  l.quantite,
          ...(l.prixEffectif !== undefined ? { prixUnitaireHT: l.prixEffectif } : {}),
        })),
      })
      setSuccess(true)
      setCart([])
      setTimeout(() => { setSuccess(false); onClose() }, 1200)
    } finally {
      setPending(false)
    }
  }

  function handleClose() {
    setCart([]); setMotifId(''); setSearch(''); setRayonId(null)
    setSuccess(false)
    onClose()
  }

  if (!isOpen) return null

  const dialog = (
    <div className={styles.hsOverlay} onClick={handleClose}>
      <div className={styles.hsDialog} role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>

        {/* Accent + décos */}
        <div className={styles.hsAccent} />
        <div className={styles.hsDecorations}>
          <div className={styles.hsBlobA} />
          <div className={styles.hsBlobB} />
        </div>

        {/* Header */}
        <div className={styles.hsHeader}>
          <div>
            <h2 className={styles.hsTitle}>Vente hors session</h2>
            <p className={styles.hsSub}>Sans session de caisse ouverte</p>
          </div>
          <button className={styles.hsClose} onClick={handleClose} aria-label="Fermer">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Motif */}
        <div className={styles.hsMotifBar}>
          <label className={styles.hsMotifLabel}>Motif de la vente</label>
          <div className={styles.hsMotifRow}>
            {motifs.map(m => (
              <button key={m.id}
                className={`${styles.motifBtn} ${motifId === m.id ? styles.motifBtnActive : ''}`}
                onClick={() => setMotifId(m.id)}>
                {m.libelle}
              </button>
            ))}
            {showAddMotif ? (
              <div className={styles.addMotifRow}>
                <input
                  className={styles.addMotifInput}
                  value={newMotifLabel}
                  onChange={e => setNewMotifLabel(e.target.value)}
                  placeholder="Nouveau motif…"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleAddMotif() }}
                />
                <button className={styles.addMotifConfirm} onClick={handleAddMotif}>•o"</button>
                <button className={styles.addMotifCancel} onClick={() => setShowAddMotif(false)}>✕</button>
              </div>
            ) : (
              <button className={styles.addMotifBtn} onClick={() => setShowAddMotif(true)}>+ Ajouter</button>
            )}
          </div>
        </div>

        {/* Corps : catalogue + panier */}
        <div className={styles.hsBody}>

          {/* Catalogue */}
          <div className={styles.hsCatalogue}>
            <div className={styles.hsCatalogueBar}>
              <input
                className={styles.hsSearch}
                placeholder="Rechercher un article…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <div className={styles.rayonTabs}>
                <button
                  className={`${styles.rayonTab} ${!rayonId ? styles.rayonTabActive : ''}`}
                  onClick={() => setRayonId(null)}
                >
                  Tout
                </button>
                {rayons.map(r => (
                  <button key={r.id}
                    className={`${styles.rayonTab} ${rayonId === r.id ? styles.rayonTabActive : ''}`}
                    onClick={() => setRayonId(r.id)}>
                    {r.nom}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.hsArticleGrid}>
              {filteredArticles.length === 0 && (
                <p className={styles.hsNoArticles}>
                  {search ? `Aucun résultat pour « ${search} »` : 'Aucun article dans ce rayon.'}
                </p>
              )}
              {filteredArticles.map(a => (
                <button key={a.id} className={styles.hsArticle} onClick={() => addToCart(a)}>
                  <span className={styles.hsArticleNom}>{a.nom}</span>
                  <span className={styles.hsArticleStock}>Stock : {a.stock}</span>
                  <span className={styles.hsArticlePrix}>{fEur(parseFloat(a.prixVenteHT))}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Panier */}
          <div className={styles.hsPanier}>
            <div className={styles.hsPanierHeader}>
              <p className={styles.hsPanierTitle}>Panier</p>
              {cart.length > 0 && (
                <button className={styles.hsPanierVider} onClick={() => setCart([])}>Vider</button>
              )}
            </div>

            {cart.length === 0 ? (
              <p className={styles.hsPanierEmpty}>Cliquez sur un article pour l'ajouter au panier.</p>
            ) : (
              <div className={styles.hsPanierLignes}>
                {cart.map(l => {
                  const pu = l.prixEffectif ?? l.prixUnitaireHT
                  const sousTotal = pu * l.quantite
                  return (
                    <div key={l.articleId} className={styles.hsPanierLigne}>
                      <span className={styles.hsPanierNom}>{l.nom}</span>
                      <div className={styles.hsQtyWrap}>
                        <button className={styles.hsQtyBtn} onClick={() => setQty(l.articleId, l.quantite - 1)}>•^'</button>
                        <span className={styles.hsQtyVal}>{l.quantite}</span>
                        <button className={styles.hsQtyBtn} onClick={() => setQty(l.articleId, l.quantite + 1)}>+</button>
                      </div>
                      <span className={styles.hsPanierSousTotal}>{fEur(sousTotal)}</span>
                      <button className={styles.hsPanierDel} onClick={() => removeFromCart(l.articleId)}>
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                          <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Mode paiement */}
            <div className={styles.hsModeRow}>
              {MODES.map(m => (
                <button key={m.key}
                  className={`${styles.hsModeBtn} ${mode === m.key ? styles.hsModeBtnActive : ''}`}
                  onClick={() => setMode(m.key)}>{m.label}</button>
              ))}
            </div>

            {/* Total + valider */}
            <div className={styles.hsFooter}>
              <div className={styles.hsTotalBlock}>
                <span className={styles.hsTotalHT}>Total HT : {fEur(totalHT)}</span>
                {!franchiseTVA && <span className={styles.hsTotalTTC}>TTC : {fEur(totalTTC)}</span>}
                {franchiseTVA && <span className={styles.hsTotalTTC}>Total : {fEur(totalTTC)}</span>}
              </div>
              <button
                className={`${styles.hsValider} ${success ? styles.hsValiderSuccess : ''}`}
                disabled={!motifId || cart.length === 0 || pending}
                onClick={handleValider}
              >
                {success ? '•o" Enregistrée' : pending ? 'Enregistrement…' : `Valider — ${fEur(totalTTC)}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(dialog, document.body)
}




