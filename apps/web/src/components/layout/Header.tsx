import { useNavigate } from 'react-router-dom'
import { Bell, ChevronRight } from 'lucide-react'
import { useMonTenant } from '@/features/reglages/hooks/useMonTenant'
import { useAuthStore } from '@/store/authStore'
import { useHelp } from '@/components/HelpContext'
import styles from './Header.module.css'

const MONTHS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre']

export function Header() {
  const navigate = useNavigate()
  const { data: tenant } = useMonTenant()
  const user = useAuthStore(s => s.user)

  const { showHelp, toggleHelp } = useHelp()
  const now = new Date()
  const mois = MONTHS[now.getMonth()]
  const annee = now.getFullYear()
  const prenom = user?.firstName ?? ''

  return (
    <header className={styles.header}>
      <div>
        <div className={styles.companyName}>{tenant?.name ?? 'Megesti'}</div>
        <div className={styles.subtitle}>Bonjour{prenom ? ` ${prenom}` : ''} — {mois} {annee}</div>
      </div>

      <div className={styles.actions}>
        <button className={`${styles.helpSwitch} ${showHelp ? styles.helpSwitchOn : ''}`} onClick={toggleHelp}>
          <span className={styles.helpLabel}>
            <span className={styles.helpBubble}>?</span>
            Afficher les bulles d'aide
          </span>
          <span className={`${styles.helpTrack} ${showHelp ? styles.helpTrackOn : ''}`}>
            <span className={styles.helpThumb} />
          </span>
        </button>
        <button className={styles.notifBtn}>
          <Bell size={18} />
          <span className={styles.notifDot} />
        </button>
        <div className={styles.userChip} onClick={() => navigate('/compte')} style={{ cursor: 'pointer' }}>
          <div className={styles.userAvatar}>{user?.firstName?.charAt(0) ?? '?'}</div>
          <span className={styles.userName}>{user?.firstName} {user?.lastName?.charAt(0)}.</span>
          <ChevronRight size={14} color="var(--text-soft)" />
        </div>
      </div>
    </header>
  )
}
