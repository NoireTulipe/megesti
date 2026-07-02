import { generateUUID } from '@/lib/utils'
import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
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
import { getImageUrl } from '@/lib/api'
import { Modal } from '@/components/ui/Modal'
import { HelpButton } from '@/components/HelpButton'
import { PageHero } from '@/components/PageHero'
import styles from './VentesPage.module.css'
import { MascoteBlock } from '@/components/MascoteBlock'

type MainTab = 'caisse' | 'historique'
type HistoriqueTab = 'sessions' | 'hors-session'

const MODES: { key: ModePaiement; label: string }[] = [
  { key: 'CB',       label: 'CB' },
  { key: 'ESPECES',  label: 'Espèces' },
  { key: 'CHEQUE',   label: 'Chèque' },
  { key: 'VIREMENT', label: 'Virement' },
]

const MODE_META: Record<string, { label: string; color: string }> = {
  CB:       { label: 'CB',       color: '#3D5470' },
  ESPECES:  { label: 'Espèces',  color: '#6B8F71' },
  CHEQUE:   { label: 'Chèque',   color: '#C9933A' },
  VIREMENT: { label: 'Virement', color: '#8B7BAB' },
  SUMUP:    { label: 'SumUp',    color: '#C4907C' },
  PDV:      { label: 'PDV',      color: '#C85D3A' },
}

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}


