import type { Salon } from './hooks/useSalons'
import { salonCA } from './hooks/useSalons'
import styles from './SalonCard.module.css'

function avatarEmoji(type: string | null) {
  const map: Record<string, string> = { 'Salon': '📚', 'Festival': '🎪', 'Marché': '🏪', 'Dédicace': '✍️', 'Atelier': '🎨' }
  return map[type ?? ''] ?? '🎪'
}

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
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

interface Props {
  salon:   Salon
  active:  boolean
  onClick: () => void
}

export function SalonCard({ salon, active, onClick }: Props) {
  const ca = salonCA(salon)
  const dateDebut = formatDate(salon.dateDebut)
  const dateFin   = formatDate(salon.dateFin)

  // Date passée ou future ?
  const aujourdhui = new Date()
  aujourdhui.setHours(0, 0, 0, 0)
  const dateFinObj = salon.dateFin ? new Date(salon.dateFin) : null
  const estPassee = dateFinObj ? dateFinObj < aujourdhui : salon.dateDebut ? new Date(salon.dateDebut) < aujourdhui : false

  const dateLabel = estPassee ? 'Dernière édition' : 'Prochaine édition'
  const dateLine  = dateFin ? `${dateDebut} → ${dateFin}` : (dateDebut || null)

  return (
    <div
      className={`${styles.card}${active ? ` ${styles.cardActive}` : ''}`}
      onClick={onClick}
    >
      <div className={styles.avatar}>{avatarEmoji(salon.typeSalon?.libelle ?? null)}</div>

      <div className={styles.main}>
        <div className={styles.topRow}>
          <h3 className={styles.nom}>{salon.nom}</h3>
          {salon.typeSalon && (
            <span className={styles.typeBadge}>{salon.typeSalon.libelle}</span>
          )}
          <Stars note={salon.note} />
        </div>

        <div className={styles.meta}>
          {/* Période habituelle */}
          {salon.periodeHabituelle && (
            <span className={styles.metaPeriod}>{salon.periodeHabituelle}</span>
          )}

          {/* Date */}
          {dateLine && (
            <span className={styles.metaDate}>
              <span className={styles.metaLabel}>{dateLabel}</span>
              <span className={styles.metaSep}>·</span>
              {dateLine}
            </span>
          )}

          {/* Lieu */}
          {(salon.ville || salon.pays) && (
            <span className={styles.metaLoc}>
              <span className={styles.metaIcon}>📍</span>
              {[salon.ville, salon.pays].filter(Boolean).join(', ')}
            </span>
          )}

          {/* Commission */}
          {salon.prixPrevuPct != null && Number(salon.prixPrevuPct) > 0 && (
            <span className={styles.metaLoc}>
              <span className={styles.metaIcon}>💸</span>
              Commission {Number(salon.prixPrevuPct).toFixed(0)}%
            </span>
          )}
        </div>
      </div>

      <div className={styles.aside}>
        <span className={`${styles.caBadge}${ca === 0 ? ` ${styles.caBadgeZero}` : ''}`}>
          {ca === 0 ? '—' : `${ca.toFixed(2)} €`}
        </span>
        {salon.contacts.length > 0 && (
          <span className={styles.contactCount}>
            {salon.contacts.length} contact{salon.contacts.length > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  )
}
