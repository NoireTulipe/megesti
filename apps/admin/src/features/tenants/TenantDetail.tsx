import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, UserPlus } from 'lucide-react'
import { apiFetch } from '../../api'

const PLAN_LABELS: Record<string, string> = {
  TRIAL: 'Essai gratuit', AUTO_EDITION: 'Auto-édition',
  EDITION: 'Edition', EDITION_PRO: 'Edition Pro',
}

interface TenantDetail {
  id: string; name: string; slug: string; plan: string; actif: boolean
  siret: string | null
  franchiseBaseVA: boolean; createdAt: string; updatedAt: string
  pdpClientId: string | null
  pdpSecretConfigured: boolean
  pdpEnvironment: 'SANDBOX' | 'PRODUCTION'
  pdpStatut: 'A_CONFIGURER' | 'ACTIF'
  pdpActivatedAt: string | null
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

  // SuperPdP / Facturation électronique
  const [pdpForm, setPdpForm] = useState({ clientId: '', clientSecret: '', environment: 'SANDBOX' })
  const [pdpErr, setPdpErr] = useState('')

  const patchPdp = useMutation({
    mutationFn: (body: { pdpClientId?: string; pdpClientSecret?: string; pdpEnvironment?: 'SANDBOX' | 'PRODUCTION' }) =>
      apiFetch(`/admin/tenants/${id}/pdp`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-tenant', id] })
      setPdpForm({ clientId: '', clientSecret: '', environment: 'SANDBOX' })
      setPdpErr('')
    },
    onError: (e: Error) => setPdpErr(e.message),
  })

  const activerPdp = useMutation({
    mutationFn: () => apiFetch(`/admin/tenants/${id}/pdp/activer`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-tenant', id] })
      setPdpErr('')
    },
    onError: (e: Error) => setPdpErr(e.message),
  })

  const desactiverPdp = useMutation({
    mutationFn: () => apiFetch(`/admin/tenants/${id}/pdp/desactiver`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-tenant', id] })
      setPdpErr('')
    },
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
          <span className={`badge ${PLAN_BADGE[tenant.plan] ?? ''}`}>{PLAN_LABELS[tenant.plan] ?? tenant.plan}</span>
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

      {/* Facturation électronique (SuperPdP) */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Facturation électronique (SuperPdP)</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                {tenant.siret ? `SIRET: ${tenant.siret}` : 'SIRET non renseigné'}
              </div>
            </div>
            <span className={`badge ${tenant.pdpStatut === 'ACTIF' ? 'badge-on' : 'badge-off'}`}>
              {tenant.pdpStatut === 'ACTIF' ? 'Actif' : 'À configurer'}
            </span>
          </div>

          {pdpErr && <div className="error-msg" style={{ marginBottom: 12 }}>{pdpErr}</div>}

          <div className="form-row">
            <div className="form-group">
              <label>Client ID</label>
              <input
                value={pdpForm.clientId || tenant.pdpClientId || ''}
                onChange={e => setPdpForm(f => ({ ...f, clientId: e.target.value }))}
                placeholder="Client ID SuperPdP"
              />
            </div>
            <div className="form-group">
              <label>Secret (en clair)</label>
              <input
                type="password"
                value={pdpForm.clientSecret}
                onChange={e => setPdpForm(f => ({ ...f, clientSecret: e.target.value }))}
                placeholder={tenant.pdpSecretConfigured ? '•••••••• (déjà configuré — laisser vide pour ne pas changer)' : 'Secret SuperPdP'}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Environnement</label>
            <select
              value={pdpForm.environment || tenant.pdpEnvironment || 'SANDBOX'}
              onChange={e => setPdpForm(f => ({ ...f, environment: e.target.value as 'SANDBOX' | 'PRODUCTION' }))}
            >
              <option value="SANDBOX">Sandbox</option>
              <option value="PRODUCTION">Production</option>
            </select>
          </div>

          <div className="flex" style={{ gap: 8, marginTop: 12 }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                const body: Record<string, string> = {}
                if (pdpForm.clientId) body.pdpClientId = pdpForm.clientId
                if (pdpForm.clientSecret) body.pdpClientSecret = pdpForm.clientSecret
                if (pdpForm.environment) body.pdpEnvironment = pdpForm.environment
                if (Object.keys(body).length > 0) patchPdp.mutate(body as any)
              }}
              disabled={patchPdp.isPending}
            >
              {patchPdp.isPending ? 'Enregistrement…' : 'Enregistrer les credentials'}
            </button>

            {tenant.pdpSecretConfigured && (
              <>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => activerPdp.mutate()}
                  disabled={activerPdp.isPending || tenant.pdpStatut === 'ACTIF'}
                >
                  {activerPdp.isPending ? 'Activation…' : 'Activer'}
                </button>
                {tenant.pdpStatut === 'ACTIF' && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => desactiverPdp.mutate()}
                    disabled={desactiverPdp.isPending}
                  >
                    {desactiverPdp.isPending ? 'Désactivation…' : 'Désactiver'}
                  </button>
                )}
              </>
            )}
          </div>

          {tenant.pdpActivatedAt && (
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
              Activé le {new Date(tenant.pdpActivatedAt).toLocaleDateString('fr-FR')}
            </div>
          )}
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
