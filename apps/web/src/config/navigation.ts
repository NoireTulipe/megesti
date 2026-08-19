import {
  LayoutGrid, BookOpen, Package, ShoppingCart,
  Settings, TrendingUp, ArrowDownToLine, Coins, FileCheck,
  Network, BarChart2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavKey =
  | 'dashboard' | 'catalog' | 'sales' | 'pointsDeVente' | 'stock'
  | 'contacts'
  | 'droitsAuteur' | 'finances' | 'reversements' | 'facturation' | 'settings'

export interface NavItem {
  key: NavKey
  label: string
  Icon: LucideIcon
  route: string
}

export const NAV_MAIN: NavItem[] = [
  { key: 'dashboard',     label: 'Tableau de bord', Icon: LayoutGrid,   route: '/' },
  { key: 'catalog',       label: 'Catalogue',        Icon: BookOpen,     route: '/catalogue' },
  { key: 'sales',         label: 'Caisse',            Icon: ShoppingCart, route: '/ventes' },
  { key: 'pointsDeVente', label: 'Points de vente',  Icon: TrendingUp,   route: '/points-de-vente' },
  { key: 'stock',         label: 'Stock',             Icon: Package,      route: '/stock' },
  { key: 'contacts',      label: 'Contacts',          Icon: Network,      route: '/contacts' },
]

export const NAV_RESEAU: NavItem[] = []

export const NAV_ADMIN: NavItem[] = [
  { key: 'droitsAuteur', label: 'Droits auteur',  Icon: Coins,           route: '/droits-auteur' },
  { key: 'finances',     label: 'Finances',        Icon: BarChart2,       route: '/finances' },
  { key: 'reversements', label: 'Reversements',    Icon: ArrowDownToLine, route: '/reversements' },
  { key: 'facturation',  label: 'Facturation',     Icon: FileCheck,       route: '/facturation' },
  { key: 'settings',     label: 'Réglages',        Icon: Settings,        route: '/reglages' },
]

export const ALL_NAV = [...NAV_MAIN, ...NAV_RESEAU, ...NAV_ADMIN]
