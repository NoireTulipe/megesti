import type { Salon } from './hooks/useSalons'
import { salonCA } from './hooks/useSalons'
import styles from './SalonCard.module.css'

function Stars({ note }: { note: number | null }) {
  if (note === null) return null
  return (
    <span className={styles.stars}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`${styles.star}${i >= note ? ` ${styles.starEmpty}` : ''}`}>★</span>
      ))}
    </span>
  )
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface Props {
  salon:    Salon
  active:   boolean
  onSelect: () => void
  onEdit:   (e: React.MouseEvent) => void
}

export function SalonCard({ salon, active, onSelect, onEdit }: Props) {
  const ca = salonCA(salon)
  const dateDebut = formatDate(salon.dateDebut)
  const dateFin   = formatDate(salon.dateFin)
  const dateLine  = dateFin ? `${dateDebut} → ${dateFin}` : dateDebut

  return (
    <div
      className={`${styles.card}${active ? ` ${styles.cardActive}` : ''}`}
      onClick={onSelect}
    >
      <div className={styles.main}>
        <div className={styles.topRow}>
          <h3 className={styles.nom}>{salon.nom}</h3>
          {salon.typeSalon && (
            <span className={styles.typeBadge}>{salon.typeSalon.libelle}</span>
          )}
          <Stars note={salon.note} />
        </div>

        <div className={styles.meta}>
          {dateLine && (
            <span className={styles.metaItem}>
              <span className={styles.metaIcon}>📅</span>
              {dateLine}
              {salon.periodeHabituelle && ` · ${salon.periodeHabituelle}`}
            </span>
          )}
          {(salon.ville || salon.pays) && (
            <span className={styles.metaItem}>
              <span className={styles.metaIcon}>📍</span>
              {[salon.ville, salon.pays].filter(Boolean).join(', ')}
            </span>
          )}
          {salon.prixPrevuPct && (
            <span className={styles.metaItem}>
              <span className={styles.metaIcon}>💸</span>
              Commission {Number(salon.prixPrevuPct).toFixed(0)} %
            </span>
          )}
        </div>
      </div>

      <div className={styles.aside}>
        <span className={`${styles.caBadge}${ca === 0 ? ` ${styles.caBadgeZero}` : ''}`}>
          {ca === 0 ? 'Pas encore de CA' : `${ca.toFixed(2)} €`}
        </span>
        {salon.contacts.length > 0 && (
          <span className={styles.contactCount}>
            {salon.contacts.length} contact{salon.contacts.length > 1 ? 's' : ''}
          </span>
        )}
        <button
          className={styles.editBtn}
          onClick={onEdit}
        >
          ✎ Modifier
        </button>
      </div>
    </div>
  )
}
