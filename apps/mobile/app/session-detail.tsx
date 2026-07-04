import { useState, useEffect, useMemo } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Modal, TextInput } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { api } from '@/lib/api'
import { getDb, generateUUID } from '@/lib/db'
import { syncEngine } from '@/lib/sync'
import { mergeVentesByUuid } from '@/lib/merge'
import { useAppTheme } from '@/hooks/useAppTheme'
import { Colors, Dark, Fonts, Radius, Shadow } from '@/constants/theme'

const MODE_EMOJI: Record<string, string> = { CB: '💳', ESPECES: '💶', CHEQUE: '📝', SUMUP: '📱', VIREMENT: '🏦', PDV: '🏪' }

/**
 * Convertit le `lignes_json` d'une vente locale (format {nom, quantite, totalLigneTTC...})
 * vers la forme attendue par l'agrégation (VenteLigne avec article.nom).
 */
function parseLignesJson(json: string): VenteLigne[] {
  try {
    const raw = JSON.parse(json) as {
      nom?: string; articleId?: string; quantite: number
      totalLigneHT?: number; totalLigneTTC?: number; prixUnitaireHT?: number; tauxTva?: number
    }[]
    return raw.map(l => ({
      articleId:    l.articleId ?? '',
      quantite:     l.quantite,
      totalLigneHT: l.totalLigneHT ?? (l.prixUnitaireHT ?? 0) * l.quantite,
      totalLigneTTC: l.totalLigneTTC ?? (l.prixUnitaireHT ?? 0) * l.quantite * (1 + (l.tauxTva ?? 0) / 100),
      article:      { nom: l.nom ?? 'Article inconnu' },
    }))
  } catch {
    return []
  }
}

interface VenteLigne {
  articleId: string; quantite: number; totalLigneHT: number; totalLigneTTC: number
  article: { nom: string }
}
interface Vente {
  id: string; dateVente: string; modePaiement: string
  totalTTC: number; totalHT: number
  statut?: string
  lignes: VenteLigne[]
}
interface SessionDetail {
  id: string
  pointDeVente: { nom: string; commissionFixe: number | null; commissionPourcent: number | null; encaissementDirect: boolean } | null
  dateOuverture: string; dateFermeture: string | null
  fondOuverture: number; fondFermeture: number | null; statut: string
  ventes: Vente[]
}

// ── Écran ───────────────────────────────────────────────────────────────

