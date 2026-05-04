import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts'
import { useBilan } from './hooks/useBilan'
import {
  useCharges,
  TYPE_CHARGE_LABELS, TYPE_CHARGE_COLORS, PERIODICITE_LABELS,
  CATEGORIE_CHARGE_LABELS, CATEGORIE_CHARGE_COLORS,
  type TypeCharge, type Periodicite, type CategorieCharge,
} from './hooks/useCharges'
import styles from './BilanPage.module.css'

// ── Palette ─────────────────────────────────────────────────────────────────
const C = {
  rose:  '#C4907C',
  gold:  '#C9933A',
  sage:  '#6B8F71',
  mauve: '#8B7BAB',
  ink:   '#3D5470',
  terra: '#C85D3A',
  green: '#15803d',
  red:   '#dc2626',
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function fEur(v: number) {
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}
function fDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}
function isoToInput(iso: string) { return iso.split('T')[0] }

function startOfMonth()  { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) }
function startOfQuarter(){ const d = new Date(); const q = Math.floor(d.getMonth()/3)*3; return new Date(d.getFullYear(), q, 1) }
function startOfYear()   { return new Date(new Date().getFullYear(), 0, 1) }

const PRESETS = [
  { key: 'month',   label: 'Ce mois',     from: () => startOfMonth() },
  { key: 'quarter', label: 'Ce trimestre', from: () => startOfQuarter() },
  { key: 'year',    label: 'Cette année',  from: () => startOfYear() },
  { key: 'custom',  label: 'Personnalisé', from: () => startOfYear() },
] as const

type PresetKey = typeof PRESETS[number]['key']

function MODE_LABEL(m: string) {
  const map: Record<string, string> = { CB: 'Carte', ESPECES: 'Espèces', CHEQUE: 'Chèque', VIREMENT: 'Virement', SUMUP: 'SumUp' }
  return map[m] ?? m
}

// ── Tooltip ──────────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltip}>
      {label && <p className={styles.tooltipLabel}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className={styles.tooltipRow} style={{ color: p.color }}>
          <span>{p.name}</span>
          <span className={styles.tooltipVal}>{fEur(Math.abs(p.value))}</span>
        </p>
      ))}
    </div>
  )
}


