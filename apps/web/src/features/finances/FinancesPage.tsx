import { useSearchParams } from 'react-router-dom'
import { ComptabilitePage } from '@/features/comptabilite/ComptabilitePage'
import { BilanPage }        from '@/features/comptabilite/BilanPage'
import { ChargesPage }      from '@/features/charges/ChargesPage'
import styles from '@/components/ui/TabPage.module.css'

type TabId = 'statistiques' | 'bilan' | 'charges'

const TABS: { id: TabId; label: string }[] = [
  { id: 'statistiques', label: 'Statistiques de ventes' },
  { id: 'bilan',        label: 'Bilan' },
  { id: 'charges',      label: 'Charges' },
]

export function FinancesPage() {
  const [sp, setSp] = useSearchParams()
  const tab = (sp.get('tab') ?? 'statistiques') as TabId

  return (
    <div className={styles.wrapper}>
      <nav className={styles.tabBar}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
            onClick={() => setSp({ tab: t.id }, { replace: true })}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div className={styles.content}>
        {tab === 'statistiques' && <ComptabilitePage />}
        {tab === 'bilan'        && <BilanPage />}
        {tab === 'charges'      && <ChargesPage />}
      </div>
    </div>
  )
}
