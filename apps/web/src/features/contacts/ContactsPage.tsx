import { useSearchParams } from 'react-router-dom'
import { AuteursPage }          from '@/features/auteurs/AuteursPage'
import { MaisonsEditionPage }   from '@/features/maisonsEdition/MaisonsEditionPage'
import { DepotsLibrairesPage }  from '@/features/depotsLibraires/DepotsLibrairesPage'
import { SalonsPage }           from '@/features/salons/SalonsPage'
import { ImprimeurPage }        from '@/features/imprimeurs/ImprimeurPage'
import styles from '@/components/ui/TabPage.module.css'

type TabId = 'auteurs' | 'maisons' | 'depots' | 'salons' | 'imprimeurs'

const TABS: { id: TabId; label: string }[] = [
  { id: 'auteurs',    label: 'Auteurs' },
  { id: 'maisons',    label: "Maisons d'édition" },
  { id: 'depots',     label: 'Dépôts libraires' },
  { id: 'salons',     label: 'Salons' },
  { id: 'imprimeurs', label: 'Imprimeurs' },
]

export function ContactsPage() {
  const [sp, setSp] = useSearchParams()
  const tab = (sp.get('tab') ?? 'auteurs') as TabId

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
        {tab === 'auteurs'    && <AuteursPage />}
        {tab === 'maisons'    && <MaisonsEditionPage />}
        {tab === 'depots'     && <DepotsLibrairesPage />}
        {tab === 'salons'     && <SalonsPage />}
        {tab === 'imprimeurs' && <ImprimeurPage />}
      </div>
    </div>
  )
}
