import { useState } from 'react'
import {
  useContratsAuteur, useCreateContratAuteur, useDeleteContratAuteur,
  contratDateFin, prochaineEcheance,
} from './hooks/useContratsAuteur'
import type { ContratAuteur, CreateContratPayload } from './hooks/useContratsAuteur'
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

// ── Carte contrat ─────────────────────────────────────────────────────────────

function ContratCard({ c, onDelete }: { c: ContratAuteur; onDelete: () => void }) {
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
          onClick={onDelete}
          style={{
            width: 24, height: 24, border: '1.5px solid transparent',
            borderRadius: 6, background: 'transparent', color: '#ccc',
            cursor: 'pointer', fontSize: '0.8rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.12s, color 0.12s, border-color 0.12s',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget
            el.style.background = '#FEE2E2'; el.style.color = '#DC2626'; el.style.borderColor = '#FECACA'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget
            el.style.background = 'transparent'; el.style.color = '#ccc'; el.style.borderColor = 'transparent'
          }}
          title="Résilier le contrat"
        >
          ×
        </button>
      </div>

      {/* Ligne dates */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        {c.dateSignature && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-soft)' }}>
            Signé le {fmtDate(c.dateSignature)}
          </span>
        )}
        <EcheanceBadge contrat={c} />
      </div>
    </div>
  )
}

// ── Formulaire de création ────────────────────────────────────────────────────

interface FormState {
  typeDAId:         string
  articleId:        string
  avance:           string
  dateSignature:    string
  datePriseEffet:   string
  dureeAns:         string
  reconduiteTacite: boolean
}

const formVide = (): FormState => ({
  typeDAId: '', articleId: '', avance: '',
  dateSignature: new Date().toISOString().slice(0, 10),
  datePriseEffet: '',
  dureeAns: '',
  reconduiteTacite: true,
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
      id:               crypto.randomUUID(),
      auteurId,
      typeDAId:         f.typeDAId,
      articleId:        f.articleId || undefined,
      avance:           f.avance ? Number(f.avance) : undefined,
      dateSignature:    sigDate,
      datePriseEffet:   effDate,
      dureeAns:         f.dureeAns ? Number(f.dureeAns) : undefined,
      reconduiteTacite: f.reconduiteTacite,
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
  const deleteContrat            = useDeleteContratAuteur()

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
        <ContratCard key={c.id} c={c} onDelete={() => deleteContrat.mutate(c.id)} />
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
