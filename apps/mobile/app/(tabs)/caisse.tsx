import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, Modal, FlatList, useWindowDimensions, Alert,
} from 'react-native'
import { Image } from 'expo-image'
import { GestureDetector, Gesture } from 'react-native-gesture-handler'
import { router, useFocusEffect } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSession, usePointsDeVente } from '@/hooks/useLocalSession'
import { useLocalArticles, LocalArticle } from '@/hooks/useLocalArticles'
import { getDb } from '@/lib/db'
import { useLocalVentes } from '@/hooks/useLocalVentes'
import { api } from '@/lib/api'
import { useDevStore } from '@/store/devStore'
import { useScannerStore } from '@/store/scannerStore'
import { useCategoryColorsStore, CAT_PALETTE } from '@/store/categoryColorsStore'
import { Colors, Dark, Fonts, Radius, Shadow, Gradients } from '@/constants/theme'
import { useAppTheme } from '@/hooks/useAppTheme'
import { usePaymentModesStore, ALL_PAYMENT_MODES, DEFAULT_PAYMENT_MODES } from '@/store/paymentModesStore'
import { SumUp } from '@megesti/react-native-sumup'
import { BarcodeIcon } from '@/components/BarcodeIcon'

type PaymentMode = 'CB' | 'ESPECES' | 'CHEQUE' | 'VIREMENT' | 'PAYPAL' | 'SUMUP' | 'PDV'

interface CartItem {
  id: string
  articleId: string
  nom: string
  prix: number
  prixOrigine: number
  quantite: number
  tauxTva: number
}

const CARD_IMG_H = 96  // hauteur de la zone image/contenu sous la barre accent

function catColor(key: string): string {
  if (!key) return CAT_PALETTE[0]
  let h = 0
  for (let i = 0; i < key.length; i++) { h = ((h << 5) - h) + key.charCodeAt(i); h |= 0 }
  return CAT_PALETTE[Math.abs(h) % CAT_PALETTE.length]
}

// ── Carte produit ────────────────────────────────────────────────────

function ProductCard({ article: a, isDark, addToCart, cart, getCatColor }: {
  article: LocalArticle
  isDark: boolean
  addToCart: (a: LocalArticle) => void
  cart: CartItem[]
  getCatColor: (id: string) => string
}) {
  const rupture = a.stock_local <= 0
  const stockLow = a.stock_local > 0 && a.stock_local <= (a.stock_alerte || 3)
  const accent = getCatColor(a.categorie_id ?? a.rayon_nom ?? a.nom)
  const inCartQty = cart.filter(i => i.articleId === a.id).reduce((s, i) => s + i.quantite, 0)
  const inCart = inCartQty > 0
  return (
    <TouchableOpacity
      style={[styles.productCard, isDark && { backgroundColor: Dark.surface, shadowColor: 'transparent', elevation: 0 }, inCart && { borderColor: accent, borderWidth: 2 }]}
      activeOpacity={rupture ? 1 : 0.75}
      onPress={() => addToCart(a)}>
      <View style={[styles.productAccentBar, { backgroundColor: accent }]} />
      <View style={styles.productInner}>
        <View style={styles.productLeft}>
          <Text style={[styles.productName, isDark && { color: Dark.text }]} numberOfLines={2}>{a.nom}</Text>
          <Text style={[styles.productPrice, { color: accent }]}>
            {a.prix_vente_ht.toFixed(2)} €
          </Text>
          <View style={styles.productStockRow}>
            {rupture ? (
              <Text style={styles.stockRupture}>Rupture</Text>
            ) : stockLow ? (
              <Text style={styles.stockLow}>⚠ {a.stock_local}</Text>
            ) : (
              <Text style={styles.stockOk}>{a.stock_local} ex.</Text>
            )}
          </View>
        </View>
        {a.thumb_app_url ? (
          <Image source={a.thumb_app_url} style={styles.productThumb} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <View style={[styles.productThumbEmpty, { backgroundColor: accent + '18' }]}>
            <Text style={styles.productThumbEmoji}>📚</Text>
          </View>
        )}
      </View>
      {inCart && (
        <View style={[styles.productCartBadge, { backgroundColor: accent }]}>
          <Text style={styles.productCartBadgeText}>{inCartQty}</Text>
        </View>
      )}
      {rupture && <View style={styles.productRuptureOverlay} />}
    </TouchableOpacity>
  )
}

// ── Composant principal ──────────────────────────────────────────────

