import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../../api'
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'

type PopupMode = 'SHOW_ONCE' | 'DISMISSIBLE' | 'ALWAYS_CLOSABLE' | 'ALWAYS_BLOCKING'

const MODE_OPTIONS: { value: PopupMode; label: string; desc: string; emoji: string }[] = [
  { value: 'SHOW_ONCE',        label: 'Une seule fois',      desc: 'Disparaît automatiquement après la première vue',                    emoji: '1️⃣' },
  { value: 'DISMISSIBLE',      label: 'Dismissible',         desc: 'Case "Ne plus afficher" — l\'utilisateur choisit de l\'ignorer',     emoji: '☑️' },
  { value: 'ALWAYS_CLOSABLE',  label: 'Toujours (fermable)', desc: 'Revient à chaque visite, peut être fermée (alerte non bloquante)',   emoji: '🔔' },
  { value: 'ALWAYS_BLOCKING',  label: 'Toujours (bloquante)',desc: 'Impossible de fermer — maintenance, message critique',               emoji: '🚨' },
]

const IMAGES = ['m1.png', 'm2.png', 'm3.png', 'm4.png', 'm5.png', 'm6.png', 'm7.png', 'm8.png']

interface PopupSlide { imageName: string; title: string; text: string; ctaLabel: string; ctaHref: string }
interface Popup {
  id: string; titre: string; mode: PopupMode; dismissText: string
  slides: Array<{ imageName: string; title?: string; text: string; ctaLabel?: string; ctaHref?: string }>
  targetPages: string[]; actif: boolean; dateDebut?: string | null; dateFin?: string | null
  createdAt: string
}

interface FormState {
  titre: string; mode: PopupMode; dismissText: string; slides: PopupSlide[]
  targetPages: string; actif: boolean; dateDebut: string; dateFin: string
}

function emptySlide(): PopupSlide { return { imageName: 'm1.png', title: '', text: '', ctaLabel: '', ctaHref: '' } }

function emptyForm(): FormState {
  return { titre: '', mode: 'DISMISSIBLE', dismissText: 'Ne plus afficher ce message', slides: [emptySlide()], targetPages: '', actif: true, dateDebut: '', dateFin: '' }
}

function toForm(p: Popup): FormState {
  return {
    titre: p.titre, mode: p.mode, dismissText: p.dismissText,
    slides: p.slides.map(s => ({ imageName: s.imageName, title: s.title ?? '', text: s.text, ctaLabel: s.ctaLabel ?? '', ctaHref: s.ctaHref ?? '' })),
    targetPages: p.targetPages.join('\n'),
    actif: p.actif,
    dateDebut: p.dateDebut ? p.dateDebut.slice(0, 16) : '',
    dateFin:   p.dateFin   ? p.dateFin.slice(0, 16)   : '',
  }
}

function buildPayload(f: FormState) {
  return {
    titre:       f.titre.trim(),
    mode:        f.mode,
    dismissText: f.dismissText.trim() || 'Ne plus afficher ce message',
    slides:      f.slides.filter(s => s.text.trim()).map(s => ({
      imageName: s.imageName,
      ...(s.title    ? { title:    s.title }    : {}),
      text: s.text,
      ...(s.ctaLabel ? { ctaLabel: s.ctaLabel } : {}),
      ...(s.ctaHref  ? { ctaHref:  s.ctaHref }  : {}),
    })),
    targetPages: f.targetPages.split('\n').map(s => s.trim()).filter(Boolean),
    actif:       f.actif,
    dateDebut:   f.dateDebut ? new Date(f.dateDebut).toISOString() : null,
    dateFin:     f.dateFin   ? new Date(f.dateFin).toISOString()   : null,
  }
}

