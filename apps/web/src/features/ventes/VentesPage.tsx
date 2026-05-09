import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePointsDeVente } from './hooks/usePointsDeVente'
import { useSessionsCaisse, useOpenSessionCaisse, useCloseSessionCaisse } from './hooks/useSessionsCaisse'
import { useVentes, useCreateVente, useAnnulerVente } from './hooks/useVentes'
import type { ModePaiement, CartLigne, Vente } from './hooks/useVentes'
import { useFraisSession, useCreateFrais, useDeleteFrais, TYPE_FRAIS_LABELS, TYPE_FRAIS_EMOJI, type TypeFrais } from './hooks/useFrais'
import { BilanSession } from './BilanSession'
import { VenteHorsSessionModal } from './VenteHorsSessionModal'
import { HistoriqueSessions } from './HistoriqueSessions'
import { HistoriqueHorsSession } from './HistoriqueHorsSession'
import { useArticles } from '@/features/catalogue/hooks/useArticles'
import { useFranchiseTVA } from '@/hooks/useFranchiseTVA'
import { useRayons } from '@/features/catalogue/hooks/useRayons'
import { Modal } from '@/components/ui/Modal'
import styles from './VentesPage.module.css'
import { MascoteBlock } from '@/components/MascoteBlock'

// ── Mascottes tutoriel caisse ─────────────────────────────────────────────────

function MascotNoPDV() {
  const navigate = useNavigate()
  return (
    <div className={styles['mascot-wrap']}>
      <img src="/img/mascotte/m1.png" alt="" className={styles['mascot-img']} />
      <div className={styles['mascot-bubbles']}>
        <div className={styles['mascot-bubble']}>
          <p className={styles['mascot-title']}>Bienvenue dans la Caisse ! 🏪</p>
          <p className={styles['mascot-text']}>
            C'est ici que tu centralises <strong>toutes tes ventes</strong> — lors d'un salon,
            d'une expo, en boutique ou même ponctuellement en dehors de tout événement.
            Chaque euro encaissé passe par ici.
          </p>
        </div>
        <div className={styles['mascot-bubble']}>
          <p className={styles['mascot-text']}>
            Avant de commencer à vendre, il te faut au moins un{' '}
            <strong>Point de vente</strong> — c'est le lieu où se déroulera ta vente :{' '}
            ton stand au salon du livre, ta boutique en ligne, une librairie partenaire…
            Tu peux en créer autant que tu veux et avoir{' '}
            <strong>plusieurs sessions actives simultanément</strong>.
          </p>
          <button className={styles['mascot-btn']} onClick={() => navigate('/points-de-vente')}>
            Créer mon premier point de vente →
          </button>
        </div>
      </div>
    </div>
  )
}

function MascotNeverSession({ onOpen }: { onOpen: () => void }) {
  return (
    <div className={styles['mascot-wrap']}>
      <img src="/img/mascotte/m1.png" alt="" className={styles['mascot-img']} />
      <div className={styles['mascot-bubbles']}>
        <div className={styles['mascot-bubble']}>
          <p className={styles['mascot-title']}>Tout est en place ! 🎉</p>
          <p className={styles['mascot-text']}>
            Pour enregistrer des ventes, deux modes s'offrent à toi :
          </p>
        </div>
        <div className={styles['mascot-bubble']}>
          <p className={styles['mascot-text']}>
            📦 <strong>La session</strong> — tu l'ouvres au début d'une journée de vente ou
            d'un événement, tu enregistres tous tes clients au fil de la journée, puis tu la
            fermes en fin de journée. Idéal pour un salon, une expo, un marché…
            Plusieurs sessions peuvent tourner en même temps sur différents points de vente.
          </p>
        </div>
        <div className={styles['mascot-bubble']}>
          <p className={styles['mascot-text']}>
            ⚡ <strong>La vente hors session</strong> — pour le coup ponctuel et rapide :
            un lecteur te contacte directement, tu enregistres sa commande en deux clics,
            sans ouvrir de session. Parfait pour les ventes en dehors de tout événement.
          </p>
          <button className={styles['mascot-btn']} onClick={onOpen}>
            Ouvrir ma première session →
          </button>
        </div>
      </div>
    </div>
  )
}

function MascotNoActiveSession({ onOpen }: { onOpen: () => void }) {
  return (
    <div className={styles['mascot-wrap']}>
      <img src="/img/mascotte/m1.png" alt="" className={styles['mascot-img']} />
      <div className={styles['mascot-bubbles']}>
        <div className={styles['mascot-bubble']}>
          <p className={styles['mascot-title']}>Prêt à reprendre ? 👋</p>
          <p className={styles['mascot-text']}>
            <strong>Ouvre une session</strong> pour démarrer une journée de vente dans un
            point de vente. Pour une vente rapide et isolée, utilise le bouton{' '}
            <strong>Vente hors session</strong> en haut de page.
          </p>
          <button className={styles['mascot-btn']} onClick={onOpen}>
            Ouvrir une session →
          </button>
        </div>
      </div>
    </div>
  )
}

