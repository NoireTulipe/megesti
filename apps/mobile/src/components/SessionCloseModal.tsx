import { useState, useEffect, useMemo } from 'react'
import { View, Text, TouchableOpacity, TextInput, Modal, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Colors, Fonts, Radius, Gradients } from '@/constants/theme'

interface SessionCloseModalProps {
  visible: boolean
  pdvNom: string
  /** Fond d'ouverture (null si inconnu — session distante non détaillée) */
  fondOuverture: number | null
  /** Espèces encaissées sur cet appareil (null si non calculable) */
  especes: number | null
  /** true = caisse physique : saisie du fond de fermeture obligatoire */
  askFond: boolean
  onCancel: () => void
  onConfirm: (fondFermeture: number) => void | Promise<void>
}

/**
 * Modal de fermeture de session. Quand le PDV encaisse en direct, affiche
 * l'attendu en caisse (fond d'ouverture + espèces comptées sur cet appareil)
 * et l'écart par rapport au montant saisi — le geste de fin de salon.
 */
export function SessionCloseModal({ visible, pdvNom, fondOuverture, especes, askFond, onCancel, onConfirm }: SessionCloseModalProps) {
  const [fond, setFond] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (visible) { setFond(''); setSaving(false) } }, [visible])

  const attendu = fondOuverture != null && especes != null ? fondOuverture + especes : null
  const saisi = parseFloat(fond.replace(',', '.'))
  const ecart = attendu != null && !isNaN(saisi) ? saisi - attendu : null

  const canClose = useMemo(() => {
    if (saving) return false
    if (!askFond) return true
    return fond.trim() !== '' && !isNaN(saisi) && saisi >= 0
  }, [askFond, fond, saisi, saving])

  async function confirm() {
    if (!canClose) return
    setSaving(true)
    try {
      await onConfirm(askFond ? saisi : 0)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onCancel}>
        <View style={s.card} onStartShouldSetResponder={() => true}>
          <Text style={s.title}>Fermer la session</Text>
          <Text style={s.pdv}>{pdvNom}</Text>

          {askFond ? (
            <>
              {attendu != null && (
                <View style={s.attenduBox}>
                  <View style={s.attenduRow}>
                    <Text style={s.attenduLbl}>Fond d'ouverture</Text>
                    <Text style={s.attenduVal}>{(fondOuverture ?? 0).toFixed(2)} €</Text>
                  </View>
                  <View style={s.attenduRow}>
                    <Text style={s.attenduLbl}>Espèces encaissées (cet appareil)</Text>
                    <Text style={s.attenduVal}>{(especes ?? 0).toFixed(2)} €</Text>
                  </View>
                  <View style={[s.attenduRow, s.attenduTotalRow]}>
                    <Text style={s.attenduTotalLbl}>Attendu en caisse</Text>
                    <Text style={s.attenduTotalVal}>{attendu.toFixed(2)} €</Text>
                  </View>
                </View>
              )}

              <Text style={s.label}>Fond compté à la fermeture (€)</Text>
              <TextInput
                style={s.input} value={fond} onChangeText={setFond}
                placeholder="0.00" placeholderTextColor={Colors.textSoft}
                keyboardType="decimal-pad" autoFocus
              />

              {ecart != null && (
                <Text style={[
                  s.ecart,
                  Math.abs(ecart) < 0.005 ? s.ecartOk : ecart > 0 ? s.ecartPlus : s.ecartMoins,
                ]}>
                  {Math.abs(ecart) < 0.005
                    ? '✓ Caisse juste'
                    : `Écart : ${ecart > 0 ? '+' : ''}${ecart.toFixed(2)} €`}
                </Text>
              )}
            </>
          ) : (
            <Text style={s.confirmTxt}>Confirmer la fermeture de la session ?</Text>
          )}

          <View style={s.actions}>
            <TouchableOpacity onPress={onCancel} style={s.btnCancel} activeOpacity={0.7}>
              <Text style={s.btnCancelTxt}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={confirm} activeOpacity={canClose ? 0.85 : 1} style={s.btnClose}>
              <LinearGradient
                colors={canClose ? Gradients.caisse : [Colors.textSoft, Colors.textSoft]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.btnCloseBg}>
                <Text style={s.btnCloseTxt}>{saving ? 'Fermeture…' : 'Fermer'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'center', alignItems: 'center', padding: 28 },
  card: {
    backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 24, width: '100%', maxWidth: 380,
    shadowColor: Colors.text, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.10, shadowRadius: 24, elevation: 8,
  },
  title: { fontFamily: Fonts.displayItalic, fontSize: 20, color: Colors.rose, fontStyle: 'italic' },
  pdv:   { fontFamily: Fonts.body, fontSize: 13, color: Colors.textSoft, marginTop: 2, marginBottom: 14 },

  attenduBox: { backgroundColor: Colors.cream, borderRadius: Radius.md, padding: 12, marginBottom: 14 },
  attenduRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  attenduLbl: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textMid, flex: 1, marginRight: 8 },
  attenduVal: { fontFamily: Fonts.body, fontSize: 12, fontWeight: '600', color: Colors.text },
  attenduTotalRow: { borderTopWidth: 1, borderTopColor: Colors.creamDark, marginTop: 6, paddingTop: 8 },
  attenduTotalLbl: { fontFamily: Fonts.body, fontSize: 13, fontWeight: '700', color: Colors.text },
  attenduTotalVal: { fontFamily: Fonts.body, fontSize: 15, fontWeight: '800', color: Colors.rose },

  label: { fontFamily: Fonts.body, fontSize: 11, fontWeight: '700', color: Colors.textSoft, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  input: {
    fontFamily: Fonts.body, fontSize: 16, color: Colors.text, backgroundColor: Colors.cream,
    borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1.5, borderColor: 'rgba(196,132,122,0.2)',
  },
  ecart:      { fontFamily: Fonts.body, fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 10 },
  ecartOk:    { color: Colors.sage },
  ecartPlus:  { color: Colors.gold },
  ecartMoins: { color: Colors.terra },

  confirmTxt: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textMid, lineHeight: 20 },

  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  btnCancel: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: Radius.md, backgroundColor: Colors.cream },
  btnCancelTxt: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '600', color: Colors.textMid },
  btnClose: { flex: 1, borderRadius: Radius.md, overflow: 'hidden' },
  btnCloseBg: { paddingVertical: 14, alignItems: 'center' },
  btnCloseTxt: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '700', color: Colors.white },
})