export default function CaisseScreen() {
  const insets = useSafeAreaInsets()
  const { isDark } = useAppTheme()
  const { width: screenW } = useWindowDimensions()
  const TAB_BAR_H = 68 + insets.bottom

  const catColors = useCategoryColorsStore(s => s.colors)
  function getCatColor(catId: string): string { return catColors[catId] || catColor(catId) }

  const enabledModes = usePaymentModesStore(s => s.enabled)
  const sumupTerminal = usePaymentModesStore(s => s.sumupTerminal)

  // Modes affichés = modes activés dans les settings, SUMUP uniquement si module dispo
  // Fallback sur les modes par défaut si la liste est vide (sécurité)
  const activeModes = enabledModes.length > 0 ? enabledModes : DEFAULT_PAYMENT_MODES
  const PAYMENT_MODES = ALL_PAYMENT_MODES.filter(m =>
    activeModes.includes(m.mode) && (m.mode !== 'SUMUP' || SumUp.isAvailable())
  )

  const { session, openSession, closeSession, refresh: refreshSession } = useLocalSession()
  const { pdvs, loading: pdvsLoading, error: pdvsError } = usePointsDeVente()
  const { articles, pullFromServer } = useLocalArticles()
  const { createVente } = useLocalVentes(session?.id)
  const addLog = useDevStore(s => s.addLog)

  const hasSession = !!session
  const sessionPdv = hasSession ? pdvs.find(p => p.id === session!.point_de_vente_id) : null
  const encaissementDirect = sessionPdv?.encaissementDirect ?? false

  // Sessions ouvertes sur le serveur (quand pas de session locale)
  const [remoteSessions, setRemoteSessions] = useState<any[]>([])
  const [loadingRemote, setLoadingRemote] = useState(false)
  useFocusEffect(useCallback(() => {
    if (!hasSession) {
      setLoadingRemote(true)
      api.get<any[]>('/sessions-caisse?statut=OUVERTE')
        .then(data => setRemoteSessions(data))
        .catch(() => setRemoteSessions([]))
        .finally(() => setLoadingRemote(false))
    } else {
      setRemoteSessions([])
    }
  }, [hasSession]))

  // Adopter une session distante (ferme l'éventuelle session locale d'abord)
  async function adoptSession(remote: any) {
    try {
      const db = await getDb()
      // Récupérer l'ID de l'ancienne session locale pour migrer les ventes
      const oldSession = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM sessions WHERE statut = ? LIMIT 1', ['OUVERTE'],
      )
      await db.runAsync(`UPDATE sessions SET statut = 'FERMEE' WHERE statut = 'OUVERTE'`)
      const articleIds = await pullFromServer()
      await db.runAsync(
        `INSERT OR REPLACE INTO sessions (id, point_de_vente_id, point_de_vente_nom, date_ouverture, fond_ouverture, debiter_stock, statut, articles_exposes, synced)
         VALUES (?, ?, ?, datetime('now'), ?, 1, 'OUVERTE', ?, 1)`,
        [remote.id, remote.pointDeVenteId, remote.pointDeVente?.nom ?? 'Session', remote.fondOuverture ?? 0, JSON.stringify(articleIds)],
      )
      // Migrer les ventes de l'ancienne session vers la nouvelle, puis supprimer l'orpheline
      if (oldSession && oldSession.id !== remote.id) {
        await db.runAsync(`UPDATE ventes_locales SET session_id = ? WHERE session_id = ?`, [remote.id, oldSession.id])
        await db.runAsync(`DELETE FROM sessions WHERE id = ?`, [oldSession.id])
      }
      await refreshSession()
      addLog('info', `Session reprise: ${remote.pointDeVente?.nom}`)
    } catch (e: any) {
      addLog('error', `Échec reprise session: ${e?.message}`)
    }
  }

  // Récupérer les scans du scanner
  const scannedItems = useScannerStore(s => s.items)
  const clearScannedItems = useScannerStore(s => s.clearItems)
  useFocusEffect(useCallback(() => {
    if (scannedItems.length > 0 && hasSession) {
      for (const item of scannedItems) {
        const article = articles.find(a => a.id === item.articleId)
        if (article) {
          setCart(prev => {
            const existing = prev.find(i => i.articleId === article.id)
            if (existing) {
              return prev.map(i => i.articleId === article.id ? { ...i, quantite: i.quantite + 1 } : i)
            }
            const prixArt = article.prix_vente_ht
            return [...prev, { id: Date.now().toString() + Math.random(), articleId: article.id, nom: article.nom, prix: prixArt, prixOrigine: prixArt, quantite: 1 }]
          })
        }
      }
      clearScannedItems()
    }
  }, [scannedItems, hasSession, articles]))

  const [showSessionModal, setShowSessionModal] = useState(false)
  const [fondCaisse, setFondCaisse] = useState('')
  const [selectedPdvId, setSelectedPdvId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedRayon, setSelectedRayon] = useState<string | null>(null)
  const [enabledCats, setEnabledCats] = useState<Set<string>>(new Set())

  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saleError, setSaleError] = useState<string | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<PaymentMode>('CB')
  const [submitting, setSubmitting] = useState(false)

  const exposedIds: string[] = session?.articles_exposes ? JSON.parse(session.articles_exposes) : []

  const rayons = useMemo(() => {
    const set = new Map<string, number>()
    for (const a of articles) {
      if (exposedIds.length && !exposedIds.includes(a.id)) continue
      if (a.rayon_nom) set.set(a.rayon_nom, (set.get(a.rayon_nom) ?? 0) + 1)
    }
    return Array.from(set.entries()).map(([nom, count]) => ({ nom, count }))
  }, [articles, exposedIds.join(',')])

  const categories = useMemo(() => {
    const cats = new Map<string, { id: string; nom: string }>()
    for (const a of articles) {
      if (exposedIds.length && !exposedIds.includes(a.id)) continue
      if (selectedRayon && a.rayon_nom !== selectedRayon) continue
      if (a.categorie_id && a.categorie_nom) cats.set(a.categorie_id, { id: a.categorie_id, nom: a.categorie_nom })
    }
    return Array.from(cats.values()).sort((x, y) => x.nom.localeCompare(y.nom))
  }, [articles, exposedIds.join(','), selectedRayon])

  const filtered = useMemo(() => articles.filter(a => {
    if (exposedIds.length && !exposedIds.includes(a.id)) return false
    if (selectedRayon && a.rayon_nom !== selectedRayon) return false
    if (search && !a.nom.toLowerCase().includes(search.toLowerCase()) && !(a.isbn ?? '').includes(search)) return false
    if (enabledCats.size > 0 && a.categorie_id && !enabledCats.has(a.categorie_id)) return false
    return true
  }), [articles, exposedIds.join(','), selectedRayon, search, enabledCats])

  // Groupement hiérarchique rayon → catégorie (tri alpha dans chaque catégorie)
  const grouped = useMemo(() => {
    if (filtered.length === 0) return null
    if (selectedRayon) {
      // Mode rayon unique : sections = catégories
      const map = new Map<string, typeof filtered>()
      for (const a of filtered) {
        const key = a.categorie_nom ?? 'Sans catégorie'
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(a)
      }
      for (const [, arts] of map) arts.sort((x, y) => x.nom.localeCompare(y.nom))
      return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([cat, articles]) => ({
          label: cat,
          articles,
          color: getCatColor(articles[0]?.categorie_id ?? cat),
          isCategory: true,
        }))
    }
    // Mode tous : sections = rayons, sous-groupes = catégories (sans titre)
    const rayonMap = new Map<string, Map<string, typeof filtered>>()
    for (const a of filtered) {
      const rayon = a.rayon_nom ?? 'Sans rayon'
      const cat = a.categorie_nom ?? 'Sans catégorie'
      if (!rayonMap.has(rayon)) rayonMap.set(rayon, new Map())
      const catMap = rayonMap.get(rayon)!
      if (!catMap.has(cat)) catMap.set(cat, [])
      catMap.get(cat)!.push(a)
    }
    const result: { label: string; color: string; isCategory: boolean; cats: { articles: typeof filtered }[] }[] = []
    for (const [rayon, catMap] of rayonMap) {
      const cats: { articles: typeof filtered }[] = []
      for (const [, articles] of catMap) {
        articles.sort((x, y) => x.nom.localeCompare(y.nom))
        cats.push({ articles })
      }
      const firstArt = cats[0]?.articles[0]
      result.push({
        label: rayon,
        color: getCatColor(firstArt?.categorie_id ?? rayon),
        isCategory: false,
        cats,
      })
    }
    return result
  }, [filtered, selectedRayon, catColors])

  const total = cart.reduce((s, i) => s + i.prix * i.quantite, 0)
  const flatListRef = useRef<FlatList<any>>(null)
  const sectionRefs = useRef<Map<string, View | null>>(new Map())

  // Pull articles et mettre à jour la liste d'exposés de la session
  async function pullAndUpdateSession() {
    const ids = await pullFromServer()
    if (session && ids.length > 0) {
      const db = await getDb()
      await db.runAsync('UPDATE sessions SET articles_exposes = ? WHERE id = ?', [JSON.stringify(ids), session.id])
    }
  }
  useEffect(() => { if (hasSession) pullAndUpdateSession() }, [hasSession])
  useFocusEffect(useCallback(() => { if (hasSession) pullAndUpdateSession() }, [hasSession, pullFromServer]))

  // ── Navigation rayons ──
  function selectRayon(name: string | null) {
    setSelectedRayon(name)
  }

  function goNextRayon() {
    if (rayons.length === 0) return
    if (selectedRayon === null) { selectRayon(rayons[0].nom); return }
    const idx = rayons.findIndex(r => r.nom === selectedRayon)
    selectRayon(idx >= rayons.length - 1 ? null : rayons[idx + 1].nom)
  }
  function goPrevRayon() {
    if (rayons.length === 0) return
    if (selectedRayon === null) { selectRayon(rayons[rayons.length - 1].nom); return }
    const idx = rayons.findIndex(r => r.nom === selectedRayon)
    selectRayon(idx <= 0 ? null : rayons[idx - 1].nom)
  }

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-25, 25])
    .failOffsetY([-10, 10])
    .runOnJS(true)
    .onEnd((e) => {
      if (e.translationX < -50 && e.velocityX < 0) goNextRayon()
      else if (e.translationX > 50 && e.velocityX > 0) goPrevRayon()
    })

  async function handleOpenSession() {
    if (!selectedPdvId) return
    const pdv = pdvs.find(p => p.id === selectedPdvId)
    if (!pdv) return
    const fond = pdv.encaissementDirect ? (parseFloat(fondCaisse) || 0) : 0
    try {
      const articleIds = await pullFromServer()
      await openSession(selectedPdvId, pdv.nom, fond, articleIds)
      setShowSessionModal(false); setFondCaisse(''); setSelectedPdvId(null)
    } catch (e: any) { addLog('error', `Erreur ouverture: ${e?.message}`) }
  }

  function handleCloseSession() {
    if (typeof (Alert as any).prompt === 'function') {
      // iOS — input natif
      ;(Alert as any).prompt(
        'Fermer la session',
        'Fond de caisse restant (€)',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Confirmer', onPress: (v: string) => closeSession(parseFloat(v?.replace(',', '.') ?? '0') || 0) },
        ],
        'plain-text', '0', 'decimal-pad'
      )
    } else {
      // Android — confirmation simple, fond = 0
      Alert.alert(
        'Fermer la session',
        'Confirmer la fermeture ? Le fond de clôture sera enregistré à 0 €.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Fermer', style: 'destructive', onPress: () => closeSession(0) },
        ]
      )
    }
  }

  const [editingPrice, setEditingPrice] = useState<string | null>(null)
  const [editPriceVal, setEditPriceVal] = useState('')

  function addToCart(article: LocalArticle) {
    if (article.stock_local <= 0) return
    setCart(prev => {
      // Grouper seulement si même article ET prix non modifié
      const existing = prev.find(i => i.articleId === article.id && i.prix === i.prixOrigine)
      if (existing) {
        if (existing.quantite >= article.stock_local) return prev
        return prev.map(i => i.articleId === article.id && i.prix === i.prixOrigine
          ? { ...i, quantite: i.quantite + 1 } : i)
      }
      const prix = article.prix_vente_ht
      return [...prev, { id: Date.now().toString(), articleId: article.id, nom: article.nom, prix, prixOrigine: prix, quantite: 1, tauxTva: article.taux_tva }]
    })
  }

  function updateQte(id: string, delta: number) {
    setCart(prev => prev.map(i => {
      if (i.id !== id) return i
      const q = i.quantite + delta
      // Si la quantité atteint 0, on supprime la ligne
      return q <= 0 ? { ...i, quantite: 0 } : { ...i, quantite: q }
    }).filter(i => i.quantite > 0))
  }

  function removeFromCart(id: string) {
    setCart(prev => prev.filter(i => i.id !== id))
  }

  function updatePrice(id: string) {
    const val = parseFloat(editPriceVal.replace(',', '.'))
    if (!isNaN(val) && val >= 0) {
      setCart(prev => prev.map(i => i.id === id ? { ...i, prix: val } : i))
    }
    setEditingPrice(null)
  }

  function clearCart() { setCart([]); setShowCart(false) }

  async function handleSale() {
    if (cart.length === 0 || submitting) return
    setSaleError(null)
    setSubmitting(true)
    const payment = encaissementDirect ? selectedPayment : 'PDV'
    try {
      // ── Encaissement SumUp : déclencher le terminal avant d'enregistrer ──
      if (payment === 'SUMUP') {
        const result = await SumUp.checkout(total, 'EUR', 'Vente MeGesti')
        if (!result.success) {
          setSaleError(result.message ?? 'Paiement SumUp annulé ou échoué.')
          addLog('warn', `SumUp refusé: ${result.message ?? result.errorCode}`)
          setSubmitting(false)
          return
        }
        addLog('info', `SumUp OK — code: ${result.transactionCode ?? '?'}`)
      }

      await createVente({
        sessionId: session?.id,
        modePaiement: payment,
        lignes: cart.map(item => ({
          articleId: item.articleId,
          nom: item.nom,
          quantite: item.quantite,
          prixUnitaireHT: item.prix,
          tauxTva: item.tauxTva,
        })),
      })
      setCart([]); setShowCart(false); setShowConfirm(false)
      refreshSession()
      addLog('info', `Vente validée: ${total.toFixed(2)} €`)
    } catch (e: any) {
      addLog('error', `Erreur vente: ${e?.message}`)
      setSaleError(e?.message ?? 'Erreur inconnue')
      if (hasSession) pullFromServer().catch(() => {})
    } finally { setSubmitting(false) }
  }

  // ════════════════════════════════════════════════════════════════
  // RENDU : Session fermée
  // ════════════════════════════════════════════════════════════════
  if (!hasSession) {
    return (
      <View style={[styles.shell, isDark && { backgroundColor: Dark.bg }]}>
        <LinearGradient colors={isDark ? [Dark.bg, Dark.bg] : [Colors.roseLight, Colors.cream]} style={styles.bg} />
        <ScrollView contentContainerStyle={styles.centerCard} showsVerticalScrollIndicator={false}>
          <Text style={styles.emptyEmoji}>📖</Text>
          <Text style={styles.emptyTitle}>Session de caisse</Text>

          {/* Sessions distantes trouvées */}
          {remoteSessions.length > 0 && (
            <View style={styles.remoteWrap}>
              <Text style={[styles.remoteTitle, isDark && { color: Dark.textSoft }]}>
                {remoteSessions.length} session{remoteSessions.length > 1 ? 's' : ''} ouverte{remoteSessions.length > 1 ? 's' : ''} sur le serveur
              </Text>
              {remoteSessions.map((rs: any) => (
                <TouchableOpacity key={rs.id} style={[styles.remoteCard, isDark && { backgroundColor: Dark.surface, borderColor: 'rgba(255,255,255,0.08)' }]}
                  activeOpacity={0.8} onPress={() => { adoptSession(rs).catch(() => {}) }}>
                  <View style={styles.remoteInfo}>
                    <Text style={[styles.remoteName, isDark && { color: Dark.text }]}>{rs.pointDeVente?.nom ?? 'Sans nom'}</Text>
                    <Text style={[styles.remoteDate, isDark && { color: Dark.textSoft }]}>
                      Ouverte le {new Date(rs.dateOuverture).toLocaleDateString('fr-FR')} · {rs._count?.ventes ?? 0} vente{rs._count?.ventes !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <Text style={styles.remoteArrow}>→</Text>
                </TouchableOpacity>
              ))}
              <Text style={[styles.remoteOr, isDark && { color: Dark.textSoft }]}>— ou —</Text>
            </View>
          )}

          <Text style={[styles.emptySub, isDark && { color: Dark.textSoft }]}>
            {remoteSessions.length > 0 ? 'Ou démarrez une nouvelle session.' : 'Ouvrez une session pour commencer à enregistrer vos ventes.'}
          </Text>
          <TouchableOpacity style={styles.openBtn} activeOpacity={0.85}
            onPress={() => setShowSessionModal(true)}>
            <LinearGradient colors={isDark ? Gradients.caisseDark : Gradients.caisse} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.openBtnBg}>
              <Text style={styles.openBtnText}>Ouvrir une nouvelle session</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>

        <Modal visible={showSessionModal} transparent animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1}
            onPress={() => setShowSessionModal(false)}>
            <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
              <Text style={styles.modalTitle}>Nouvelle session</Text>
              <Text style={styles.sectionLabel}>Point de vente</Text>
              {pdvsLoading ? (
                <Text style={styles.hint}>Chargement…</Text>
              ) : pdvsError ? (
                <Text style={styles.errorHint}>Erreur : {pdvsError}</Text>
              ) : pdvs.length === 0 ? (
                <Text style={styles.hint}>Aucun point de vente. Créez-en un depuis l'interface web.</Text>
              ) : (
                pdvs.map(pdv => (
                  <TouchableOpacity key={pdv.id}
                    style={[styles.pdvOption, selectedPdvId === pdv.id && styles.pdvOptionActive]}
                    onPress={() => setSelectedPdvId(pdv.id)} activeOpacity={0.7}>
                    <Text style={[styles.pdvOptionText, selectedPdvId === pdv.id && styles.pdvOptionTextActive]}>
                      {pdv.nom}
                    </Text>
                    {pdv.encaissementDirect && (
                      <Text style={styles.pdvOptionMeta}>Règlement à la caisse du PDV</Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
              {selectedPdvId && pdvs.find(p => p.id === selectedPdvId)?.encaissementDirect && (
                <>
                  <Text style={styles.sectionLabel}>Fond de caisse (€)</Text>
                  <TextInput style={styles.modalInput} value={fondCaisse} onChangeText={setFondCaisse}
                    placeholder="0.00" placeholderTextColor={Colors.textSoft} keyboardType="decimal-pad" />
                </>
              )}
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setShowSessionModal(false)}
                  style={styles.modalBtnCancel} activeOpacity={0.7}>
                  <Text style={styles.modalBtnCancelText}>Annuler</Text>
                </TouchableOpacity>
                {(() => {
                  const sel = pdvs.find(p => p.id === selectedPdvId)
                  const canOpen = !!selectedPdvId && (!sel?.encaissementDirect || !!fondCaisse)
                  return (
                    <TouchableOpacity onPress={canOpen ? handleOpenSession : undefined}
                      activeOpacity={canOpen ? 0.85 : 1} style={styles.modalBtnConfirm}>
                      <LinearGradient
                        colors={canOpen ? Gradients.caisse : [Colors.textSoft, Colors.textSoft]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={styles.modalBtnConfirmBg}>
                        <Text style={styles.modalBtnConfirmText}>Ouvrir</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )
                })()}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    )
  }

  // ════════════════════════════════════════════════════════════════
  // RENDU : Session ouverte
  // ════════════════════════════════════════════════════════════════

  function toggleCat(id: string) {
    setEnabledCats(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const rayonIdx = rayons.findIndex(r => r.nom === selectedRayon)

  return (
    <View style={[styles.shell, isDark && { backgroundColor: Dark.bg }]}>
      <LinearGradient colors={isDark ? [Dark.bg, Dark.bg, Dark.bg] : ['#FAF0EC', Colors.cream, Colors.cream]} style={styles.bg} />

      {/* ── Header gradient rose→mauve ── */}
      <LinearGradient
        colors={isDark ? Gradients.caisseDark : Gradients.caisse}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={[styles.headerGradient, { paddingTop: 48 + insets.top }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerPdv}>{session!.point_de_vente_nom}</Text>
            <Text style={styles.headerSub}>
              {filtered.length} articles · {cart.length > 0 ? `${cart.length} au panier` : 'Session ouverte'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={async () => {
                const db = await getDb()
                await db.runAsync(`UPDATE sessions SET statut = 'FERMEE' WHERE statut = 'OUVERTE'`)
                await refreshSession()
                setRemoteSessions([])
              }}
              style={styles.changeBtn} activeOpacity={0.7}>
              <Text style={styles.changeBtnText}>Changer</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCloseSession} style={styles.closeBtn} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recherche */}
        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput style={styles.searchInput} value={search} onChangeText={setSearch}
              placeholder="Titre, ISBN…" placeholderTextColor="rgba(255,255,255,0.45)" />
          </View>
          <TouchableOpacity
            style={styles.scanBtn}
            activeOpacity={0.7}
            onPress={() => router.push('/scanner?mode=vente')}>
            <BarcodeIcon size={22} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Rayons — toujours présent pour hauteur fixe du header */}
        <View style={[styles.rayonRow, { opacity: rayons.length > 1 ? 1 : 0 }]}
          pointerEvents={rayons.length > 1 ? 'auto' : 'none'}>
          <TouchableOpacity onPress={goPrevRayon} style={styles.rayonArrow} activeOpacity={0.6}>
            <Text style={styles.rayonArrowText}>‹</Text>
          </TouchableOpacity>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rayonTabs}>
            <TouchableOpacity style={[styles.rayonTab, !selectedRayon && styles.rayonTabActive]}
              activeOpacity={0.7} onPress={() => selectRayon(null)}>
              <Text style={[styles.rayonTabText, !selectedRayon && styles.rayonTabTextActive]}>Tous</Text>
            </TouchableOpacity>
            {rayons.map(r => (
              <TouchableOpacity key={r.nom}
                style={[styles.rayonTab, selectedRayon === r.nom && styles.rayonTabActive]}
                activeOpacity={0.7} onPress={() => selectRayon(r.nom)}>
                <Text style={[styles.rayonTabText, selectedRayon === r.nom && styles.rayonTabTextActive]}>{r.nom}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity onPress={goNextRayon} style={styles.rayonArrow} activeOpacity={0.6}>
            <Text style={styles.rayonArrowText}>›</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── Catégories (chips fixes, hauteur constante) ── */}
      <View style={[styles.catBarFixed, isDark && { backgroundColor: Dark.bg, borderBottomColor: 'rgba(255,255,255,0.06)' }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRowContent}>
          <TouchableOpacity
            style={[styles.catChip, enabledCats.size === 0 && styles.catChipAll]}
            onPress={() => setEnabledCats(new Set())} activeOpacity={0.7}>
            <Text style={[styles.catChipText, enabledCats.size === 0 && styles.catChipTextActive]}>Tous</Text>
          </TouchableOpacity>
          {categories.map(c => {
            const color = getCatColor(c.id)
            const active = enabledCats.has(c.id)
            return (
              <TouchableOpacity key={c.id}
                style={[styles.catChip, { borderColor: color }, active && { backgroundColor: color }]}
                onPress={() => toggleCat(c.id)} activeOpacity={0.7}>
                <Text style={[styles.catChipText, active && styles.catChipTextActive]}>{c.nom}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {/* ── Grille produits (avec swipe pour changer de rayon) ── */}
      <GestureDetector gesture={swipeGesture}>
      {grouped ? (
        /* ── Mode groupé (rayons ou catégories) ── */
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: TAB_BAR_H + 100 }}
          style={{ flex: 1 }}>
          {grouped.map(section => (
            <View key={section.label} ref={r => { sectionRefs.current.set(section.label, r) }}>
              {/* Bandeau : fin pour rayon, normal pour catégorie */}
              {section.isCategory ? (
                <View style={[styles.catBandeau, { borderLeftColor: section.color }, isDark && { backgroundColor: Dark.surface }]}>
                  <Text style={[styles.catBandeauTitle, isDark && { color: Dark.text }]}>{section.label}</Text>
                </View>
              ) : (
                <View style={[styles.rayonBandeau, { borderLeftColor: section.color }, isDark && { backgroundColor: Dark.surface }]}>
                  <Text style={[styles.rayonBandeauTitle, isDark && { color: Dark.text }]}>{section.label}</Text>
                </View>
              )}
              {/* Grille produits par sous-groupe */}
              <View style={styles.productGrid}>
                {section.cats.map((cat, ci) => {
                  const rows: (typeof cat.articles)[] = []
                  for (let i = 0; i < cat.articles.length; i += 2) rows.push(cat.articles.slice(i, i + 2))
                  return (
                    <View key={ci} style={ci > 0 ? styles.catGap : undefined}>
                      {rows.map((row, ri) => (
                        <View key={ri} style={styles.productRow}>
                          {row.map(a => (
                            <ProductCard key={a.id} article={a} isDark={isDark} addToCart={addToCart} cart={cart} getCatColor={getCatColor} />
                          ))}
                          {row.length === 1 && <View style={{ flex: 1, maxWidth: '48%' }} />}
                        </View>
                      ))}
                    </View>
                  )
                })}
              </View>
            </View>
          ))}
          {filtered.length === 0 && (
            <View style={styles.emptyList}>
              <Text style={styles.emptyListEmoji}>📚</Text>
              <Text style={styles.emptyListText}>Aucun article trouvé</Text>
            </View>
          )}
        </ScrollView>
      ) : null}
      </GestureDetector>

      {/* ── Barre panier ── */}
      {cart.length > 0 && (
        <TouchableOpacity
          style={[styles.cartBar, { bottom: TAB_BAR_H + 8 }]}
          activeOpacity={0.9}
          onPress={() => { setShowCart(true); setShowConfirm(false) }}>
          <LinearGradient colors={Gradients.caisse} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.cartBarBg}>
            <View style={styles.cartBarBadge}>
              <Text style={styles.cartBarBadgeText}>{cart.length}</Text>
            </View>
            <Text style={styles.cartBarLabel}>Voir le panier</Text>
            <Text style={styles.cartBarTotal}>{total.toFixed(2)} €</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* ── Bottom sheet panier ── */}
      <Modal visible={showCart} transparent animationType="slide" onRequestClose={() => setShowCart(false)}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setShowCart(false)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Panier</Text>
              <TouchableOpacity onPress={clearCart} activeOpacity={0.7}>
                <Text style={styles.sheetClear}>Vider</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
              {cart.map(item => (
                <View key={item.id} style={styles.cartRow}>
                  <View style={styles.cartRowInfo}>
                    <Text style={styles.cartRowName}>{item.nom}</Text>
                    {editingPrice === item.id ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <TextInput
                          style={styles.cartPriceInput}
                          value={editPriceVal}
                          onChangeText={setEditPriceVal}
                          keyboardType="decimal-pad"
                          autoFocus
                          selectTextOnFocus
                        />
                        <TouchableOpacity
                          style={styles.cartPriceOk}
                          onPress={() => updatePrice(item.id)}
                          activeOpacity={0.7}>
                          <Text style={styles.cartPriceOkText}>✓</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        onPress={() => { setEditingPrice(item.id); setEditPriceVal(String(item.prix)) }}>
                        {item.prix !== item.prixOrigine ? (
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <Text style={styles.cartRowOldPrice}>{item.prixOrigine.toFixed(2)} €</Text>
                            <Text style={styles.cartRowNewPrice}>{item.prix.toFixed(2)} € / u.</Text>
                          </View>
                        ) : (
                          <Text style={styles.cartRowUnit}>{item.prix.toFixed(2)} € / u.</Text>
                        )}
                        <Text style={styles.cartRowEditHint}>✎</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.cartRowQty}>
                    <TouchableOpacity onPress={() => updateQte(item.id, -1)} style={styles.qtyBtn} activeOpacity={0.6}>
                      <Text style={styles.qtyBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{item.quantite}</Text>
                    <TouchableOpacity onPress={() => updateQte(item.id, 1)} style={styles.qtyBtn} activeOpacity={0.6}>
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.cartRowTotal}>{(item.prix * item.quantite).toFixed(2)} €</Text>
                  <TouchableOpacity style={styles.cartDelBtn} activeOpacity={0.5}
                    onPress={() => removeFromCart(item.id)}>
                    <Text style={styles.cartDelIcon}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            <View style={[styles.sheetFooter, { paddingBottom: insets.bottom + 8 }]}>
              <View style={styles.sheetTotalRow}>
                <Text style={styles.sheetTotalLabel}>Total</Text>
                <Text style={styles.sheetTotalValue}>{total.toFixed(2)} €</Text>
              </View>
              <TouchableOpacity activeOpacity={0.85} onPress={() => setShowConfirm(true)}>
                <LinearGradient colors={Gradients.sessions} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.validateBtn}>
                  <Text style={styles.validateBtnText}>Valider la vente</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Confirmation paiement ── */}
      <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(false)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Confirmer la vente</Text>
            <Text style={styles.confirmTotal}>{total.toFixed(2)} €</Text>
            <Text style={styles.confirmArticles}>{cart.length} article{cart.length > 1 ? 's' : ''}</Text>
            {saleError && (
              <View style={styles.confirmError}>
                <Text style={styles.confirmErrorText}>{saleError}</Text>
                <Text style={styles.confirmErrorHint}>Les articles seront resynchronisés. Réessayez.</Text>
              </View>
            )}
            {encaissementDirect && (
              <>
                <Text style={styles.confirmSectionLabel}>Mode de paiement</Text>
                <View style={styles.confirmPayRow}>
                  {PAYMENT_MODES.map(p => (
                    <TouchableOpacity key={p.mode}
                      style={[styles.confirmPayChip, selectedPayment === p.mode && styles.confirmPayChipActive]}
                      activeOpacity={0.7} onPress={() => setSelectedPayment(p.mode)}>
                      <Text style={styles.confirmPayEmoji}>{p.emoji}</Text>
                      <Text style={[styles.confirmPayLabel, selectedPayment === p.mode && styles.confirmPayLabelActive]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.confirmBtnCancel} activeOpacity={0.7}
                onPress={() => { setShowConfirm(false); setSaleError(null) }}>
                <Text style={styles.confirmBtnCancelText}>Retour</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtnOk} activeOpacity={0.85}
                disabled={submitting} onPress={handleSale}>
                <LinearGradient colors={Gradients.sessions} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.confirmBtnOkBg}>
                  <Text style={styles.confirmBtnOkText}>{submitting ? 'Envoi…' : 'Confirmer'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

// ══════════════════════════════════════════════════════════════════════
// Styles
// ══════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: Colors.cream },
  bg: { ...StyleSheet.absoluteFillObject },

  centerCard: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontFamily: Fonts.displayItalic, fontSize: 22, color: Colors.rose, fontStyle: 'italic', marginBottom: 8 },
  emptySub: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textSoft, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  openBtn: { borderRadius: Radius.lg, overflow: 'hidden', width: '100%' },
  openBtnBg: { paddingVertical: 16, alignItems: 'center' },
  openBtnText: { fontFamily: Fonts.body, fontSize: 15, fontWeight: '700', color: Colors.white },

  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'center', alignItems: 'center', padding: 28 },
  modalCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 24, width: '100%', maxWidth: 380, shadowColor: Colors.text, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.10, shadowRadius: 24, elevation: 8 },
  modalTitle: { fontFamily: Fonts.displayItalic, fontSize: 20, color: Colors.rose, fontStyle: 'italic', marginBottom: 16 },
  sectionLabel: { fontFamily: Fonts.body, fontSize: 11, fontWeight: '700', color: Colors.textSoft, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6, marginTop: 14 },
  modalInput: { fontFamily: Fonts.body, fontSize: 15, color: Colors.text, backgroundColor: Colors.cream, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1.5, borderColor: 'rgba(196,132,122,0.2)' },
  pdvOption: { padding: 14, borderRadius: Radius.md, backgroundColor: Colors.cream, marginBottom: 6, borderWidth: 2, borderColor: 'transparent' },
  pdvOptionActive: { borderColor: Colors.rose, backgroundColor: Colors.roseLight },
  pdvOptionText: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '600', color: Colors.textMid },
  pdvOptionTextActive: { color: Colors.roseDark },
  pdvOptionMeta: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSoft, marginTop: 2 },
  hint: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textSoft, paddingVertical: 8, fontStyle: 'italic' },
  errorHint: { fontFamily: Fonts.body, fontSize: 13, color: Colors.terra, paddingVertical: 8 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalBtnCancel: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: Radius.md, backgroundColor: Colors.cream },
  modalBtnCancelText: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '600', color: Colors.textMid },
  modalBtnConfirm: { flex: 1, borderRadius: Radius.md, overflow: 'hidden' },
  modalBtnConfirmBg: { paddingVertical: 14, alignItems: 'center' },
  modalBtnConfirmText: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '700', color: Colors.white },

  headerGradient: { paddingBottom: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, marginBottom: 12 },
  headerLeft: { flex: 1 },
  headerPdv: { fontFamily: Fonts.displayItalic, fontSize: 20, color: Colors.white, fontStyle: 'italic' },
  headerSub: { fontFamily: Fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 3 },
  closeBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full },
  closeBtnText: { fontFamily: Fonts.body, fontSize: 12, fontWeight: '700', color: Colors.white },
  changeBtn: { backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full },
  changeBtnText: { fontFamily: Fonts.body, fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },

  // Sessions distantes
  remoteWrap: { width: '100%', marginBottom: 16 },
  remoteTitle: { fontFamily: Fonts.body, fontSize: 12, fontWeight: '700', color: Colors.textSoft, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, textAlign: 'center' },
  remoteCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 16, marginBottom: 8,
    borderWidth: 1.5, borderColor: Colors.sageLight, ...Shadow.card,
  },
  remoteInfo: { flex: 1 },
  remoteName: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '700', color: Colors.text },
  remoteDate: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSoft, marginTop: 3 },
  remoteArrow: { fontFamily: Fonts.body, fontSize: 18, color: Colors.sage, fontWeight: '600' },
  remoteOr: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textSoft, textAlign: 'center', marginBottom: 8, fontStyle: 'italic' },

  searchRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 12, gap: 10 },
  searchWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: Radius.md, paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  searchIcon: { fontSize: 15, marginRight: 6 },
  searchInput: { flex: 1, fontFamily: Fonts.body, fontSize: 14, color: Colors.white, paddingVertical: 10 },
  scanBtn: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },

  rayonRow: { flexDirection: 'row', alignItems: 'center' },
  rayonArrow: { width: 32, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  rayonArrowText: { fontFamily: Fonts.body, fontSize: 24, color: 'rgba(255,255,255,0.5)', fontWeight: '300' },
  rayonTabs: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  rayonTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full },
  rayonTabActive: { backgroundColor: 'rgba(255,255,255,0.22)' },
  rayonTabText: { fontFamily: Fonts.body, fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.55)' },
  rayonTabTextActive: { color: Colors.white },

  catBarFixed: { height: 48, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.cream, justifyContent: 'center' },
  catRowContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 6, flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  catChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.creamDark },
  catChipAll: { backgroundColor: Colors.text, borderColor: Colors.text },
  catChipText: { fontFamily: Fonts.body, fontSize: 11, fontWeight: '600', color: Colors.textMid },
  catChipTextActive: { color: Colors.white },

  // Bandeau rayon (fin, Tous mode)
  rayonBandeau: {
    marginHorizontal: 16, marginTop: 12, marginBottom: 6,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: Colors.white, borderRadius: Radius.md,
    borderLeftWidth: 3,
    shadowColor: Colors.text, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
  },
  rayonBandeauTitle: { fontFamily: Fonts.displayItalic, fontSize: 16, color: Colors.text, fontStyle: 'italic' },

  // Bandeau catégorie (mode rayon unique)
  catBandeau: {
    marginHorizontal: 16, marginTop: 14, marginBottom: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    borderLeftWidth: 4,
    shadowColor: Colors.text, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  catBandeauTitle: { fontFamily: Fonts.displayItalic, fontSize: 17, color: Colors.text, fontStyle: 'italic' },

  // Grille produits
  productGrid: { paddingHorizontal: 16 },
  productRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  catGap: { marginTop: 8 },
  productCard: {
    flex: 1, backgroundColor: Colors.white, borderRadius: Radius.lg, overflow: 'hidden',
    borderWidth: 2, borderColor: 'transparent',
    shadowColor: Colors.text, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    marginBottom: 10, maxWidth: '48%',
  },
  productAccentBar: { height: 5 },
  productInner: { flexDirection: 'row', height: CARD_IMG_H },
  productLeft: { flex: 1, padding: 8, justifyContent: 'space-between' },
  productName: { fontFamily: Fonts.body, fontSize: 12, fontWeight: '600', color: Colors.text, lineHeight: 17 },
  productPrice: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '800' },
  productStockRow: { marginTop: 2 },
  stockOk: { fontFamily: Fonts.body, fontSize: 10, color: Colors.sage, fontWeight: '600' },
  stockLow: { fontFamily: Fonts.body, fontSize: 10, color: Colors.gold, fontWeight: '600' },
  stockRupture: { fontFamily: Fonts.body, fontSize: 10, color: Colors.terra, fontWeight: '700' },
  productThumb: { width: '40%', height: '100%' },
  productThumbEmpty: { width: '40%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  productThumbEmoji: { fontSize: 24 },
  productCartBadge: {
    position: 'absolute', top: 8, right: 8,
    borderRadius: Radius.full, width: 22, height: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  productCartBadgeText: { fontFamily: Fonts.body, fontSize: 11, fontWeight: '700', color: Colors.white },
  productRuptureOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.55)' },
  emptyList: { alignItems: 'center', paddingTop: 60 },
  emptyListEmoji: { fontSize: 40, marginBottom: 12 },
  emptyListText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textSoft },

  cartBar: { position: 'absolute', left: 16, right: 16, borderRadius: Radius.lg, overflow: 'hidden', shadowColor: Colors.text, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.10, shadowRadius: 24, elevation: 8 },
  cartBarBg: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  cartBarBadge: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: Radius.full, width: 26, height: 26, justifyContent: 'center', alignItems: 'center' },
  cartBarBadgeText: { fontFamily: Fonts.body, fontSize: 13, fontWeight: '700', color: Colors.white },
  cartBarLabel: { flex: 1, fontFamily: Fonts.body, fontSize: 14, fontWeight: '600', color: Colors.white },
  cartBarTotal: { fontFamily: Fonts.body, fontSize: 16, fontWeight: '700', color: Colors.white, marginRight: 4 },

  sheetOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.white, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, maxHeight: '85%' },
  sheetHandle: { width: 36, height: 4, backgroundColor: Colors.creamDark, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
  sheetTitle: { fontFamily: Fonts.displayItalic, fontSize: 20, color: Colors.rose, fontStyle: 'italic' },
  sheetClear: { fontFamily: Fonts.body, fontSize: 13, fontWeight: '600', color: Colors.terra },
  sheetList: { paddingHorizontal: 20, maxHeight: 340 },
  cartRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.cream },
  cartRowInfo: { flex: 1 },
  cartRowName: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '600', color: Colors.text },
  cartRowUnit: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSoft, marginTop: 2 },
  cartRowOldPrice: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSoft, textDecorationLine: 'line-through' as const },
  cartRowNewPrice: { fontFamily: Fonts.body, fontSize: 11, fontWeight: '700', color: Colors.terra },
  cartPriceInput: {
    fontFamily: Fonts.body, fontSize: 11, color: Colors.ink,
    backgroundColor: Colors.cream, borderRadius: Radius.sm,
    paddingHorizontal: 8, paddingVertical: 4, width: 72,
    borderWidth: 1, borderColor: Colors.rose,
  },
  cartPriceOk: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.sage, justifyContent: 'center', alignItems: 'center',
  },
  cartPriceOkText: { fontSize: 12, fontWeight: '700', color: Colors.white },
  cartRowEditHint: { fontSize: 10, color: Colors.textSoft, marginLeft: 2 },
  cartRowQty: { flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 12 },
  qtyBtn: { width: 30, height: 30, borderRadius: Radius.full, backgroundColor: Colors.cream, justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { fontSize: 16, color: Colors.rose, fontWeight: '600' },
  qtyValue: { fontFamily: Fonts.body, fontSize: 15, fontWeight: '700', color: Colors.text, minWidth: 20, textAlign: 'center' },
  cartRowTotal: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '700', color: Colors.roseDark, minWidth: 56, textAlign: 'right' },
  cartDelBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.terraLight, justifyContent: 'center', alignItems: 'center', marginLeft: 6 },
  cartDelIcon: { fontSize: 9, color: Colors.terra, fontWeight: '700' },

  // Swipe actions
  swipeRowWrap: { position: 'relative', overflow: 'hidden', borderRadius: Radius.md },
  swipeBgBtn: { position: 'absolute', top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', width: 64 },
  swipeEditBg: { right: 0, backgroundColor: Colors.inkLight, borderTopRightRadius: Radius.md, borderBottomRightRadius: Radius.md },
  swipeDeleteBg: { left: 0, backgroundColor: Colors.terra, borderTopLeftRadius: Radius.md, borderBottomLeftRadius: Radius.md },
  swipeDeleteText: { fontSize: 18, color: Colors.white },
  swipeEditText: { fontFamily: Fonts.body, fontSize: 11, fontWeight: '700', color: Colors.white },
  sheetFooter: { paddingHorizontal: 20, paddingTop: 16 },
  sheetTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sheetTotalLabel: { fontFamily: Fonts.body, fontSize: 12, fontWeight: '700', color: Colors.textSoft, textTransform: 'uppercase', letterSpacing: 0.6 },
  sheetTotalValue: { fontFamily: Fonts.displayItalic, fontSize: 28, color: Colors.rose, fontStyle: 'italic' },
  validateBtn: { paddingVertical: 16, borderRadius: Radius.md, alignItems: 'center' },
  validateBtnText: { fontFamily: Fonts.body, fontSize: 15, fontWeight: '700', color: Colors.white },

  confirmOverlay: { flex: 1, backgroundColor: 'rgba(36,39,51,0.5)', justifyContent: 'center', alignItems: 'center', padding: 28 },
  confirmCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 28, width: '100%', maxWidth: 340, alignItems: 'center', shadowColor: Colors.text, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.10, shadowRadius: 24, elevation: 8 },
  confirmTitle: { fontFamily: Fonts.displayItalic, fontSize: 18, color: Colors.rose, fontStyle: 'italic', marginBottom: 16 },
  confirmTotal: { fontFamily: Fonts.displayItalic, fontSize: 42, color: Colors.sage, fontStyle: 'italic' },
  confirmArticles: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textSoft, marginBottom: 20 },
  confirmError: { backgroundColor: Colors.terraLight, borderRadius: Radius.md, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(200,93,58,0.2)' },
  confirmErrorText: { fontFamily: Fonts.body, fontSize: 12, fontWeight: '700', color: Colors.terra, textAlign: 'center' },
  confirmErrorHint: { fontFamily: Fonts.body, fontSize: 10, color: Colors.textSoft, textAlign: 'center', marginTop: 4 },
  confirmSectionLabel: { fontFamily: Fonts.body, fontSize: 11, fontWeight: '700', color: Colors.textSoft, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, alignSelf: 'flex-start' },
  confirmPayRow: { flexDirection: 'row', gap: 6, marginBottom: 24, alignSelf: 'stretch' },
  confirmPayChip: { flex: 1, alignItems: 'center', padding: 10, borderRadius: Radius.md, backgroundColor: Colors.cream, borderWidth: 2, borderColor: 'transparent' },
  confirmPayChipActive: { borderColor: Colors.rose, backgroundColor: Colors.roseLight },
  confirmPayEmoji: { fontSize: 18, marginBottom: 2 },
  confirmPayLabel: { fontFamily: Fonts.body, fontSize: 9, fontWeight: '600', color: Colors.textSoft },
  confirmPayLabelActive: { color: Colors.roseDark },
  confirmActions: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  confirmBtnCancel: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: Radius.md, backgroundColor: Colors.cream },
  confirmBtnCancelText: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '600', color: Colors.textMid },
  confirmBtnOk: { flex: 1.5, borderRadius: Radius.md, overflow: 'hidden' },
  confirmBtnOkBg: { paddingVertical: 14, alignItems: 'center' },
  confirmBtnOkText: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '700', color: Colors.white },
})