// ── Composant principal ───────────────────────────────────────────────────────
export function BilanPage() {
  const navigate = useNavigate()
  const [preset, setPreset]     = useState<PresetKey>('year')
  const [customFrom, setCustomFrom] = useState(isoToInput(startOfYear().toISOString()))
  const [customTo,   setCustomTo]   = useState(isoToInput(new Date().toISOString()))
  const [showDetail, setShowDetail] = useState<string | null>(null)

  const { data: charges = [] } = useCharges()

  const { from, to } = useMemo(() => {
    if (preset === 'custom') return { from: customFrom, to: customTo }
    const f = PRESETS.find(p => p.key === preset)!.from()
    return { from: isoToInput(f.toISOString()), to: isoToInput(new Date().toISOString()) }
  }, [preset, customFrom, customTo])

  const { data, isLoading } = useBilan(from, to)

  // ── Données P&L pour waterfall CSS ─────────────────────────────────────────
  const pnlRows = useMemo(() => {
    if (!data) return []
    const { caHT, coutDesVentes, totalFrais, totalChargesPayees, totalDroits, resultatNet } = data.pnl
    return [
      { label: 'CA HT',         valeur: caHT,             couleur: C.sage,  signe: '+' },
      { label: 'Coût des ventes', valeur: coutDesVentes,    couleur: C.gold,  signe: '-' },
      { label: 'Frais sessions',valeur: totalFrais,        couleur: C.terra, signe: '-' },
      { label: 'Droits auteurs',valeur: totalDroits,       couleur: C.mauve, signe: '-' },
      { label: 'Charges',       valeur: totalChargesPayees,couleur: C.ink,   signe: '-' },
      { label: 'Résultat net',  valeur: Math.abs(resultatNet), couleur: resultatNet >= 0 ? C.green : C.red, signe: resultatNet >= 0 ? '=' : '= -', isResult: true },
    ]
  }, [data])

  const maxPnl = useMemo(() => Math.max(...pnlRows.map(r => r.valeur), 1), [pnlRows])

  // ── Données donut flux ──────────────────────────────────────────────────────
  const donutEntrees = useMemo(() => {
    if (!data) return []
    const { ventesDirectes, ventesHorsSession, ventesDepotTTC, reversementsEncaisses, detail } = data.entreesEffectives
    const motifSlices = (detail.ventesParMotif ?? []).map(m => ({
      name:  m.libelle,
      value: m.ca,
      fill:  C.mauve,
    }))
    return [
      { name: 'Ventes sessions',   value: ventesDirectes,        fill: C.rose },
      ...motifSlices,
      { name: 'Ventes en dépôt',   value: ventesDepotTTC,        fill: C.ink },
      { name: 'Reversements PDV',  value: reversementsEncaisses, fill: C.gold },
    ].filter(d => d.value > 0)
  }, [data])

  const donutSorties = useMemo(() => {
    if (!data) return []
    const { frais, parCategorie, droitsAuteursPaies, commissionsReversements } = data.sortiesEffectives
    const slices = [
      { name: 'Frais sessions',     value: frais,                    fill: C.terra },
      { name: 'DA versés',          value: droitsAuteursPaies,       fill: C.mauve },
      { name: 'Commissions PDV',    value: commissionsReversements,  fill: C.gold  },
      ...(Object.keys(parCategorie) as CategorieCharge[]).map(cat => ({
        name:  CATEGORIE_CHARGE_LABELS[cat],
        value: parCategorie[cat],
        fill:  CATEGORIE_CHARGE_COLORS[cat],
      })),
    ]
    return slices.filter(d => d.value > 0)
  }, [data])

  // ── Données bar chart flux (comparaison effectif vs prévu) ─────────────────
  const barData = useMemo(() => {
    if (!data) return []
    return [
      { name: 'Effectif',  entrees: data.entreesEffectives.total, sorties: -data.sortiesEffectives.total },
      { name: 'Prévu',     entrees: data.entreesPrevues.total,    sorties: -data.sortiesPrevues.total },
    ]
  }, [data])

  // ── Bilan actif/passif ──────────────────────────────────────────────────────
  const bilanActif  = data?.bilan.actif
  const bilanPassif = data?.bilan.passif

  // Jours avant échéance pour alerte
  function joursAvant(iso: string | null): number | null {
    if (!iso) return null
    return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.hero}>
          <div className={styles.heroBlob} />
          <div className={styles.heroContent}>
            <div className={styles.skH1} />
          </div>
        </div>
        <div className={styles.content}>
          <div className={styles.skRow}>
            {[1,2,3,4].map(i => <div key={i} className={styles.skCard} />)}
          </div>
          <div className={styles.skChart} />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div className={styles.hero}>
        <div className={styles.heroBlob} />
        <div className={styles.heroContent}>
          <div>
            <h1 className={styles.heroTitle}>Bilan financier</h1>
            {data && (
              <p className={styles.heroSub}>
                {fDate(data.periode.from)} → {fDate(data.periode.to)}
              </p>
            )}
          </div>
          <div className={styles.periodSelector}>
            {PRESETS.map(p => (
              <button
                key={p.key}
                className={`${styles.periodBtn} ${preset === p.key ? styles.periodBtnActive : ''}`}
                onClick={() => setPreset(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {preset === 'custom' && (
          <div className={styles.customDates}>
            <label className={styles.customLabel}>Du</label>
            <input type="date" className={styles.customInput} value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
            <label className={styles.customLabel}>au</label>
            <input type="date" className={styles.customInput} value={customTo}   onChange={e => setCustomTo(e.target.value)} />
          </div>
        )}
      </div>

      <div className={styles.content}>

        {/* ── KPI ROW ──────────────────────────────────────────────────────── */}
        {data && (
          <div className={styles.kpiRow}>
            <div className={`${styles.kpiCard} ${styles.kpiResult}`}
              style={{ '--accent': data.pnl.resultatNet >= 0 ? C.green : C.red } as React.CSSProperties}>
              <p className={styles.kpiLabel}>Résultat net</p>
              <p className={styles.kpiVal} style={{ color: data.pnl.resultatNet >= 0 ? C.green : C.red }}>
                {data.pnl.resultatNet >= 0 ? '+' : ''}{fEur(data.pnl.resultatNet)}
              </p>
              <p className={styles.kpiSub}>CA HT : {fEur(data.pnl.caHT)}</p>
            </div>
            <div className={styles.kpiCard} style={{ '--accent': C.sage } as React.CSSProperties}>
              <p className={styles.kpiLabel}>Encaissé</p>
              <p className={styles.kpiVal}>{fEur(data.entreesEffectives.total)}</p>
              <p className={styles.kpiSub}>{data.entreesEffectives.detail.ventesParMode.length} mode{data.entreesEffectives.detail.ventesParMode.length > 1 ? 's' : ''}</p>
            </div>
            <div className={styles.kpiCard} style={{ '--accent': C.terra } as React.CSSProperties}>
              <p className={styles.kpiLabel}>Décaissé</p>
              <p className={styles.kpiVal}>{fEur(data.sortiesEffectives.total)}</p>
              <p className={styles.kpiSub}>Frais + charges payées</p>
            </div>
            <div className={styles.kpiCard} style={{ '--accent': C.gold } as React.CSSProperties}>
              <p className={styles.kpiLabel}>Valeur stock</p>
              <p className={styles.kpiVal}>{fEur(data.stock.valeurEstimee)}</p>
              <p className={styles.kpiSub}>{data.stock.nbArticles} article{data.stock.nbArticles > 1 ? 's' : ''} en stock</p>
            </div>
          </div>
        )}

        {/* ── COMPTE DE RÉSULTAT (waterfall CSS) ───────────────────────────── */}
        {data && pnlRows.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionEmoji}>📊</span>
              <h2 className={styles.sectionTitle}>Compte de résultat</h2>
            </div>
            <div className={styles.waterfall}>
              {pnlRows.map((row, i) => (
                <div key={i} className={`${styles.wfRow} ${row.isResult ? styles.wfRowResult : ''}`}>
                  <div className={styles.wfLabel}>{row.label}</div>
                  <div className={styles.wfBarWrap}>
                    <div
                      className={styles.wfBar}
                      style={{
                        width: `${(row.valeur / maxPnl) * 100}%`,
                        background: row.isResult
                          ? `linear-gradient(90deg, ${row.couleur}CC 0%, ${row.couleur} 100%)`
                          : row.couleur,
                        opacity: row.valeur === 0 ? 0.2 : 1,
                      }}
                    />
                  </div>
                  <div className={styles.wfAmount} style={{ color: row.couleur }}>
                    {row.signe} {fEur(row.valeur)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FLUX EFFECTIFS vs PRÉVUS (bar chart) ─────────────────────────── */}
        {data && (
          <div className={styles.grid2}>

            {/* Entrées effectives */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionEmoji}>💰</span>
                <h2 className={styles.sectionTitle}>Entrées effectives</h2>
                <span className={styles.sectionTotal}>{fEur(data.entreesEffectives.total)}</span>
              </div>
              {donutEntrees.length > 0 ? (
                <div className={styles.donutWrap}>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={donutEntrees} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                        {donutEntrees.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => fEur(v)} />
                      <Legend iconType="circle" iconSize={8} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className={styles.empty}>Aucune entrée sur la période</p>
              )}
              <button className={styles.detailBtn} onClick={() => setShowDetail(showDetail === 'entrees' ? null : 'entrees')}>
                {showDetail === 'entrees' ? '▲ Masquer' : '▼ Détail'}
              </button>
              {showDetail === 'entrees' && (
                <div className={styles.detailList}>
                  {data.entreesEffectives.detail.ventesParMode.length > 0 && (
                    <p className={styles.detailCat}>Ventes en session</p>
                  )}
                  {data.entreesEffectives.detail.ventesParMode.map(v => (
                    <div key={v.mode} className={styles.detailRow}>
                      <span>{MODE_LABEL(v.mode)}</span>
                      <span className={styles.detailSub}>{v.nb} vente{v.nb > 1 ? 's' : ''}</span>
                      <span className={styles.detailMontant}>{fEur(v.ca)}</span>
                    </div>
                  ))}
                  {(data.entreesEffectives.detail.ventesParMotif ?? []).length > 0 && (
                    <p className={styles.detailCat}>Ventes hors session</p>
                  )}
                  {(data.entreesEffectives.detail.ventesParMotif ?? []).map(m => (
                    <div key={m.motifVenteId} className={styles.detailRow}>
                      <span>{m.libelle}</span>
                      <span className={styles.detailSub}>{m.nb} vente{m.nb > 1 ? 's' : ''}</span>
                      <span className={styles.detailMontant}>{fEur(m.ca)}</span>
                    </div>
                  ))}
                  {data.entreesEffectives.detail.reversements.length > 0 && (
                    <p className={styles.detailCat}>Reversements PDV</p>
                  )}
                  {data.entreesEffectives.detail.reversements.map((r, i) => (
                    <div key={i} className={styles.detailRow}>
                      <span>{r.pdvNom}</span>
                      <span className={styles.detailSub}>{r.dateEncaissement ? fDate(r.dateEncaissement) : ''}</span>
                      <span className={styles.detailMontant}>{fEur(r.montant)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sorties effectives */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionEmoji}>💸</span>
                <h2 className={styles.sectionTitle}>Sorties effectives</h2>
                <span className={styles.sectionTotal} style={{ color: C.terra }}>{fEur(data.sortiesEffectives.total)}</span>
              </div>
              {donutSorties.length > 0 ? (
                <div className={styles.donutWrap}>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={donutSorties} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                        {donutSorties.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => fEur(v)} />
                      <Legend iconType="circle" iconSize={8} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className={styles.empty}>Aucune sortie sur la période</p>
              )}
              <button className={styles.detailBtn} onClick={() => setShowDetail(showDetail === 'sorties' ? null : 'sorties')}>
                {showDetail === 'sorties' ? '▲ Masquer' : '▼ Détail'}
              </button>
              {showDetail === 'sorties' && (
                <div className={styles.detailList}>
                  {data.sortiesEffectives.detail.frais.length > 0 && <p className={styles.detailCat}>Frais sessions</p>}
                  {data.sortiesEffectives.detail.frais.map((f, i) => (
                    <div key={i} className={styles.detailRow}>
                      <span>{f.motif}</span>
                      <span className={styles.detailSub}>{f.type}</span>
                      <span className={styles.detailMontant}>{fEur(f.montantHT)}</span>
                    </div>
                  ))}
                  {data.sortiesEffectives.detail.charges.length > 0 && <p className={styles.detailCat}>Charges payées</p>}
                  {data.sortiesEffectives.detail.charges.map((c, i) => (
                    <div key={i} className={styles.detailRow}>
                      <span>{c.libelle}</span>
                      <span className={styles.detailSub} style={{ color: CATEGORIE_CHARGE_COLORS[c.categorie as CategorieCharge] }}>
                        {CATEGORIE_CHARGE_LABELS[c.categorie as CategorieCharge] ?? TYPE_CHARGE_LABELS[c.type as TypeCharge]}
                      </span>
                      <span className={styles.detailMontant}>{fEur(c.montantHT)}</span>
                    </div>
                  ))}
                  {data.sortiesEffectives.detail.droitsAuteursPaies.length > 0 && <p className={styles.detailCat}>Droits d'auteurs versés</p>}
                  {data.sortiesEffectives.detail.droitsAuteursPaies.map((d, i) => (
                    <div key={i} className={styles.detailRow}>
                      <span>{d.nomAuteur}</span>
                      <span className={styles.detailSub} style={{ color: C.mauve }}>DA versé</span>
                      <span className={styles.detailMontant}>{fEur(d.montant)}</span>
                    </div>
                  ))}
                  {data.sortiesEffectives.detail.commissionsReversements.length > 0 && <p className={styles.detailCat}>Commissions PDV</p>}
                  {data.sortiesEffectives.detail.commissionsReversements.map((c, i) => (
                    <div key={i} className={styles.detailRow}>
                      <span>{c.pdvNom}</span>
                      <span className={styles.detailSub}>Brut {fEur(c.montantBrut)}</span>
                      <span className={styles.detailMontant} style={{ color: C.gold }}>{fEur(c.commission)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── FLUX PRÉVUS ───────────────────────────────────────────────────── */}
        {data && (
          <div className={styles.grid2}>

            {/* Entrées prévues */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionEmoji}>⏳</span>
                <h2 className={styles.sectionTitle}>Entrées prévues</h2>
                <span className={styles.sectionTotal}>{fEur(data.entreesPrevues.total)}</span>
              </div>
              {data.entreesPrevues.detail.length === 0 ? (
                <p className={styles.empty}>Aucun reversement en attente</p>
              ) : (
                <div className={styles.detailList}>
                  {data.entreesPrevues.detail.map((r, i) => (
                    <div key={i} className={styles.detailRow}>
                      <span>{r.pdvNom}</span>
                      <span className={styles.detailSub}>
                        Brut {fEur(r.montant)}{r.commission > 0 ? ` − comm. ${fEur(r.commission)}` : ''}
                      </span>
                      <span className={styles.detailMontant} style={{ color: C.gold }}>
                        {fEur(r.montant - r.commission)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sorties prévues */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionEmoji}>📋</span>
                <h2 className={styles.sectionTitle}>Sorties prévues</h2>
                <span className={styles.sectionTotal} style={{ color: C.mauve }}>{fEur(data.sortiesPrevues.total)}</span>
              </div>
              {data.sortiesPrevues.detail.droits.length > 0 && (
                <>
                  <p className={styles.detailCat}>Droits d'auteurs à reverser</p>
                  {data.sortiesPrevues.detail.droits.map((d) => (
                    <div key={d.auteurId} className={styles.detailRow}>
                      <span>{d.nomAuteur}</span>
                      <span className={styles.detailSub}>Brut : {fEur(d.montantBrut)}</span>
                      <span className={styles.detailMontant} style={{ color: C.mauve }}>{fEur(d.montantNet)}</span>
                    </div>
                  ))}
                </>
              )}
              {data.sortiesPrevues.detail.charges.length > 0 && (
                <>
                  <p className={styles.detailCat}>Charges à venir</p>
                  {data.sortiesPrevues.detail.charges.map((c) => (
                    <div key={c.id} className={styles.detailRow}>
                      <span>{c.libelle}</span>
                      <span className={styles.detailSub}>{c.periodicite ? PERIODICITE_LABELS[c.periodicite as Periodicite] : TYPE_CHARGE_LABELS[c.type as TypeCharge]}</span>
                      <span className={styles.detailMontant}>{fEur(c.montantHT)}</span>
                    </div>
                  ))}
                </>
              )}
              {data.sortiesPrevues.commissionsReversements > 0 && (
                <>
                  <p className={styles.detailCat}>Commissions PDV à déduire</p>
                  <div className={styles.detailRow}>
                    <span>Total commissions reversements en attente</span>
                    <span className={styles.detailMontant} style={{ color: C.gold }}>
                      {fEur(data.sortiesPrevues.commissionsReversements)}
                    </span>
                  </div>
                </>
              )}
              {data.sortiesPrevues.detail.droits.length === 0 && data.sortiesPrevues.detail.charges.length === 0 && data.sortiesPrevues.commissionsReversements === 0 && (
                <p className={styles.empty}>Aucune sortie prévue</p>
              )}
            </div>
          </div>
        )}

        {/* ── VUE GLOBALE (bar chart effectif vs prévu) ────────────────────── */}
        {data && (barData[0].entrees > 0 || barData[1].entrees > 0) && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionEmoji}>📈</span>
              <h2 className={styles.sectionTitle}>Effectif vs Prévu</h2>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--cream-dark)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-soft)' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => fEur(Math.abs(v))} tick={{ fontSize: 11, fill: 'var(--text-soft)' }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="entrees" name="Entrées"  fill={C.sage}  radius={[4,4,0,0]} />
                <Bar dataKey="sorties" name="Sorties"  fill={C.terra} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── CHARGES & ABONNEMENTS (aperçu) ──────────────────────────────── */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEmoji}>🔄</span>
            <h2 className={styles.sectionTitle}>Charges & abonnements</h2>
            <button className={styles.btnManage} onClick={() => navigate('/charges')}>
              Gérer →
            </button>
          </div>

          {charges.length === 0 ? (
            <div className={styles.chargesEmptyRow}>
              <p className={styles.empty}>Aucune charge enregistrée</p>
              <button className={styles.btnAdd} onClick={() => navigate('/charges')}>+ Ajouter</button>
            </div>
          ) : (
            <div className={styles.chargeGrid}>
              {charges.slice(0, 6).map(c => {
                const jours    = c.prochaineEcheance ? Math.ceil((new Date(c.prochaineEcheance).getTime() - Date.now()) / 86_400_000) : null
                const urgent   = jours !== null && jours >= 0 && jours <= 30
                const depassee = jours !== null && jours < 0
                return (
                  <div key={c.id} className={`${styles.chargeCard} ${c.statut === 'PAYE' && c.type !== 'ABONNEMENT' ? styles.chargePaye : ''}`}
                    style={{ '--type-color': TYPE_CHARGE_COLORS[c.type] } as React.CSSProperties}>
                    <div className={styles.chargeCardTop}>
                      <span className={styles.chargeTypeBadge} style={{ background: TYPE_CHARGE_COLORS[c.type] }}>
                        {TYPE_CHARGE_LABELS[c.type]}
                      </span>
                      {c.type !== 'ABONNEMENT' && c.statut === 'PAYE' && <span className={styles.chargePayeBadge}>✓ Payé</span>}
                      {c.periodicite && <span className={styles.chargePerioBadge}>{PERIODICITE_LABELS[c.periodicite as Periodicite]}</span>}
                    </div>
                    <p className={styles.chargeLibelle}>{c.libelle}</p>
                    <p className={styles.chargeMontant}>{fEur(parseFloat(c.montantHT))}</p>
                    {c.prochaineEcheance && (
                      <p className={`${styles.chargeEcheance} ${urgent ? styles.chargeEcheanceUrgent : ''} ${depassee ? styles.chargeEcheanceDepassee : ''}`}>
                        {depassee ? '⚠️ Échue' : urgent ? `⏰ J-${jours}` : `📅 ${fDate(c.prochaineEcheance)}`}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          {charges.length > 6 && (
            <button className={styles.btnSeeAll} onClick={() => navigate('/charges')}>
              Voir les {charges.length} charges →
            </button>
          )}
        </div>

        {/* ── TABLEAU RÉCAPITULATIF ────────────────────────────────────────── */}
        {data && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionEmoji}>📋</span>
              <h2 className={styles.sectionTitle}>Récapitulatif entrées / sorties</h2>
            </div>
            <div className={styles.grid2}>
              {/* Entrées */}
              <div>
                <p className={styles.detailCat} style={{ marginBottom: 8 }}>Entrées effectives</p>
                {[
                  { label: 'Ventes en session',       val: data.entreesEffectives.ventesDirectes },
                  { label: 'Ventes hors session',     val: data.entreesEffectives.ventesHorsSession },
                  { label: 'Ventes en dépôt (CA brut)', val: data.entreesEffectives.ventesDepotTTC, extra: data.entreesEffectives.ventesDepotNb > 0 ? `${data.entreesEffectives.ventesDepotNb} vente${data.entreesEffectives.ventesDepotNb > 1 ? 's' : ''}` : undefined },
                  { label: 'Reversements PDV encaissés', val: data.entreesEffectives.reversementsEncaisses },
                ].filter(r => r.val > 0).map((r, i) => (
                  <div key={i} className={styles.detailRow}>
                    <span>{r.label}{r.extra && <span className={styles.detailSub}> · {r.extra}</span>}</span>
                    <span className={styles.detailMontant} style={{ color: C.sage }}>{fEur(r.val)}</span>
                  </div>
                ))}
                <div className={styles.detailRow} style={{ borderTop: '1.5px solid var(--cream-dark)', marginTop: 6, paddingTop: 6, fontWeight: 700 }}>
                  <span>Total encaissé</span>
                  <span style={{ color: C.sage }}>{fEur(data.entreesEffectives.total)}</span>
                </div>
                {data.entreesPrevues.total > 0 && (
                  <>
                    <p className={styles.detailCat} style={{ marginTop: 16, marginBottom: 8 }}>Entrées prévues</p>
                    <div className={styles.detailRow}>
                      <span>Reversements PDV en attente (brut)</span>
                      <span className={styles.detailMontant} style={{ color: C.gold }}>{fEur(data.entreesPrevues.total)}</span>
                    </div>
                  </>
                )}
              </div>
              {/* Sorties */}
              <div>
                <p className={styles.detailCat} style={{ marginBottom: 8 }}>Sorties effectives</p>
                {[
                  { label: 'Frais sessions',        val: data.sortiesEffectives.frais },
                  { label: 'Charges payées',         val: data.sortiesEffectives.charges },
                  { label: 'Droits d\'auteurs versés', val: data.sortiesEffectives.droitsAuteursPaies },
                  { label: 'Commissions PDV',        val: data.sortiesEffectives.commissionsReversements },
                ].filter(r => r.val > 0).map((r, i) => (
                  <div key={i} className={styles.detailRow}>
                    <span>{r.label}</span>
                    <span className={styles.detailMontant} style={{ color: C.terra }}>{fEur(r.val)}</span>
                  </div>
                ))}
                <div className={styles.detailRow} style={{ borderTop: '1.5px solid var(--cream-dark)', marginTop: 6, paddingTop: 6, fontWeight: 700 }}>
                  <span>Total décaissé</span>
                  <span style={{ color: C.terra }}>{fEur(data.sortiesEffectives.total)}</span>
                </div>
                {data.sortiesPrevues.total > 0 && (
                  <>
                    <p className={styles.detailCat} style={{ marginTop: 16, marginBottom: 8 }}>Sorties prévues</p>
                    {[
                      { label: 'Droits d\'auteurs à reverser', val: data.sortiesPrevues.droitsAuteurs },
                      { label: 'Commissions PDV attendues',    val: data.sortiesPrevues.commissionsReversements },
                      { label: 'Charges à venir',             val: data.sortiesPrevues.chargesAVenir },
                    ].filter(r => r.val > 0).map((r, i) => (
                      <div key={i} className={styles.detailRow}>
                        <span>{r.label}</span>
                        <span className={styles.detailMontant} style={{ color: C.mauve }}>{fEur(r.val)}</span>
                      </div>
                    ))}
                    <div className={styles.detailRow} style={{ borderTop: '1.5px solid var(--cream-dark)', marginTop: 6, paddingTop: 6, fontWeight: 700 }}>
                      <span>Total prévu</span>
                      <span style={{ color: C.mauve }}>{fEur(data.sortiesPrevues.total)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            {/* Solde net */}
            <div style={{ marginTop: 20, padding: '14px 20px', background: 'var(--cream)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)' }}>Solde net (effectif)</span>
              <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.4rem', color: data.entreesEffectives.total - data.sortiesEffectives.total >= 0 ? C.green : C.red }}>
                {fEur(data.entreesEffectives.total - data.sortiesEffectives.total)}
              </span>
            </div>
          </div>
        )}

        {/* ── BILAN COMPTABLE ──────────────────────────────────────────────── */}
        {bilanActif && bilanPassif && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionEmoji}>⚖️</span>
              <h2 className={styles.sectionTitle}>Bilan comptable</h2>
            </div>

            <div className={styles.bilanGrid}>
              {/* ACTIF */}
              <div className={styles.bilanCol}>
                <h3 className={styles.bilanColTitle} style={{ color: C.sage }}>ACTIF</h3>
                <div className={styles.bilanRows}>
                  <div className={styles.bilanRow}>
                    <span className={styles.bilanRowLabel}>Stocks (valeur estimée)</span>
                    <span className={styles.bilanRowVal}>{fEur(bilanActif.stock)}</span>
                  </div>
                  <div className={styles.bilanRow}>
                    <span className={styles.bilanRowLabel}>Créances clients (PDV)</span>
                    <span className={styles.bilanRowVal}>{fEur(bilanActif.creancesClients)}</span>
                  </div>
                  <div className={styles.bilanRow}>
                    <span className={styles.bilanRowLabel}>Trésorerie disponible</span>
                    <span className={styles.bilanRowVal}>{fEur(bilanActif.tresorerie)}</span>
                  </div>
                </div>
                <div className={styles.bilanTotal}>
                  <span>Total actif</span>
                  <strong style={{ color: C.sage }}>{fEur(bilanActif.total)}</strong>
                </div>
                <div className={styles.bilanBar}>
                  <div className={styles.bilanBarFill} style={{ width: '100%', background: C.sage }} />
                </div>
              </div>

              {/* SÉPARATEUR */}
              <div className={styles.bilanSep} />

              {/* PASSIF */}
              <div className={styles.bilanCol}>
                <h3 className={styles.bilanColTitle} style={{ color: C.terra }}>PASSIF</h3>
                <div className={styles.bilanRows}>
                  <div className={styles.bilanRow}>
                    <span className={styles.bilanRowLabel}>Droits d'auteurs à reverser</span>
                    <span className={styles.bilanRowVal} style={{ color: C.mauve }}>{fEur(bilanPassif.droitsAuteurs)}</span>
                  </div>
                  <div className={styles.bilanRow}>
                    <span className={styles.bilanRowLabel}>Charges à payer</span>
                    <span className={styles.bilanRowVal}>{fEur(bilanPassif.chargesAPayer)}</span>
                  </div>
                  <div className={styles.bilanRow}>
                    <span className={styles.bilanRowLabel}>Résultat net</span>
                    <span className={styles.bilanRowVal} style={{ color: bilanPassif.resultatNet >= 0 ? C.green : C.red }}>
                      {bilanPassif.resultatNet >= 0 ? '+' : ''}{fEur(bilanPassif.resultatNet)}
                    </span>
                  </div>
                </div>
                <div className={styles.bilanTotal}>
                  <span>Total passif</span>
                  <strong style={{ color: C.terra }}>{fEur(bilanPassif.total)}</strong>
                </div>
                <div className={styles.bilanBar}>
                  <div className={styles.bilanBarFill} style={{ width: '100%', background: C.terra }} />
                </div>
              </div>
            </div>

            {/* Équilibre */}
            <div className={styles.bilanEquilibre}>
              {Math.abs(bilanActif.total - bilanPassif.total) < 1
                ? <span className={styles.bilanOk}>✓ Bilan équilibré</span>
                : <span className={styles.bilanEcart}>Écart : {fEur(Math.abs(bilanActif.total - bilanPassif.total))}</span>
              }
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
