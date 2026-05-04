import { useQuery } from '@tanstack/react-query'
import { apiFetch }  from '../../api'

interface Stats {
  tenants: { total: number; actifs: number; parPlan: { plan: string; _count: number }[] }
  ventes:  { today: number; total: number }
}

export function StatsPage() {
  const { data, isLoading } = useQuery<Stats>({
    queryKey: ['admin-stats'],
    queryFn:  () => apiFetch('/admin/stats'),
    refetchInterval: 60_000,
  })

  if (isLoading) return <div className="page"><p className="text-muted">Chargement…</p></div>
  if (!data)     return null

  const planCount = (plan: string) => data.tenants.parPlan.find(p => p.plan === plan)?._count ?? 0

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{data.tenants.total}</div>
          <div className="stat-label">Tenants total</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.tenants.actifs}</div>
          <div className="stat-label">Tenants actifs</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{planCount('TRIAL')}</div>
          <div className="stat-label">En trial</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{planCount('STARTER')}</div>
          <div className="stat-label">Starter</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{planCount('PRO')}</div>
          <div className="stat-label">Pro</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.ventes.today}</div>
          <div className="stat-label">Ventes aujourd'hui</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.ventes.total}</div>
          <div className="stat-label">Ventes total</div>
        </div>
      </div>
    </div>
  )
}
