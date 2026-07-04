import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Building2, LogOut, MessageCircle, Bell, Wrench } from 'lucide-react'
import { useAuthStore } from '../../store'

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { nom, logout } = useAuthStore()
  const navigate        = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">Megesti <span>Admin</span></div>
        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <LayoutDashboard size={16} /> Dashboard
          </NavLink>
          <NavLink to="/tenants" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <Building2 size={16} /> Tenants
          </NavLink>
          <NavLink to="/megestine" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <MessageCircle size={16} /> MeGestine
          </NavLink>
          <NavLink to="/popups" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <Bell size={16} /> Popups
          </NavLink>
          <NavLink to="/interventions" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <Wrench size={16} /> Interventions
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <div style={{ marginBottom: 8, color: '#c9d1d9', fontSize: 13 }}>{nom}</div>
          <button className="nav-link" onClick={handleLogout} style={{ color: 'var(--danger)' }}>
            <LogOut size={14} /> Déconnexion
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  )
}
