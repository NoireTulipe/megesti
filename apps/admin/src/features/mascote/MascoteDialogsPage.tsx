import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../../api'
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'

interface Bulle {
  title: string
  text:  string
  cta_label: string
  cta_href:  string
}

interface MascoteDialog {
  id:          string
  slug:        string
  description: string
  imageName:   string
  bulles:      Array<{ title?: string; text: string; cta?: { label: string; href?: string } }>
  actif:       boolean
  createdAt:   string
}

const IMAGES = ['m1.png', 'm2.png', 'm3.png', 'm4.png', 'm5.png', 'm6.png', 'm7.png', 'm8.png']

function emptyBulle(): Bulle {
  return { title: '', text: '', cta_label: '', cta_href: '' }
}

function toBulleForm(b: { title?: string; text: string; cta?: { label: string; href?: string } }): Bulle {
  return { title: b.title ?? '', text: b.text, cta_label: b.cta?.label ?? '', cta_href: b.cta?.href ?? '' }
}

function fromBulleForm(b: Bulle): { title?: string; text: string; cta?: { label: string; href?: string } } {
  return {
    ...(b.title ? { title: b.title } : {}),
    text: b.text,
    ...(b.cta_label ? { cta: { label: b.cta_label, ...(b.cta_href ? { href: b.cta_href } : {}) } } : {}),
  }
}

interface FormState {
  slug:        string
  description: string
  imageName:   string
  actif:       boolean
  bulles:      Bulle[]
}

function emptyForm(): FormState {
  return { slug: '', description: '', imageName: 'm1.png', actif: true, bulles: [emptyBulle()] }
}

function dialogToForm(d: MascoteDialog): FormState {
  return {
    slug:        d.slug,
    description: d.description,
    imageName:   d.imageName,
    actif:       d.actif,
    bulles:      d.bulles.map(toBulleForm),
  }
}

