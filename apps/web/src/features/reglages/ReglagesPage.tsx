import { useState } from 'react'
import { FormBuilder }      from '@/components/FormBuilder'
import { ThesaurusSection } from './ThesaurusSection'
import { RayonsSection }    from './RayonsSection'
import { TypesDASection }   from './TypesDASection'
import { useRayons }        from '../catalogue/hooks/useRayons'
import { useMonTenant, useUpdateMonTenant } from './hooks/useMonTenant'
import { usePlanFeatures } from '@/hooks/usePlanFeatures'
import styles from './ReglagesPage.module.css'
import type { EntityType } from '@megesti/shared'

type Tab = 'champs' | 'rayons' | 'thesaurus' | 'droits' | 'fiscal'
type Niveau = 'classique' | 'avance'

const CLASSIQUE: { key: Tab; label: string; emoji: string; desc: string }[] = [
  { key: 'rayons',  label: 'Rayons & Catégories', emoji: '🗂️', desc: 'Organisez votre catalogue' },
  { key: 'droits',  label: 'Barèmes DA',           emoji: '📄', desc: "Formules de droits d'auteur" },
  { key: 'fiscal',  label: 'Paramètres fiscaux',   emoji: '🧾', desc: 'TVA et régime fiscal' },
]

const AVANCE: { key: Tab; label: string; emoji: string; desc: string }[] = [
  { key: 'champs',    label: 'Champs personnalisés', emoji: '✏️', desc: 'Ajoutez des champs sur vos fiches' },
  { key: 'thesaurus', label: 'Thésaurus',             emoji: '📖', desc: 'Vocabulaires contrôlés' },
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
  const { features }          = usePlanFeatures()
  const [niveau, setNiveau]   = useState<Niveau>('classique')
  const [tab, setTab]         = useState<Tab>('rayons')
  const [scope, setScope]     = useState<ActiveScope>({ kind: 'entity', entityType: 'auteur' })
  const { data: rayons = [] } = useRayons()
  const { data: tenant }      = useMonTenant()
  const updateTenant          = useUpdateMonTenant()

  function handleNiveau(n: Niveau) {
    setNiveau(n)
    setTab(n === 'classique' ? 'rayons' : 'champs')
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Réglages</h1>
          <p className={styles.subtitle}>Personnalisez l'application selon vos besoins</p>
        </div>
        {/* Sélecteur Classique / Avancé */}
        <div className={styles.niveauSwitch}>
          <button
            className={`${styles.niveauBtn} ${niveau === 'classique' ? styles.niveauBtnActive : ''}`}
            onClick={() => handleNiveau('classique')}
          >
            ⚙️ Classique
          </button>
          <button
            className={`${styles.niveauBtn} ${niveau === 'avance' ? styles.niveauBtnActive : ''}`}
            onClick={() => handleNiveau('avance')}
          >
            🔬 Avancé
          </button>
        </div>
      </header>

      {/* ── Cartes de navigation ── */}
      <div className={styles.tabCards}>
        {(niveau === 'classique' ? CLASSIQUE : AVANCE).map(t => {
          const locked = t.key === 'droits' && !features.contratsAuteurs
          return (
            <button
              key={t.key}
              className={`${styles.tabCard} ${tab === t.key ? styles.tabCardActive : ''}`}
              onClick={() => !locked && setTab(t.key)}
              disabled={locked}
              title={locked ? "Les barèmes de droits d'auteur sont disponibles à partir du plan Edition." : undefined}
              style={locked ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
            >
              <span className={styles.tabCardEmoji}>{locked ? '🔒' : t.emoji}</span>
              <span className={styles.tabCardLabel}>{t.label}</span>
              <span className={styles.tabCardDesc}>{t.desc}</span>
            </button>
          )
        })}
      </div>

      <div className={styles.content}>

        {/* ── Rayons & Catégories ── */}
        {tab === 'rayons' && <RayonsSection />}

        {/* ── Barèmes DA ── */}
        {tab === 'droits' && !features.contratsAuteurs && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '48px 24px', textAlign: 'center' }}>
            <span style={{ fontSize: 36 }}>🔒</span>
            <p style={{ fontFamily: "'DM Serif Display',serif", fontSize: '1.1rem', color: 'var(--ink)', margin: 0 }}>Disponible à partir du plan Edition</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-soft)', maxWidth: 320, margin: 0, lineHeight: 1.6 }}>Les barèmes de droits d'auteur sont disponibles à partir du plan Edition.</p>
          </div>
        )}
        {tab === 'droits' && features.contratsAuteurs && <TypesDASection />}

        {/* ── Champs personnalisés ── */}
        {tab === 'champs' && (
          <>
            <nav className={styles.entityTabs}>
              {ENTITY_TABS.map(e => (
                <button
                  key={e.key}
                  className={`${styles.entityTab} ${scope.kind === 'entity' && scope.entityType === e.key ? styles.entityTabActive : ''}`}
                  onClick={() => setScope({ kind: 'entity', entityType: e.key })}
                >
                  {e.label}
                </button>
              ))}

              {rayons.length > 0 && <span className={styles.entityTabSep} />}

              {rayons.map(r => (
                <button
                  key={r.id}
                  className={`${styles.entityTab} ${styles.entityTabRayon} ${scope.kind === 'rayon' && scope.rayonId === r.id ? styles.entityTabActive : ''}`}
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

        {/* ── Paramètres fiscaux ── */}
        {tab === 'fiscal' && (
          <div className={styles.fiscalWrap}>
            {/* Franchise en base de TVA */}
            <div className={styles.fiscalCard}>
              <div className={styles.fiscalCardHeader}>
                <span className={styles.fiscalEmoji}>🧾</span>
                <div>
                  <h3 className={styles.fiscalTitle}>Régime fiscal de TVA</h3>
                  <p className={styles.fiscalSub}>
                    Définit comment la TVA est calculée sur vos ventes.
                  </p>
                </div>
              </div>

              <div className={styles.fiscalOptions}>
                {/* Option : assujetti TVA */}
                <label className={`${styles.fiscalOption} ${!tenant?.franchiseBaseVA ? styles.fiscalOptionActive : ''}`}>
                  <input
                    type="radio"
                    checked={!tenant?.franchiseBaseVA}
                    onChange={() => updateTenant.mutate({ franchiseBaseVA: false })}
                    className={styles.fiscalRadio}
                  />
                  <div>
                    <p className={styles.fiscalOptionTitle}>Assujetti à la TVA</p>
                    <p className={styles.fiscalOptionDesc}>
                      TVA collectée et reversée. Taux configurés par rayon (ex. 5,5 % livres, 20 % goodies).
                    </p>
                  </div>
                </label>

                {/* Option : franchise en base */}
                <label className={`${styles.fiscalOption} ${tenant?.franchiseBaseVA ? styles.fiscalOptionActive : ''}`}>
                  <input
                    type="radio"
                    checked={!!tenant?.franchiseBaseVA}
                    onChange={() => updateTenant.mutate({ franchiseBaseVA: true })}
                    className={styles.fiscalRadio}
                  />
                  <div>
                    <p className={styles.fiscalOptionTitle}>Franchise en base de TVA</p>
                    <p className={styles.fiscalOptionDesc}>
                      Micro-entreprise ou EI sous le seuil de franchise (art. 293 B CGI).
                      TVA non collectée — les prix HT = TTC, mention légale automatique.
                    </p>
                    {tenant?.franchiseBaseVA && (
                      <p className={styles.fiscalMention}>
                        Mention appliquée : <em>« TVA non applicable, art. 293 B du CGI »</em>
                      </p>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* Info taux TVA livres */}
            <div className={styles.fiscalInfo}>
              <span style={{ fontSize: '1.1rem' }}>📚</span>
              <div>
                <p className={styles.fiscalInfoTitle}>TVA livres : 5,5 %</p>
                <p className={styles.fiscalInfoDesc}>
                  Le taux réduit livres (5,5 %) est configuré automatiquement à la création d'un rayon Librairie.
                  Vous pouvez ajuster le taux de chaque rayon dans l'onglet <strong>Rayons & Catégories</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Thésaurus ── */}
        {tab === 'thesaurus' && <ThesaurusSection />}
      </div>
    </div>
  )
}
