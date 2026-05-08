import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, UserPlus } from 'lucide-react'
import { apiFetch } from '../../api'
import { PLAN_LABELS, type PlanTier } from '@megesti/shared'

interface TenantDetail {
  id: string; name: string; slug: string; plan: string; actif: boolean
  franchiseBaseVA: boolean; createdAt: string; updatedAt: string
  _count: { users: number; ventes: number; articles: number; salons: number }
  users: UserRow[]
}

interface UserRow {
  id: string; email: string; firstName: string; lastName: string
  role: string; active: boolean; createdAt: string
}

const PLAN_BADGE: Record<string, string> = {
  TRIAL: 'badge-trial', AUTO_EDITION: 'badge-auto',
  EDITION: 'badge-starter', EDITION_PRO: 'badge-pro',
  STARTER: 'badge-starter', PRO: 'badge-pro',
}
const ROLE_LABEL: Record<string, string> = { ADMIN: 'Admin', EDITOR: 'Éditeur', AUTHOR: 'Auteur' }

export function TenantDetail() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc       = useQueryClient()

  const [showUserModal, setShowUserModal] = useState(false)
  const [userForm, setUserForm] = useState({ email: '', password: '', firstName: '', lastName: '', role: 'EDITOR' as 'ADMIN' | 'EDITOR' | 'AUTHOR' })
  const [userErr, setUserErr]   = useState('')

  const { data: tenant, isLoading } = useQuery<TenantDetail>({
    queryKey: ['admin-tenant', id],
    queryFn:  () => apiFetch(`/admin/tenants/${id}`),
  })

  const patchTenant = useMutation({
    mutationFn: (body: { plan?: string; actif?: boolean }) =>
      apiFetch(`/admin/tenants/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-tenant', id] }),
  })

  const patchUser = useMutation({
    mutationFn: ({ userId, body }: { userId: string; body: { active?: boolean; role?: string; password?: string } }) =>
      apiFetch(`/admin/tenants/${id}/users/${userId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-tenant', id] }),
  })

  const createUser = useMutation({
    mutationFn: (body: typeof userForm) =>
      apiFetch(`/admin/tenants/${id}/users`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-tenant', id] })
      setShowUserModal(false)
      setUserForm({ email: '', password: '', firstName: '', lastName: '', role: 'EDITOR' })
    },
    onError: (e: Error) => setUserErr(e.message),
  })

  if (isLoading) return <div className="page"><p className="text-muted">Chargement…</p></div>
  if (!tenant)   return null

  return (
    <div className="page">
      <div className="page-header">
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tenants')}>
            <ArrowLeft size={14} /> Retour
          </button>
          <h1 className="page-title">{tenant.name}</h1>
          <span className={`badge ${PLAN_BADGE[tenant.plan] ?? ''}`}>{PLAN_LABELS[tenant.plan as PlanTier] ?? tenant.plan}</span>
          <span className={`badge ${tenant.actif ? 'badge-on' : 'badge-off'}`}>{tenant.actif ? 'Actif' : 'Suspendu'}</span>
        </div>
      </div>

      {/* Infos + actions */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 20 }}>
            {[
              ['Slug', tenant.slug],
              ['Ventes', tenant.id ? String(tenant._count.ventes) : '—'],
              ['Articles', String(tenant._count.articles)],
              ['Salons', String(tenant._count.salons)],
            ].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                <div style={{ fontWeight: 600 }}>{val}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            {/* Changer le plan */}
            <select
              value={tenant.plan}
              onChange={e => patchTenant.mutate({ plan: e.target.value })}
              style={{ width: 'auto', padding: '6px 10px' }}
            >
              <option value="AUTO_EDITION">Auto-édition</option>
              <option value="EDITION">Edition</option>
              <option value="EDITION_PRO">Edition Pro</option>
              <option value="TRIAL">Essai gratuit</option>
            </select>

            {/* Suspendre / réactiver */}
            <button
              className={`btn btn-sm ${tenant.actif ? 'btn-danger' : 'btn-ghost'}`}
              onClick={() => patchTenant.mutate({ actif: !tenant.actif })}
              disabled={patchTenant.isPending}
            >
              {tenant.actif ? 'Suspendre' : 'Réactiver'}
            </button>
          </div>
        </div>
      </div>

      {/* Utilisateurs */}
      <div className="flex items-center" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <div className="section-title" style={{ margin: 0 }}>Utilisateurs ({tenant._count.users})</div>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowUserModal(true)}>
          <UserPlus size={14} /> Ajouter un user
        </button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Statut</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {tenant.users.map(u => (
                <tr key={u.id}>
                  <td>{u.firstName} {u.lastName}</td>
                  <td className="text-muted">{u.email}</td>
                  <td>{ROLE_LABEL[u.role] ?? u.role}</td>
                  <td><span className={`badge ${u.active ? 'badge-on' : 'badge-off'}`}>{u.active ? 'Actif' : 'Inactif'}</span></td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => patchUser.mutate({ userId: u.id, body: { active: !u.active } })}
                    >
                      {u.active ? 'Désactiver' : 'Activer'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal nouveau user */}
      {showUserModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowUserModal(false)}>
          <div className="modal">
            <div className="modal-title">Ajouter un utilisateur</div>
            {userErr && <div className="error-msg">{userErr}</div>}
            <div className="form-row">
              <div className="form-group">
                <label>Prénom</label>
                <input value={userForm.firstName} onChange={e => setUserForm(f => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Nom</label>
                <input value={userForm.lastName} onChange={e => setUserForm(f => ({ ...f, lastName: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Mot de passe provisoire</label>
                <input type="password" value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Rôle</label>
                <select value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value as 'ADMIN' | 'EDITOR' | 'AUTHOR' }))}>
                  <option value="ADMIN">Admin</option>
                  <option value="EDITOR">Éditeur</option>
                  <option value="AUTHOR">Auteur</option>
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowUserModal(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={() => createUser.mutate(userForm)} disabled={createUser.isPending}>
                {createUser.isPending ? 'Création…' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