export function MascoteDialogsPage() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<MascoteDialog | null>(null)
  const [isNew,    setIsNew]    = useState(false)
  const [form,     setForm]     = useState<FormState>(emptyForm())
  const [err,      setErr]      = useState('')

  const { data: dialogs = [], isLoading } = useQuery<MascoteDialog[]>({
    queryKey: ['admin-mascote-dialogs'],
    queryFn:  () => apiFetch('/admin/mascote-dialogs'),
  })

  const create = useMutation({
    mutationFn: (body: object) => apiFetch('/admin/mascote-dialogs', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['admin-mascote-dialogs'] }); closePanel() },
    onError:    (e: Error) => setErr(e.message),
  })

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) =>
      apiFetch(`/admin/mascote-dialogs/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['admin-mascote-dialogs'] }); closePanel() },
    onError:    (e: Error) => setErr(e.message),
  })

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/mascote-dialogs/${id}`, { method: 'DELETE' }),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['admin-mascote-dialogs'] }); closePanel() },
  })

  function openCreate() {
    setSelected(null)
    setIsNew(true)
    setForm(emptyForm())
    setErr('')
  }

  function openEdit(d: MascoteDialog) {
    setSelected(d)
    setIsNew(false)
    setForm(dialogToForm(d))
    setErr('')
  }

  function closePanel() {
    setSelected(null)
    setIsNew(false)
    setErr('')
  }

  function setF<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function setBulle(i: number, key: keyof Bulle, val: string) {
    setForm(f => {
      const bulles = [...f.bulles]
      bulles[i] = { ...bulles[i]!, [key]: val }
      return { ...f, bulles }
    })
  }

  function moveBulle(i: number, dir: -1 | 1) {
    setForm(f => {
      const bulles = [...f.bulles]
      const j = i + dir
      if (j < 0 || j >= bulles.length) return f
      ;[bulles[i], bulles[j]] = [bulles[j]!, bulles[i]!]
      return { ...f, bulles }
    })
  }

  function removeBulle(i: number) {
    setForm(f => ({ ...f, bulles: f.bulles.filter((_, idx) => idx !== i) }))
  }

  function buildPayload() {
    return {
      slug:        form.slug.trim(),
      description: form.description.trim(),
      imageName:   form.imageName,
      actif:       form.actif,
      bulles:      form.bulles.filter(b => b.text.trim()).map(fromBulleForm),
    }
  }

  function handleSave() {
    setErr('')
    const payload = buildPayload()
    if (!payload.slug)    return setErr('Le slug est requis.')
    if (!payload.description) return setErr('La description est requise.')
    if (payload.bulles.length === 0) return setErr('Au moins une bulle est requise.')
    if (isNew) create.mutate(payload)
    else if (selected) update.mutate({ id: selected.id, body: payload })
  }

  const panelOpen = isNew || !!selected

  return (
    <div style={{ display: 'flex', gap: 24, height: '100%' }}>

      {/* ── Liste ── */}
      <div style={{ flex: panelOpen ? '0 0 340px' : '1', minWidth: 0 }}>
        <div className="page-header">
          <h1 className="page-title">MeGestine — Dialogs</h1>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={14} /> Nouveau dialog
          </button>
        </div>

        <div className="card">
          {isLoading ? (
            <div style={{ padding: 24 }} className="text-muted">Chargement…</div>
          ) : dialogs.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
              Aucun dialog — créez-en un pour commencer.
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Slug</th>
                    <th>Description</th>
                    <th>Bulles</th>
                    <th>Image</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {dialogs.map(d => (
                    <tr key={d.id} style={{ cursor: 'pointer' }}
                      onClick={() => openEdit(d)}>
                      <td><code style={{ fontSize: 12, background: 'var(--bg)', padding: '2px 6px', borderRadius: 4 }}>{d.slug}</code></td>
                      <td className="text-muted" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.description}</td>
                      <td>{d.bulles.length}</td>
                      <td className="text-muted">{d.imageName}</td>
                      <td><span className={`badge ${d.actif ? 'badge-on' : 'badge-off'}`}>{d.actif ? 'Actif' : 'Inactif'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Panel édition / création ── */}
      {panelOpen && (
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="page-header">
            <h2 className="page-title" style={{ fontSize: '1.1rem' }}>
              {isNew ? 'Nouveau dialog' : `Modifier — ${selected?.slug}`}
            </h2>
            <div style={{ display: 'flex', gap: 8 }}>
              {!isNew && selected && (
                <button className="btn btn-danger btn-sm"
                  onClick={() => { if (confirm('Supprimer ce dialog ?')) remove.mutate(selected.id) }}>
                  <Trash2 size={13} /> Supprimer
                </button>
              )}
              <button className="btn btn-ghost" onClick={closePanel}>Annuler</button>
              <button className="btn btn-primary"
                onClick={handleSave}
                disabled={create.isPending || update.isPending}>
                {create.isPending || update.isPending ? 'Sauvegarde…' : 'Sauvegarder'}
              </button>
            </div>
          </div>

          {err && <div className="error-msg" style={{ marginBottom: 12 }}>{err}</div>}

          <div className="card" style={{ padding: 20 }}>

            {/* Slug + Description */}
            <div className="form-row">
              <div className="form-group">
                <label>Slug <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input value={form.slug} onChange={e => setF('slug', e.target.value)}
                  placeholder="ex: catalogue-vide" disabled={!isNew}
                  style={!isNew ? { opacity: 0.6, cursor: 'not-allowed' } : undefined} />
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>Minuscules, chiffres, tirets. Non modifiable après création.</span>
              </div>
              <div className="form-group">
                <label>Image</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <select value={form.imageName} onChange={e => setF('imageName', e.target.value)}>
                    {IMAGES.map(img => <option key={img} value={img}>{img}</option>)}
                  </select>
                  <img
                    key={form.imageName}
                    src={`/img/mascotte/${form.imageName}`}
                    alt={form.imageName}
                    style={{ height: 80, width: 'auto', borderRadius: 6, border: '1px solid var(--border)' }}
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Description (note interne) <span style={{ color: 'var(--danger)' }}>*</span></label>
              <textarea value={form.description} rows={2}
                onChange={e => setF('description', e.target.value)}
                placeholder="Ex: Affiché sur la page Catalogue quand aucun rayon n'existe" />
            </div>

            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <input type="checkbox" id="actif" checked={form.actif}
                onChange={e => setF('actif', e.target.checked)} style={{ width: 'auto' }} />
              <label htmlFor="actif" style={{ marginBottom: 0, cursor: 'pointer' }}>Dialog actif</label>
            </div>

            {/* Bulles */}
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 16, paddingTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>Bulles ({form.bulles.length})</span>
                <button className="btn btn-ghost btn-sm"
                  onClick={() => setForm(f => ({ ...f, bulles: [...f.bulles, emptyBulle()] }))}>
                  <Plus size={13} /> Ajouter une bulle
                </button>
              </div>

              {form.bulles.map((b, i) => (
                <div key={i} style={{ background: 'var(--bg)', borderRadius: 8, padding: 14, marginBottom: 10, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Bulle {i + 1}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => moveBulle(i, -1)} disabled={i === 0}><ChevronUp size={13} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => moveBulle(i, 1)} disabled={i === form.bulles.length - 1}><ChevronDown size={13} /></button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}
                        onClick={() => removeBulle(i)} disabled={form.bulles.length === 1}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Titre (optionnel)</label>
                    <input value={b.title} onChange={e => setBulle(i, 'title', e.target.value)}
                      placeholder="Ex: Par ici ! 👋" />
                  </div>
                  <div className="form-group">
                    <label>Texte <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <textarea rows={3} value={b.text}
                      onChange={e => setBulle(i, 'text', e.target.value)}
                      placeholder="Contenu de la bulle…" />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Bouton — libellé (optionnel)</label>
                      <input value={b.cta_label} onChange={e => setBulle(i, 'cta_label', e.target.value)}
                        placeholder="Ex: Aller aux réglages →" />
                    </div>
                    <div className="form-group">
                      <label>Bouton — URL</label>
                      <input value={b.cta_href} onChange={e => setBulle(i, 'cta_href', e.target.value)}
                        placeholder="Ex: /reglages" />
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
