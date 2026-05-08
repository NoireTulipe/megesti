import { useState, useCallback, useMemo } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, RefreshControl, Modal, Alert,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSession, useAllSessions, SessionWithStats } from '@/hooks/useLocalSession'
import { useLocalVentes, LocalVente } from '@/hooks/useLocalVentes'
import { useLocalFrais, LocalFrais, FRAIS_TYPES, fraisLabel, fraisEmoji } from '@/hooks/useLocalFrais'
import { Colors, Dark, Fonts, Radius, Shadow, Gradients } from '@/constants/theme'
import { useAppTheme } from '@/hooks/useAppTheme'
import { useThemeStore } from '@/store/themeStore'

const MODE_EMOJI: Record<string, string> = { CB: '💳', ESPECES: '💶', CHEQUE: '📝', SUMUP: '📱', VIREMENT: '🏦', PDV: '🏪' }

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
function fmtDuration(openIso: string, closeIso?: string | null): string {
  const ms = (closeIso ? new Date(closeIso) : new Date()).getTime() - new Date(openIso).getTime()
  const h = Math.floor(ms / 3_600_000); const m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m} min`
}

// ─── Détail d'une session (bottom sheet) ─────────────────────────────

function SessionDetailSheet({
  session, onClose,
}: { session: SessionWithStats; onClose: () => void }) {
  const insets = useSafeAreaInsets()
  const isDark = useThemeStore(s => s.isDark)
  const [tab, setTab] = useState<'paniers' | 'articles' | 'frais'>('paniers')

  const { ventes } = useLocalVentes(session.id)
  const { frais, createFrais, updateFrais, deleteFrais } = useLocalFrais(session.id)

  const [showFraisForm, setShowFraisForm] = useState(false)
  const [editFrais, setEditFrais] = useState<LocalFrais | null>(null)
  const [formType, setFormType] = useState('DEPLACEMENT')
  const [formMotif, setFormMotif] = useState('')
  const [formMontant, setFormMontant] = useState('')
  const [expandedVente, setExpandedVente] = useState<string | null>(null)

  // Aggrégation par article
  const articleAgg = useMemo(() => {
    const map = new Map<string, { nom: string; qty: number; ca: number }>()
    for (const v of ventes) {
      const lignes: any[] = JSON.parse(v.lignes_json)
      for (const l of lignes) {
        const ex = map.get(l.nom) ?? { nom: l.nom, qty: 0, ca: 0 }
        map.set(l.nom, { ...ex, qty: ex.qty + l.quantite, ca: ex.ca + (l.totalTTC ?? l.prixUnitaireHT * l.quantite) })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty)
  }, [ventes])

  const totalFrais = frais.reduce((s, f) => s + (f.montant_ht ?? 0), 0)
  const caSession = ventes.reduce((s, v) => s + v.total_ttc, 0)

  function openFraisForm(f?: LocalFrais) {
    setEditFrais(f ?? null)
    setFormType(f?.type ?? 'DEPLACEMENT')
    setFormMotif(f?.motif ?? '')
    setFormMontant(f?.montant_ht != null ? String(f.montant_ht) : '')
    setShowFraisForm(true)
  }

  async function saveFrais() {
    if (!formMotif.trim()) return
    const montantHT = parseFloat(formMontant) || undefined
    if (editFrais) {
      await updateFrais(editFrais.id, { type: formType, motif: formMotif.trim(), montantHT })
    } else {
      await createFrais({ sessionId: session.id, type: formType, motif: formMotif.trim(), montantHT })
    }
    setShowFraisForm(false)
  }

  function confirmDeleteFrais(id: string) {
    Alert.alert('Supprimer', 'Supprimer ce frais ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteFrais(id) },
    ])
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={ss.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[ss.sheet, { paddingBottom: insets.bottom }, isDark && { backgroundColor: '#162030' }]}
          onStartShouldSetResponder={() => true}>
          <View style={ss.handle} />

          {/* Header de la sheet */}
          <View style={ss.sheetHead}>
            <View style={ss.sheetHeadLeft}>
              <Text style={ss.sheetPdv}>{session.point_de_vente_nom}</Text>
              <Text style={ss.sheetDate}>{fmtDate(session.date_ouverture)} · {fmtTime(session.date_ouverture)}</Text>
            </View>
            <View style={ss.sheetHeadStats}>
              <Text style={ss.sheetCA}>{caSession.toFixed(0)} €</Text>
              <Text style={ss.sheetVentes}>{ventes.length} vte{ventes.length > 1 ? 's' : ''}</Text>
            </View>
          </View>

          {/* Onglets */}
          <View style={ss.tabBar}>
            {(['paniers', 'articles', 'frais'] as const).map(t => (
              <TouchableOpacity key={t} style={[ss.tabBtn, tab === t && ss.tabBtnActive]}
                onPress={() => setTab(t)} activeOpacity={0.7}>
                <Text style={[ss.tabText, tab === t && ss.tabTextActive]}>
                  {t === 'paniers' ? `Paniers (${ventes.length})`
                    : t === 'articles' ? `Articles (${articleAgg.length})`
                    : `Frais (${frais.length})`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Contenu onglets */}
          <ScrollView style={ss.tabContent} showsVerticalScrollIndicator={false}>

            {/* ── Paniers ── */}
            {tab === 'paniers' && (
              <>
                {ventes.length === 0 ? (
                  <View style={ss.empty}><Text style={ss.emptyText}>Aucune vente dans cette session</Text></View>
                ) : (
                  ventes.map(v => {
                    const lignes: any[] = JSON.parse(v.lignes_json)
                    const expanded = expandedVente === v.id
                    return (
                      <TouchableOpacity key={v.id} style={ss.venteCard}
                        onPress={() => setExpandedVente(expanded ? null : v.id)} activeOpacity={0.8}>
                        <View style={ss.venteRow}>
                          <Text style={ss.venteEmoji}>{MODE_EMOJI[v.mode_paiement] ?? '💰'}</Text>
                          <View style={ss.venteInfo}>
                            <Text style={ss.venteArticle}>
                              {lignes[0]?.nom ?? 'Article'}
                              {lignes.length > 1 ? ` +${lignes.length - 1} autre${lignes.length > 2 ? 's' : ''}` : ''}
                            </Text>
                            <Text style={ss.venteMeta}>{fmtTime(v.date_vente)} · {v.mode_paiement}</Text>
                          </View>
                          <View style={ss.venteRight}>
                            <Text style={ss.venteTotal}>{v.total_ttc.toFixed(2)} €</Text>
                            <View style={[ss.syncDot, v.synced ? ss.syncOk : ss.syncPending]}>
                              <Text style={{ fontSize: 9, fontWeight: '700', color: v.synced ? Colors.sage : Colors.gold }}>
                                {v.synced ? '✓' : '↑'}
                              </Text>
                            </View>
                          </View>
                        </View>
                        {expanded && (
                          <View style={ss.lignesWrap}>
                            {lignes.map((l: any, i: number) => (
                              <View key={i} style={ss.ligneRow}>
                                <Text style={ss.ligneNom}>{l.nom}</Text>
                                <Text style={ss.ligneQty}>×{l.quantite}</Text>
                                <Text style={ss.lignePrix}>{(l.totalTTC ?? l.prixUnitaireHT * l.quantite).toFixed(2)} €</Text>
                              </View>
                            ))}
                            <View style={ss.ligneTotalRow}>
                              <Text style={ss.ligneTotalLabel}>Total</Text>
                              <Text style={ss.ligneTotalValue}>{v.total_ttc.toFixed(2)} €</Text>
                            </View>
                          </View>
                        )}
                      </TouchableOpacity>
                    )
                  })
                )}
              </>
            )}

            {/* ── Articles ── */}
            {tab === 'articles' && (
              <>
                {articleAgg.length === 0 ? (
                  <View style={ss.empty}><Text style={ss.emptyText}>Aucune donnée</Text></View>
                ) : (
                  <>
                    <View style={ss.aggHeader}>
                      <Text style={ss.aggHeaderLabel}>Nom</Text>
                      <Text style={ss.aggHeaderLabel}>Qté</Text>
                      <Text style={ss.aggHeaderLabel}>CA</Text>
                    </View>
                    {articleAgg.map((a, i) => (
                      <View key={i} style={ss.aggRow}>
                        <Text style={ss.aggNom} numberOfLines={1}>{a.nom}</Text>
                        <View style={ss.aggQtyBadge}><Text style={ss.aggQtyText}>×{a.qty}</Text></View>
                        <Text style={ss.aggCA}>{a.ca.toFixed(0)} €</Text>
                      </View>
                    ))}
                    <View style={ss.aggTotal}>
                      <Text style={ss.aggTotalLabel}>Total</Text>
                      <Text style={ss.aggTotalQty}>{articleAgg.reduce((s, a) => s + a.qty, 0)} ex.</Text>
                      <Text style={ss.aggTotalCA}>{caSession.toFixed(2)} €</Text>
                    </View>
                  </>
                )}
              </>
            )}

            {/* ── Frais ── */}
            {tab === 'frais' && (
              <>
                {frais.length === 0 ? (
                  <View style={ss.empty}>
                    <Text style={ss.emptyText}>Aucun frais enregistré</Text>
                  </View>
                ) : (
                  <>
                    {frais.map(f => (
                      <View key={f.id} style={ss.fraisCard}>
                        <Text style={ss.fraisEmoji}>{fraisEmoji(f.type)}</Text>
                        <View style={ss.fraisBody}>
                          <Text style={ss.fraisType}>{fraisLabel(f.type)}</Text>
                          <Text style={ss.fraisMotif}>{f.motif}</Text>
                        </View>
                        <Text style={ss.fraisAmount}>
                          {f.montant_ht != null ? `${f.montant_ht.toFixed(2)} €` : '—'}
                        </Text>
                        <View style={ss.fraisActions}>
                          <TouchableOpacity onPress={() => openFraisForm(f)} style={ss.fraisActionBtn}>
                            <Text style={ss.fraisActionEdit}>✏️</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => confirmDeleteFrais(f.id)} style={ss.fraisActionBtn}>
                            <Text style={ss.fraisActionDelete}>🗑</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                    <View style={ss.fraisTotal}>
                      <Text style={ss.fraisTotalLabel}>Total frais</Text>
                      <Text style={ss.fraisTotalValue}>{totalFrais.toFixed(2)} €</Text>
                    </View>
                  </>
                )}

                {/* Bouton ajouter frais */}
                <TouchableOpacity style={ss.addFraisBtn} onPress={() => openFraisForm()} activeOpacity={0.85}>
                  <LinearGradient colors={Gradients.bilan} style={ss.addFraisBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Text style={ss.addFraisText}>+ Ajouter un frais</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </TouchableOpacity>

      {/* ── Formulaire frais ── */}
      <Modal visible={showFraisForm} transparent animationType="fade" onRequestClose={() => setShowFraisForm(false)}>
        <View style={ss.formOverlay}>
          <View style={ss.formCard}>
            <Text style={ss.formTitle}>{editFrais ? 'Modifier le frais' : 'Nouveau frais'}</Text>

            <Text style={ss.formLabel}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ss.typeRow}>
              {FRAIS_TYPES.map(t => (
                <TouchableOpacity key={t.value}
                  style={[ss.typeChip, formType === t.value && ss.typeChipActive]}
                  onPress={() => setFormType(t.value)} activeOpacity={0.7}>
                  <Text style={ss.typeChipEmoji}>{t.emoji}</Text>
                  <Text style={[ss.typeChipLabel, formType === t.value && ss.typeChipLabelActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={ss.formLabel}>Description</Text>
            <TextInput style={ss.formInput} value={formMotif} onChangeText={setFormMotif}
              placeholder="Ex : Essence aller-retour" placeholderTextColor={Colors.textSoft} />

            <Text style={ss.formLabel}>Montant HT (€)</Text>
            <TextInput style={ss.formInput} value={formMontant} onChangeText={setFormMontant}
              placeholder="0.00" keyboardType="decimal-pad" placeholderTextColor={Colors.textSoft} />

            <View style={ss.formActions}>
              <TouchableOpacity style={ss.formBtnCancel} onPress={() => setShowFraisForm(false)} activeOpacity={0.7}>
                <Text style={ss.formBtnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={ss.formBtnSave} onPress={saveFrais} activeOpacity={0.85}>
                <LinearGradient colors={Gradients.bilan} style={ss.formBtnSaveBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={ss.formBtnSaveText}>Enregistrer</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  )
}

// ─── Carte session active ─────────────────────────────────────────────

function ActiveSessionCard({ s, venteCount, ca, onDetail }: {
  s: SessionWithStats; venteCount: number; ca: number; onDetail: () => void
}) {
  const isDark = useThemeStore(s => s.isDark)
  return (
    <LinearGradient colors={isDark ? Gradients.sessionsDark : Gradients.sessions} style={styles.heroCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <View style={styles.heroTop}>
        <View style={styles.heroBadge}>
          <View style={styles.heroLiveDot} />
          <Text style={styles.heroLiveText}>En cours</Text>
        </View>
        <Text style={styles.heroDuration}>{fmtDuration(s.date_ouverture)}</Text>
      </View>
      <Text style={styles.heroPdv}>{s.point_de_vente_nom}</Text>
      <Text style={styles.heroDate}>{fmtDate(s.date_ouverture)} · {fmtTime(s.date_ouverture)}</Text>

      <View style={styles.heroStats}>
        <View style={styles.heroStat}>
          <Text style={styles.heroStatValue}>{venteCount}</Text>
          <Text style={styles.heroStatLabel}>ventes</Text>
        </View>
        <View style={styles.heroStatDivider} />
        <View style={styles.heroStat}>
          <Text style={styles.heroStatValue}>{ca.toFixed(0)} €</Text>
          <Text style={styles.heroStatLabel}>CA</Text>
        </View>
        <View style={styles.heroStatDivider} />
        <View style={styles.heroStat}>
          <Text style={styles.heroStatValue}>{s.fond_ouverture.toFixed(0)} €</Text>
          <Text style={styles.heroStatLabel}>fond</Text>
        </View>
      </View>

      <View style={styles.heroBtnRow}>
        <TouchableOpacity style={[styles.heroBtn, { flex: 1 }]} activeOpacity={0.85}
          onPress={() => router.push('/caisse')}>
          <Text style={styles.heroBtnText}>Aller à la caisse →</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.heroBtn, styles.heroBtnDetail]} activeOpacity={0.85}
          onPress={onDetail}>
          <Text style={styles.heroBtnText}>Détail</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  )
}

// ─── Écran principal ──────────────────────────────────────────────────

export default function SessionsScreen() {
  const insets = useSafeAreaInsets()
  const { isDark } = useAppTheme()
  const [tab, setTab] = useState<'active' | 'history'>('active')
  const [refreshing, setRefreshing] = useState(false)
  const [detailSession, setDetailSession] = useState<SessionWithStats | null>(null)

  const { session } = useLocalSession()
  const { actives, history, historyHasMore, loadingMore, loading, refresh, loadMoreHistory } = useAllSessions()
  const { ventes } = useLocalVentes(session?.id)

  useFocusEffect(useCallback(() => { refresh() }, [refresh]))

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }, [refresh])

  const activeSession = actives[0] ?? null
  const ventesCount = ventes.length
  const ca = ventes.reduce((sum, v) => sum + v.total_ttc, 0)

  return (
    <View style={[styles.shell, isDark && { backgroundColor: Dark.bg }]}>
      <LinearGradient colors={[Colors.sageLight, Colors.cream, Colors.cream]} style={styles.bg} />

      {/* En-tête dégradé */}
      <LinearGradient
        colors={isDark ? Gradients.sessionsDark : Gradients.sessions}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={[styles.heroGradient, { paddingTop: 48 + insets.top }]}>
        <Text style={styles.heroTitle}>Sessions</Text>

        <View style={styles.heroTabRow}>
          <TouchableOpacity style={[styles.heroTab, tab === 'active' && styles.heroTabActive]}
            onPress={() => setTab('active')} activeOpacity={0.7}>
            <Text style={[styles.heroTabText, tab === 'active' && styles.heroTabTextActive]}>
              En cours {actives.length > 0 ? `(${actives.length})` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.heroTab, tab === 'history' && styles.heroTabActive]}
            onPress={() => setTab('history')} activeOpacity={0.7}>
            <Text style={[styles.heroTabText, tab === 'history' && styles.heroTabTextActive]}>
              Historique {history.length > 0 ? `(${history.length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing || loading} onRefresh={onRefresh} tintColor={Colors.sage} />}>

        {tab === 'active' && (
          activeSession ? (
            <ActiveSessionCard s={activeSession} venteCount={ventesCount} ca={ca}
              onDetail={() => setDetailSession(activeSession)} />
          ) : (
            <View style={[styles.emptyCard, isDark && { backgroundColor: Dark.surface, shadowColor: 'transparent', elevation: 0 }]}>
              <Text style={styles.emptyEmoji}>🏪</Text>
              <Text style={styles.emptyTitle}>Aucune session active</Text>
              <Text style={styles.emptySub}>Ouvrez une session de caisse pour commencer à vendre.</Text>
              <TouchableOpacity style={styles.emptyBtn} activeOpacity={0.85}
                onPress={() => router.push('/caisse')}>
                <LinearGradient colors={Gradients.caisse} style={styles.emptyBtnBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={styles.emptyBtnText}>Aller à la caisse</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )
        )}

        {tab === 'history' && (
          history.length === 0 ? (
            <View style={[styles.emptyCard, isDark && { backgroundColor: Dark.surface, shadowColor: 'transparent', elevation: 0 }]}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>Aucune session passée</Text>
              <Text style={styles.emptySub}>L'historique apparaîtra ici une fois vos sessions fermées.</Text>
            </View>
          ) : (
            <>
              {history.map(s => (
                <TouchableOpacity key={s.id} style={[styles.histCard, isDark && { backgroundColor: Dark.surface, shadowColor: 'transparent', elevation: 0 }]}
                  onPress={() => setDetailSession(s)} activeOpacity={0.8}>
                  <View style={[styles.histAccent, { backgroundColor: s.ca > 0 ? Colors.sage : Colors.textSoft }]} />
                  <View style={styles.histBody}>
                    <View style={styles.histTop}>
                      <Text style={styles.histPdv}>{s.point_de_vente_nom}</Text>
                      <Text style={styles.histCa}>{s.ca.toFixed(0)} €</Text>
                    </View>
                    <Text style={styles.histDate}>{fmtDate(s.date_ouverture)} · {fmtTime(s.date_ouverture)}</Text>
                    <View style={styles.histMeta}>
                      <Text style={styles.histMetaText}>{s.venteCount} vente{s.venteCount > 1 ? 's' : ''}</Text>
                      {s.fond_fermeture != null && (
                        <Text style={styles.histMetaText}>· Fond final {s.fond_fermeture.toFixed(0)} €</Text>
                      )}
                      <Text style={styles.histMetaText}>· {fmtDuration(s.date_ouverture)}</Text>
                    </View>
                  </View>
                  <View style={styles.histChevron}>
                    <Text style={styles.histChevronText}>›</Text>
                  </View>
                </TouchableOpacity>
              ))}

              {/* Charger la suite */}
              {historyHasMore && (
                <TouchableOpacity
                  style={[styles.loadMoreBtn, loadingMore && styles.loadMoreBtnDisabled, isDark && { backgroundColor: Dark.surface }]}
                  onPress={loadMoreHistory}
                  activeOpacity={0.7}
                  disabled={loadingMore}>
                  <Text style={styles.loadMoreTxt}>
                    {loadingMore ? 'Chargement…' : 'Charger les 10 suivantes'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )
        )}
      </ScrollView>

      {detailSession && (
        <SessionDetailSheet session={detailSession} onClose={() => setDetailSession(null)} />
      )}
    </View>
  )
}

// ══════════════════════════════════════════════════════════════════════
// Styles partagés
// ══════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: Colors.cream },
  bg: { ...StyleSheet.absoluteFillObject },
  heroGradient: { paddingHorizontal: 20, paddingBottom: 24, marginBottom: 16 },
  heroTitle: { fontFamily: Fonts.displayItalic, fontSize: 22, color: Colors.white, fontStyle: 'italic' },

  heroTabRow: { flexDirection: 'row', marginTop: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: Radius.lg, padding: 4 },
  heroTab: { flex: 1, paddingVertical: 10, borderRadius: Radius.md, alignItems: 'center' },
  heroTabActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  heroTabText: { fontFamily: Fonts.body, fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.55)' },
  heroTabTextActive: { color: Colors.white },

  content: { paddingHorizontal: 20 },

  heroCard: { borderRadius: Radius.xl, padding: 22, marginBottom: 16, shadowColor: Colors.text, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 8 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  heroLiveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFF', opacity: 0.9 },
  heroLiveText: { fontFamily: Fonts.body, fontSize: 11, fontWeight: '700', color: Colors.white },
  heroDuration: { fontFamily: Fonts.body, fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  heroPdv: { fontFamily: Fonts.displayItalic, fontSize: 22, color: Colors.white, fontStyle: 'italic', marginBottom: 4 },
  heroDate: { fontFamily: Fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 20 },
  heroStats: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: Radius.lg, padding: 16, marginBottom: 14, alignItems: 'center' },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: { fontFamily: Fonts.body, fontSize: 20, fontWeight: '700', color: Colors.white },
  heroStatLabel: { fontFamily: Fonts.body, fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 3 },
  heroStatDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)' },
  heroBtnRow: { flexDirection: 'row', gap: 8 },
  heroBtn: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: Radius.md, paddingVertical: 13, alignItems: 'center' },
  heroBtnDetail: { paddingHorizontal: 20 },
  heroBtnText: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '600', color: Colors.white },

  histCard: { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: Radius.lg, marginBottom: 8, overflow: 'hidden', ...Shadow.card, alignItems: 'stretch' },
  histAccent: { width: 4 },
  histBody: { flex: 1, padding: 14 },
  histTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  histPdv: { fontFamily: Fonts.body, fontSize: 15, fontWeight: '700', color: Colors.text, flex: 1, marginRight: 8 },
  histCa: { fontFamily: Fonts.body, fontSize: 16, fontWeight: '800', color: Colors.sage },
  histDate: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textSoft, marginBottom: 6 },
  histMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  histMetaText: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSoft },
  histChevron: { width: 36, justifyContent: 'center', alignItems: 'center' },
  histChevronText: { fontSize: 20, color: Colors.textSoft, fontWeight: '300' },

  loadMoreBtn: { marginTop: 4, marginBottom: 8, paddingVertical: 14, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.sage, alignItems: 'center', backgroundColor: Colors.white },
  loadMoreBtnDisabled: { opacity: 0.5 },
  loadMoreTxt: { fontFamily: Fonts.body, fontSize: 13, fontWeight: '600', color: Colors.sage },

  emptyCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 32, alignItems: 'center', ...Shadow.card },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontFamily: Fonts.displayItalic, fontSize: 20, color: Colors.textMid, fontStyle: 'italic', marginBottom: 8 },
  emptySub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textSoft, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn: { borderRadius: Radius.md, overflow: 'hidden', width: '100%' },
  emptyBtnBg: { paddingVertical: 14, alignItems: 'center' },
  emptyBtnText: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '700', color: Colors.white },
})

