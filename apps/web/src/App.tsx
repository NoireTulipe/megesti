import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage }       from '@/features/auth/LoginPage'
import { TenantLoginPage } from '@/features/auth/TenantLoginPage'
import { PageLoader }      from '@/components/PageLoader'

// Pages chargées à la demande : sort Recharts & co du bundle initial
const DashboardPage     = lazy(() => import('@/features/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })))
const CataloguePage     = lazy(() => import('@/features/catalogue/CataloguePage').then(m => ({ default: m.CataloguePage })))
const VentesPage        = lazy(() => import('@/features/ventes/VentesPage').then(m => ({ default: m.VentesPage })))
const PointsDeVentePage = lazy(() => import('@/features/ventes/PointsDeVentePage').then(m => ({ default: m.PointsDeVentePage })))
const ReglagesPage      = lazy(() => import('@/features/reglages/ReglagesPage').then(m => ({ default: m.ReglagesPage })))
const ComptePage        = lazy(() => import('@/features/compte/ComptePage').then(m => ({ default: m.ComptePage })))
const StockPage         = lazy(() => import('@/features/stock/StockPage').then(m => ({ default: m.StockPage })))
const ContactsPage      = lazy(() => import('@/features/contacts/ContactsPage').then(m => ({ default: m.ContactsPage })))
const FinancesPage      = lazy(() => import('@/features/finances/FinancesPage').then(m => ({ default: m.FinancesPage })))
const ReversementsPage  = lazy(() => import('@/features/reversements/ReversementsPage').then(m => ({ default: m.ReversementsPage })))
const DroitsAuteurPage  = lazy(() => import('@/features/droitsAuteur/DroitsAuteurPage').then(m => ({ default: m.DroitsAuteurPage })))
const FacturationPage   = lazy(() => import('@/features/facturation/FacturationPage').then(m => ({ default: m.FacturationPage })))


export default function App() {
  return (
    <Routes>
      <Route path="/login"   element={<LoginPage />} />
      <Route path="/t/:slug" element={<TenantLoginPage />} />

      <Route path="/*" element={
        <ProtectedRoute>
          <AppLayout>
            <Suspense fallback={<PageLoader />}>
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
            </Suspense>
          </AppLayout>
        </ProtectedRoute>
      } />
    </Routes>
  )
}
