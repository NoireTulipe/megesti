import type { LucideProps } from 'lucide-react'
import {
  LayoutGrid, BookOpen, TrendingUp, Package, Users,
  Home, FileText, Settings, Bell, Plus, ArrowUp,
  AlertCircle, Clock, Receipt, Tag, ChevronRight,
  ChevronLeft, Check,
} from 'lucide-react'

const ICONS = {
  dashboard: LayoutGrid,
  catalog:   BookOpen,
  sales:     TrendingUp,
  stock:     Package,
  authors:   Users,
  salons:    Home,
  reports:   FileText,
  settings:  Settings,
  bell:      Bell,
  plus:      Plus,
  arrowUp:   ArrowUp,
  alert:     AlertCircle,
  clock:     Clock,
  book:      BookOpen,
  receipt:   Receipt,
  tag:       Tag,
  chevron:   ChevronRight,
  chevronLeft: ChevronLeft,
  check:     Check,
} as const

export type IconName = keyof typeof ICONS

interface IconProps extends Omit<LucideProps, 'ref'> {
  name: IconName
}

export function Icon({ name, ...props }: IconProps) {
  const LucideIcon = ICONS[name]
  return <LucideIcon {...props} />
}
