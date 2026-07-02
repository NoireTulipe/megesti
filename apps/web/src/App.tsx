import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage }       from '@/features/auth/LoginPage'
import { TenantLoginPage } from '@/features/auth/TenantLoginPage'
import { DashboardPage }   from '@/features/dashboard/DashboardPage'
import { CataloguePage }   from '@/features/catalogue/CataloguePage'
import { VentesPage }      from '@/features/ventes/VentesPage'
import { PointsDeVentePage } from '@/features/ventes/PointsDeVentePage'
import { ReglagesPage }    from '@/features/reglages/ReglagesPage'
import { ComptePage }      from '@/features/compte/ComptePage'
import { StockPage }       from '@/features/stock/StockPage'
import { ContactsPage }    from '@/features/contacts/ContactsPage'
import { FinancesPage }    from '@/features/finances/FinancesPage'
import { ReversementsPage }  from '@/features/reversements/ReversementsPage'
import { DroitsAuteurPage }  from '@/features/droitsAuteur/DroitsAuteurPage'
import { FacturationPage }   from '@/features/facturation/FacturationPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login"   element={<LoginPage />} />
      <Route path="/t/:slug" element={<TenantLoginPage />} />

      <Route path="/*" element={
        <ProtectedRoute>
          <AppLayout>
            <Routes>
              <Route path="/"                 element={<DashboardPage />} />
              <Route path="/catalogue"        element={<CataloguePage />} />
              <Route path="/ventes"           element={<VentesPage />} />
              <Route path="/points-de-vente"  element={<PointsDeVentePage />} />
              <Route path="/stock"            element={<StockPage />} />
              <Route path="/contacts"         element={<ContactsPage />} />
              <Route path="/finances"         element={<FinancesPage />} />
              <Route path="/droits-auteur"    element={<DroitsAuteurPage />} />
              <Route path="/reversements"     element={<ReversementsPage />} />
              <Route path="/facturation"      element={<FacturationPage />} />
              <Route path="/reglages"         element={<ReglagesPage />} />
              <Route path="/compte"           element={<ComptePage />} />
              {/* Anciens alias — redirigent vers les pages agrégées */}
              <Route path="/auteurs"               element={<Navigate to="/contacts?tab=auteurs"    replace />} />
              <Route path="/maisons-edition"       element={<Navigate to="/contacts?tab=maisons"   replace />} />
              <Route path="/depots-libraires"      element={<Navigate to="/contacts?tab=depots"    replace />} />
              <Route path="/salons"                element={<Navigate to="/contacts?tab=salons"    replace />} />
              <Route path="/imprimeurs"            element={<Navigate to="/contacts?tab=imprimeurs" replace />} />
              <Route path="/statistiques_de_vente" element={<Navigate to="/finances?tab=statistiques" replace />} />
              <Route path="/comptabilite"          element={<Navigate to="/finances?tab=statistiques" replace />} />
              <Route path="/bilan"                 element={<Navigate to="/finances?tab=bilan"    replace />} />
              <Route path="/charges"               element={<Navigate to="/finances?tab=charges"  replace />} />
            </Routes>
          </AppLayout>
        </ProtectedRoute>
      } />
    </Routes>
  )
}
