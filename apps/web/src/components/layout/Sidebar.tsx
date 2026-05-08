import { Lock } from 'lucide-react'
import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { NAV_MAIN, NAV_RESEAU, NAV_ADMIN, type NavKey, type NavItem } from '@/config/navigation'
import { useMonTenant } from '@/features/reglages/hooks/useMonTenant'
import { useAuthStore } from '@/store/authStore'
import { usePlanFeatures } from '@/hooks/usePlanFeatures'
import type { PlanFeatures } from '@megesti/shared'
import styles from './Sidebar.module.css'

interface SidebarProps {
  active: NavKey
  onNav: (key: NavKey) => void
  collapsed: boolean
  onToggle: () => void
}

// Mapping item de nav → feature requise
const NAV_FEATURE_GATES: Partial<Record<NavKey, keyof PlanFeatures>> = {
  depotsLibraires: 'depotsLibraires',
  droitsAuteur:    'droitsAuteur',
  reversements:    'droitsAuteur',
  charges:         'charges',
}

export function Sidebar({ active, onNav, collapsed, onToggle }: SidebarProps) {
  const navigate = useNavigate()
  const v = (visible: string, hidden: string) => (collapsed ? hidden : visible)
  const { data: tenant } = useMonTenant()
  const user = useAuthStore(s => s.user)
  const { can, upgradeMessage } = usePlanFeatures()

  const tenantName = tenant?.name ?? 'Megesti'

  function renderNav(items: NavItem[]) {
    return items.map(item => {
      const requiredFeature = NAV_FEATURE_GATES[item.key]
      const locked = requiredFeature ? !can(requiredFeature) : false
      const tooltip = locked && requiredFeature ? upgradeMessage(requiredFeature) : undefined
      return (
        <NavButton
          key={item.key}
          item={item}
          isActive={item.key === active}
          collapsed={collapsed}
          locked={locked}
          tooltip={tooltip}
          onClick={() => !locked && onNav(item.key)}
        />
      )
    })
  }

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : styles.expanded}`}>

      {/* Logo */}
      <div className={styles.logoArea}>
        <img
          src="/img/logo-MeGesti.png"
          alt="Megesti"
          className={`${styles.logoImg} ${collapsed ? styles.logoImgCollapsed : styles.logoImgExpanded}`}
        />
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        {!collapsed && <div className={styles.groupLabel}>Principal</div>}
        {renderNav(NAV_MAIN)}

        <div style={{ height: 8 }} />
        {!collapsed && <div className={styles.groupLabel}>Réseau</div>}
        {renderNav(NAV_RESEAU)}

        <div style={{ height: 8 }} />
        {!collapsed && <div className={styles.groupLabel}>Administratif</div>}
        {renderNav(NAV_ADMIN)}
      </nav>

      {/* Bottom */}
      <div className={styles.bottom}>
        <button className={styles.collapseBtn} onClick={onToggle}>
          <span className={`${styles.arrow} ${collapsed ? styles.arrowRotated : ''}`}>
            <ChevronLeft size={16} />
          </span>
          {!collapsed && (
            <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 6, opacity: 0.6 }}>Réduire</span>
          )}
        </button>
        <div className={styles.user} onClick={() => navigate('/compte')} style={{ cursor: 'pointer' }}>
          <div className={styles.userAvatar}>{user?.firstName?.charAt(0) ?? '?'}</div>
          <div className={`${styles.userInfo} ${v(styles.userInfoVisible, styles.userInfoHidden)}`}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'white' }}>{user?.firstName} {user?.lastName}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{user?.role === 'ADMIN' ? 'Administrateur' : 'Éditeur'}</div>
          </div>
        </div>
      </div>
    </aside>
  )
}

// ── NavButton ──────────────────────────────────────────────────────────────────
interface NavButtonProps {
  item: NavItem
  isActive: boolean
  collapsed: boolean
  locked: boolean
  tooltip?: string
  onClick: () => void
}

function NavButton({ item, isActive, collapsed, locked, tooltip, onClick }: NavButtonProps) {
  return (
    <button
      className={`${styles.navItem} ${isActive ? styles.active : ''} ${locked ? styles.locked : ''}`}
      onClick={onClick}
      title={collapsed ? (locked ? tooltip : item.label) : (locked ? tooltip : undefined)}
      style={{ opacity: locked ? 0.4 : 1, cursor: locked ? 'not-allowed' : 'pointer' }}
    >
      <div className={styles.iconWrap}>
        <item.Icon size={15} color={isActive ? 'white' : 'rgba(255,255,255,0.7)'} />
      </div>
      <span className={`${styles.navLabel} ${collapsed ? styles.navLabelHidden : styles.navLabelVisible}`}>
        {item.label}
      </span>
      {locked && !collapsed && (
        <Lock size={10} color="rgba(255,255,255,0.5)" style={{ marginLeft: 'auto', flexShrink: 0 }} />
      )}
    </button>
  )
}
