import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { apiFetch } from '../../api'

interface Tenant {
  id: string; name: string; slug: string; plan: string; actif: boolean
  createdAt: string; _count: { users: number; ventes: number }
}

interface CreateTenantForm {
  name: string; slug: string; plan: 'TRIAL' | 'STARTER' | 'PRO'
  franchiseBaseVA: boolean
  adminEmail: string; adminPassword: string; adminPrenom: string; adminNom: string
}

const PLAN_BADGE: Record<string, string> = { TRIAL: 'badge-trial', STARTER: 'badge-starter', PRO: 'badge-pro' }

export function TenantsPage() {
  const navigate      = useNavigate()
  const qc            = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<CreateTenantForm>({
    name: '', slug: '', plan: 'TRIAL', franchiseBaseVA: false,
    adminEmail: '', adminPassword: '', adminPrenom: '', adminNom: '',
  })
  const [err, setErr] = useState('')

  const { data: tenants = [], isLoading } = useQuery<Tenant[]>({
    queryKey: ['admin-tenants'],
    queryFn:  () => apiFetch('/admin/tenants'),
  })

  const create = useMutation({
    mutationFn: (body: CreateTenantForm) => apiFetch('/admin/tenants', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-tenants'] }); setShowModal(false); resetForm() },
    onError:   (e: Error) => setErr(e.message),
  })

  function resetForm() {
    setForm({ name: '', slug: '', plan: 'TRIAL', franchiseBaseVA: false, adminEmail: '', adminPassword: '', adminPrenom: '', adminNom: '' })
    setErr('')
  }

  function set(field: keyof CreateTenantForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const val = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value
      setForm(f => ({ ...f, [field]: val }))
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Tenants</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} /> Nouveau tenant
        </button>
      </div>

      <div className="card">
        <div className="table-wrap">
          {isLoading
            ? <div style={{ padding: 24 }} className="text-muted">Chargement…</div>
            : (
              <table>
                <thead>
                  <tr>
                    <th>Nom</th><th>Slug</th><th>Plan</th><th>Statut</th>
                    <th>Users</th><th>Ventes</th><th>Créé le</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map(t => (
                    <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/tenants/${t.id}`)}>
                      <td style={{ fontWeight: 600 }}>{t.name}</td>
                      <td className="text-muted">{t.slug}</td>
                      <td><span className={`badge ${PLAN_BADGE[t.plan] ?? ''}`}>{t.plan}</span></td>
                      <td><span className={`badge ${t.actif ? 'badge-on' : 'badge-off'}`}>{t.actif ? 'Actif' : 'Suspendu'}</span></td>
                      <td>{t._count.users}</td>
                      <td>{t._count.ventes}</td>
                      <td className="text-muted">{new Date(t.createdAt).toLocaleDateString('fr-FR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && (setShowModal(false), resetForm())}>
          <div className="modal">
            <div className="modal-title">Nouveau tenant</div>
            {err && <div className="error-msg">{err}</div>}
            <div className="form-row">
              <div className="form-group">
                <label>Nom de la maison d'édition</label>
                <input value={form.name} onChange={set('name')} required />
              </div>
              <div className="form-group">
                <label>Slug (URL)</label>
                <input value={form.slug} onChange={set('slug')} placeholder="ex: editions-dupont" required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Plan</label>
                <select value={form.plan} onChange={set('plan')}>
                  <option value="TRIAL">Trial</option>
                  <option value="STARTER">Starter</option>
                  <option value="PRO">Pro</option>
                </select>
              </div>
              <div className="form-group" style={{ justifyContent: 'flex-end', paddingBottom: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.franchiseBaseVA} onChange={set('franchiseBaseVA')} style={{ width: 'auto' }} />
                  Franchise base TVA (art. 293B)
                </label>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0 16px', paddingTop: 16, fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
              PREMIER COMPTE ADMIN
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Prénom</label>
                <input value={form.adminPrenom} onChange={set('adminPrenom')} required />
              </div>
              <div className="form-group">
                <label>Nom</label>
                <input value={form.adminNom} onChange={set('adminNom')} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={form.adminEmail} onChange={set('adminEmail')} required />
              </div>
              <div className="form-group">
                <label>Mot de passe provisoire</label>
                <input type="password" value={form.adminPassword} onChange={set('adminPassword')} required />
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => { setShowModal(false); resetForm() }}>Annuler</button>
              <button className="btn btn-primary" onClick={() => create.mutate(form)} disabled={create.isPending}>
                {create.isPending ? 'Création…' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
