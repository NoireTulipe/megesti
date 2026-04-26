import { Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage } from '@/features/auth/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { CataloguePage } from '@/features/catalogue/CataloguePage'
import { AuteursPage }   from '@/features/auteurs/AuteursPage'
import { MaisonsEditionPage }  from '@/features/maisonsEdition/MaisonsEditionPage'
import { DepotsLibrairesPage } from '@/features/depotsLibraires/DepotsLibrairesPage'
import { SalonsPage }          from '@/features/salons/SalonsPage'
import { VentesPage }          from '@/features/ventes/VentesPage'
import { PointsDeVentePage }   from '@/features/ventes/PointsDeVentePage'
import { ReglagesPage }  from '@/features/reglages/ReglagesPage'

function ComingSoon({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, height: '100%', minHeight: 400 }}>
      <div style={{ fontFamily: 'DM Serif Display', fontSize: 36, color: 'var(--ink)', opacity: 0.3 }}>{label}</div>
      <p style={{ fontSize: 13, color: 'var(--text-soft)' }}>En cours de développement.</p>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/*" element={
        <ProtectedRoute>
          <AppLayout>
            <Routes>
              <Route path="/"                  element={<DashboardPage />} />
              <Route path="/catalogue"         element={<CataloguePage />} />
              <Route path="/ventes"            element={<VentesPage />} />
              <Route path="/points-de-vente"  element={<PointsDeVentePage />} />
              <Route path="/stock"             element={<ComingSoon label="Stock" />} />
              <Route path="/auteurs"           element={<AuteursPage />} />
              <Route path="/maisons-edition"   element={<MaisonsEditionPage />} />
              <Route path="/depots-libraires"  element={<DepotsLibrairesPage />} />
              <Route path="/salons"            element={<SalonsPage />} />
              <Route path="/rapports"          element={<ComingSoon label="Rapports" />} />
              <Route path="/reglages"          element={<ReglagesPage />} />
            </Routes>
          </AppLayout>
        </ProtectedRoute>
      } />
    </Routes>
  )
}
