import { useState, useMemo } from 'react'
import { usePointsDeVente } from './hooks/usePointsDeVente'
import { useSessionsCaisse, useOpenSessionCaisse, useCloseSessionCaisse } from './hooks/useSessionsCaisse'
import { useVentes, useCreateVente, useAnnulerVente } from './hooks/useVentes'
import type { ModePaiement, CartLigne, Vente } from './hooks/useVentes'
import { useArticles } from '@/features/catalogue/hooks/useArticles'
import { useRayons } from '@/features/catalogue/hooks/useRayons'
import { Modal } from '@/components/ui/Modal'
import styles from './VentesPage.module.css'

const MODES: { key: ModePaiement; label: string }[] = [
  { key: 'CB',       label: 'CB' },
  { key: 'ESPECES',  label: 'Espèces' },
  { key: 'CHEQUE',   label: 'Chèque' },
  { key: 'VIREMENT', label: 'Virement' },
]

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function venteSummary(lignes: Vente['lignes']) {
  return lignes.map((l) => `${l.article.nom}${l.quantite > 1 ? ` ×${l.quantite}` : ''}`).join(' · ')
}

export function VentesPage() {
  // ── Session ──────────────────────────────────────────────────────────
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [showOpenModal,   setShowOpenModal]   = useState(false)
  const [openPDVId,       setOpenPDVId]       = useState('')
  const [fondOuverture,   setFondOuverture]   = useState(0)
  const [debiterStockME,  setDebiterStockME]  = useState(true)
  const [sessionNom,      setSessionNom]      = useState('')
  const [showCloseModal,  setShowCloseModal]  = useState(false)
  const [fondFermeture,   setFondFermeture]   = useState(0)

  // ── Articles / Rayon ─────────────────────────────────────────────────
  const [selectedRayonId, setSelectedRayonId] = useState<string | null>(null)
  const [search,          setSearch]          = useState('')

  // ── Panier ───────────────────────────────────────────────────────────
  const [cart,         setCart]         = useState<CartLigne[]>([])
  const [modePaiement, setModePaiement] = useState<ModePaiement>('CB')
  const [editPrixId,   setEditPrixId]   = useState<string | null>(null)
  const [editPrixVal,  setEditPrixVal]  = useState('')

  // ── Ventes récentes ──────────────────────────────────────────────────
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // ── Data ─────────────────────────────────────────────────────────────
  const { data: pdvList   = [] } = usePointsDeVente()
  const { data: sessions  = [] } = useSessionsCaisse({ statut: 'OUVERTE' })
  const { data: rayons    = [] } = useRayons()
  const { data: articles  = [] } = useArticles()
  const { data: ventes    = [] } = useVentes(activeSessionId ?? undefined)

  const openSession  = useOpenSessionCaisse()
  const closeSession = useCloseSessionCaisse()
  const createVente  = useCreateVente()
  const annulerVente = useAnnulerVente()

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null

  const filteredArticles = useMemo(() => {
    let list = articles.filter((a) => a.actif)
    if (selectedRayonId) list = list.filter((a) => a.rayonId === selectedRayonId)
    if (search) list = list.filter((a) => a.nom.toLowerCase().includes(search.toLowerCase()))
    return list
  }, [articles, selectedRayonId, search])

  // ── Cart helpers ─────────────────────────────────────────────────────
  function addToCart(article: typeof articles[number]) {
    setCart((prev) => {
      const existing = prev.find((l) => l.articleId === article.id)
      if (existing) return prev.map((l) =>
        l.articleId === article.id ? { ...l, quantite: l.quantite + 1 } : l
      )
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
    setCart((prev) =>
      prev.map((l) => l.articleId === articleId ? { ...l, quantite: l.quantite + delta } : l)
          .filter((l) => l.quantite > 0)
    )
  }

  function confirmPrixEdit(articleId: string) {
    const val = parseFloat(editPrixVal.replace(',', '.'))
    if (!isNaN(val) && val >= 0) {
      setCart((prev) => prev.map((l) =>
        l.articleId === articleId
          ? { ...l, prixEffectif: val === l.prixUnitaireHT ? undefined : val }
          : l
      ))
    }
    setEditPrixId(null)
    setEditPrixVal('')
  }

  const totals = useMemo(() => {
    let ht = 0, tva = 0, ttc = 0
    for (const l of cart) {
      const p       = l.prixEffectif ?? l.prixUnitaireHT
      const ligneHT = p * l.quantite
      const ligneTTC = ligneHT * (1 + l.tauxTVA / 100)
      ht  += ligneHT
      tva += ligneTTC - ligneHT
      ttc += ligneTTC
    }
    return { ht: ht.toFixed(2), tva: tva.toFixed(2), ttc: ttc.toFixed(2) }
  }, [cart])

  // ── Handlers ─────────────────────────────────────────────────────────
  async function handleOuvrirSession() {
    if (!openPDVId) return
    const s = await openSession.mutateAsync({
      id: crypto.randomUUID(), pointDeVenteId: openPDVId,
      nom: sessionNom || undefined, fondOuverture, debiterStockME,
    })
    setActiveSessionId(s.id)
    setShowOpenModal(false)
    setSessionNom(''); setFondOuverture(0); setOpenPDVId(''); setDebiterStockME(true)
  }

  async function handleFermerSession() {
    if (!activeSessionId) return
    await closeSession.mutateAsync({ id: activeSessionId, fondFermeture: fondFermeture || undefined })
    setActiveSessionId(null)
    setCart([])
    setShowCloseModal(false)
    setFondFermeture(0)
  }

  async function handleValider() {
    if (!activeSessionId || cart.length === 0) return
    await createVente.mutateAsync({
      id:          crypto.randomUUID(),
      sessionId:   activeSessionId,
      modePaiement,
      lignes: cart.map((l) => ({
        articleId:      l.articleId,
        quantite:       l.quantite,
        ...(l.prixEffectif !== undefined && { prixUnitaireHT: l.prixEffectif }),
      })),
    })
    setCart([])
  }

  function stockClass(a: typeof articles[number]) {
    if (a.stockAlerte > 0 && a.stock <= a.stockAlerte) return styles.tileStockAlert
    if (a.stockTension > 0 && a.stock <= a.stockTension) return styles.tileStockWarn
    return styles.tileStock
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ÉCRAN DE SÉLECTION DE SESSION
  // ═══════════════════════════════════════════════════════════════════════
  if (!activeSession) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.headerTitle}>Caisse</h1>
          <button className={styles.btnOuvrirHeader} onClick={() => setShowOpenModal(true)}>
            + Ouvrir une session
          </button>
        </div>

        <div className={styles.sessionSelectPage}>
          {sessions.length > 0 ? (
            <>
              <p className={styles.sessionSelectLabel}>Sessions en cours</p>
              <div className={styles.sessionCards}>
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    className={styles.sessionCard}
                    onClick={() => setActiveSessionId(s.id)}
                  >
                    <div className={styles.sessionCardDot} />
                    <div className={styles.sessionCardBody}>
                      <span className={styles.sessionCardPDV}>{s.pointDeVente.nom}</span>
                      {s.nom && <span className={styles.sessionCardNom}>{s.nom}</span>}
                      <span className={styles.sessionCardMeta}>
                        Ouverte le {fmtDate(s.dateOuverture)} à {fmtTime(s.dateOuverture)}
                        {s._count ? ` · ${s._count.ventes} vente${s._count.ventes > 1 ? 's' : ''}` : ''}
                      </span>
                    </div>
                    <span className={styles.sessionCardArrow}>→</span>
                  </button>
                ))}
              </div>
              <p className={styles.sessionSelectOr}>— ou —</p>
            </>
          ) : (
            <div className={styles.sessionEmptyIllust}>
              <span className={styles.sessionEmoji}>🏪</span>
              <p className={styles.sessionEmptyTitle}>Aucune session active</p>
              <p className={styles.sessionEmptyText}>Ouvrez une session pour commencer à vendre.</p>
            </div>
          )}
          <button className={styles.btnOuvrirBig} onClick={() => setShowOpenModal(true)}>
            + Ouvrir une nouvelle session
          </button>
        </div>

        {/* Modal ouverture */}
        <ModalOuvrirSession
          isOpen={showOpenModal}
          onClose={() => setShowOpenModal(false)}
          pdvList={pdvList}
          openPDVId={openPDVId}    setOpenPDVId={setOpenPDVId}
          sessionNom={sessionNom}  setSessionNom={setSessionNom}
          fondOuverture={fondOuverture} setFondOuverture={setFondOuverture}
          debiterStockME={debiterStockME} setDebiterStockME={setDebiterStockME}
          onSubmit={handleOuvrirSession}
          isPending={openSession.isPending}
        />
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ÉCRAN CAISSE ACTIVE
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className={styles.page}>

      {/* ── Barre session ────────────────────────────────────────────── */}
      <div className={styles.sessionBar}>
        <div className={styles.sessionBarLeft}>
          <span className={styles.sessionBarDot} />
          <span className={styles.sessionBarPDV}>{activeSession.pointDeVente.nom}</span>
          {activeSession.nom && <span className={styles.sessionBarNom}>— {activeSession.nom}</span>}
          <span className={styles.sessionBarTime}>depuis {fmtTime(activeSession.dateOuverture)}</span>
        </div>
        <div className={styles.sessionBarRight}>
          <button
            className={styles.btnChanger}
            onClick={() => { setActiveSessionId(null); setCart([]) }}
          >
            ← Changer
          </button>
          <button className={styles.btnFermer} onClick={() => setShowCloseModal(true)}>
            Fermer la session
          </button>
        </div>
      </div>

      {/* ── Contenu POS ──────────────────────────────────────────────── */}
      <div className={styles.body}>

        {/* ── Panel gauche : articles ──────────────────────────────── */}
        <div className={styles.leftPanel}>
          {/* Tabs rayons */}
          <div className={styles.rayonTabs}>
            <button
              className={`${styles.rayonTab} ${selectedRayonId === null ? styles.rayonTabActive : ''}`}
              onClick={() => setSelectedRayonId(null)}
            >
              Tous
            </button>
            {rayons.map((r) => (
              <button
                key={r.id}
                className={`${styles.rayonTab} ${selectedRayonId === r.id ? styles.rayonTabActive : ''}`}
                onClick={() => setSelectedRayonId(r.id)}
              >
                {r.nom}
              </button>
            ))}
          </div>

          {/* Recherche */}
          <div className={styles.searchBar}>
            <input
              className={styles.searchInput}
              type="search"
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Grille articles */}
          <div className={styles.articleGrid}>
            {filteredArticles.map((a) => (
              <button key={a.id} className={styles.articleTile} onClick={() => addToCart(a)}>
                <span className={styles.tileNom}>{a.nom}</span>
                <span className={styles.tilePrix}>{Number(a.prixVenteHT).toFixed(2)} €</span>
                <span className={stockClass(a)}>Stock : {a.stock}</span>
              </button>
            ))}
            {filteredArticles.length === 0 && (
              <p className={styles.noArticles}>Aucun article{search ? ` pour « ${search} »` : ''}.</p>
            )}
          </div>
        </div>

        {/* ── Panel droit : panier ─────────────────────────────────── */}
        <div className={styles.rightPanel}>
          <div className={styles.cartHeader}>
            <p className={styles.cartTitle}>Panier</p>
            {cart.length > 0 && (
              <button className={styles.btnViderCart} onClick={() => setCart([])}>Vider</button>
            )}
          </div>

          <div className={styles.cartLines}>
            {cart.length === 0
              ? <p className={styles.emptyCart}>Cliquez sur un article pour l'ajouter</p>
              : cart.map((l) => {
                  const prixAff = l.prixEffectif ?? l.prixUnitaireHT
                  const hasRemise = l.prixEffectif !== undefined && l.prixEffectif !== l.prixUnitaireHT
                  return (
                    <div key={l.articleId} className={styles.cartLine}>
                      <div className={styles.cartLineTop}>
                        <span className={styles.cartLineNom}>{l.nom}</span>
                        <div className={styles.qtyControl}>
                          <button
                            className={`${styles.qtyBtn} ${l.quantite === 1 ? styles.qtyBtnDanger : ''}`}
                            onClick={() => updateQty(l.articleId, -1)}
                          >
                            {l.quantite === 1 ? '✕' : '−'}
                          </button>
                          <span className={styles.qtyValue}>{l.quantite}</span>
                          <button className={styles.qtyBtn} onClick={() => updateQty(l.articleId, 1)}>+</button>
                        </div>
                      </div>
                      <div className={styles.cartLineMeta}>
                        {editPrixId === l.articleId ? (
                          <div className={styles.prixEditRow}>
                            <input
                              className={styles.prixEditInput}
                              type="number"
                              step="0.01"
                              min="0"
                              value={editPrixVal}
                              onChange={(e) => setEditPrixVal(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') confirmPrixEdit(l.articleId)
                                if (e.key === 'Escape') { setEditPrixId(null); setEditPrixVal('') }
                              }}
                              autoFocus
                            />
                            <button className={styles.prixEditSave} onClick={() => confirmPrixEdit(l.articleId)}>✓</button>
                            <button className={styles.prixEditCancel} onClick={() => { setEditPrixId(null); setEditPrixVal('') }}>✕</button>
                          </div>
                        ) : (
                          <button
                            className={styles.btnEditPrix}
                            onClick={() => {
                              setEditPrixId(l.articleId)
                              setEditPrixVal(String(prixAff))
                            }}
                          >
                            {hasRemise && (
                              <span className={styles.prixOriginal}>{l.prixUnitaireHT.toFixed(2)} €</span>
                            )}
                            <span className={hasRemise ? styles.prixRemise : styles.prixNormal}>
                              {prixAff.toFixed(2)} €
                            </span>
                            <span className={styles.editPrixIcon}>✎</span>
                          </button>
                        )}
                        <span className={styles.cartLineSubtotal}>
                          {(prixAff * l.quantite).toFixed(2)} €
                        </span>
                      </div>
                    </div>
                  )
                })
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

      {/* ── Ventes récentes ──────────────────────────────────────────── */}
      {ventes.length > 0 && (
        <div className={styles.ventesRecentes}>
          <p className={styles.ventesTitle}>Ventes de la session ({ventes.length})</p>
          <div className={styles.ventesScroll}>
            {ventes.map((v) => (
              <div key={v.id} className={`${styles.venteRow} ${v.statut === 'ANNULEE' ? styles.venteAnnulee : ''}`}>
                <button
                  className={styles.venteRowHeader}
                  onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
                >
                  <span className={styles.venteNum}>#{v.numero}</span>
                  <span className={styles.venteTime}>{fmtTime(v.dateVente)}</span>
                  <span className={styles.venteSummaryText}>{venteSummary(v.lignes)}</span>
                  <span className={styles.venteMontant}>{Number(v.totalTTC).toFixed(2)} €</span>
                  <span className={styles.venteMode}>{v.modePaiement}</span>
                  <span className={`${styles.venteStatut} ${v.statut === 'VALIDEE' ? styles.statutValidee : styles.statutAnnulee}`}>
                    {v.statut === 'VALIDEE' ? 'Validée' : 'Annulée'}
                  </span>
                  <span className={styles.venteChevron}>{expandedId === v.id ? '▲' : '▼'}</span>
                </button>

                {expandedId === v.id && (
                  <div className={styles.venteDetail}>
                    {v.lignes.map((l) => (
                      <div key={l.id} className={styles.venteDetailLigne}>
                        <span>{l.article.nom}</span>
                        <span>×{l.quantite}</span>
                        <span>{Number(l.totalLigneTTC).toFixed(2)} € TTC</span>
                      </div>
                    ))}
                    {v.statut === 'VALIDEE' && (
                      <button
                        className={styles.btnAnnulerVente}
                        onClick={() => annulerVente.mutate({ id: v.id })}
                      >
                        Annuler cette vente
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────── */}
      <ModalOuvrirSession
        isOpen={showOpenModal}
        onClose={() => setShowOpenModal(false)}
        pdvList={pdvList}
        openPDVId={openPDVId}    setOpenPDVId={setOpenPDVId}
        sessionNom={sessionNom}  setSessionNom={setSessionNom}
        fondOuverture={fondOuverture} setFondOuverture={setFondOuverture}
        debiterStockME={debiterStockME} setDebiterStockME={setDebiterStockME}
        onSubmit={handleOuvrirSession}
        isPending={openSession.isPending}
      />

      <Modal isOpen={showCloseModal} onClose={() => setShowCloseModal(false)} title="Fermer la session" width={420}>
        <div className={styles.modalForm}>
          <p className={styles.modalText}>
            Vous allez fermer la session de <strong>{activeSession.pointDeVente.nom}</strong>.
            {ventes.filter((v) => v.statut === 'VALIDEE').length > 0 && (
              <> {ventes.filter((v) => v.statut === 'VALIDEE').length} vente(s) enregistrée(s).</>
            )}
          </p>
          <div>
            <label className={styles.modalLabel}>Fond de caisse en fin de session (€)</label>
            <input
              type="number" min={0} value={fondFermeture}
              onChange={(e) => setFondFermeture(Number(e.target.value))}
              className={styles.modalInput}
            />
          </div>
          <div className={styles.modalActions}>
            <button className={styles.btnModalCancel} onClick={() => setShowCloseModal(false)}>Annuler</button>
            <button
              className={styles.btnModalDanger}
              onClick={handleFermerSession}
              disabled={closeSession.isPending}
            >
              Fermer la session
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── Composant modal ouverture (partagé entre les deux écrans) ──────────────

interface ModalOuvrirProps {
  isOpen: boolean
  onClose: () => void
  pdvList: import('./hooks/usePointsDeVente').PointDeVente[]
  openPDVId: string;    setOpenPDVId: (v: string) => void
  sessionNom: string;   setSessionNom: (v: string) => void
  fondOuverture: number; setFondOuverture: (v: number) => void
  debiterStockME: boolean; setDebiterStockME: (v: boolean) => void
  onSubmit: () => void
  isPending: boolean
}

function ModalOuvrirSession({
  isOpen, onClose, pdvList,
  openPDVId, setOpenPDVId,
  sessionNom, setSessionNom,
  fondOuverture, setFondOuverture,
  debiterStockME, setDebiterStockME,
  onSubmit, isPending,
}: ModalOuvrirProps) {
  const salons   = pdvList.filter((p) => p.salonId !== null)
  const fixes    = pdvList.filter((p) => p.salonId === null)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ouvrir une session de caisse" width={480}>
      <div className={styles.modalForm}>
        <div>
          <label className={styles.modalLabel}>Lieu de vente <span style={{ color: '#DC2626' }}>*</span></label>
          <select
            value={openPDVId}
            onChange={(e) => setOpenPDVId(e.target.value)}
            className={styles.modalSelect}
          >
            <option value="">— Sélectionner —</option>
            {salons.length > 0 && (
              <optgroup label="Salons &amp; événements">
                {salons.map((p) => <option key={p.id} value={p.id}>🎪 {p.nom}</option>)}
              </optgroup>
            )}
            {fixes.length > 0 && (
              <optgroup label="Lieux fixes">
                {fixes.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </optgroup>
            )}
          </select>
        </div>
        <div>
          <label className={styles.modalLabel}>Nom de la session (optionnel)</label>
          <input
            value={sessionNom}
            onChange={(e) => setSessionNom(e.target.value)}
            placeholder="Ex : Vendeur A — Jour 1"
            className={styles.modalInput}
          />
        </div>
        <div>
          <label className={styles.modalLabel}>Fond de caisse (€)</label>
          <input
            type="number" min={0} value={fondOuverture}
            onChange={(e) => setFondOuverture(Number(e.target.value))}
            className={styles.modalInput}
          />
        </div>
        <label className={styles.modalCheckLabel}>
          <input
            type="checkbox"
            checked={debiterStockME}
            onChange={(e) => setDebiterStockME(e.target.checked)}
            className={styles.modalCheckbox}
          />
          <span>
            Débiter le stock de la ME
            <small className={styles.modalHint}>Décocher si le vendeur gère son propre stock.</small>
          </span>
        </label>
        <div className={styles.modalActions}>
          <button className={styles.btnModalCancel} onClick={onClose}>Annuler</button>
          <button
            className={styles.btnModalPrimary}
            onClick={onSubmit}
            disabled={isPending || !openPDVId}
          >
            Ouvrir la session
          </button>
        </div>
      </div>
    </Modal>
  )
}
