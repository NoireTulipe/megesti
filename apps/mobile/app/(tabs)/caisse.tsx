import { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, Modal, Alert } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSession, usePointsDeVente } from '@/hooks/useLocalSession'
import { useLocalArticles } from '@/hooks/useLocalArticles'
import { useLocalVentes } from '@/hooks/useLocalVentes'
import { useDevStore } from '@/store/devStore'
import { Colors, Fonts, Radius, Shadow } from '@/constants/theme'

type PaymentMode = 'CB' | 'ESPECES' | 'CHEQUE' | 'VIREMENT' | 'SUMUP' | 'PDV'

interface CartItem {
  id: string
  articleId: string
  nom: string
  prix: number
  quantite: number
}

const PAYMENT_MODES: { mode: PaymentMode; label: string; emoji: string }[] = [
  { mode: 'CB', label: 'CB', emoji: '💳' },
  { mode: 'ESPECES', label: 'Espèces', emoji: '💶' },
  { mode: 'CHEQUE', label: 'Chèque', emoji: '📝' },
  { mode: 'SUMUP', label: 'SumUp', emoji: '📱' },
]

export default function CaisseScreen() {
  const { session, loading: sessionLoading, openSession, closeSession, refresh: refreshSession } = useLocalSession()
  const { pdvs, loading: pdvsLoading } = usePointsDeVente()
  const { articles, pullFromServer } = useLocalArticles()
  const { createVente, stats } = useLocalVentes(session?.id)
  const addLog = useDevStore(s => s.addLog)

  const [showSessionModal, setShowSessionModal] = useState(false)
  const [fondCaisse, setFondCaisse] = useState('')
  const [selectedPdvId, setSelectedPdvId] = useState<string | null>(null)
  const [selectArticles, setSelectArticles] = useState<'all' | 'choose'>('all')
  const [search, setSearch] = useState('')

  // Panier
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<PaymentMode>('CB')

  // Session ouverte ?
  const hasSession = !!session

  // Récupérer les articles exposés depuis la session
  useEffect(() => {
    if (hasSession && session!.articles_exposes) {
      const ids = JSON.parse(session!.articles_exposes)
      pullFromServer(ids)
    }
  }, [hasSession, session?.articles_exposes])

  // ── Ouverture session ──
  async function handleOpenSession() {
    if (!fondCaisse || !selectedPdvId) return
    const pdv = pdvs.find(p => p.id === selectedPdvId)
    if (!pdv) return

    try {
      // Pull les articles depuis l'API
      await pullFromServer(selectArticles === 'all' ? undefined : undefined)
      // Pour l'instant on prend tous les articles
      const articleIds = articles.map(a => a.id)
      await openSession(selectedPdvId, pdv.nom, parseFloat(fondCaisse), articleIds)
      addLog('info', `Session ouverte: ${pdv.nom}`)
      setShowSessionModal(false)
    } catch (e: any) {
      addLog('error', `Erreur ouverture: ${e?.message}`)
    }
  }

  async function handleCloseSession() {
    Alert.alert(
      'Fermer la session',
      'Cette action est irréversible. Vérifiez votre fond de caisse final.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Fermer', style: 'destructive',
          onPress: () => {
            Alert.prompt
              ? Alert.prompt('Fond de caisse final (€)', '', [
                  { text: 'Annuler', style: 'cancel' },
                  { text: 'Fermer', onPress: (val?: string) => {
                    if (val) closeSession(parseFloat(val))
                  }},
                ])
              : closeSession(0) // fallback si prompt pas dispo
          },
        },
      ],
    )
  }

  // ── Panier ──
  function addToCart(article: { id: string; nom: string; prix_vente_ht: number }) {
    setCart(prev => {
      const existing = prev.find(i => i.articleId === article.id)
      if (existing) {
        return prev.map(i => i.articleId === article.id
          ? { ...i, quantite: i.quantite + 1 }
          : i)
      }
      return [...prev, {
        id: Date.now().toString(),
        articleId: article.id,
        nom: article.nom,
        prix: article.prix_vente_ht,
        quantite: 1,
      }]
    })
  }

  function updateQte(id: string, delta: number) {
    setCart(prev => prev.map(i => {
      if (i.id !== id) return i
      const q = i.quantite + delta
      return q <= 0 ? i : { ...i, quantite: q }
    }).filter(i => i.quantite > 0))
  }

  const total = cart.reduce((s, i) => s + i.prix * i.quantite, 0)

  async function handleSale() {
    if (cart.length === 0) return
    try {
      await createVente({
        sessionId: session?.id,
        modePaiement: selectedPayment,
        lignes: cart.map(item => ({
          articleId: item.articleId,
          nom: item.nom,
          quantite: item.quantite,
          prixUnitaireHT: item.prix,
        })),
      })
      setCart([])
      setShowCart(false)
      refreshSession()
    } catch (e: any) {
      addLog('error', `Erreur vente: ${e?.message}`)
    }
  }

  // ── Session fermée ──
  if (!hasSession) {
    return (
      <View style={styles.shell}>
        <LinearGradient colors={[Colors.roseLight, Colors.cream]} style={styles.bg} />
        <View style={styles.centerCard}>
          <Text style={styles.emptyEmoji}>📖</Text>
          <Text style={styles.emptyTitle}>Session de caisse</Text>
          <Text style={styles.emptySub}>
            Ouvrez une session pour commencer à enregistrer vos ventes en salon.
          </Text>
          <TouchableOpacity style={styles.openBtn} activeOpacity={0.8}
            onPress={() => setShowSessionModal(true)}>
            <LinearGradient colors={[Colors.ink, Colors.inkLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.openBtnBg}>
              <Text style={styles.openBtnText}>Ouvrir une session</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Modal visible={showSessionModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Nouvelle session</Text>

              <Text style={styles.modalLabel}>Point de vente</Text>
              {pdvs.map(pdv => (
                <TouchableOpacity key={pdv.id}
                  style={[styles.pdvOption, selectedPdvId === pdv.id && styles.pdvOptionActive]}
                  onPress={() => setSelectedPdvId(pdv.id)}>
                  <Text style={[styles.pdvOptionText, selectedPdvId === pdv.id && styles.pdvOptionTextActive]}>
                    {pdv.nom}
                  </Text>
                  {pdv.encaissementDirect && (
                    <Text style={styles.pdvOptionMeta}>Paiement à la caisse du PDV</Text>
                  )}
                </TouchableOpacity>
              ))}

              <Text style={styles.modalLabel}>Fond de caisse (€)</Text>
              <TextInput style={styles.modalInput} value={fondCaisse} onChangeText={setFondCaisse}
                placeholder="0.00" placeholderTextColor={Colors.textSoft} keyboardType="decimal-pad" />

              <Text style={styles.modalLabel}>Articles exposés</Text>
              <View style={styles.articleChoice}>
                <TouchableOpacity
                  style={[styles.articleChoiceBtn, selectArticles === 'all' && styles.articleChoiceBtnActive]}
                  onPress={() => setSelectArticles('all')}>
                  <Text style={[styles.articleChoiceText, selectArticles === 'all' && styles.articleChoiceTextActive]}>
                    Tous
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.articleChoiceBtn, selectArticles === 'choose' && styles.articleChoiceBtnActive]}
                  onPress={() => setSelectArticles('choose')}>
                  <Text style={[styles.articleChoiceText, selectArticles === 'choose' && styles.articleChoiceTextActive]}>
                    Choisir
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setShowSessionModal(false)} style={styles.modalBtnCancel}>
                  <Text style={styles.modalBtnCancelText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleOpenSession}
                  style={styles.modalBtnConfirm} disabled={!fondCaisse || !selectedPdvId}>
                  <LinearGradient colors={[Colors.ink, Colors.inkLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.modalBtnConfirmBg}>
                    <Text style={styles.modalBtnConfirmText}>Ouvrir</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    )
  }

  // ── Session ouverte ──
  const exposedIds: string[] = session?.articles_exposes ? JSON.parse(session.articles_exposes) : []
  const filtered = articles.filter(a =>
    (exposedIds.length === 0 || exposedIds.includes(a.id)) &&
    a.nom.toLowerCase().includes(search.toLowerCase()))

  return (
    <View style={styles.shell}>
      <LinearGradient colors={[Colors.inkFaint, Colors.cream]} style={styles.bg} />
      <View style={styles.sessionBar}>
        <View>
          <Text style={styles.sessionBarTitle}>{session!.point_de_vente_nom}</Text>
          <Text style={styles.sessionBarSub}>{cart.length} article{cart.length > 1 ? 's' : ''} · {total.toFixed(2)} €</Text>
        </View>
        <TouchableOpacity onPress={handleCloseSession} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>Fermer</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput style={styles.searchInput} value={search} onChangeText={setSearch}
            placeholder="Rechercher un article…" placeholderTextColor={Colors.textSoft} />
        </View>
        <TouchableOpacity style={styles.scanBtn} activeOpacity={0.7}>
          <Text style={styles.scanBtnEmoji}>📷</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.articleGrid} showsVerticalScrollIndicator={false}>
        {filtered.map(a => (
          <TouchableOpacity key={a.id} style={styles.articleCard} activeOpacity={0.7}
            onPress={() => addToCart(a)}>
            <View style={styles.articleImgPlaceholder}>
              <Text style={styles.articleImgEmoji}>📚</Text>
            </View>
            <Text style={styles.articleName} numberOfLines={2}>{a.nom}</Text>
            <Text style={styles.articlePrice}>{a.prix_vente_ht.toFixed(2)} €</Text>
            <Text style={styles.articleStock}>{a.stock_local} en stock</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Panier flottant */}
      {cart.length > 0 && (
        <TouchableOpacity style={styles.cartFab} activeOpacity={0.9}
          onPress={() => setShowCart(true)}>
          <LinearGradient colors={[Colors.ink, Colors.inkLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.cartFabBg}>
            <Text style={styles.cartFabCount}>{cart.length}</Text>
            <Text style={styles.cartFabLabel}>Voir le panier</Text>
            <Text style={styles.cartFabTotal}>{total.toFixed(2)} €</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Modal panier */}
      <Modal visible={showCart} transparent animationType="slide">
        <View style={styles.cartOverlay}>
          <View style={styles.cartSheet}>
            <View style={styles.cartHandle} />
            <Text style={styles.cartTitle}>Panier</Text>

            {cart.map(item => (
              <View key={item.id} style={styles.cartRow}>
                <View style={styles.cartRowLeft}>
                  <Text style={styles.cartItemName}>{item.nom}</Text>
                  <Text style={styles.cartItemPrice}>{item.prix.toFixed(2)} € / u.</Text>
                </View>
                <View style={styles.cartQteRow}>
                  <TouchableOpacity onPress={() => updateQte(item.id, -1)}
                    style={styles.cartQteBtn}>
                    <Text style={styles.cartQteBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.cartQte}>{item.quantite}</Text>
                  <TouchableOpacity onPress={() => updateQte(item.id, 1)}
                    style={styles.cartQteBtn}>
                    <Text style={styles.cartQteBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.cartRowTotal}>{(item.prix * item.quantite).toFixed(2)} €</Text>
              </View>
            ))}

            <Text style={styles.paymentTitle}>Mode de paiement</Text>
            <View style={styles.paymentRow}>
              {PAYMENT_MODES.map(p => (
                <TouchableOpacity key={p.mode}
                  style={[styles.paymentChip, selectedPayment === p.mode && styles.paymentChipActive]}
                  onPress={() => setSelectedPayment(p.mode)}>
                  <Text style={styles.paymentChipEmoji}>{p.emoji}</Text>
                  <Text style={[styles.paymentChipLabel, selectedPayment === p.mode && styles.paymentChipLabelActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.cartFooter}>
              <View>
                <Text style={styles.cartTotalLabel}>Total</Text>
                <Text style={styles.cartTotalValue}>{total.toFixed(2)} €</Text>
              </View>
              <TouchableOpacity onPress={handleSale} activeOpacity={0.85}>
                <LinearGradient colors={[Colors.terra, '#D9775A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.validateBtn}>
                  <Text style={styles.validateBtnText}>Valider la vente</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: Colors.cream },
  bg: { ...StyleSheet.absoluteFillObject },

  // Session fermée
  centerCard: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontFamily: Fonts.display, fontSize: 24, color: Colors.ink, fontStyle: 'italic', marginBottom: 8 },
  emptySub: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textSoft, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  openBtn: { borderRadius: Radius.md, overflow: 'hidden', width: '100%' },
  openBtnBg: { paddingVertical: 16, alignItems: 'center' },
  openBtnText: { fontFamily: Fonts.body, fontSize: 15, fontWeight: '700', color: Colors.white },

  // Modal ouverture session
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'center', alignItems: 'center', padding: 28 },
  modalCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 24, width: '100%', maxWidth: 380, maxHeight: '80%', ...Shadow.float },
  modalTitle: { fontFamily: Fonts.display, fontSize: 22, color: Colors.ink, fontStyle: 'italic', marginBottom: 20 },
  modalLabel: { fontFamily: Fonts.body, fontSize: 11, fontWeight: '700', color: Colors.textSoft, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6, marginTop: 12 },
  modalInput: { fontFamily: Fonts.body, fontSize: 15, color: Colors.text, backgroundColor: Colors.cream, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1.5, borderColor: 'rgba(36,51,71,0.08)', marginBottom: 8 },
  pdvOption: { padding: 14, borderRadius: Radius.md, backgroundColor: Colors.cream, marginBottom: 6, borderWidth: 2, borderColor: 'transparent' },
  pdvOptionActive: { borderColor: Colors.ink, backgroundColor: Colors.inkFaint },
  pdvOptionText: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '600', color: Colors.textMid },
  pdvOptionTextActive: { color: Colors.ink },
  pdvOptionMeta: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSoft, marginTop: 2 },
  articleChoice: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  articleChoiceBtn: { flex: 1, padding: 12, borderRadius: Radius.md, backgroundColor: Colors.cream, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  articleChoiceBtnActive: { borderColor: Colors.ink, backgroundColor: Colors.inkFaint },
  articleChoiceText: { fontFamily: Fonts.body, fontSize: 13, fontWeight: '600', color: Colors.textMid },
  articleChoiceTextActive: { color: Colors.ink },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  modalBtnCancel: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: Radius.md, backgroundColor: Colors.cream },
  modalBtnCancelText: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '600', color: Colors.textMid },
  modalBtnConfirm: { flex: 1, borderRadius: Radius.md, overflow: 'hidden' },
  modalBtnConfirmBg: { paddingVertical: 14, alignItems: 'center' },
  modalBtnConfirmText: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '700', color: Colors.white },

  // Barre session
  sessionBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12 },
  sessionBarTitle: { fontFamily: Fonts.display, fontSize: 20, color: Colors.ink, fontStyle: 'italic' },
  sessionBarSub: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textSoft, marginTop: 2 },
  closeBtn: { backgroundColor: Colors.terraLight, paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.full },
  closeBtnText: { fontFamily: Fonts.body, fontSize: 12, fontWeight: '700', color: Colors.terra },

  // Recherche
  searchRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 16 },
  searchWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.md, paddingHorizontal: 12, borderWidth: 1.5, borderColor: 'rgba(36,51,71,0.06)' },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontFamily: Fonts.body, fontSize: 14, color: Colors.text, paddingVertical: 12 },
  scanBtn: { width: 48, height: 48, backgroundColor: Colors.roseLight, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center' },
  scanBtnEmoji: { fontSize: 22 },

  // Grille articles
  articleGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 120, gap: 10 },
  articleCard: { width: '47%', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 12, ...Shadow.card },
  articleImgPlaceholder: { height: 100, backgroundColor: Colors.cream, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  articleImgEmoji: { fontSize: 32 },
  articleName: { fontFamily: Fonts.body, fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  articlePrice: { fontFamily: Fonts.body, fontSize: 15, fontWeight: '700', color: Colors.ink },
  articleStock: { fontFamily: Fonts.body, fontSize: 10, color: Colors.textSoft, marginTop: 2 },

  // FAB panier
  cartFab: { position: 'absolute', bottom: 90, left: 20, right: 20, borderRadius: Radius.lg, overflow: 'hidden', ...Shadow.float },
  cartFabBg: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  cartFabCount: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '700', color: Colors.white, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: Radius.full, width: 28, height: 28, textAlign: 'center', lineHeight: 28, overflow: 'hidden' },
  cartFabLabel: { flex: 1, fontFamily: Fonts.body, fontSize: 14, fontWeight: '600', color: Colors.white },
  cartFabTotal: { fontFamily: Fonts.body, fontSize: 16, fontWeight: '700', color: Colors.white },

  // Modal panier
  cartOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  cartSheet: { backgroundColor: Colors.white, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: 24, maxHeight: '80%' },
  cartHandle: { width: 40, height: 4, backgroundColor: Colors.creamDark, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  cartTitle: { fontFamily: Fonts.display, fontSize: 22, color: Colors.ink, fontStyle: 'italic', marginBottom: 16 },
  cartRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.cream },
  cartRowLeft: { flex: 1 },
  cartItemName: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '600', color: Colors.text },
  cartItemPrice: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSoft },
  cartQteRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cartQteBtn: { width: 30, height: 30, borderRadius: Radius.full, backgroundColor: Colors.cream, justifyContent: 'center', alignItems: 'center' },
  cartQteBtnText: { fontSize: 16, color: Colors.ink, fontWeight: '600' },
  cartQte: { fontFamily: Fonts.body, fontSize: 15, fontWeight: '700', color: Colors.text, minWidth: 20, textAlign: 'center' },
  cartRowTotal: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '700', color: Colors.ink, marginLeft: 12, minWidth: 60, textAlign: 'right' },

  // Paiement
  paymentTitle: { fontFamily: Fonts.body, fontSize: 11, fontWeight: '700', color: Colors.textSoft, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 20, marginBottom: 10 },
  paymentRow: { flexDirection: 'row', gap: 8 },
  paymentChip: { flex: 1, alignItems: 'center', padding: 12, borderRadius: Radius.md, backgroundColor: Colors.cream, borderWidth: 2, borderColor: 'transparent' },
  paymentChipActive: { borderColor: Colors.ink, backgroundColor: Colors.inkFaint },
  paymentChipEmoji: { fontSize: 20, marginBottom: 4 },
  paymentChipLabel: { fontFamily: Fonts.body, fontSize: 10, fontWeight: '600', color: Colors.textSoft },
  paymentChipLabelActive: { color: Colors.ink },

  // Footer
  cartFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  cartTotalLabel: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSoft, textTransform: 'uppercase', letterSpacing: 0.6 },
  cartTotalValue: { fontFamily: Fonts.display, fontSize: 26, color: Colors.ink, fontStyle: 'italic' },
  validateBtn: { paddingHorizontal: 24, paddingVertical: 16, borderRadius: Radius.md },
  validateBtnText: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '700', color: Colors.white },
})
