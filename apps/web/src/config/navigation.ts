import { LayoutGrid, BookOpen, TrendingUp, Package, Users, Home, FileText, Settings, BookMarked, Store, ShoppingCart } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavKey = 'dashboard' | 'catalog' | 'sales' | 'pointsDeVente' | 'stock' | 'authors' | 'maisonsEdition' | 'depotsLibraires' | 'salons' | 'reports' | 'settings'

export interface NavItem {
  key: NavKey
  label: string
  Icon: LucideIcon
  route: string
}

export const NAV_MAIN: NavItem[] = [
  { key: 'dashboard', label: 'Tableau de bord', Icon: LayoutGrid, route: '/' },
  { key: 'catalog',   label: 'Catalogue',        Icon: BookOpen,   route: '/catalogue' },
  { key: 'sales',         label: 'Caisse',             Icon: ShoppingCart, route: '/ventes' },
  { key: 'pointsDeVente', label: 'Points de vente',   Icon: TrendingUp,   route: '/points-de-vente' },
  { key: 'stock',     label: 'Stock',             Icon: Package,    route: '/stock' },
]

export const NAV_RESEAU: NavItem[] = [
  { key: 'authors',         label: 'Auteurs',            Icon: Users,      route: '/auteurs' },
  { key: 'maisonsEdition',  label: "Maisons d'édition",  Icon: BookMarked, route: '/maisons-edition' },
  { key: 'depotsLibraires', label: 'Dépôts libraires',   Icon: Store,      route: '/depots-libraires' },
  { key: 'salons',          label: 'Salons',              Icon: Home,       route: '/salons' },
  { key: 'reports',         label: 'Rapports',            Icon: FileText,   route: '/rapports' },
  { key: 'settings',        label: 'Réglages',            Icon: Settings,   route: '/reglages' },
]

export const ALL_NAV = [...NAV_MAIN, ...NAV_RESEAU]