export default function SessionDetailScreen() {
  const insets = useSafeAreaInsets()
  const { isDark } = useAppTheme()
  const { id, openFrais } = useLocalSearchParams<{ id: string; openFrais?: string }>()

  const [data, setData] = useState<SessionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'paniers' | 'articles'>('paniers')
  const [expanded, setExpanded] = useState<string | null>(null)

  // Frais
  const [showFraisForm, setShowFraisForm] = useState(openFrais === '1')
  const [fraisType, setFraisType] = useState('DEPLACEMENT')
  const [fraisMotif, setFraisMotif] = useState('')
  const [fraisMontant, setFraisMontant] = useState('')
  const [fraisSaving, setFraisSaving] = useState(false)

  async function saveFrais() {
    if (!id || !fraisMotif.trim()) return
    setFraisSaving(true)
    try {
      const fraisId = generateUUID()
      const date = new Date().toISOString()
      // Clavier FR : la virgule est le séparateur décimal ("12,50" → 12.50)
      const montantHT = parseFloat(fraisMontant.replace(',', '.')) || 0
      // Sauvegarder en local (créer un stub session si FK manquante)
      const db = await getDb()
      const ses = await db.getFirstAsync<{ id: string }>('SELECT id FROM sessions WHERE id = ?', [id])
      if (!ses) {
        await db.runAsync(
          `INSERT INTO sessions (id, point_de_vente_id, point_de_vente_nom, date_ouverture, fond_ouverture, debiter_stock, statut, articles_exposes, synced)
           VALUES (?, ?, ?, datetime('now'), 0, 1, 'OUVERTE', '[]', 1)`,
          [id, generateUUID(), data?.pointDeVente?.nom ?? 'Session distante'],
        )
      }
      // Envoyer au serveur ; en cas d'échec, mise en queue pour retry
      const payload = { id: fraisId, sessionId: id, type: fraisType, motif: fraisMotif.trim(), montantHT, date }
      let synced = 0
      try {
        await api.post('/frais', payload)
        synced = 1
      } catch {
        await syncEngine.enqueue('frais', fraisId, 'create', payload)
      }
      await db.runAsync(
        `INSERT INTO frais_locaux (id, session_id, type, motif, montant_ht, date, actif, synced) VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
        [fraisId, id, fraisType, fraisMotif.trim(), montantHT, date, synced],
      )
      setShowFraisForm(false)
      setFraisMotif('')
      setFraisMontant('')
      // Recharger total + liste
      const f = await db.getFirstAsync<{ total: number }>(
        'SELECT COALESCE(SUM(montant_ht),0) as total FROM frais_locaux WHERE session_id = ? AND actif = 1', [id],
      )
      setFraisSession(f?.total ?? 0)
      const fl = await db.getAllAsync<any>(
        'SELECT id, type, motif, montant_ht, date, synced, actif FROM frais_locaux WHERE session_id = ? ORDER BY date DESC', [id],
      )
      setFraisList(fl)
    } finally { setFraisSaving(false) }
  }

  // Delta local : ventes de cette session non remontées au serveur (synced=0).
  // Ajoutées par-dessus la réponse serveur pour un CA exact même en attente de sync.
  const [localDelta, setLocalDelta] = useState<Vente[]>([])
  useEffect(() => {
    if (!id) return
    getDb().then(async (db) => {
      const rows = await db.getAllAsync<{
        id: string; date_vente: string; mode_paiement: string
        total_ttc: number; total_ht: number; lignes_json: string; statut: string
      }>(
        `SELECT id, date_vente, mode_paiement, total_ttc, total_ht, lignes_json, statut
         FROM ventes_locales WHERE session_id = ? AND synced = 0 AND statut != 'ANNULEE'`,
        [id],
      )
      setLocalDelta(rows.map(r => ({
        id: r.id, dateVente: r.date_vente, modePaiement: r.mode_paiement,
        totalTTC: r.total_ttc, totalHT: r.total_ht, statut: r.statut,
        lignes: parseLignesJson(r.lignes_json),
      })))
    })
  }, [id])

  useEffect(() => {
    if (!id) return
    api.get<SessionDetail>(`/sessions-caisse/${id}`)
      .then(setData)
      .finally(() => setLoading(false))
  }, [id])

  // Ventes fusionnées : serveur (source de vérité) + delta local dédupliqué par UUID.
  // Conserve TOUTES les ventes (y compris ANNULEE), nécessaires à l'affichage grisé.
  const mergedVentes = useMemo(
    () => data ? mergeVentesByUuid(data.ventes, localDelta) : [],
    [data, localDelta],
  )
  // Ventes validées seulement — pour le CA, le coût, les agrégations.
  const ventesValidees = useMemo(
    () => mergedVentes.filter(v => v.statut !== 'ANNULEE'),
    [mergedVentes],
  )

  // Agrégation par article
  const articleAgg = useMemo(() => {
    if (!data) return []
    const map = new Map<string, { nom: string; qty: number; ca: number }>()
    for (const v of ventesValidees) {
      for (const l of v.lignes) {
        const nom = l.article?.nom ?? 'Article inconnu'
        const ex = map.get(nom) ?? { nom, qty: 0, ca: 0 }
        map.set(nom, { ...ex, qty: ex.qty + l.quantite, ca: ex.ca + (Number(l.totalLigneTTC) || Number(l.totalLigneHT) * 1.055) })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.ca - a.ca)
  }, [data, ventesValidees])

  // ── Calculs de résultat ──────────────────────────────────────────

  const [coutVentes, setCoutVentes] = useState(0)
  const [fraisSession, setFraisSession] = useState(0)
  const [fraisList, setFraisList] = useState<any[]>([])
  const [showResultat, setShowResultat] = useState(false)
  const [showFrais, setShowFrais] = useState(true)

  // Charger les prix d'achat locaux + frais (local + serveur)
  useEffect(() => {
    if (!data || !id) return
    ;(async () => {
      const db = await getDb()
      // Coût des ventes — ventesValidees = delta local fusionné, ANNULEE exclues
      let cout = 0
      for (const v of ventesValidees) {
        for (const l of v.lignes) {
          if (!l.articleId) continue
          const art = await db.getFirstAsync<{ prix_achat_ht: number | null }>(
            'SELECT prix_achat_ht FROM articles WHERE id = ?', [l.articleId],
          )
          if (art?.prix_achat_ht != null) cout += art.prix_achat_ht * l.quantite
        }
      }
      setCoutVentes(cout)

      // Rapatrier les frais du serveur → synchro complète
      try {
        const remote = await api.get<any[]>(`/frais?sessionId=${id}`)
        const remoteIds = remote.map((f: any) => f.id)
        // Supprimer les frais locaux déjà sync qui ne sont plus sur le serveur
        if (remoteIds.length > 0) {
          const placeholders = remoteIds.map(() => '?').join(',')
          await db.runAsync(
            `DELETE FROM frais_locaux WHERE session_id = ? AND synced = 1 AND id NOT IN (${placeholders})`,
            [id, ...remoteIds],
          )
        } else {
          await db.runAsync(`DELETE FROM frais_locaux WHERE session_id = ? AND synced = 1`, [id])
        }
        // Insérer/mettre à jour les frais du serveur (avec actif)
        for (const f of remote) {
          await db.runAsync(
            `INSERT OR REPLACE INTO frais_locaux (id, session_id, type, motif, montant_ht, date, synced, actif)
             VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
            [f.id, f.sessionId, f.type, f.motif, Number(f.montantHT) || 0, f.date, f.actif !== false ? 1 : 0],
          )
        }
      } catch {}

      // Total + liste frais local (actifs seulement)
      const f = await db.getFirstAsync<{ total: number }>(
        'SELECT COALESCE(SUM(montant_ht),0) as total FROM frais_locaux WHERE session_id = ? AND actif = 1', [id],
      )
      setFraisSession(f?.total ?? 0)
      const fl = await db.getAllAsync<any>(
        'SELECT id, type, motif, montant_ht, date, synced, actif FROM frais_locaux WHERE session_id = ? ORDER BY date DESC', [id],
      )
      setFraisList(fl)
    })()
  }, [data, id, ventesValidees])

  // CA issu des ventes validées fusionnées (serveur + delta local, ANNULEE exclues)
  const ca = ventesValidees.reduce((sum, v) => sum + Number(v.totalTTC), 0)
  const pdv = data?.pointDeVente ?? null
  const commissionPdv = pdv
    ? (Number(pdv.commissionFixe) || 0) + (ca * (Number(pdv.commissionPourcent) || 0) / 100)
    : 0
  const beneficeNet = ca - coutVentes - fraisSession - commissionPdv
  function fmtEuro(n: number) { return `${n.toFixed(2)} €` }

  async function cancelVente(venteId: string) {
    await api.patch(`/ventes/${venteId}/annuler`, {}).catch(() => {})
    // Re-fetch la session pour rafraîchir les statuts
    if (id) {
      api.get<SessionDetail>(`/sessions-caisse/${id}`).then(setData).catch(() => {})
    }
  }

  if (loading) {
    return (
      <View style={[s.shell, { justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? Dark.bg : Colors.cream }]}>
        <ActivityIndicator size="large" color={isDark ? Dark.accent : Colors.rose} />
      </View>
    )
  }

  if (!data) {
    return (
      <View style={[s.shell, { justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? Dark.bg : Colors.cream }]}>
        <Text style={{ color: isDark ? Dark.textSoft : Colors.textSoft }}>Session introuvable</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: Colors.rose, fontWeight: '700' }}>← Retour</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  return (
    <View style={[s.shell, isDark && { backgroundColor: Dark.bg }]}>
      <LinearGradient colors={isDark ? [Dark.bg, Dark.bg] : [Colors.inkFaint, Colors.cream]} style={s.bg} />

      {/* Header */}
      <LinearGradient
        colors={[Colors.ink, Colors.inkLight]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={[s.header, { paddingTop: insets.top + 48 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={s.headerInfo}>
          <Text style={s.headerPdv} numberOfLines={1}>{data.pointDeVente?.nom ?? 'Session'}</Text>
          <Text style={s.headerDate}>{fmtDate(data.dateOuverture)}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowFraisForm(true)} style={s.headerBtn} activeOpacity={0.7}>
          <Text style={s.headerBtnText}>🧾 +</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Résumé */}
      <View style={[s.summary, isDark && { backgroundColor: Dark.surface }]}>
        <View style={s.summaryItem}>
          <Text style={[s.summaryVal, { color: isDark ? Dark.text : Colors.ink }]}>{ca.toFixed(2)} €</Text>
          <Text style={[s.summaryLbl, isDark && { color: 'rgba(255,255,255,0.5)' }]}>CA TTC</Text>
        </View>
        <View style={[s.summaryDiv, isDark && { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
        <View style={s.summaryItem}>
          <Text style={[s.summaryVal, { color: isDark ? Dark.text : Colors.ink }]}>{ventesValidees.length}</Text>
          <Text style={[s.summaryLbl, isDark && { color: 'rgba(255,255,255,0.5)' }]}>paniers</Text>
        </View>
        <View style={[s.summaryDiv, isDark && { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
        <View style={s.summaryItem}>
          <Text style={[s.summaryVal, { color: isDark ? Dark.text : Colors.ink }]}>{Number(data.fondOuverture).toFixed(0)} €</Text>
          <Text style={[s.summaryLbl, isDark && { color: 'rgba(255,255,255,0.5)' }]}>fond</Text>
        </View>
      </View>

      {/* ── Frais de la session ── */}
      {fraisList.filter((f: any) => f.actif !== 0).length > 0 && (
        <TouchableOpacity
          style={[s.fraisAccordion, isDark && { backgroundColor: Dark.surface }]}
          activeOpacity={0.8}
          onPress={() => setShowFrais(!showFrais)}>
          <View style={s.fraisAccordionHeader}>
            <Text style={[s.fraisAccordionTitle, isDark && { color: Dark.text }]}>
              🧾 Frais ({fraisList.filter((f: any) => f.actif !== 0).length})
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontFamily: Fonts.body, fontSize: 13, fontWeight: '700', color: Colors.terra }}>
                −{fraisSession.toFixed(0)} €
              </Text>
              <Text style={[s.fraisAccordionArrow, isDark && { color: Dark.textSoft }]}>
                {showFrais ? '▲' : '▼'}
              </Text>
            </View>
          </View>
          {showFrais && (
            <View style={s.fraisList}>
              {fraisList.map((f: any) => (
                <View key={f.id} style={[s.fraisRow, isDark && { borderBottomColor: 'rgba(255,255,255,0.04)' }, f.actif === 0 && { opacity: 0.45 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.fraisMotif, isDark && { color: Dark.text }, f.actif === 0 && { textDecorationLine: 'line-through' as const }]}>{f.motif}</Text>
                    <Text style={[s.fraisMeta, isDark && { color: Dark.textSoft }]}>{f.type} · {new Date(f.date).toLocaleDateString('fr-FR')}{f.actif === 0 ? ' · Annulé' : ''}</Text>
                  </View>
                  <Text style={[s.fraisMontant, isDark && { color: Dark.text }, f.actif === 0 && { textDecorationLine: 'line-through' as const }]}>{Number(f.montant_ht).toFixed(2)} €</Text>
                  <TouchableOpacity
                    style={s.fraisDeleteBtn}
                    onPress={async () => {
                      const db = await getDb()
                      await db.runAsync(`UPDATE frais_locaux SET actif = 0 WHERE id = ?`, [f.id])
                      api.delete(`/frais/${f.id}`).catch(() => syncEngine.enqueue('frais', f.id, 'delete', {}))
                      const fl = await db.getAllAsync<any>('SELECT id, type, motif, montant_ht, date, synced, actif FROM frais_locaux WHERE session_id = ? ORDER BY date DESC', [id])
                      setFraisList(fl)
                      const ft = await db.getFirstAsync<{ total: number }>('SELECT COALESCE(SUM(montant_ht),0) as total FROM frais_locaux WHERE session_id = ? AND actif = 1', [id])
                      setFraisSession(ft?.total ?? 0)
                    }}
                    activeOpacity={0.5}>
                    <Text style={s.fraisDeleteIcon}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Tabs */}
      <View style={[s.tabRow, isDark && { backgroundColor: Dark.surface }]}>
        <TouchableOpacity style={[s.tab, tab === 'paniers' && (isDark ? s.tabActiveDark : s.tabActive)]}
          onPress={() => setTab('paniers')} activeOpacity={0.7}>
          <Text style={[s.tabText, { color: tab === 'paniers' ? (isDark ? Dark.accent : Colors.ink) : (isDark ? Dark.textSoft : Colors.textSoft) }]}>Paniers ({ventesValidees.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'articles' && (isDark ? s.tabActiveDark : s.tabActive)]}
          onPress={() => setTab('articles')} activeOpacity={0.7}>
          <Text style={[s.tabText, { color: tab === 'articles' ? (isDark ? Dark.accent : Colors.ink) : (isDark ? Dark.textSoft : Colors.textSoft) }]}>Articles ({articleAgg.length})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}>

        {/* ═══ PANIERS ═══ */}
        {tab === 'paniers' && (
          mergedVentes.length === 0 ? (
            <View style={s.emptyWrap}>
              <Text style={[s.emptyText, isDark && { color: Dark.textSoft }]}>Aucune vente dans cette session</Text>
            </View>
          ) : (
            mergedVentes.map(v => {
              const isExpanded = expanded === v.id
              return (
                <TouchableOpacity key={v.id}
                  style={[s.panierCard, v.statut === 'ANNULEE' && { opacity: 0.5 }, isDark && { backgroundColor: Dark.surface, shadowColor: 'transparent', elevation: 0 }]}
                  onPress={() => setExpanded(isExpanded ? null : v.id)}
                  activeOpacity={v.statut === 'ANNULEE' ? 1 : 0.8}>
                  <View style={s.panierRow}>
                    <Text style={s.panierEmoji}>{MODE_EMOJI[v.modePaiement] ?? '💰'}</Text>
                    <View style={s.panierInfo}>
                      <Text style={[s.panierName, isDark && { color: Dark.text }, v.statut === 'ANNULEE' && { textDecorationLine: 'line-through' as const }]}>
                        {v.lignes[0]?.article?.nom ?? 'Article'}
                        {v.lignes.length > 1 ? ` +${v.lignes.length - 1}` : ''}
                      </Text>
                      <Text style={[s.panierMeta, isDark && { color: Dark.textSoft }]}>
                        {fmtTime(v.dateVente)} · {v.modePaiement}{v.statut === 'ANNULEE' ? ' · Annulé' : ''}
                      </Text>
                    </View>
                    <Text style={[s.panierTotal, { color: isDark ? Dark.text : Colors.ink }, v.statut === 'ANNULEE' && { textDecorationLine: 'line-through' as const }]}>{Number(v.totalTTC).toFixed(2)} €</Text>
                    {v.statut !== 'ANNULEE' && (
                      <TouchableOpacity
                        style={s.panierCancelBtn}
                        onPress={(e) => { e.stopPropagation(); cancelVente(v.id) }}
                        activeOpacity={0.5}>
                        <Text style={s.panierCancelIcon}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {isExpanded && (
                    <View style={[s.lignesWrap, isDark && { borderTopColor: 'rgba(255,255,255,0.06)' }]}>
                      {v.lignes.map((l, i) => (
                        <View key={i} style={s.ligneRow}>
                          <Text style={[s.ligneName, isDark && { color: Dark.text }]}>{l.article?.nom ?? 'Article'}</Text>
                          <Text style={[s.ligneQty, isDark && { color: Dark.textSoft }]}>×{l.quantite}</Text>
                          <Text style={[s.ligneCa, isDark && { color: '#8DB890' }]}>{(Number(l.totalLigneTTC) || Number(l.totalLigneHT) * 1.055).toFixed(2)} €</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              )
            })
          )
        )}

        {/* ═══ ARTICLES ═══ */}
        {tab === 'articles' && (
          articleAgg.length === 0 ? (
            <View style={s.emptyWrap}>
              <Text style={[s.emptyText, isDark && { color: Dark.textSoft }]}>Aucun article vendu</Text>
            </View>
          ) : (
            articleAgg.map(a => (
              <View key={a.nom}
                style={[s.articleCard, isDark && { backgroundColor: Dark.surface, shadowColor: 'transparent', elevation: 0 }]}>
                <View style={s.articleInfo}>
                  <Text style={[s.articleName, isDark && { color: Dark.text }]}>{a.nom}</Text>
                  <Text style={[s.articleQty, isDark && { color: Dark.textSoft }]}>×{a.qty} · panier moy. {(a.ca / a.qty).toFixed(2)} €</Text>
                </View>
                <Text style={[s.articleCa, { color: isDark ? Dark.text : Colors.ink }]}>{a.ca.toFixed(2)} €</Text>
              </View>
            ))
          )
        )}

        {/* ═══ DÉTAIL DU RÉSULTAT (accordéon) ═══ */}
        <TouchableOpacity
          style={[s.accordion, isDark && { backgroundColor: Dark.surface }]}
          activeOpacity={0.8}
          onPress={() => setShowResultat(!showResultat)}>
          <View style={s.accordionHeader}>
            <Text style={[s.accordionTitle, isDark && { color: Dark.text }]}>Détail du résultat</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[s.accordionBenef, { color: beneficeNet >= 0 ? Colors.sage : Colors.terra }]}>
                {fmtEuro(beneficeNet)}
              </Text>
              <Text style={[s.accordionArrow, isDark && { color: Dark.textSoft }]}>
                {showResultat ? '▲' : '▼'}
              </Text>
            </View>
          </View>

          {showResultat && (
            <View style={[s.accordionBody, isDark && { borderTopColor: 'rgba(255,255,255,0.06)' }]}>
              <LigneResult label="Chiffre d'affaires TTC" value={ca} isDark={isDark} />
              <LigneResult label="Coût des ventes" value={-coutVentes} isDark={isDark} />
              <LigneResult label="Frais de session" value={-fraisSession} isDark={isDark} />
              {pdv && (Number(pdv.commissionFixe) || Number(pdv.commissionPourcent)) ? (
                <LigneResult
                  label={`Commission ${pdv.encaissementDirect ? 'encaissée' : 'à reverser'}${pdv.commissionPourcent ? ` (${Number(pdv.commissionPourcent)}%)` : ''}`}
                  value={-commissionPdv} isDark={isDark}
                />
              ) : null}
              <LigneResult label="Droits d'auteur" value={null} sub="Non disponible" isDark={isDark} />
              <View style={[s.resultSep, isDark && { borderTopColor: 'rgba(255,255,255,0.08)' }]} />
              <LigneResult label="Bénéfice net estimé" value={beneficeNet} bold isDark={isDark} />
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* ═══ MODAL FRAIS ═══ */}
      <Modal visible={showFraisForm} transparent animationType="fade" onRequestClose={() => setShowFraisForm(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowFraisForm(false)}>
          <View style={[s.modalCard, isDark && { backgroundColor: '#1C2A3A' }]} onStartShouldSetResponder={() => true}>
            <Text style={[s.modalTitle, isDark && { color: Dark.text }]}>Ajouter un frais</Text>

            <Text style={s.modalLabel}>Type</Text>
            <View style={s.typeRow}>
              {(['DEPLACEMENT', 'REPAS', 'HEBERGEMENT', 'STAND', 'AUTRE'] as const).map(t => (
                <TouchableOpacity key={t}
                  style={[s.typeChip, fraisType === t && s.typeChipActive]}
                  onPress={() => setFraisType(t)} activeOpacity={0.7}>
                  <Text style={[s.typeChipText, fraisType === t && s.typeChipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.modalLabel}>Motif</Text>
            <TextInput style={[s.modalInput, isDark && { backgroundColor: 'rgba(255,255,255,0.08)', color: Colors.white, borderColor: 'rgba(255,255,255,0.1)' }]}
              value={fraisMotif} onChangeText={setFraisMotif} placeholder="Ex: Transport salon Paris" placeholderTextColor={Colors.textSoft} />

            <Text style={s.modalLabel}>Montant HT (€)</Text>
            <TextInput style={[s.modalInput, isDark && { backgroundColor: 'rgba(255,255,255,0.08)', color: Colors.white, borderColor: 'rgba(255,255,255,0.1)' }]}
              value={fraisMontant} onChangeText={setFraisMontant} placeholder="0.00" placeholderTextColor={Colors.textSoft} keyboardType="decimal-pad" />

            <View style={s.modalActions}>
              <TouchableOpacity onPress={() => setShowFraisForm(false)} style={s.modalBtnCancel} activeOpacity={0.7}>
                <Text style={s.modalBtnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveFrais} disabled={fraisSaving || !fraisMotif.trim()}
                style={[s.modalBtnSave, (fraisSaving || !fraisMotif.trim()) && { opacity: 0.5 }]} activeOpacity={0.85}>
                <LinearGradient colors={[Colors.sage, '#3A7D63']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.modalBtnSaveBg}>
                  <Text style={s.modalBtnSaveText}>{fraisSaving ? '…' : 'Ajouter'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

// ── Ligne résultat ─────────────────────────────────────────────────────

function LigneResult({ label, value, sub, bold, isDark }: {
  label: string; value: number | null; sub?: string; bold?: boolean; isDark: boolean
}) {
  return (
    <View style={lr.row}>
      <Text style={[lr.label, bold && lr.labelBold, { color: isDark ? (bold ? Dark.text : Dark.textSoft) : (bold ? Colors.text : Colors.textMid) }]}>
        {label}
      </Text>
      {value != null ? (
        <Text style={[lr.value, { color: value >= 0 ? Colors.sage : Colors.terra }, bold && lr.valueBold]}>
          {value.toFixed(2)} €
        </Text>
      ) : (
        <Text style={[lr.value, lr.sub, isDark && { color: Dark.textSoft }]}>{sub}</Text>
      )}
    </View>
  )
}
const lr = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  label: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textMid, flex: 1 },
  labelBold: { fontWeight: '700', color: Colors.text },
  value: { fontFamily: Fonts.body, fontSize: 13, fontWeight: '600', minWidth: 72, textAlign: 'right' },
  valueBold: { fontSize: 15, fontWeight: '700' },
  sub: { color: Colors.textSoft, fontStyle: 'italic', fontSize: 11, fontWeight: '400' },
})

// ── Styles ──────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: Colors.cream },
  bg:    { ...StyleSheet.absoluteFillObject },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 16, marginBottom: 16,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center',
  },
  backBtnText: { color: Colors.white, fontSize: 18, fontWeight: '600' },
  headerBtn: { width: 36, height: 36, borderRadius: Radius.full, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerBtnText: { color: Colors.white, fontSize: 14 },
  headerInfo: { flex: 1, alignItems: 'center' },
  headerPdv: { fontFamily: Fonts.displayItalic, fontSize: 18, color: Colors.white, fontStyle: 'italic' },
  headerDate: { fontFamily: Fonts.body, fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 },

  // Résumé
  summary: {
    flexDirection: 'row', backgroundColor: Colors.white,
    marginHorizontal: 20, borderRadius: Radius.lg, padding: 16, marginBottom: 12,
    ...Shadow.card,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { fontFamily: Fonts.body, fontSize: 18, fontWeight: '700' },
  summaryLbl: { fontFamily: Fonts.body, fontSize: 10, color: Colors.textSoft, marginTop: 2 },
  summaryDiv: { width: 1, height: 30, backgroundColor: Colors.creamDark, alignSelf: 'center' },

  // Frais
  fraisAccordion: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, marginBottom: 12,
    padding: 14, ...Shadow.card, marginHorizontal: 20,
  },
  fraisAccordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fraisAccordionTitle: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '700', color: Colors.text },
  fraisAccordionArrow: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSoft },
  fraisList: { marginTop: 10 },
  fraisRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.cream },
  fraisMotif: { fontFamily: Fonts.body, fontSize: 13, fontWeight: '600', color: Colors.text },
  fraisMeta: { fontFamily: Fonts.body, fontSize: 10, color: Colors.textSoft, marginTop: 1 },
  fraisMontant: { fontFamily: Fonts.body, fontSize: 13, fontWeight: '600', color: Colors.text, marginRight: 8 },
  fraisDeleteBtn: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.terraLight, justifyContent: 'center', alignItems: 'center', marginLeft: 6,
  },
  fraisDeleteIcon: { fontSize: 10, color: Colors.terra, fontWeight: '700' },

  // Tabs
  tabRow: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 12,
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 4, ...Shadow.card,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: Radius.md, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.inkFaint },
  tabActiveDark: { backgroundColor: 'rgba(255,255,255,0.1)' },
  tabText: { fontFamily: Fonts.body, fontSize: 13, fontWeight: '600' },
  tabTextActive: {},

  scroll: { paddingHorizontal: 20 },

  // Paniers
  panierCard: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14, marginBottom: 6,
    ...Shadow.card,
  },
  panierRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  panierEmoji: { fontSize: 20 },
  panierInfo: { flex: 1 },
  panierName: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '600', color: Colors.text },
  panierMeta: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSoft, marginTop: 2 },
  panierTotal: { fontFamily: Fonts.body, fontSize: 15, fontWeight: '700', color: Colors.ink },
  panierCancelBtn: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.terraLight, justifyContent: 'center', alignItems: 'center', marginLeft: 8,
  },
  panierCancelIcon: { fontSize: 10, color: Colors.terra, fontWeight: '700' },

  lignesWrap: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.cream },
  ligneRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  ligneName: { flex: 1, fontFamily: Fonts.body, fontSize: 12, color: Colors.text },
  ligneQty: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textSoft, marginRight: 12 },
  ligneCa: { fontFamily: Fonts.body, fontSize: 12, fontWeight: '600', color: Colors.sage },

  // Articles
  articleCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    borderRadius: Radius.lg, padding: 14, marginBottom: 6, ...Shadow.card,
  },
  articleInfo: { flex: 1 },
  articleName: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '600', color: Colors.text },
  articleQty: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSoft, marginTop: 2 },
  articleCa: { fontFamily: Fonts.body, fontSize: 15, fontWeight: '700' },

  // Accordéon
  accordion: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, marginTop: 16, padding: 14,
    ...Shadow.card,
  },
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  accordionTitle: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '700', color: Colors.text },
  accordionBenef: { fontFamily: Fonts.body, fontSize: 15, fontWeight: '700' },
  accordionArrow: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSoft },
  accordionBody: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.cream },
  resultSep: { borderTopWidth: 1, borderTopColor: Colors.cream, marginVertical: 4 },

  // Modal frais
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 24, width: '100%', maxWidth: 360, ...Shadow.float },
  modalTitle: { fontFamily: Fonts.displayItalic, fontSize: 20, color: Colors.ink, fontStyle: 'italic', marginBottom: 16 },
  modalLabel: { fontFamily: Fonts.body, fontSize: 10, fontWeight: '700', color: Colors.textSoft, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 12, marginBottom: 6 },
  modalInput: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text, backgroundColor: Colors.cream, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1.5, borderColor: 'rgba(36,51,71,0.08)' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: Colors.cream, borderWidth: 1.5, borderColor: 'transparent' },
  typeChipActive: { borderColor: Colors.sage, backgroundColor: Colors.sageLight },
  typeChipText: { fontFamily: Fonts.body, fontSize: 11, fontWeight: '600', color: Colors.textMid },
  typeChipTextActive: { color: Colors.sage },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalBtnCancel: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: Radius.md, backgroundColor: Colors.cream },
  modalBtnCancelText: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '600', color: Colors.textMid },
  modalBtnSave: { flex: 1.5, borderRadius: Radius.md, overflow: 'hidden' },
  modalBtnSaveBg: { paddingVertical: 14, alignItems: 'center' },
  modalBtnSaveText: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '700', color: Colors.white },

  emptyWrap: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textSoft },
})
