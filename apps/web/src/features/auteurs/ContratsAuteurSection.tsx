import { useState } from 'react'
import {
  useContratsAuteur, useCreateContratAuteur, useUpdateContratAuteur, useDeleteContratAuteur,
  useAppliquerPeriodicite, contratDateFin, prochaineEcheance,
} from './hooks/useContratsAuteur'
import type { ContratAuteur, CreateContratPayload, UpdateContratPayload, PeriodiciteDA, DateFixe } from './hooks/useContratsAuteur'
import { useTypesDA } from '@/features/reglages/hooks/useTypesDA'
import { useArticles } from '@/features/catalogue/hooks/useArticles'
import type { Auteur } from './hooks/useAuteurs'
import sty from './AuteurForm.module.css'

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (d: Date | string | null) => {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function EcheanceBadge({ contrat }: { contrat: ContratAuteur }) {
  const fin      = contratDateFin(contrat)
  const echeance = prochaineEcheance(contrat)

  if (!fin) {
    return <span style={{ fontSize: '0.72rem', color: 'var(--text-soft)' }}>Durée indéterminée</span>
  }

  const isExpire = !contrat.reconduiteTacite && fin < new Date()

  return (
    <span style={{
      fontSize: '0.72rem', fontWeight: 600,
      color: isExpire ? '#DC2626' : '#059669',
    }}>
      {isExpire
        ? `Expiré le ${fmtDate(fin)}`
        : contrat.reconduiteTacite
          ? `Reconduit tacitement · prochaine échéance ${fmtDate(echeance)}`
          : `Contrat jusqu'au ${fmtDate(fin)}`
      }
    </span>
  )
}

// ── Périodicité ───────────────────────────────────────────────────────────────

const PERIODICITE_LABELS: Record<PeriodiciteDA, string> = {
  MENSUEL:        'Mensuel',
  TRIMESTRIEL:    'Trimestriel (3 mois)',
  TOUS_LES_4_MOIS:'Tous les 4 mois',
  SEMESTRIEL:     'Semestriel (6 mois)',
  ANNUEL:         'Annuel',
  DATES_FIXES:    'Dates fixes',
}

const MOIS_LABELS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

interface PeriodiciteFieldsProps {
  periodicite:       string
  datesFixesJSON:    DateFixe[]
  prochainVersement: string
  onChange: (p: string, d: DateFixe[], pv: string) => void
}

function PeriodiciteFields({ periodicite, datesFixesJSON, prochainVersement, onChange }: PeriodiciteFieldsProps) {
  function addDate() {
    onChange(periodicite, [...datesFixesJSON, { mois: 1, jour: 1 }], prochainVersement)
  }
  function removeDate(i: number) {
    onChange(periodicite, datesFixesJSON.filter((_, idx) => idx !== i), prochainVersement)
  }
  function updateDate(i: number, field: 'mois' | 'jour', val: number) {
    onChange(periodicite, datesFixesJSON.map((d, idx) => idx === i ? { ...d, [field]: val } : d), prochainVersement)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-soft)', display: 'block', marginBottom: 4 }}>
            Périodicité reversements
          </label>
          <select
            style={{ width: '100%', padding: '8px 10px', border: '1.5px solid var(--cream-dark)', borderRadius: 8, fontSize: '0.85rem', background: '#fff' }}
            value={periodicite}
            onChange={(e) => onChange(e.target.value, datesFixesJSON, prochainVersement)}
          >
            <option value="">— Aucune —</option>
            {(Object.entries(PERIODICITE_LABELS) as [PeriodiciteDA, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        {periodicite && periodicite !== 'DATES_FIXES' && (
          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-soft)', display: 'block', marginBottom: 4 }}>
              Prochain versement
            </label>
            <input
              type="date"
              style={{ padding: '8px 10px', border: '1.5px solid var(--cream-dark)', borderRadius: 8, fontSize: '0.85rem', background: '#fff' }}
              value={prochainVersement}
              onChange={(e) => onChange(periodicite, datesFixesJSON, e.target.value)}
            />
          </div>
        )}
      </div>
      {periodicite === 'DATES_FIXES' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {datesFixesJSON.map((d, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                style={{ flex: 1, padding: '6px 8px', border: '1.5px solid var(--cream-dark)', borderRadius: 7, fontSize: '0.82rem' }}
                value={d.mois}
                onChange={(e) => updateDate(i, 'mois', Number(e.target.value))}
              >
                {MOIS_LABELS.map((m, idx) => <option key={idx + 1} value={idx + 1}>{m}</option>)}
              </select>
              <input
                type="number" min={1} max={31}
                style={{ width: 60, padding: '6px 8px', border: '1.5px solid var(--cream-dark)', borderRadius: 7, fontSize: '0.82rem' }}
                value={d.jour}
                onChange={(e) => updateDate(i, 'jour', Number(e.target.value))}
              />
              <button type="button" onClick={() => removeDate(i)}
                style={{ width: 24, height: 24, border: 'none', borderRadius: 6, background: '#FEE2E2', color: '#DC2626', cursor: 'pointer', fontSize: '0.75rem' }}>
                ×
              </button>
            </div>
          ))}
          <button type="button" onClick={addDate}
            style={{ alignSelf: 'flex-start', height: 28, padding: '0 12px', border: '1.5px dashed var(--cream-dark)', borderRadius: 7, background: 'transparent', color: 'var(--text-soft)', fontSize: '0.78rem', cursor: 'pointer' }}>
            + Ajouter une date
          </button>
        </div>
      )}
    </div>
  )
}

// ── Carte contrat ─────────────────────────────────────────────────────────────

interface ContratCardProps {
  c:           ContratAuteur
  typesDA:     { id: string; nom: string }[]
  articles:    { id: string; nom: string }[]
  onDelete:    () => void
  onUpdate:    (data: UpdateContratPayload) => Promise<void>
  onAppliquer: () => void
  updating:    boolean
  applying:    boolean
}

function ContratCard({ c, typesDA, articles, onDelete, onUpdate, onAppliquer, updating, applying }: ContratCardProps) {
  const [editing, setEditing] = useState(false)
  const [f, setF] = useState({
    typeDAId:          c.typeDAId,
    articleId:         c.articleId ?? '',
    avance:            c.avance ? String(Number(c.avance)) : '',
    dateSignature:     c.dateSignature ? c.dateSignature.slice(0, 10) : '',
    datePriseEffet:    c.datePriseEffet ? c.datePriseEffet.slice(0, 10) : '',
    dureeAns:          c.dureeAns ? String(c.dureeAns) : '',
    reconduiteTacite:  c.reconduiteTacite,
    periodicite:       c.periodicite ?? '',
    datesFixesJSON:    c.datesFixesJSON ?? [] as DateFixe[],
    prochainVersement: c.prochainVersement ? c.prochainVersement.slice(0, 10) : '',
  })
  const set = (k: keyof typeof f) => (v: string | boolean | DateFixe[]) => setF(s => ({ ...s, [k]: v }))

  const [saveError, setSaveError] = useState<string | null>(null)

  async function handleSave() {
    setSaveError(null)
    const sigDate = f.dateSignature ? `${f.dateSignature}T00:00:00.000Z` : undefined
    const effDate = f.datePriseEffet ? `${f.datePriseEffet}T00:00:00.000Z` : sigDate
    try {
      await onUpdate({
        typeDAId:          f.typeDAId || undefined,
        articleId:         f.articleId || null,
        avance:            f.avance ? Number(f.avance) : null,
        dateSignature:     sigDate,
        datePriseEffet:    effDate,
        dureeAns:          f.dureeAns ? Number(f.dureeAns) : null,
        reconduiteTacite:  f.reconduiteTacite,
        periodicite:       (f.periodicite as PeriodiciteDA) || null,
        datesFixesJSON:    f.periodicite === 'DATES_FIXES' ? f.datesFixesJSON : null,
        prochainVersement: (f.periodicite !== 'DATES_FIXES' && f.prochainVersement) ? `${f.prochainVersement}T00:00:00.000Z` : null,
      })
      setEditing(false)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    }
  }

  if (editing) {
    return (
      <div style={{ padding: 14, background: '#fff', borderRadius: 10, border: '1.5px solid var(--ink-light)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className={sty.row2}>
          <div className={sty.field}>
            <label className={sty.label}>Barème DA *</label>
            <select className={sty.input} value={f.typeDAId} onChange={e => set('typeDAId')(e.target.value)}>
              {typesDA.map(t => <option key={t.id} value={t.id}>{t.nom}</option>)}
            </select>
          </div>
          <div className={sty.field}>
            <label className={sty.label}>Article (vide = tous)</label>
            <select className={sty.input} value={f.articleId} onChange={e => set('articleId')(e.target.value)}>
              <option value="">Tous les articles</option>
              {articles.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
            </select>
          </div>
        </div>
        <div className={sty.row2}>
          <div className={sty.field}>
            <label className={sty.label}>Date de signature</label>
            <input type="date" className={sty.input} value={f.dateSignature} onChange={e => set('dateSignature')(e.target.value)} />
          </div>
          <div className={sty.field}>
            <label className={sty.label}>Date de prise d'effet</label>
            <input type="date" className={sty.input} value={f.datePriseEffet} onChange={e => set('datePriseEffet')(e.target.value)} />
          </div>
        </div>
        <div className={sty.row2}>
          <div className={sty.field}>
            <label className={sty.label}>Durée (années)</label>
            <input type="number" min={1} className={sty.input} value={f.dureeAns} onChange={e => set('dureeAns')(e.target.value)} placeholder="Indéterminée" />
          </div>
          <div className={sty.field}>
            <label className={sty.label}>À-valoir (€)</label>
            <input type="number" min={0} step={0.01} className={sty.input} value={f.avance} onChange={e => set('avance')(e.target.value)} placeholder="0.00" />
          </div>
        </div>
        {f.dureeAns && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.82rem', color: 'var(--ink)' }}>
            <input type="checkbox" checked={f.reconduiteTacite} onChange={e => set('reconduiteTacite')(e.target.checked)} style={{ width: 15, height: 15, accentColor: 'var(--ink)' }} />
            Reconduite tacite
          </label>
        )}
        <PeriodiciteFields
          periodicite={f.periodicite}
          datesFixesJSON={f.datesFixesJSON}
          prochainVersement={f.prochainVersement}
          onChange={(p, d, pv) => setF(s => ({ ...s, periodicite: p, datesFixesJSON: d, prochainVersement: pv }))}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {saveError && (
            <span style={{ fontSize: '0.75rem', color: '#DC2626', flex: 1 }}>⚠ {saveError}</span>
          )}
          <button type="button" className={sty.btnSecondary} onClick={() => setEditing(false)}>Annuler</button>
          <button type="button" className={sty.btnPrimary} disabled={!f.typeDAId || updating} onClick={handleSave}>
            {updating ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      padding: '12px 14px',
      background: 'var(--ink-faint)',
      borderRadius: 10, border: '1px solid var(--cream-dark)',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--ink)' }}>
            {c.typeDA.nom}
          </span>
          {c.article && (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-soft)', marginLeft: 8 }}>
              {c.article.nom}
            </span>
          )}
          {!c.article && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-soft)', marginLeft: 8, fontStyle: 'italic' }}>
              tous les articles
            </span>
          )}
        </div>
        {c.avance && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-soft)' }}>À-valoir </span>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gold)' }}>
              {Number(c.avance).toFixed(2)} €
            </span>
            {Number(c.avanceDue) > 0 && (
              <div style={{ fontSize: '0.68rem', color: 'var(--text-soft)' }}>
                {Number(c.avanceDue).toFixed(2)} € recoupé
              </div>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          style={{
            width: 26, height: 26, border: '1.5px solid transparent',
            borderRadius: 6, background: 'transparent', color: '#aaa',
            cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.12s, color 0.12s, border-color 0.12s',
            flexShrink: 0,
          }}
          onMouseEnter={e => { const el = e.currentTarget; el.style.background = 'var(--cream-dark)'; el.style.color = 'var(--ink)'; el.style.borderColor = 'var(--ink-light)' }}
          onMouseLeave={e => { const el = e.currentTarget; el.style.background = 'transparent'; el.style.color = '#aaa'; el.style.borderColor = 'transparent' }}
          title="Modifier le contrat"
        >
          ✎
        </button>
        <button
          type="button"
          onClick={onDelete}
          style={{
            width: 26, height: 26, border: '1.5px solid transparent',
            borderRadius: 6, background: 'transparent', color: '#ccc',
            cursor: 'pointer', fontSize: '0.85rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.12s, color 0.12s, border-color 0.12s',
            flexShrink: 0,
          }}
          onMouseEnter={e => { const el = e.currentTarget; el.style.background = '#FEE2E2'; el.style.color = '#DC2626'; el.style.borderColor = '#FECACA' }}
          onMouseLeave={e => { const el = e.currentTarget; el.style.background = 'transparent'; el.style.color = '#ccc'; el.style.borderColor = 'transparent' }}
          title="Résilier le contrat"
        >
          ×
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        {c.dateSignature && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-soft)' }}>
            Signé le {fmtDate(c.dateSignature)}
          </span>
        )}
        <EcheanceBadge contrat={c} />
        {c.periodicite && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-soft)' }}>
            · {PERIODICITE_LABELS[c.periodicite]}
            {c.prochainVersement && ` · prochain ${fmtDate(c.prochainVersement)}`}
          </span>
        )}
      </div>
      {c.periodicite && (
        <div>
          <button
            type="button"
            onClick={onAppliquer}
            disabled={applying}
            style={{
              height: 26, padding: '0 12px', fontSize: '0.72rem', fontWeight: 600,
              border: '1.5px solid var(--cream-dark)', borderRadius: 20,
              background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer',
              transition: 'border-color 0.12s, color 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ink-light)'; e.currentTarget.style.color = 'var(--ink)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--cream-dark)'; e.currentTarget.style.color = 'var(--text-soft)' }}
          >
            {applying ? 'Application…' : '↓ Appliquer cette périodicité à tous les contrats de l\'auteur'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Formulaire de création ────────────────────────────────────────────────────

interface FormState {
  typeDAId:          string
  articleId:         string
  avance:            string
  dateSignature:     string
  datePriseEffet:    string
  dureeAns:          string
  reconduiteTacite:  boolean
  periodicite:       string
  datesFixesJSON:    DateFixe[]
  prochainVersement: string
}

const formVide = (): FormState => ({
  typeDAId: '', articleId: '', avance: '',
  dateSignature: new Date().toISOString().slice(0, 10),
  datePriseEffet: '', dureeAns: '',
  reconduiteTacite: true,
  periodicite: '', datesFixesJSON: [], prochainVersement: '',
})

interface FormulaireProps {
  auteurId:   string
  articles:   { id: string; nom: string }[]
  typesDA:    { id: string; nom: string }[]
  onCreated:  () => void
  onCancel:   () => void
  isPending:  boolean
  onSubmit:   (p: CreateContratPayload) => void
}

function FormulaireContrat({ auteurId, articles, typesDA, onCreated, onCancel, isPending, onSubmit }: FormulaireProps) {
  const [f, setF] = useState<FormState>(formVide)
  const set = (k: keyof FormState) => (v: string | boolean) => setF((s) => ({ ...s, [k]: v }))

  function handleSubmit() {
    if (!f.typeDAId) return
    const sigDate = f.dateSignature ? `${f.dateSignature}T00:00:00.000Z` : undefined
    const effDate = f.datePriseEffet ? `${f.datePriseEffet}T00:00:00.000Z` : sigDate
    onSubmit({
      id:                crypto.randomUUID(),
      auteurId,
      typeDAId:          f.typeDAId,
      articleId:         f.articleId || undefined,
      avance:            f.avance ? Number(f.avance) : undefined,
      dateSignature:     sigDate,
      datePriseEffet:    effDate,
      dureeAns:          f.dureeAns ? Number(f.dureeAns) : undefined,
      reconduiteTacite:  f.reconduiteTacite,
      periodicite:       (f.periodicite as PeriodiciteDA) || null,
      datesFixesJSON:    f.periodicite === 'DATES_FIXES' ? f.datesFixesJSON : null,
      prochainVersement: (f.periodicite !== 'DATES_FIXES' && f.prochainVersement) ? `${f.prochainVersement}T00:00:00.000Z` : undefined,
    })
  }

  return (
    <div style={{ padding: 14, background: '#fff', borderRadius: 10, border: '1.5px solid var(--ink-light)', display: 'flex', flexDirection: 'column', gap: 12 }}>

      <div className={sty.row2}>
        <div className={sty.field}>
          <label className={sty.label}>Barème DA *</label>
          <select className={sty.input} value={f.typeDAId} onChange={(e) => set('typeDAId')(e.target.value)}>
            <option value="">— Choisir —</option>
            {typesDA.map((t) => <option key={t.id} value={t.id}>{t.nom}</option>)}
          </select>
        </div>
        <div className={sty.field}>
          <label className={sty.label}>Article (vide = tous)</label>
          <select className={sty.input} value={f.articleId} onChange={(e) => set('articleId')(e.target.value)}>
            <option value="">Tous les articles</option>
            {articles.map((a) => <option key={a.id} value={a.id}>{a.nom}</option>)}
          </select>
        </div>
      </div>

      <div className={sty.row2}>
        <div className={sty.field}>
          <label className={sty.label}>Date de signature</label>
          <input type="date" className={sty.input} value={f.dateSignature} onChange={(e) => set('dateSignature')(e.target.value)} />
        </div>
        <div className={sty.field}>
          <label className={sty.label}>Date de prise d'effet</label>
          <input type="date" className={sty.input} value={f.datePriseEffet} onChange={(e) => set('datePriseEffet')(e.target.value)}
            placeholder={f.dateSignature || '= date de signature'} />
        </div>
      </div>

      <div className={sty.row2}>
        <div className={sty.field}>
          <label className={sty.label}>Durée (années)</label>
          <input type="number" min={1} className={sty.input} value={f.dureeAns}
            onChange={(e) => set('dureeAns')(e.target.value)} placeholder="Indéterminée si vide" />
        </div>
        <div className={sty.field}>
          <label className={sty.label}>À-valoir (€)</label>
          <input type="number" min={0} step={0.01} className={sty.input} value={f.avance}
            onChange={(e) => set('avance')(e.target.value)} placeholder="0.00" />
        </div>
      </div>

      {f.dureeAns && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.82rem', color: 'var(--ink)' }}>
          <input type="checkbox" checked={f.reconduiteTacite}
            onChange={(e) => set('reconduiteTacite')(e.target.checked)}
            style={{ width: 15, height: 15, accentColor: 'var(--ink)' }} />
          Reconduite tacite à l'échéance
        </label>
      )}

      <PeriodiciteFields
        periodicite={f.periodicite}
        datesFixesJSON={f.datesFixesJSON}
        prochainVersement={f.prochainVersement}
        onChange={(p, d, pv) => setF(s => ({ ...s, periodicite: p, datesFixesJSON: d, prochainVersement: pv }))}
      />

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" className={sty.btnSecondary} onClick={onCancel}>Annuler</button>
        <button type="button" className={sty.btnPrimary} disabled={!f.typeDAId || isPending} onClick={handleSubmit}>
          {isPending ? 'Enregistrement…' : 'Créer le contrat'}
        </button>
      </div>
    </div>
  )
}

// ── Section principale ────────────────────────────────────────────────────────

interface Props {
  auteur:    Auteur
  allArticles?: boolean  // si true : montre tous les articles (mode création auteur)
}

export function ContratsAuteurSection({ auteur, allArticles = false }: Props) {
  const [showNew, setShowNew] = useState(false)

  const { data: contrats = [] }  = useContratsAuteur(auteur.id)
  const { data: typesDA = [] }   = useTypesDA()
  const { data: articles = [] }  = useArticles(undefined, undefined, true)
  const createContrat            = useCreateContratAuteur()
  const updateContrat            = useUpdateContratAuteur()
  const deleteContrat            = useDeleteContratAuteur()
  const appliquerPeriodicite     = useAppliquerPeriodicite()

  const mesArticles = allArticles
    ? articles
    : articles.filter((a) => a.auteurs.some((aa) => aa.auteur.id === auteur.id))

  async function handleCreate(payload: CreateContratPayload) {
    await createContrat.mutateAsync(payload)
    setShowNew(false)
  }

  return (
    <div className={sty.section}>
      <p className={sty.sectionLabel}>Contrats &amp; barèmes DA</p>

      {contrats.length === 0 && !showNew && (
        <p style={{ fontSize: '0.82rem', color: 'var(--text-soft)', fontStyle: 'italic', margin: 0 }}>
          Aucun contrat actif — sans contrat, les droits ne peuvent pas être calculés.
        </p>
      )}

      {contrats.map((c) => (
        <ContratCard
          key={c.id}
          c={c}
          typesDA={typesDA}
          articles={mesArticles}
          onDelete={() => deleteContrat.mutate(c.id)}
          onUpdate={(data) => updateContrat.mutateAsync({ id: c.id, ...data })}
          onAppliquer={() => appliquerPeriodicite.mutate(c.id)}
          updating={updateContrat.isPending}
          applying={appliquerPeriodicite.isPending}
        />
      ))}

      {showNew && (
        <FormulaireContrat
          auteurId={auteur.id}
          articles={mesArticles}
          typesDA={typesDA}
          onCreated={() => setShowNew(false)}
          onCancel={() => setShowNew(false)}
          isPending={createContrat.isPending}
          onSubmit={handleCreate}
        />
      )}

      {!showNew && (
        <button
          type="button"
          onClick={() => setShowNew(true)}
          style={{
            alignSelf: 'flex-start', height: 32, padding: '0 14px',
            background: 'transparent', color: 'var(--text-soft)',
            border: '1.5px dashed var(--cream-dark)', borderRadius: 8,
            fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--ink-light)'; e.currentTarget.style.color = 'var(--ink)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--cream-dark)'; e.currentTarget.style.color = 'var(--text-soft)' }}
        >
          + Nouveau contrat
        </button>
      )}
    </div>
  )
}