export function PopupsPage() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<Popup | null>(null)
  const [isNew,    setIsNew]    = useState(false)
  const [form,     setForm]     = useState<FormState>(emptyForm())
  const [err,      setErr]      = useState('')

  const { data: popups = [], isLoading } = useQuery<Popup[]>({
    queryKey: ['admin-popups'],
    queryFn:  () => apiFetch('/admin/popups'),
  })

  const create = useMutation({
    mutationFn: (body: object) => apiFetch('/admin/popups', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['admin-popups'] }); closePanel() },
    onError:    (e: Error) => setErr(e.message),
  })
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) =>
      apiFetch(`/admin/popups/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['admin-popups'] }); closePanel() },
    onError:    (e: Error) => setErr(e.message),
  })
  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/popups/${id}`, { method: 'DELETE' }),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['admin-popups'] }); closePanel() },
  })

  function closePanel() { setSelected(null); setIsNew(false); setErr('') }
  function setF<K extends keyof FormState>(k: K, v: FormState[K]) { setForm(f => ({ ...f, [k]: v })) }
  function setSlide(i: number, k: keyof PopupSlide, v: string) {
    setForm(f => { const s = [...f.slides]; s[i] = { ...s[i]!, [k]: v }; return { ...f, slides: s } })
  }
  function moveSlide(i: number, dir: -1 | 1) {
    setForm(f => { const s = [...f.slides]; const j = i + dir; if (j < 0 || j >= s.length) return f; [s[i], s[j]] = [s[j]!, s[i]!]; return { ...f, slides: s } })
  }
  function removeSlide(i: number) { setForm(f => ({ ...f, slides: f.slides.filter((_, idx) => idx !== i) })) }

  function handleSave() {
    setErr('')
    const p = buildPayload(form)
    if (!p.titre)          return setErr('Le titre est requis.')
    if (p.slides.length === 0) return setErr('Au moins une slide est requise.')
    if (isNew) create.mutate(p)
    else if (selected) update.mutate({ id: selected.id, body: p })
  }

  const MODE_BADGE: Record<PopupMode, string> = {
    SHOW_ONCE: 'badge-auto', DISMISSIBLE: 'badge-starter',
    ALWAYS_CLOSABLE: 'badge-trial', ALWAYS_BLOCKING: 'badge-pro',
  }
  const MODE_LABEL: Record<PopupMode, string> = {
    SHOW_ONCE: 'Une fois', DISMISSIBLE: 'Dismissible',
    ALWAYS_CLOSABLE: 'Toujours', ALWAYS_BLOCKING: 'Bloquante',
  }

  const panelOpen = isNew || !!selected

  return (
    <div style={{ display: 'flex', gap: 24, minHeight: 0 }}>

      {/* ── Liste ── */}
      <div style={{ flex: panelOpen ? '0 0 360px' : '1', minWidth: 0 }}>
        <div className="page-header">
          <h1 className="page-title">Popups</h1>
          <button className="btn btn-primary" onClick={() => { setSelected(null); setIsNew(true); setForm(emptyForm()); setErr('') }}>
            <Plus size={14} /> Nouveau popup
          </button>
        </div>
        <div className="card">
          {isLoading ? <div style={{ padding: 24 }} className="text-muted">Chargement…</div>
          : popups.length === 0 ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>Aucun popup créé.</div>
          : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Titre</th><th>Mode</th><th>Slides</th><th>Pages</th><th>Statut</th></tr></thead>
                <tbody>
                  {popups.map(p => (
                    <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => { setSelected(p); setIsNew(false); setForm(toForm(p)); setErr('') }}>
                      <td style={{ fontWeight: 600 }}>{p.titre}</td>
                      <td><span className={`badge ${MODE_BADGE[p.mode]}`}>{MODE_LABEL[p.mode]}</span></td>
                      <td>{p.slides.length} slide{p.slides.length > 1 ? 's' : ''}</td>
                      <td className="text-muted">{p.targetPages.length === 0 ? 'Toutes' : p.targetPages.slice(0, 2).join(', ') + (p.targetPages.length > 2 ? '…' : '')}</td>
                      <td><span className={`badge ${p.actif ? 'badge-on' : 'badge-off'}`}>{p.actif ? 'Actif' : 'Inactif'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Panel ── */}
      {panelOpen && (
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="page-header">
            <h2 className="page-title" style={{ fontSize: '1.1rem' }}>
              {isNew ? 'Nouveau popup' : `Modifier — ${selected?.titre}`}
            </h2>
            <div style={{ display: 'flex', gap: 8 }}>
              {!isNew && selected && (
                <button className="btn btn-danger btn-sm"
                  onClick={() => { if (confirm('Supprimer ce popup ?')) remove.mutate(selected.id) }}>
                  <Trash2 size={13} /> Supprimer
                </button>
              )}
              <button className="btn btn-ghost" onClick={closePanel}>Annuler</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={create.isPending || update.isPending}>
                {create.isPending || update.isPending ? 'Sauvegarde…' : 'Sauvegarder'}
              </button>
            </div>
          </div>

          {err && <div className="error-msg" style={{ marginBottom: 12 }}>{err}</div>}

          <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Titre + actif */}
            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label>Titre (libellé interne) *</label>
                <input value={form.titre} onChange={e => setF('titre', e.target.value)} placeholder="Ex: Bienvenue ! / Maintenance prévue" />
              </div>
              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 4 }}>
                <input type="checkbox" id="actif" checked={form.actif} onChange={e => setF('actif', e.target.checked)} style={{ width: 'auto' }} />
                <label htmlFor="actif" style={{ margin: 0, cursor: 'pointer' }}>Actif</label>
              </div>
            </div>

            {/* Mode */}
            <div className="form-group">
              <label>Mode d'affichage *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                {MODE_OPTIONS.map(m => (
                  <label key={m.value} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px',
                    borderRadius: 8, border: `1.5px solid ${form.mode === m.value ? 'var(--terra)' : 'var(--border)'}`,
                    background: form.mode === m.value ? 'rgba(200,93,58,0.05)' : 'var(--bg)',
                    cursor: 'pointer',
                  }}>
                    <input type="radio" name="mode" checked={form.mode === m.value}
                      onChange={() => setF('mode', m.value)} style={{ marginTop: 2, width: 'auto' }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{m.emoji} {m.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{m.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Texte dismiss (seulement pour DISMISSIBLE) */}
            {form.mode === 'DISMISSIBLE' && (
              <div className="form-group">
                <label>Texte de la case à cocher</label>
                <input value={form.dismissText} onChange={e => setF('dismissText', e.target.value)} />
              </div>
            )}

            {/* Dates + Ciblage */}
            <div className="form-row">
              <div className="form-group">
                <label>Début (optionnel)</label>
                <input type="datetime-local" value={form.dateDebut} onChange={e => setF('dateDebut', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Fin (optionnel)</label>
                <input type="datetime-local" value={form.dateFin} onChange={e => setF('dateFin', e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label>Pages ciblées (une par ligne — vide = toutes les pages)</label>
              <textarea rows={3} value={form.targetPages}
                onChange={e => setF('targetPages', e.target.value)}
                placeholder={'/ventes\n/catalogue\n/points-de-vente'} />
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Ex: /ventes → page caisse, /catalogue → catalogue articles</span>
            </div>

            {/* Slides */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>Slides ({form.slides.length})</span>
                <button className="btn btn-ghost btn-sm"
                  onClick={() => setForm(f => ({ ...f, slides: [...f.slides, emptySlide()] }))}>
                  <Plus size={13} /> Ajouter une slide
                </button>
              </div>

              {form.slides.map((s, i) => (
                <div key={i} style={{ background: 'var(--bg)', borderRadius: 8, padding: 14, marginBottom: 10, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Slide {i + 1}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => moveSlide(i, -1)} disabled={i === 0}><ChevronUp size={13} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => moveSlide(i, 1)} disabled={i === form.slides.length - 1}><ChevronDown size={13} /></button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}
                        onClick={() => removeSlide(i)} disabled={form.slides.length === 1}><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Image MeGestine</label>
                      <select value={s.imageName} onChange={e => setSlide(i, 'imageName', e.target.value)}>
                        {IMAGES.map(img => <option key={img} value={img}>{img}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Titre (optionnel)</label>
                      <input value={s.title} onChange={e => setSlide(i, 'title', e.target.value)} placeholder="Ex: Bienvenue ! 👋" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Texte *</label>
                    <textarea rows={3} value={s.text} onChange={e => setSlide(i, 'text', e.target.value)} placeholder="Contenu de la slide…" />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Bouton — libellé (optionnel)</label>
                      <input value={s.ctaLabel} onChange={e => setSlide(i, 'ctaLabel', e.target.value)} placeholder="Ex: En savoir plus →" />
                    </div>
                    <div className="form-group">
                      <label>Bouton — URL</label>
                      <input value={s.ctaHref} onChange={e => setSlide(i, 'ctaHref', e.target.value)} placeholder="Ex: /reglages" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