export function VentesPage() {
  // •"?•"? Navigation •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?
  const [mainTab,       setMainTab]       = useState<MainTab>('caisse')
  const [historiqueTab, setHistoriqueTab] = useState<HistoriqueTab>('sessions')
  const [showHorsSession, setShowHorsSession] = useState(false)

  // •"?•"? Session •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [showOpenModal,   setShowOpenModal]   = useState(false)
  const [openPDVId,       setOpenPDVId]       = useState('')
  const [fondOuverture,   setFondOuverture]   = useState(0)
  const [debiterStockME,  setDebiterStockME]  = useState(true)
  const [sessionNom,      setSessionNom]      = useState('')
  const [fondFermeture,   setFondFermeture]   = useState(0)

  // •"?•"? Articles / Rayon •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?
  const [selectedRayonId, setSelectedRayonId] = useState<string | null>(null)
  const [search,          setSearch]          = useState('')

  // •"?•"? Panier •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?
  const [cart,         setCart]         = useState<CartLigne[]>([])
  const [modePaiement, setModePaiement] = useState<ModePaiement>('CB')
  const [editPrixId,   setEditPrixId]   = useState<string | null>(null)
  const [editPrixVal,  setEditPrixVal]  = useState('')

  // •"?•"? Bilan •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?
  const [showBilan,       setShowBilan]       = useState(false)
  const [closeModeActive, setCloseModeActive] = useState(false)

  // •"?•"? Annulation vente •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?
  const [annulerConfirmId, setAnnulerConfirmId] = useState<string | null>(null)

  // •"?•"? Accordéons •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?
  const [fraisOpen,  setFraisOpen]  = useState(false)
  const [ventesOpen, setVentesOpen] = useState(false)

  // •"?•"? Frais •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?
  const [showFraisForm, setShowFraisForm] = useState(false)
  const [fraisType,     setFraisType]     = useState<TypeFrais>('DEPLACEMENT')
  const [fraisMotif,    setFraisMotif]    = useState('')
  const [fraisMontant,  setFraisMontant]  = useState('')

  // •"?•"? Data •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?
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

  // •"?•"? Métriques en temps réel de la session active •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?
  const sessionStats = useMemo(() => {
    const validees = ventes.filter(v => v.statut === 'VALIDEE')
    const caTTC    = validees.reduce((s, v) => s + parseFloat(v.totalTTC), 0)
    const caHT     = validees.reduce((s, v) => s + parseFloat(v.totalHT),  0)
    const totalFrais = fraisSession.filter(f => f.actif).reduce((s, f) => s + (f.montantHT ? parseFloat(f.montantHT) : 0), 0)

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

  // Groupement par catégorie (ou par rayon si "Tous" sans filtre rayon)
  const articleGroups = useMemo(() => {
    if (search) return [{ label: null as string | null, articles: filteredArticles }]

    if (selectedRayonId) {
      // Rayon sélectionné → grouper par catégorie
      const map = new Map<string, { label: string; articles: typeof filteredArticles }>()
      const sans: typeof filteredArticles = []
      for (const a of filteredArticles) {
        if (a.categorie) {
          if (!map.has(a.categorieId!)) map.set(a.categorieId!, { label: a.categorie.nom, articles: [] })
          map.get(a.categorieId!)!.articles.push(a)
        } else {
          sans.push(a)
        }
      }
      const groups = Array.from(map.values())
      if (sans.length) groups.push({ label: 'Sans catégorie', articles: sans })
      return groups
    }

    // "Tous" → grouper par rayon
    const map = new Map<string, { label: string; articles: typeof filteredArticles }>()
    for (const a of filteredArticles) {
      if (!map.has(a.rayonId)) map.set(a.rayonId, { label: a.rayon.nom, articles: [] })
      map.get(a.rayonId)!.articles.push(a)
    }
    return Array.from(map.values())
  }, [filteredArticles, search, selectedRayonId])

  // •"?•"? Cart helpers •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?
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

  // •"?•"? Handlers •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?
  async function handleOuvrirSession() {
    if (!openPDVId) return
    const s = await openSession.mutateAsync({
      id: generateUUID(), pointDeVenteId: openPDVId,
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
    setShowBilan(false)
    setCloseModeActive(false)
    setFondFermeture(0)
  }

  // Si le PDV encaisse lui-même, le mode est toujours PDV
  const pdvEncaisse = activeSession ? !activeSession.pointDeVente.encaissementDirect : false
  const modeEffectif: typeof modePaiement = pdvEncaisse ? 'PDV' : modePaiement

  async function handleValider() {
    if (!activeSessionId || cart.length === 0) return
    await createVente.mutateAsync({
      id:          generateUUID(),
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

  // •.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.•
  // … DE S… DE SESSION (+ historique)
  // •.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.•
  if (!activeSession) {
    return (
      <div className={styles.page}>
        <PageHero
          title="Caisse"
          subtitle={<>{sessions.length} session{sessions.length !== 1 ? 's' : ''} active{sessions.length !== 1 ? 's' : ''}</>}
        >
          <div className={styles.headerActions}>
            <button className={styles.btnSecondary} onClick={() => setShowHorsSession(true)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
              Vente hors session
            </button>
            <HelpButton slug="aide-ventespage-switch" className={styles['tab-help']} />
            {mainTab === 'caisse' && (
              <button className={styles.btnPrimary} onClick={() => setShowOpenModal(true)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Ouvrir une session
              </button>
            )}
          </div>
        </PageHero>

        {/* Onglets principaux */}
        <div className={styles.mainTabBar}  style={{ alignItems: 'center' }}>
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
          <HelpButton slug="aide-ventespage-historique" className={styles['tab-help']} />
        </div>

        {mainTab === 'caisse' && (
          <div className={styles.sessionSelectPage}>
            {sessions.length > 0 ? (
              <>
                <p className={styles.sessionSelectLabel}>Sessions en cours <HelpButton slug="aide-caisse-session" className={styles['tab-help']} /></p>
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

  // •.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.•
  // … CAISSE ACTIVE
  // •.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.••.•
  return (
    <div className={styles.page}>

      {/* •"?•"? Barre session •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"? */}
      <div className={styles.sessionBar}>
        <div className={styles.sessionBarLeft}>
          <span className={styles.sessionBarDot} />
          <span className={styles.sessionBarPDV}>{activeSession.pointDeVente.nom}</span>
          <button
            className={styles.btnChangerPdv}
            onClick={() => { setActiveSessionId(null); setCart([]) }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 3l4 4-4 4"/><path d="M20 7H4"/>
              <path d="M8 21l-4-4 4-4"/><path d="M4 17h16"/>
            </svg>
            Changer de PdV
          </button>
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
                  <span className={styles.sessionMetricLabel}>{franchiseTVA ? 'Bénéfice' : 'Bénéfice HT'}</span>
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
          <button className={styles.btnBilan} onClick={() => { setShowBilan(true); setCloseModeActive(false) }}>
            Bilan
          </button>
          <button className={styles.btnFermer} onClick={() => { setShowBilan(true); setCloseModeActive(true) }}>
            Fermer la session
          </button>
        </div>
      </div>

      {/* •"?•"? Contenu POS •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"? */}
      <div className={styles.body}>

        {/* •"?•"? Panel gauche : articles •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"? */}
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

          {/* Grille articles groupée */}
          <div className={styles.articleGrid}>
            {filteredArticles.length === 0 && (
              <p className={styles.noArticles}>Aucun article{search ? ` pour « ${search} »` : ''}.</p>
            )}
            {articleGroups.map((group, gi) => (
              <div key={gi} className={styles.catGroup}>
                {group.label && (
                  <div className={styles.catGroupHeader}>
                    <span className={styles.catGroupLabel}>{group.label}</span>
                  </div>
                )}
                <div className={styles.catGroupGrid}>
                  {group.articles.map((a) => {
                    const imgUrl    = getImageUrl(a.imageUrl)
                    const inCartQty = cart.filter(l => l.articleId === a.id).reduce((s, l) => s + l.quantite, 0)
                    const rupture   = a.stock <= 0
                    const stockLow  = !rupture && a.stockAlerte > 0 && a.stock <= a.stockAlerte
                    const stockWarn = !rupture && !stockLow && a.stockTension > 0 && a.stock <= a.stockTension
                    return (
                      <button
                        key={a.id}
                        className={`${styles.articleTile} ${inCartQty > 0 ? styles.tileInCart : ''} ${rupture ? styles.tileRupture : ''}`}
                        onClick={() => addToCart(a)}
                        disabled={rupture}
                      >
                        {/* Image */}
                        <div className={styles.tileImgWrap}>
                          {imgUrl ? (
                            <img src={imgUrl} alt={a.nom} className={styles.tileImg} />
                          ) : (
                            <div className={styles.tileImgEmpty}>
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                <rect x="3" y="3" width="18" height="18" rx="3"/>
                                <circle cx="8.5" cy="8.5" r="1.5"/>
                                <polyline points="21 15 16 10 5 21"/>
                              </svg>
                            </div>
                          )}
                          {rupture && (
                            <div className={styles.tileRuptureOverlay}>
                              <span className={styles.tileRuptureBadge}>Rupture</span>
                            </div>
                          )}
                          {inCartQty > 0 && (
                            <div className={styles.tileCartBadge}>{inCartQty}</div>
                          )}
                        </div>
                        {/* Contenu */}
                        <div className={styles.tileContent}>
                          <span className={styles.tileNom}>{a.nom}</span>
                          <div className={styles.tileMeta}>
                            <span className={styles.tilePrix}>{Number(a.prixVenteHT).toFixed(2)} €</span>
                            <span className={stockLow ? styles.tileStockAlert : stockWarn ? styles.tileStockWarn : styles.tileStock}>
                              {a.stock} ex.
                            </span>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* •"?•"? Panel droit : panier •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"? */}
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
                              onBlur={() => confirmPrixEdit(l.articleId)}
                              autoFocus
                            />
                            <button
                              className={styles.prixEditCancel}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => { setEditPrixId(null); setEditPrixVal('') }}
                            >✕</button>
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
                  <p className={styles.pdvEncaisseTitle}>Encaissé par le point de vente <HelpButton slug="aide-caisse-paiementpointdevente" className={styles['tab-help']} /></p>
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

      {/* •"?•"? Frais de session •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"? */}
      <div className={styles.fraisSection}>
        <button
          className={styles.sectionAccHead}
          onClick={() => { setFraisOpen(o => !o); if (fraisOpen) setShowFraisForm(false) }}
        >
          <span className={styles.sectionAccTitle}>Frais de la session</span>
          {fraisSession.filter(f => f.actif).length > 0 && (
            <span className={styles.sectionAccCount}>{fraisSession.filter(f => f.actif).length}</span>
          )}
          {fraisSession.filter(f => f.actif).length > 0 && (
            <span className={styles.sectionAccTotal}>
              {fraisSession.filter(f => f.actif).reduce((s, f) => s + (f.montantHT ? parseFloat(f.montantHT) : 0), 0).toFixed(2)} €{!franchiseTVA && ' HT'}
            </span>
          )}
          <svg className={styles.sectionAccChevron} style={{ transform: fraisOpen ? 'rotate(180deg)' : undefined }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>

        {fraisOpen && (
          <div className={styles.sectionAccBody}>
            <div className={styles.fraisBodyHeader}>
              <button className={styles.btnAddFrais} onClick={() => setShowFraisForm(v => !v)}>
                {showFraisForm ? '✕ Annuler' : '+ Enregistrer un frais'}
              </button>
              <HelpButton slug="aide-caisse-frais" className={styles['tab-help']} />
            </div>

            {showFraisForm && (
              <div className={styles.fraisForm}>
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
                    <span className={styles.fraisMontantUnit}>€{!franchiseTVA && ' HT'}</span>
                  </div>
                  <button
                    className={styles.btnFraisValider}
                    disabled={!fraisMotif.trim() || createFrais.isPending}
                    onClick={async () => {
                      if (!fraisMotif.trim() || !activeSessionId) return
                      await createFrais.mutateAsync({
                        id: generateUUID(),
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
                  <div key={f.id} className={`${styles.fraisRow} ${!f.actif ? styles.fraisRowDeleted : ''}`}>
                    <span className={styles.fraisEmoji}>{TYPE_FRAIS_EMOJI[f.type]}</span>
                    <span className={styles.fraisMotif}>{f.motif}</span>
                    <span className={styles.fraisType}>{TYPE_FRAIS_LABELS[f.type]}</span>
                    <span className={styles.fraisMontant}>
                      {f.montantHT ? `${parseFloat(f.montantHT).toFixed(2)} €${franchiseTVA ? '' : ' HT'}` : '—'}
                    </span>
                    {f.actif ? (
                      <button className={styles.btnDeleteFrais} onClick={() => deleteFrais.mutate(f.id)} title="Supprimer">✕</button>
                    ) : (
                      <span className={styles.fraisAnnule}>annulé</span>
                    )}
                  </div>
                ))}
                <div className={styles.fraisTotal}>
                  Total frais :&nbsp;
                  <strong>
                    {fraisSession.filter(f => f.actif).reduce((s, f) => s + (f.montantHT ? parseFloat(f.montantHT) : 0), 0).toFixed(2)} €{!franchiseTVA && ' HT'}
                  </strong>
                </div>
              </div>
            )}

            {fraisSession.length === 0 && !showFraisForm && (
              <p className={styles.fraisEmpty}>Aucun frais enregistré pour cette session.</p>
            )}
          </div>
        )}
      </div>

      {/* •"?•"? Ventes de la session •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"? */}
      <div className={styles.ventesSection}>
        <button className={styles.sectionAccHead} onClick={() => setVentesOpen(o => !o)}>
          <span className={styles.sectionAccTitle}>Ventes de la session</span>
          <span className={styles.sectionAccCount}>{ventes.filter(v => v.statut === 'VALIDEE').length}</span>
          <svg className={styles.sectionAccChevron} style={{ transform: ventesOpen ? 'rotate(180deg)' : undefined }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>

        {ventesOpen && (
          <div className={styles.sectionAccBody}>
            {ventes.length === 0 && (
              <p className={styles.fraisEmpty}>Aucune vente enregistrée pour cette session.</p>
            )}
            {ventes.map(v => {
              const annulee = v.statut === 'ANNULEE'
              const meta    = MODE_META[v.modePaiement]
              return (
                <div key={v.id} className={`${styles.venteSessionRow} ${annulee ? styles.venteSessionRowAnnulee : ''}`}>
                  <div className={styles.venteSessionLeft}>
                    <span className={styles.venteSessionNum}>#{v.numero}</span>
                    <span className={styles.venteSessionHeure}>{fmtTime(v.dateVente)}</span>
                    {annulee
                      ? <span className={styles.venteAnnuleeBadge}>Annulée</span>
                      : <span className={styles.venteSessionMode}
                          style={{ background: `${meta?.color ?? '#888'}18`, color: meta?.color ?? '#888' }}>
                          {meta?.label ?? v.modePaiement}
                        </span>
                    }
                    <div className={styles.venteSessionArticles}>
                      {v.lignes.map(l => (
                        <span key={l.id} className={styles.venteSessionPill}>
                          {l.article.nom}{l.quantite > 1 ? ` ×${l.quantite}` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className={styles.venteSessionRight}>
                    <span className={styles.venteSessionMontant}>
                      {parseFloat(v.totalTTC).toFixed(2)} €
                    </span>
                    {!annulee && (
                      annulerConfirmId === v.id
                        ? (
                          <div className={styles.annulerConfirm}>
                            <span className={styles.annulerConfirmTxt}>Confirmer ?</span>
                            <button
                              className={styles.annulerConfirmYes}
                              disabled={annulerVente.isPending}
                              onClick={() => { annulerVente.mutate({ id: v.id }); setAnnulerConfirmId(null) }}
                            >
                              {annulerVente.isPending ? '…' : 'Oui'}
                            </button>
                            <button className={styles.annulerConfirmNo} onClick={() => setAnnulerConfirmId(null)}>
                              Non
                            </button>
                          </div>
                        ) : (
                          <button className={styles.btnAnnulerVente} onClick={() => setAnnulerConfirmId(v.id)}>
                            Annuler
                          </button>
                        )
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* •"?•"? Modale bilan •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"? */}
      {showBilan && createPortal(
        <div className={styles.bilanOverlay}>
          <div className={styles.bilanPanel} style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <BilanSession
                sessionId={activeSessionId!}
                ventes={ventes}
                frais={fraisSession}
                articles={articles}
                sessionNom={activeSession.nom ?? activeSession.pointDeVente.nom}
                commissionFixe={activeSession.pointDeVente.commissionFixe}
                commissionPourcent={activeSession.pointDeVente.commissionPourcent}
                onClose={() => { setShowBilan(false); setCloseModeActive(false) }}
              />
            </div>
            {closeModeActive && (
              <div style={{
                padding: '16px 20px', borderTop: '1.5px solid rgba(255,255,255,0.1)',
                background: 'var(--ink)', display: 'flex', gap: 12, alignItems: 'center',
              }}>
                <label style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap' }}>
                  Fond de caisse (€)
                </label>
                <input
                  type="number" min={0} value={fondFermeture}
                  onChange={(e) => setFondFermeture(Number(e.target.value))}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 8,
                    border: '1.5px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)',
                    color: '#fff', fontSize: '0.9rem',
                  }}
                />
                <button
                  onClick={handleFermerSession}
                  disabled={closeSession.isPending}
                  style={{
                    padding: '9px 18px', borderRadius: 8, border: 'none',
                    background: closeSession.isPending ? 'rgba(200,93,58,0.4)' : 'var(--terra)',
                    color: '#fff', fontWeight: 700, fontSize: '0.85rem',
                    cursor: closeSession.isPending ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  {closeSession.isPending ? 'Clôture…' : '✓ Clôturer la session'}
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      <VenteHorsSessionModal isOpen={showHorsSession} onClose={() => setShowHorsSession(false)} />

      {/* •"?•"? Modals •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"? */}
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

// •"?•"? Composant modal ouverture (partagé entre les deux écrans) •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?

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
                {salons.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
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




