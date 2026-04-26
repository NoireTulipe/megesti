import { useState, useMemo } from 'react'
import { usePointsDeVente } from './hooks/usePointsDeVente'
import { useSessionsCaisse, useOpenSessionCaisse, useCloseSessionCaisse } from './hooks/useSessionsCaisse'
import { useVentes, useCreateVente, useAnnulerVente } from './hooks/useVentes'
import type { ModePaiement, CartLigne } from './hooks/useVentes'
import { useArticles } from '@/features/catalogue/hooks/useArticles'
import { Modal } from '@/components/ui/Modal'
import styles from './VentesPage.module.css'

const MODES: { key: ModePaiement; label: string }[] = [
  { key: 'CB',       label: 'CB' },
  { key: 'ESPECES',  label: 'Espèces' },
  { key: 'CHEQUE',   label: 'Chèque' },
  { key: 'VIREMENT', label: 'Virement' },
]

export function VentesPage() {
  const [selectedPDV,     setSelectedPDV]     = useState<string>('')
  const [selectedSession, setSelectedSession] = useState<string>('')
  const [search,          setSearch]          = useState('')
  const [cart,            setCart]            = useState<CartLigne[]>([])
  const [modePaiement,    setModePaiement]    = useState<ModePaiement>('CB')
  const [showOpenModal,   setShowOpenModal]   = useState(false)
  const [fondOuverture,   setFondOuverture]   = useState(0)
  const [debiterStockME,  setDebiterStockME]  = useState(true)
  const [sessionNom,      setSessionNom]      = useState('')
  const [showCloseModal,  setShowCloseModal]  = useState(false)
  const [fondFermeture,   setFondFermeture]   = useState(0)

  const { data: pdvList = [] }     = usePointsDeVente()
  const { data: sessions = [] }    = useSessionsCaisse({ pointDeVenteId: selectedPDV || undefined, statut: 'OUVERTE' })
  const { data: articles = [] }    = useArticles()
  const { data: ventes = [] }      = useVentes(selectedSession || undefined)

  const openSession  = useOpenSessionCaisse()
  const closeSession = useCloseSessionCaisse()
  const createVente  = useCreateVente()
  const annulerVente = useAnnulerVente()

  const activeSession = sessions.find((s) => s.id === selectedSession)

  const filteredArticles = useMemo(() =>
    articles.filter((a) => a.actif && a.nom.toLowerCase().includes(search.toLowerCase())),
    [articles, search]
  )

  function addToCart(article: typeof articles[number]) {
    setCart((prev) => {
      const existing = prev.find((l) => l.articleId === article.id)
      if (existing) return prev.map((l) => l.articleId === article.id ? { ...l, quantite: l.quantite + 1 } : l)
      return [...prev, {
        articleId:      article.id,
        nom:            article.nom,
        prixUnitaireHT: Number(article.prixVenteHT),
        tauxTVA:        Number(article.rayon.tauxTVA),
        quantite:       1,
      }]
    })
  }

  function updateQty(articleId: string, delta: number) {
    setCart((prev) => {
      const next = prev.map((l) => l.articleId === articleId ? { ...l, quantite: l.quantite + delta } : l)
      return next.filter((l) => l.quantite > 0)
    })
  }

  const totals = useMemo(() => {
    let ht = 0, tva = 0, ttc = 0
    for (const l of cart) {
      const ligneHT  = l.prixUnitaireHT * l.quantite
      const ligneTTC = ligneHT * (1 + l.tauxTVA / 100)
      ht  += ligneHT
      tva += ligneTTC - ligneHT
      ttc += ligneTTC
    }
    return { ht: ht.toFixed(2), tva: tva.toFixed(2), ttc: ttc.toFixed(2) }
  }, [cart])

  async function handleValider() {
    if (!selectedSession || cart.length === 0) return
    await createVente.mutateAsync({
      id:          crypto.randomUUID(),
      sessionId:   selectedSession,
      modePaiement,
      lignes:      cart.map((l) => ({ articleId: l.articleId, quantite: l.quantite })),
    })
    setCart([])
  }

  async function handleOuvrirSession() {
    if (!selectedPDV) return
    const session = await openSession.mutateAsync({
      id: crypto.randomUUID(), pointDeVenteId: selectedPDV,
      nom: sessionNom || undefined, fondOuverture, debiterStockME,
    })
    setSelectedSession(session.id)
    setShowOpenModal(false)
    setSessionNom(''); setFondOuverture(0); setDebiterStockME(true)
  }

  async function handleFermerSession() {
    if (!selectedSession) return
    await closeSession.mutateAsync({ id: selectedSession, fondFermeture: fondFermeture || undefined })
    setSelectedSession('')
    setCart([])
    setShowCloseModal(false)
  }

  function stockClass(article: typeof articles[number]) {
    const s = article.stock
    if (article.stockAlerte > 0 && s <= article.stockAlerte) return styles.tileStockAlert
    if (article.stockTension > 0 && s <= article.stockTension) return styles.tileStockWarn
    return styles.tileStock
  }

  return (
    <div className={styles.page}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>Caisse</h1>

        <select
          value={selectedPDV}
          onChange={(e) => { setSelectedPDV(e.target.value); setSelectedSession('') }}
          style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--cream-dark)', fontSize: '0.85rem' }}
        >
          <option value="">— Point de vente —</option>
          {pdvList.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
        </select>

        {selectedPDV && (
          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--cream-dark)', fontSize: '0.85rem' }}
          >
            <option value="">— Session —</option>
            {sessions.map((s) => <option key={s.id} value={s.id}>{s.nom ?? s.pointDeVente.nom} ({new Date(s.dateOuverture).toLocaleDateString('fr-FR')})</option>)}
          </select>
        )}

        {selectedPDV && (
          <button
            onClick={() => setShowOpenModal(true)}
            style={{ padding: '6px 14px', borderRadius: 8, background: 'var(--terra)', color: '#fff', border: 'none', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
          >
            + Session
          </button>
        )}

        {activeSession && (
          <>
            <div className={`${styles.sessionBadge} ${styles.sessionOpen}`}>
              <span className={styles.dot} />
              Session ouverte
            </div>
            <button
              onClick={() => setShowCloseModal(true)}
              style={{ padding: '6px 14px', borderRadius: 8, background: '#fff', border: '1.5px solid var(--cream-dark)', fontSize: '0.82rem', cursor: 'pointer' }}
            >
              Fermer session
            </button>
          </>
        )}
      </div>

      {!activeSession ? (
        <div className={styles.noSession}>
          <p className={styles.noSessionTitle}>Aucune session active</p>
          <p style={{ color: 'var(--text-soft)', fontSize: '0.9rem' }}>Sélectionnez un point de vente et ouvrez une session pour commencer.</p>
          {selectedPDV && (
            <button className={styles.btnOuvrir} onClick={() => setShowOpenModal(true)}>
              Ouvrir une session
            </button>
          )}
        </div>
      ) : (
        <div className={styles.body}>

          {/* ── Articles ─────────────────────────────────────── */}
          <div className={styles.leftPanel}>
            <div className={styles.searchBar}>
              <input
                className={styles.searchInput}
                type="search"
                placeholder="Rechercher un article…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className={styles.articleGrid}>
              {filteredArticles.map((a) => (
                <button key={a.id} className={styles.articleTile} onClick={() => addToCart(a)}>
                  <span className={styles.tileNom}>{a.nom}</span>
                  <span className={styles.tilePrix}>{Number(a.prixVenteHT).toFixed(2)} €</span>
                  <span className={stockClass(a)}>Stock : {a.stock}</span>
                </button>
              ))}
              {filteredArticles.length === 0 && (
                <p style={{ gridColumn: '1/-1', color: 'var(--text-soft)', fontSize: '0.85rem', padding: 8 }}>Aucun article trouvé.</p>
              )}
            </div>
          </div>

          {/* ── Panier ────────────────────────────────────────── */}
          <div className={styles.rightPanel}>
            <div className={styles.cartHeader}>
              <p className={styles.cartTitle}>Panier — {cart.length} article{cart.length > 1 ? 's' : ''}</p>
            </div>

            <div className={styles.cartLines}>
              {cart.length === 0
                ? <p className={styles.emptyCart}>Cliquez sur un article pour l'ajouter</p>
                : cart.map((l) => (
                    <div key={l.articleId} className={styles.cartLine}>
                      <span className={styles.cartLineNom}>{l.nom}</span>
                      <div className={styles.qtyControl}>
                        <button className={`${styles.qtyBtn} ${l.quantite === 1 ? styles.qtyBtnDanger : ''}`} onClick={() => updateQty(l.articleId, -1)}>
                          {l.quantite === 1 ? '✕' : '−'}
                        </button>
                        <span className={styles.qtyValue}>{l.quantite}</span>
                        <button className={styles.qtyBtn} onClick={() => updateQty(l.articleId, 1)}>+</button>
                      </div>
                      <span className={styles.cartLineSubtotal}>{(l.prixUnitaireHT * l.quantite).toFixed(2)} €</span>
                    </div>
                  ))
              }
            </div>

            <div className={styles.totals}>
              <div className={styles.totalRow}><span>Total HT</span><span>{totals.ht} €</span></div>
              <div className={styles.totalRow}><span>TVA</span><span>{totals.tva} €</span></div>
              <div className={styles.totalRowBig}><span>Total TTC</span><span>{totals.ttc} €</span></div>
            </div>

            <div className={styles.payment}>
              <p className={styles.payLabel}>Mode de paiement</p>
              <div className={styles.modeGrid}>
                {MODES.map((m) => (
                  <button
                    key={m.key}
                    className={`${styles.modeBtn} ${modePaiement === m.key ? styles.modeBtnActive : ''}`}
                    onClick={() => setModePaiement(m.key)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <button
                className={styles.btnValider}
                disabled={cart.length === 0 || createVente.isPending}
                onClick={handleValider}
              >
                {createVente.isPending ? 'Enregistrement…' : `Valider — ${totals.ttc} €`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ventes récentes */}
      {activeSession && ventes.length > 0 && (
        <div className={styles.ventesRecentes}>
          <p className={styles.ventesTitle}>Ventes de la session</p>
          {ventes.slice(0, 5).map((v) => (
            <div key={v.id} className={styles.venteRow}>
              <span className={styles.venteNum}>#{v.numero}</span>
              <span className={styles.venteMontant}>{Number(v.totalTTC).toFixed(2)} €</span>
              <span className={styles.venteMode}>{v.modePaiement}</span>
              <span className={`${styles.venteStatut} ${v.statut === 'VALIDEE' ? styles.statutValidee : styles.statutAnnulee}`}>
                {v.statut === 'VALIDEE' ? 'Validée' : 'Annulée'}
              </span>
              {v.statut === 'VALIDEE' && (
                <button className={styles.btnAnnuler} onClick={() => annulerVente.mutate({ id: v.id })}>
                  Annuler
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Modal ouverture session ──────────────────────────── */}
      <Modal isOpen={showOpenModal} onClose={() => setShowOpenModal(false)} title="Ouvrir une session de caisse" width={460}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>Nom de la session (optionnel)</label>
            <input
              value={sessionNom}
              onChange={(e) => setSessionNom(e.target.value)}
              placeholder="Ex : Vendeur A — Jour 1"
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--cream-dark)', borderRadius: 8, fontSize: '0.9rem', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>Fond de caisse (€)</label>
            <input
              type="number" min={0} value={fondOuverture}
              onChange={(e) => setFondOuverture(Number(e.target.value))}
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--cream-dark)', borderRadius: 8, fontSize: '0.9rem', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={debiterStockME} onChange={(e) => setDebiterStockME(e.target.checked)} style={{ width: 16, height: 16 }} />
              Débiter le stock de la ME
            </label>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-soft)', margin: '4px 0 0 26px' }}>
              Décocher si le vendeur utilise son propre stock.
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button onClick={() => setShowOpenModal(false)} style={{ padding: '10px 20px', borderRadius: 8, border: '1.5px solid var(--cream-dark)', background: 'transparent', cursor: 'pointer' }}>Annuler</button>
            <button
              onClick={handleOuvrirSession}
              disabled={openSession.isPending}
              style={{ padding: '10px 24px', borderRadius: 8, background: 'var(--terra)', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
            >
              Ouvrir la session
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Modal fermeture session ──────────────────────────── */}
      <Modal isOpen={showCloseModal} onClose={() => setShowCloseModal(false)} title="Fermer la session" width={420}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ color: 'var(--text-soft)', fontSize: '0.875rem', margin: 0 }}>
            Vous allez fermer la session. Les nouvelles ventes ne seront plus possibles.
          </p>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>Fond de caisse en fin de session (€)</label>
            <input
              type="number" min={0} value={fondFermeture}
              onChange={(e) => setFondFermeture(Number(e.target.value))}
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--cream-dark)', borderRadius: 8, fontSize: '0.9rem', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={() => setShowCloseModal(false)} style={{ padding: '10px 20px', borderRadius: 8, border: '1.5px solid var(--cream-dark)', background: 'transparent', cursor: 'pointer' }}>Annuler</button>
            <button
              onClick={handleFermerSession}
              disabled={closeSession.isPending}
              style={{ padding: '10px 24px', borderRadius: 8, background: '#DC2626', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
            >
              Fermer la session
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
