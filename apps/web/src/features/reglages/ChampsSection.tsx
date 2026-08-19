import { useState } from 'react'
import { useCustomFields, useDeleteCustomField } from './hooks/useCustomFields'
import { ChampForm } from './ChampForm'
import { Modal } from '@/components/ui/Modal'
import { ENTITY_TYPES } from '@megesti/shared'
import type { EntityType } from '@megesti/shared'
import styles from './ChampsSection.module.css'

const ENTITY_LABELS: Record<EntityType, string> = {
  auteur:        'Auteur',
  maisonEdition: 'Maison d\'édition',
  depotLibraire: 'Dépôt libraire',
  salon:         'Salon',
  pointDeVente:  'Point de vente',
}

const FIELD_TYPE_LABELS: Record<string, string> = {
  text:      'Texte court',
  textarea:  'Texte long',
  number:    'Nombre',
  date:      'Date',
  boolean:   'Case à cocher',
  select:    'Liste déroulante',
  thesaurus: 'Thésaurus',
}

const FIELD_TYPE_COLORS: Record<string, string> = {
  text:      '#E8EEF5',
  textarea:  '#E8EEF5',
  number:    '#FBF3E4',
  date:      '#E8F3EB',
  boolean:   '#FDEEE9',
  select:    '#F3E8F5',
  thesaurus: '#FBF3E4',
}

export function ChampsSection() {
  const [entityType, setEntityType] = useState<EntityType>('auteur')
  const [showModal, setShowModal]   = useState(false)

  const { data: champs = [], isLoading } = useCustomFields(entityType)
  const deleteChamp = useDeleteCustomField()

  return (
    <div className={styles.section}>
      {/* Sélecteur entité */}
      <div className={styles.entityTabs}>
        {ENTITY_TYPES.map((et) => (
          <button
            key={et}
            className={`${styles.entityTab} ${entityType === et ? styles.entityTabActive : ''}`}
            onClick={() => setEntityType(et)}
          >
            {ENTITY_LABELS[et]}
          </button>
        ))}
      </div>

      <div className={styles.toolbar}>
        <p className={styles.desc}>
          Champs supplémentaires affichés sur les fiches <strong>{ENTITY_LABELS[entityType]}</strong>.
        </p>
        <button className={styles.btnAdd} onClick={() => setShowModal(true)}>
          + Nouveau champ
        </button>
      </div>

      {isLoading && <div className={styles.loading}>Chargement…</div>}

      {!isLoading && champs.length === 0 && (
        <div className={styles.empty}>
          <p>Aucun champ personnalisé pour les {ENTITY_LABELS[entityType].toLowerCase()}s.</p>
          <button className={styles.btnEmptyAdd} onClick={() => setShowModal(true)}>
            Créer le premier champ
          </button>
        </div>
      )}

      {champs.length > 0 && (
        <div className={styles.list}>
          {champs.map((champ) => (
            <div key={champ.id} className={styles.row}>
              <span
                className={styles.typeBadge}
                style={{ background: FIELD_TYPE_COLORS[champ.fieldType] ?? '#F5F5F5' }}
              >
                {FIELD_TYPE_LABELS[champ.fieldType] ?? champ.fieldType}
              </span>
              <div className={styles.rowInfo}>
                <span className={styles.rowLabel}>{champ.labelFr}</span>
                {champ.labelEn && <span className={styles.rowLabelEn}>{champ.labelEn}</span>}
              </div>
              {champ.required && <span className={styles.reqBadge}>Requis</span>}
              <button
                className={styles.btnDelete}
                onClick={() => deleteChamp.mutate(champ.id)}
                aria-label="Supprimer"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Nouveau champ"
        subtitle={`Champ personnalisé pour les fiches ${ENTITY_LABELS[entityType]}`}
        size="md"
      >
        <ChampForm entityType={entityType} onClose={() => setShowModal(false)} />
      </Modal>
    </div>
  )
}