// Styles du bottom sheet détail session
const ss = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.white, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, maxHeight: '90%' },
  handle: { width: 36, height: 4, backgroundColor: Colors.creamDark, borderRadius: 2, alignSelf: 'center', marginTop: 12 },

  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.cream },
  sheetHeadLeft: { flex: 1 },
  sheetPdv: { fontFamily: Fonts.displayItalic, fontSize: 20, color: Colors.sage, fontStyle: 'italic' },
  sheetDate: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textSoft, marginTop: 2 },
  sheetHeadStats: { alignItems: 'flex-end' },
  sheetCA: { fontFamily: Fonts.body, fontSize: 20, fontWeight: '800', color: Colors.sage },
  sheetVentes: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSoft },

  tabBar: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 4, borderBottomWidth: 1, borderBottomColor: Colors.cream },
  tabBtn: { flex: 1, paddingVertical: 7, borderRadius: Radius.md, alignItems: 'center', backgroundColor: Colors.cream },
  tabBtnActive: { backgroundColor: Colors.sage },
  tabText: { fontFamily: Fonts.body, fontSize: 11, fontWeight: '600', color: Colors.textMid },
  tabTextActive: { color: Colors.white },

  tabContent: { maxHeight: 480, paddingHorizontal: 16 },

  empty: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textSoft, fontStyle: 'italic' },

  // Paniers
  venteCard: { marginTop: 8, backgroundColor: Colors.cream, borderRadius: Radius.md, overflow: 'hidden' },
  venteRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  venteEmoji: { fontSize: 20 },
  venteInfo: { flex: 1 },
  venteArticle: { fontFamily: Fonts.body, fontSize: 13, fontWeight: '600', color: Colors.text },
  venteMeta: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSoft, marginTop: 2 },
  venteRight: { alignItems: 'flex-end', gap: 4 },
  venteTotal: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '700', color: Colors.sage },
  syncDot: { width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  syncOk: { backgroundColor: Colors.sageLight },
  syncPending: { backgroundColor: Colors.goldLight },

  lignesWrap: { paddingHorizontal: 12, paddingBottom: 10, borderTopWidth: 1, borderTopColor: Colors.creamDark },
  ligneRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  ligneNom: { flex: 1, fontFamily: Fonts.body, fontSize: 12, color: Colors.text },
  ligneQty: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textSoft, marginRight: 12, width: 30 },
  lignePrix: { fontFamily: Fonts.body, fontSize: 12, fontWeight: '600', color: Colors.text, width: 60, textAlign: 'right' },
  ligneTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6, marginTop: 2, borderTopWidth: 1, borderTopColor: Colors.cream },
  ligneTotalLabel: { fontFamily: Fonts.body, fontSize: 11, fontWeight: '700', color: Colors.textSoft, textTransform: 'uppercase' },
  ligneTotalValue: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '800', color: Colors.sage },

  // Articles agrégés
  aggHeader: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4, marginTop: 8 },
  aggHeaderLabel: { fontFamily: Fonts.body, fontSize: 10, fontWeight: '700', color: Colors.textSoft, textTransform: 'uppercase', flex: 1 },
  aggRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: Colors.cream },
  aggNom: { flex: 1, fontFamily: Fonts.body, fontSize: 13, fontWeight: '500', color: Colors.text },
  aggQtyBadge: { backgroundColor: Colors.sageLight, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2, marginRight: 8 },
  aggQtyText: { fontFamily: Fonts.body, fontSize: 11, fontWeight: '700', color: Colors.sage },
  aggCA: { fontFamily: Fonts.body, fontSize: 13, fontWeight: '700', color: Colors.text, width: 64, textAlign: 'right' },
  aggTotal: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, marginTop: 4 },
  aggTotalLabel: { flex: 1, fontFamily: Fonts.body, fontSize: 12, fontWeight: '700', color: Colors.textMid, textTransform: 'uppercase' },
  aggTotalQty: { fontFamily: Fonts.body, fontSize: 13, fontWeight: '700', color: Colors.sage, marginRight: 8 },
  aggTotalCA: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '800', color: Colors.sage, width: 64, textAlign: 'right' },

  // Frais
  fraisCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: Colors.cream, marginTop: 4 },
  fraisEmoji: { fontSize: 20, marginRight: 10 },
  fraisBody: { flex: 1 },
  fraisType: { fontFamily: Fonts.body, fontSize: 11, fontWeight: '700', color: Colors.gold, textTransform: 'uppercase' },
  fraisMotif: { fontFamily: Fonts.body, fontSize: 13, color: Colors.text, marginTop: 1 },
  fraisAmount: { fontFamily: Fonts.body, fontSize: 13, fontWeight: '700', color: Colors.terra },
  fraisActions: { flexDirection: 'row', gap: 4, marginLeft: 8 },
  fraisActionBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', borderRadius: Radius.sm, backgroundColor: Colors.cream },
  fraisActionEdit: { fontSize: 14 },
  fraisActionDelete: { fontSize: 14 },
  fraisTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, marginTop: 4, borderTopWidth: 1.5, borderTopColor: Colors.creamDark },
  fraisTotalLabel: { fontFamily: Fonts.body, fontSize: 12, fontWeight: '700', color: Colors.textMid, textTransform: 'uppercase' },
  fraisTotalValue: { fontFamily: Fonts.body, fontSize: 15, fontWeight: '800', color: Colors.terra },
  addFraisBtn: { marginTop: 16, borderRadius: Radius.md, overflow: 'hidden' },
  addFraisBg: { paddingVertical: 14, alignItems: 'center' },
  addFraisText: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '700', color: Colors.white },

  // Formulaire frais
  formOverlay: { flex: 1, backgroundColor: 'rgba(44,33,24,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  formCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 24, width: '100%', maxWidth: 380, shadowColor: Colors.text, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.10, shadowRadius: 24, elevation: 8 },
  formTitle: { fontFamily: Fonts.displayItalic, fontSize: 20, color: Colors.gold, fontStyle: 'italic', marginBottom: 16 },
  formLabel: { fontFamily: Fonts.body, fontSize: 11, fontWeight: '700', color: Colors.textSoft, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6, marginTop: 12 },
  formInput: { fontFamily: Fonts.body, fontSize: 15, color: Colors.text, backgroundColor: Colors.cream, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1.5, borderColor: 'rgba(201,147,58,0.2)' },
  typeRow: { marginBottom: 4 },
  typeChip: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: Radius.md, backgroundColor: Colors.cream, marginRight: 6, borderWidth: 1.5, borderColor: 'transparent', minWidth: 70 },
  typeChipActive: { borderColor: Colors.gold, backgroundColor: Colors.goldLight },
  typeChipEmoji: { fontSize: 18, marginBottom: 2 },
  typeChipLabel: { fontFamily: Fonts.body, fontSize: 10, fontWeight: '600', color: Colors.textMid },
  typeChipLabelActive: { color: Colors.gold },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  formBtnCancel: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: Radius.md, backgroundColor: Colors.cream },
  formBtnCancelText: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '600', color: Colors.textMid },
  formBtnSave: { flex: 1, borderRadius: Radius.md, overflow: 'hidden' },
  formBtnSaveBg: { paddingVertical: 14, alignItems: 'center' },
  formBtnSaveText: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '700', color: Colors.white },
})

