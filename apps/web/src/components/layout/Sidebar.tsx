import { ChevronLeft } from 'lucide-react'
import { NAV_MAIN, NAV_RESEAU, type NavKey } from '@/config/navigation'
import styles from './Sidebar.module.css'

interface SidebarProps {
  active: NavKey
  onNav: (key: NavKey) => void
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ active, onNav, collapsed, onToggle }: SidebarProps) {
  const v = (visible: string, hidden: string) => (collapsed ? hidden : visible)

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : styles.expanded}`}>

      {/* Logo */}
      <div className={styles.logoArea}>
        <div className={styles.logoIcon}>
          <span style={{ color: 'white', fontSize: 17, fontFamily: 'DM Serif Display', fontStyle: 'italic', lineHeight: 1 }}>
            é
          </span>
        </div>
        <div className={`${styles.logoText} ${v(styles.logoTextVisible, styles.logoTextHidden)}`}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'white', letterSpacing: '-0.01em' }}>Megesti</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: 500, marginTop: 1 }}>
            Édition & gestion
          </div>
        </div>
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
        <div className={styles.user}>
          <div className={styles.userAvatar}>M</div>
          <div className={`${styles.userInfo} ${v(styles.userInfoVisible, styles.userInfoHidden)}`}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'white' }}>Marie Leroux</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Directrice</div>
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
