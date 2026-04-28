import { useState } from 'react'
import { FormBuilder }      from '@/components/FormBuilder'
import { ThesaurusSection } from './ThesaurusSection'
import { RayonsSection }    from './RayonsSection'
import { TypesDASection }   from './TypesDASection'
import { useRayons }        from '../catalogue/hooks/useRayons'
import styles from './ReglagesPage.module.css'
import type { EntityType } from '@megesti/shared'

type Tab = 'champs' | 'rayons' | 'thesaurus' | 'droits'

const TABS: { key: Tab; label: string }[] = [
  { key: 'champs',    label: 'Champs personnalisés' },
  { key: 'rayons',    label: 'Rayons & Catégories' },
  { key: 'thesaurus', label: 'Thésaurus' },
  { key: 'droits',    label: 'Barèmes DA' },
]

const ENTITY_TABS: { key: EntityType; label: string }[] = [
  { key: 'auteur',        label: 'Auteur' },
  { key: 'maisonEdition', label: "Maison d'édition" },
  { key: 'depotLibraire', label: 'Dépôt libraire' },
  { key: 'salon',         label: 'Salon' },
  { key: 'pointDeVente',  label: 'Point de vente' },
]

type ActiveScope =
  | { kind: 'entity'; entityType: EntityType }
  | { kind: 'rayon';  rayonId: string; isLibrairie: boolean }

export function ReglagesPage() {
  const [tab, setTab]         = useState<Tab>('champs')
  const [scope, setScope]     = useState<ActiveScope>({ kind: 'entity', entityType: 'auteur' })
  const { data: rayons = [] } = useRayons()

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Réglages</h1>
        <p className={styles.subtitle}>Personnalisez l'application selon vos besoins</p>
      </header>

      <nav className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className={styles.content}>

        {/* ── Champs personnalisés ─────────────────────────────── */}
        {tab === 'champs' && (
          <>
            <nav className={styles.entityTabs}>
              {/* Entity types fixes */}
              {ENTITY_TABS.map((e) => (
                <button
                  key={e.key}
                  className={`${styles.entityTab} ${
                    scope.kind === 'entity' && scope.entityType === e.key ? styles.entityTabActive : ''
                  }`}
                  onClick={() => setScope({ kind: 'entity', entityType: e.key })}
                >
                  {e.label}
                </button>
              ))}

              {/* Séparateur si des rayons existent */}
              {rayons.length > 0 && <span className={styles.entityTabSep} />}

              {/* Rayons dynamiques */}
              {rayons.map((r) => (
                <button
                  key={r.id}
                  className={`${styles.entityTab} ${styles.entityTabRayon} ${
                    scope.kind === 'rayon' && scope.rayonId === r.id ? styles.entityTabActive : ''
                  }`}
                  onClick={() => setScope({ kind: 'rayon', rayonId: r.id, isLibrairie: r.isLibrairie })}
                >
                  {r.isLibrairie && <span className={styles.entityTabIcon}>📚</span>}
                  {r.nom}
                </button>
              ))}

              {rayons.length === 0 && (
                <span className={styles.rayonHint}>
                  Créez des rayons dans l'onglet "Rayons &amp; Catégories" pour configurer leurs champs.
                </span>
              )}
            </nav>

            {scope.kind === 'entity'
              ? <FormBuilder entityType={scope.entityType} />
              : <FormBuilder rayonId={scope.rayonId} isLibrairie={scope.isLibrairie} />
            }
          </>
        )}

        {/* ── Rayons & Catégories ──────────────────────────────── */}
        {tab === 'rayons' && <RayonsSection />}

        {/* ── Thésaurus ────────────────────────────────────────── */}
        {tab === 'thesaurus' && <ThesaurusSection />}

        {/* ── Barèmes DA ───────────────────────────────────────── */}
        {tab === 'droits' && <TypesDASection />}
      </div>
    </div>
  )
}
