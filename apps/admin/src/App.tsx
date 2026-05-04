import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store'
import { LoginPage }    from './features/auth/LoginPage'
import { AdminLayout }  from './features/layout/AdminLayout'
import { StatsPage }    from './features/stats/StatsPage'
import { TenantsPage }  from './features/tenants/TenantsPage'
import { TenantDetail } from './features/tenants/TenantDetail'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore(s => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={
        <RequireAuth>
          <AdminLayout>
            <Routes>
              <Route path="/"                   element={<StatsPage />} />
              <Route path="/tenants"            element={<TenantsPage />} />
              <Route path="/tenants/:id"        element={<TenantDetail />} />
              <Route path="*"                   element={<Navigate to="/" replace />} />
            </Routes>
          </AdminLayout>
        </RequireAuth>
      } />
    </Routes>
  )
}
