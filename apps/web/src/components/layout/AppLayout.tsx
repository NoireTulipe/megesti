import type { ReactNode } from 'react'
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { PageBlobs } from '@/components/PageBlobs'
import { PopupOverlay } from '@/components/PopupOverlay'
import { HelpProvider } from '@/components/HelpContext'
import { ALL_NAV, type NavKey } from '@/config/navigation'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('megesti-sidebar') === 'collapsed'
  )

  const activeNav =
    ALL_NAV.find(item => item.route === location.pathname)?.key ?? 'dashboard'

  const handleNav = (key: NavKey) => {
    const item = ALL_NAV.find(n => n.key === key)
    if (item) navigate(item.route)
  }

  const toggleSidebar = () => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem('megesti-sidebar', next ? 'collapsed' : 'expanded')
      return next
    })
  }

  return (
    <HelpProvider>
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <PageBlobs />
      <Sidebar
        active={activeNav}
        onNav={handleNav}
        collapsed={collapsed}
        onToggle={toggleSidebar}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <Header />
        <main style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
          {children}
        </main>
      </div>
      <PopupOverlay />
    </div>
    </HelpProvider>
  )
}
