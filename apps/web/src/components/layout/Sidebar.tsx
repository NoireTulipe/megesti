import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { NAV_MAIN, NAV_RESEAU, NAV_ADMIN, type NavKey } from '@/config/navigation'
import { useMonTenant } from '@/features/reglages/hooks/useMonTenant'
import { useAuthStore } from '@/store/authStore'
import styles from './Sidebar.module.css'

interface SidebarProps {
  active: NavKey
  onNav: (key: NavKey) => void
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ active, onNav, collapsed, onToggle }: SidebarProps) {
  const navigate = useNavigate()
  const v = (visible: string, hidden: string) => (collapsed ? hidden : visible)
  const { data: tenant } = useMonTenant()
  const user = useAuthStore(s => s.user)

  const tenantName = tenant?.name ?? 'Megesti'

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
        {NAV_MAIN.map(item => (
          <NavButton key={item.key} item={item} isActive={item.key === active} collapsed={collapsed} onClick={() => onNav(item.key)} />
        ))}

        <div style={{ height: 8 }} />
        {!collapsed && <div className={styles.groupLabel}>Réseau</div>}
        {NAV_RESEAU.map(item => (
          <NavButton key={item.key} item={item} isActive={item.key === active} collapsed={collapsed} onClick={() => onNav(item.key)} />
        ))}

        <div style={{ height: 8 }} />
        {!collapsed && <div className={styles.groupLabel}>Administratif</div>}
        {NAV_ADMIN.map(item => (
          <NavButton key={item.key} item={item} isActive={item.key === active} collapsed={collapsed} onClick={() => onNav(item.key)} />
        ))}
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

// ── NavButton ──────────────────────────────────────────────
interface NavButtonProps {
  item: { key: NavKey; label: string; Icon: React.ComponentType<{ size?: number; color?: string }> }
  isActive: boolean
  collapsed: boolean
  onClick: () => void
}

function NavButton({ item, isActive, collapsed, onClick }: NavButtonProps) {
  return (
    <button
      className={`${styles.navItem} ${isActive ? styles.active : ''}`}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
    >
      <div className={styles.iconWrap}>
        <item.Icon size={15} color={isActive ? 'white' : 'rgba(255,255,255,0.7)'} />
      </div>
      <span className={`${styles.navLabel} ${collapsed ? styles.navLabelHidden : styles.navLabelVisible}`}>
        {item.label}
      </span>
    </button>
  )
}
