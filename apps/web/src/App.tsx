import { Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage }       from '@/features/auth/LoginPage'
import { TenantLoginPage } from '@/features/auth/TenantLoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { CataloguePage } from '@/features/catalogue/CataloguePage'
import { AuteursPage }   from '@/features/auteurs/AuteursPage'
import { MaisonsEditionPage }  from '@/features/maisonsEdition/MaisonsEditionPage'
import { DepotsLibrairesPage } from '@/features/depotsLibraires/DepotsLibrairesPage'
import { SalonsPage }          from '@/features/salons/SalonsPage'
import { VentesPage }          from '@/features/ventes/VentesPage'
import { PointsDeVentePage }   from '@/features/ventes/PointsDeVentePage'
import { ReglagesPage }        from '@/features/reglages/ReglagesPage'
import { ComptePage }         from '@/features/compte/ComptePage'
import { StockPage }           from '@/features/stock/StockPage'
import { ImprimeurPage }       from '@/features/imprimeurs/ImprimeurPage'
import { ComptabilitePage }    from '@/features/comptabilite/ComptabilitePage'
import { BilanPage }          from '@/features/comptabilite/BilanPage'
import { ChargesPage }        from '@/features/charges/ChargesPage'
import { ReversementsPage }   from '@/features/reversements/ReversementsPage'
import { DroitsAuteurPage }   from '@/features/droitsAuteur/DroitsAuteurPage'
import { FacturationPage }    from '@/features/facturation/FacturationPage'

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
              <Route path="/auteurs"          element={<AuteursPage />} />
              <Route path="/maisons-edition"  element={<MaisonsEditionPage />} />
              <Route path="/depots-libraires" element={<DepotsLibrairesPage />} />
              <Route path="/salons"           element={<SalonsPage />} />
              <Route path="/imprimeurs"       element={<ImprimeurPage />} />
              <Route path="/statistiques_de_vente" element={<ComptabilitePage />} />
              <Route path="/comptabilite"          element={<ComptabilitePage />} />{/* redirect legacy */}
              <Route path="/bilan"           element={<BilanPage />} />
              <Route path="/charges"         element={<ChargesPage />} />
              <Route path="/reversements"     element={<ReversementsPage />} />
              <Route path="/droits-auteur"   element={<DroitsAuteurPage />} />
              <Route path="/facturation"     element={<FacturationPage />} />
              <Route path="/reglages"         element={<ReglagesPage />} />
              <Route path="/compte"           element={<ComptePage />} />
            </Routes>
          </AppLayout>
        </ProtectedRoute>
      } />
    </Routes>
  )
}
