import { LayoutGrid, BookOpen, TrendingUp, Package, Users, Home, FileText, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavKey = 'dashboard' | 'catalog' | 'sales' | 'stock' | 'authors' | 'salons' | 'reports' | 'settings'

export interface NavItem {
  key: NavKey
  label: string
  Icon: LucideIcon
  route: string
}

export const NAV_MAIN: NavItem[] = [
  { key: 'dashboard', label: 'Tableau de bord', Icon: LayoutGrid, route: '/' },
  { key: 'catalog',   label: 'Catalogue',        Icon: BookOpen,   route: '/catalogue' },
  { key: 'sales',     label: 'Ventes',            Icon: TrendingUp, route: '/ventes' },
  { key: 'stock',     label: 'Stock',             Icon: Package,    route: '/stock' },
]

export const NAV_RESEAU: NavItem[] = [
  { key: 'authors',  label: 'Auteur·ices', Icon: Users,     route: '/auteurs' },
  { key: 'salons',   label: 'Salons',      Icon: Home,      route: '/salons' },
  { key: 'reports',  label: 'Rapports',    Icon: FileText,  route: '/rapports' },
  { key: 'settings', label: 'Réglages',    Icon: Settings,  route: '/reglages' },
]

export const ALL_NAV = [...NAV_MAIN, ...NAV_RESEAU]
