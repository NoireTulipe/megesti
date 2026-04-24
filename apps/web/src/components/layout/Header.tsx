import { Bell, ChevronRight } from 'lucide-react'
import styles from './Header.module.css'

export function Header() {
  return (
    <header className={styles.header}>
      <div>
        <div className={styles.companyName}>Éditions du Vent Marin</div>
        <div className={styles.subtitle}>Bonjour Marie — Avril 2026</div>
      </div>

      <div className={styles.actions}>
        <button className={styles.notifBtn}>
          <Bell size={18} />
          <span className={styles.notifDot} />
        </button>
        <div className={styles.userChip}>
          <div className={styles.userAvatar}>M</div>
          <span className={styles.userName}>Marie L.</span>
          <ChevronRight size={14} color="var(--text-soft)" />
        </div>
      </div>
    </header>
  )
}
