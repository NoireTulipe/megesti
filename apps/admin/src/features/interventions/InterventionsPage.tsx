import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../../api'
import { Search, Undo2 } from 'lucide-react'

interface TenantLite { id: string; name: string; slug: string }

interface VenteAdmin {
  id: string; numero: number; dateVente: string; modePaiement: string
  totalTTC: string; statut: 'VALIDEE' | 'ANNULEE'; noteAnnulation: string | null
  session: { id: string; debiterStockME: boolean } | null
  lignes: {
    id: string; quantite: number; totalLigneTTC: string
    article: { id: string; nom: string; stock: number }
  }[]
}

interface Intervention {
  id: string; action: string; ticket: string; note: string | null
  detail: { numero?: number; totalTTC?: number } | null
  createdAt: string
  admin: { nom: string }; tenant: { name: string }
}

const ACTION_LABEL: Record<string, string> = {
  DESANNULATION_VENTE: 'Désannulation de vente',
}

const fDate = (iso: string) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
const fEur  = (n: number | string) => `${Number(n).toFixed(2).replace('.', ',')} €`

export function InterventionsPage() {
  const qc = useQueryClient()
  const [tenantId, setTenantId] = useState('')
  const [numero,   setNumero]   = useState('')
  const [vente,    setVente]    = useState<VenteAdmin | null>(null)
  const [ticket,   setTicket]   = useState('')
  const [note,     setNote]     = useState('')
  const [err,      setErr]      = useState('')
  const [ok,       setOk]       = useState('')

  const { data: tenants = [] } = useQuery<TenantLite[]>({
    queryKey: ['admin-tenants'],
    queryFn:  () => apiFetch('/admin/tenants'),
  })

  const { data: interventions = [] } = useQuery<Intervention[]>({
    queryKey: ['admin-interventions'],
    queryFn:  () => apiFetch('/admin/interventions'),
  })

  const search = useMutation({
    mutationFn: () => apiFetch<VenteAdmin>(`/admin/tenants/${tenantId}/ventes/numero/${numero.trim()}`),
    onSuccess:  (v) => { setVente(v); setErr(''); setOk('') },
    onError:    (e: Error) => { setVente(null); setErr(e.message) },
  })

  const desannuler = useMutation({
    mutationFn: () => apiFetch<VenteAdmin>('/admin/interventions/desannuler-vente', {
      method: 'POST',
      body: JSON.stringify({ tenantId, venteId: vente!.id, ticket: ticket.trim(), ...(note.trim() ? { note: note.trim() } : {}) }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-interventions'] })
      setOk(`Vente #${vente!.numero} désannulée.`)
      setVente(null); setTicket(''); setNote(''); setErr('')
    },
    onError: (e: Error) => setErr(e.message),
  })

  function handleSearch() {
    setErr(''); setOk('')
    if (!tenantId)      return setErr('Sélectionne un tenant.')
    if (!numero.trim()) return setErr('Indique un numéro de vente.')
    search.mutate()
  }

  function handleDesannuler() {
    setErr('')
    if (!ticket.trim()) return setErr('La référence du ticket d\'intervention est obligatoire.')
    if (!confirm(`Désannuler la vente #${vente!.numero} (${fEur(vente!.totalTTC)}) ? Le stock des articles sera re-débité.`)) return
    desannuler.mutate()
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Interventions</h1>
      </div>

      {/* ── Recherche de vente ── */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Rechercher une vente</div>
        <div className="form-row" style={{ alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 2 }}>
            <label>Tenant *</label>
            <select value={tenantId} onChange={e => { setTenantId(e.target.value); setVente(null) }}>
              <option value="">— Choisir —</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>N° de vente *</label>
            <input value={numero} onChange={e => setNumero(e.target.value)} placeholder="Ex: 245"
              onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          </div>
          <div className="form-group" style={{ flex: '0 0 auto' }}>
            <button className="btn btn-primary" onClick={handleSearch} disabled={search.isPending}>
              <Search size={14} /> {search.isPending ? 'Recherche…' : 'Rechercher'}
            </button>
          </div>
        </div>

        {err && <div className="error-msg" style={{ marginTop: 8 }}>{err}</div>}
        {ok  && <div style={{ marginTop: 8, color: 'var(--success, #3fb950)', fontSize: 13 }}>{ok}</div>}

        {/* ── Fiche vente ── */}
        {vente && (
          <div style={{ marginTop: 16, border: '1px solid var(--border)', borderRadius: 8, padding: 16, background: 'var(--bg)' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontWeight: 700 }}>Vente #{vente.numero}</span>
              <span className="text-muted" style={{ fontSize: 13 }}>{fDate(vente.dateVente)}</span>
              <span className={`badge ${vente.statut === 'ANNULEE' ? 'badge-off' : 'badge-on'}`}>
                {vente.statut === 'ANNULEE' ? 'Annulée' : 'Validée'}
              </span>
              <span style={{ marginLeft: 'auto', fontWeight: 700 }}>{fEur(vente.totalTTC)}</span>
            </div>
            <table style={{ width: '100%', fontSize: 13 }}>
              <tbody>
                {vente.lignes.map(l => (
                  <tr key={l.id}>
                    <td>{l.article.nom}</td>
                    <td style={{ textAlign: 'center' }}>× {l.quantite}</td>
                    <td className="text-muted" style={{ textAlign: 'center' }}>stock actuel : {l.article.stock}</td>
                    <td style={{ textAlign: 'right' }}>{fEur(l.totalLigneTTC)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {vente.noteAnnulation && (
              <div className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>Note d'annulation : {vente.noteAnnulation}</div>
            )}
            {vente.session && !vente.session.debiterStockME && (
              <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>Session sans débit de stock ME : le stock ne sera pas touché.</div>
            )}

            {vente.statut === 'ANNULEE' && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                <div className="form-row" style={{ alignItems: 'flex-end' }}>
                  <div className="form-group">
                    <label>Ticket d'intervention *</label>
                    <input value={ticket} onChange={e => setTicket(e.target.value)} placeholder="Ex: TICKET-2026-0042" />
                  </div>
                  <div className="form-group" style={{ flex: 2 }}>
                    <label>Note (optionnel)</label>
                    <input value={note} onChange={e => setNote(e.target.value)} placeholder="Ex: annulée par erreur par le client" />
                  </div>
                  <div className="form-group" style={{ flex: '0 0 auto' }}>
                    <button className="btn btn-danger" onClick={handleDesannuler} disabled={desannuler.isPending}>
                      <Undo2 size={14} /> {desannuler.isPending ? 'En cours…' : 'Désannuler la vente'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Journal ── */}
      <div className="card">
        <div style={{ padding: '14px 20px 0', fontWeight: 600, fontSize: 13 }}>Journal des interventions</div>
        {interventions.length === 0 ? (
          <div style={{ padding: 24, color: 'var(--muted)', fontSize: 13 }}>Aucune intervention enregistrée.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Admin</th><th>Tenant</th><th>Action</th><th>Vente</th><th>Ticket</th><th>Note</th></tr></thead>
              <tbody>
                {interventions.map(i => (
                  <tr key={i.id}>
                    <td>{fDate(i.createdAt)}</td>
                    <td>{i.admin.nom}</td>
                    <td>{i.tenant.name}</td>
                    <td>{ACTION_LABEL[i.action] ?? i.action}</td>
                    <td>{i.detail?.numero ? `#${i.detail.numero}${i.detail.totalTTC != null ? ` — ${fEur(i.detail.totalTTC)}` : ''}` : '—'}</td>
                    <td style={{ fontWeight: 600 }}>{i.ticket}</td>
                    <td className="text-muted">{i.note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