type MainTab = 'caisse' | 'historique'
type HistoriqueTab = 'sessions' | 'hors-session'

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


export function VentesPage() {
  // ── Navigation ────────────────────────────────────────────────────────
  const [mainTab,       setMainTab]       = useState<MainTab>('caisse')
  const [historiqueTab, setHistoriqueTab] = useState<HistoriqueTab>('sessions')
  const [showHorsSession, setShowHorsSession] = useState(false)

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

  // ── Bilan ─────────────────────────────────────────────────────────────
  const [showBilan, setShowBilan] = useState(false)

  // ── Frais ─────────────────────────────────────────────────────────────
  const [showFraisForm, setShowFraisForm] = useState(false)
  const [fraisType,     setFraisType]     = useState<TypeFrais>('DEPLACEMENT')
  const [fraisMotif,    setFraisMotif]    = useState('')
  const [fraisMontant,  setFraisMontant]  = useState('')

  // ── Data ─────────────────────────────────────────────────────────────
  const { data: pdvList        = [] } = usePointsDeVente()
  const { data: sessions       = [] } = useSessionsCaisse({ statut: 'OUVERTE' })
  const { data: sessionsFermees = [] } = useSessionsCaisse({ statut: 'FERMEE' })
  const { data: rayons    = [] } = useRayons()
  const { data: articles  = [] } = useArticles()
  const { data: ventes    = [] } = useVentes(activeSessionId ?? undefined)

  const franchiseTVA = useFranchiseTVA()
  const openSession  = useOpenSessionCaisse()
  const closeSession = useCloseSessionCaisse()
  const createVente  = useCreateVente()
  const annulerVente = useAnnulerVente()
  const createFrais  = useCreateFrais()
  const deleteFrais  = useDeleteFrais()

  const { data: fraisSession = [] } = useFraisSession(activeSessionId)

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null

  // ── Métriques en temps réel de la session active ──────────────────
  const sessionStats = useMemo(() => {
    const validees = ventes.filter(v => v.statut === 'VALIDEE')
    const caTTC    = validees.reduce((s, v) => s + parseFloat(v.totalTTC), 0)
    const caHT     = validees.reduce((s, v) => s + parseFloat(v.totalHT),  0)
    const totalFrais = fraisSession.reduce((s, f) => s + (f.montantHT ? parseFloat(f.montantHT) : 0), 0)

    // Quantités vendues par article
    const qteMap = new Map<string, number>()
    validees.forEach(v => v.lignes.forEach(l =>
      qteMap.set(l.articleId, (qteMap.get(l.articleId) ?? 0) + l.quantite)
    ))

    let coutDesVentes = 0; let hasCout = false
    qteMap.forEach((qte, articleId) => {
      const art = articles.find(a => a.id === articleId)
      if (!art) return
      const u = art.prixAchatLotHT && art.prixAchatLotQte
        ? parseFloat(art.prixAchatLotHT) / art.prixAchatLotQte
        : art.prixAchatHT ? parseFloat(art.prixAchatHT) : null
      if (u !== null) { coutDesVentes += u * qte; hasCout = true }
    })

    return {
      caTTC,
      nbVentes: validees.length,
      benefice: hasCout ? caHT - coutDesVentes - totalFrais : null,
    }
  }, [ventes, fraisSession, articles])

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
      // Franchise TVA : taux = 0 → TTC = HT
      const taux    = franchiseTVA ? 0 : l.tauxTVA / 100
      const ligneTTC = ligneHT * (1 + taux)
      ht  += ligneHT
      tva += ligneTTC - ligneHT
      ttc += ligneTTC
    }
    return { ht: ht.toFixed(2), tva: tva.toFixed(2), ttc: ttc.toFixed(2) }
  }, [cart, franchiseTVA])

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

  // Si le PDV encaisse lui-même, le mode est toujours PDV
  const pdvEncaisse = activeSession ? !activeSession.pointDeVente.encaissementDirect : false
  const modeEffectif: typeof modePaiement = pdvEncaisse ? 'PDV' : modePaiement

  async function handleValider() {
    if (!activeSessionId || cart.length === 0) return
    await createVente.mutateAsync({
      id:          crypto.randomUUID(),
      sessionId:   activeSessionId,
      modePaiement: modeEffectif,
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
  // ÉCRAN DE SÉLECTION DE SESSION (+ historique)
  // ═══════════════════════════════════════════════════════════════════════
  if (!activeSession) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.headerTitle}>Caisse</h1>
            <p className={styles.headerSubtitle}>
              {sessions.length} session{sessions.length !== 1 ? 's' : ''} active{sessions.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.btnSecondary} onClick={() => setShowHorsSession(true)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
              Vente hors session
            </button>
            {mainTab === 'caisse' && (
              <button className={styles.btnPrimary} onClick={() => setShowOpenModal(true)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Ouvrir une session
              </button>
            )}
          </div>
        </div>

        {/* Onglets principaux */}
        <div className={styles.mainTabBar}>
          <button className={`${styles.mainTab} ${mainTab === 'caisse' ? styles.mainTabActive : ''}`}
            onClick={() => setMainTab('caisse')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Caisse
          </button>
          <button className={`${styles.mainTab} ${mainTab === 'historique' ? styles.mainTabActive : ''}`}
            onClick={() => setMainTab('historique')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            Historique
          </button>
        </div>

        {mainTab === 'caisse' && (
          <div className={styles.sessionSelectPage}>
            {sessions.length > 0 ? (
              <>
                <p className={styles.sessionSelectLabel}>Sessions en cours</p>
                <div className={styles.sessionCards}>
                  {sessions.map((s) => (
                    <button key={s.id} className={styles.sessionCard} onClick={() => setActiveSessionId(s.id)}>
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
            ) : pdvList.length === 0 ? (
              <MascoteBlock slug="caisse-no-pdv" />
            ) : sessionsFermees.length === 0 ? (
              <MascoteBlock slug="caisse-premiere-session" onCta={() => setShowOpenModal(true)} />
            ) : (
              <MascoteBlock slug="caisse-no-active" onCta={() => setShowOpenModal(true)} />
            )}

            {/* Bouton "Ouvrir une session" — masqué si pas de PDV (la mascotte gère la navigation) */}
            {pdvList.length > 0 && (
              <button className={styles.btnPrimary} onClick={() => setShowOpenModal(true)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Ouvrir une nouvelle session
              </button>
            )}
          </div>
        )}

        {mainTab === 'historique' && (
          <div className={styles.historiqueContainer}>
            <div className={styles.historiqueTabBar}>
              <button className={`${styles.historiqueTab} ${historiqueTab === 'sessions' ? styles.historiqueTabActive : ''}`}
                onClick={() => setHistoriqueTab('sessions')}>Sessions fermées</button>
              <button className={`${styles.historiqueTab} ${historiqueTab === 'hors-session' ? styles.historiqueTabActive : ''}`}
                onClick={() => setHistoriqueTab('hors-session')}>Ventes hors session</button>
            </div>
            {historiqueTab === 'sessions'     && <HistoriqueSessions />}
            {historiqueTab === 'hors-session' && <HistoriqueHorsSession />}
          </div>
        )}

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

        <VenteHorsSessionModal isOpen={showHorsSession} onClose={() => setShowHorsSession(false)} />
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

        {/* Métriques live */}
        {sessionStats.nbVentes > 0 && (
          <div className={styles.sessionMetrics}>
            <div className={styles.sessionMetric}>
              <span className={styles.sessionMetricLabel}>CA TTC</span>
              <span className={styles.sessionMetricVal}>
                {sessionStats.caTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </span>
            </div>
            {sessionStats.benefice !== null && (
              <>
                <span className={styles.sessionMetricSep} />
                <div className={styles.sessionMetric}>
                  <span className={styles.sessionMetricLabel}>Bénéfice HT</span>
                  <span className={styles.sessionMetricVal}
                    style={{ color: sessionStats.benefice >= 0 ? '#166534' : '#991b1b', fontWeight: 800 }}>
                    {sessionStats.benefice >= 0 ? '+' : ''}
                    {sessionStats.benefice.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </span>
                </div>
              </>
            )}
            <span className={styles.sessionMetricCount}>
              {sessionStats.nbVentes} vente{sessionStats.nbVentes > 1 ? 's' : ''}
            </span>
          </div>
        )}

        <div className={styles.sessionBarRight}>
          <button className={styles.btnHorsSessionSm} onClick={() => setShowHorsSession(true)}>
            Hors session
          </button>
          <button className={styles.btnBilan} onClick={() => setShowBilan(true)}>
            Bilan
          </button>
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
            {franchiseTVA ? (
              <>
                <div className={styles.totalRow} style={{ color: 'var(--text-soft)', fontSize: '0.72rem' }}>
                  <span>TVA non applicable — art. 293 B CGI</span>
                </div>
                <div className={styles.totalRowBig}><span>Total</span><span>{totals.ttc} €</span></div>
              </>
            ) : (
              <>
                <div className={styles.totalRow}><span>Total HT</span><span>{totals.ht} €</span></div>
                <div className={styles.totalRow}><span>TVA</span><span>{totals.tva} €</span></div>
                <div className={styles.totalRowBig}><span>Total TTC</span><span>{totals.ttc} €</span></div>
              </>
            )}
          </div>

          <div className={styles.payment}>
            {pdvEncaisse ? (
              <div className={styles.pdvEncaisseBadge}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{color:'var(--terra)',flexShrink:0}}>
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                <div>
                  <p className={styles.pdvEncaisseTitle}>Encaissé par le point de vente</p>
                  <p className={styles.pdvEncaisseSub}>Le paiement sera reversé ultérieurement.</p>
                </div>
              </div>
            ) : (
              <>
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
              </>
            )}
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

      {/* ── Frais de session ─────────────────────────────────────────── */}
      <div className={styles.fraisSection}>
        <div className={styles.fraisHeader}>
          <p className={styles.fraisTitle}>Frais de la session</p>
          <button className={styles.btnAddFrais} onClick={() => setShowFraisForm(v => !v)}>
            {showFraisForm ? '✕ Annuler' : '+ Enregistrer un frais'}
          </button>
        </div>

        {showFraisForm && (
          <div className={styles.fraisForm}>
            {/* Type */}
            <div className={styles.fraisTypeGrid}>
              {(Object.keys(TYPE_FRAIS_LABELS) as TypeFrais[]).filter(t => t !== 'DON' && t !== 'PERTE_STOCK').map(t => (
                <button
                  key={t}
                  className={`${styles.fraisTypeBtn} ${fraisType === t ? styles.fraisTypeBtnActive : ''}`}
                  onClick={() => setFraisType(t)}
                >
                  <span>{TYPE_FRAIS_EMOJI[t]}</span>
                  <span>{TYPE_FRAIS_LABELS[t]}</span>
                </button>
              ))}
            </div>
            {/* Motif + montant */}
            <div className={styles.fraisInputRow}>
              <input
                className={styles.fraisMotifInput}
                placeholder="Motif (ex : A7 → salle, péage retour)"
                value={fraisMotif}
                onChange={e => setFraisMotif(e.target.value)}
              />
              <div className={styles.fraisMontantWrap}>
                <input
                  className={styles.fraisMontantInput}
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={fraisMontant}
                  onChange={e => setFraisMontant(e.target.value)}
                />
                <span className={styles.fraisMontantUnit}>€ HT</span>
              </div>
              <button
                className={styles.btnFraisValider}
                disabled={!fraisMotif.trim() || createFrais.isPending}
                onClick={async () => {
                  if (!fraisMotif.trim() || !activeSessionId) return
                  await createFrais.mutateAsync({
                    id: crypto.randomUUID(),
                    sessionId: activeSessionId,
                    type: fraisType,
                    motif: fraisMotif,
                    montantHT: fraisMontant ? parseFloat(fraisMontant.replace(',', '.')) : undefined,
                  })
                  setFraisMotif('')
                  setFraisMontant('')
                  setShowFraisForm(false)
                }}
              >
                {createFrais.isPending ? '…' : 'Ajouter'}
              </button>
            </div>
          </div>
        )}

        {fraisSession.length > 0 && (
          <div className={styles.fraisList}>
            {fraisSession.map(f => (
              <div key={f.id} className={styles.fraisRow}>
                <span className={styles.fraisEmoji}>{TYPE_FRAIS_EMOJI[f.type]}</span>
                <span className={styles.fraisMotif}>{f.motif}</span>
                <span className={styles.fraisType}>{TYPE_FRAIS_LABELS[f.type]}</span>
                <span className={styles.fraisMontant}>
                  {f.montantHT ? `${parseFloat(f.montantHT).toFixed(2)} € HT` : '—'}
                </span>
                <button
                  className={styles.btnDeleteFrais}
                  onClick={() => deleteFrais.mutate(f.id)}
                  title="Supprimer"
                >✕</button>
              </div>
            ))}
            <div className={styles.fraisTotal}>
              Total frais :&nbsp;
              <strong>
                {fraisSession.reduce((s, f) => s + (f.montantHT ? parseFloat(f.montantHT) : 0), 0).toFixed(2)} € HT
              </strong>
            </div>
          </div>
        )}

        {fraisSession.length === 0 && !showFraisForm && (
          <p className={styles.fraisEmpty}>Aucun frais enregistré pour cette session.</p>
        )}
      </div>

      {/* ── Modale bilan ─────────────────────────────────────────────── */}
      {showBilan && (
        <div className={styles.bilanOverlay}>
          <div className={styles.bilanPanel}>
            <BilanSession
              sessionId={activeSessionId!}
              ventes={ventes}
              frais={fraisSession}
              articles={articles}
              sessionNom={activeSession.nom ?? activeSession.pointDeVente.nom}
              onClose={() => setShowBilan(false)}
            />
          </div>
        </div>
      )}

      <VenteHorsSessionModal isOpen={showHorsSession} onClose={() => setShowHorsSession(false)} />

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
