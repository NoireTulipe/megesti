import { ExternalLink, ThumbsUp, ThumbsDown, Phone, Mail } from 'lucide-react'
import type { Imprimeur } from './hooks/useImprimeurs'
import styles from './ImprimeurCard.module.css'

interface Props {
  imprimeur: Imprimeur
  onEdit:    () => void
}

export function ImprimeurCard({ imprimeur, onEdit }: Props) {
  const { nom, lienCommande, pointsForts, pointsFaibles, noteLibre, contacts } = imprimeur

  return (
    <div className={styles.card}>
      {/* En-tête centré */}
      <div className={styles.hero}>
        <div className={styles.iconWrap}>
          <span style={{ fontSize: 22 }}>🖨️</span>
        </div>
        <h3 className={styles.nom}>{nom}</h3>
        {lienCommande && (
          <a
            href={lienCommande}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.lien}
            onClick={e => e.stopPropagation()}
          >
            Commander en ligne <ExternalLink size={11} />
          </a>
        )}
      </div>

      {/* Points forts / faibles côte à côte */}
      {(pointsForts.length > 0 || pointsFaibles.length > 0) && (
        <div className={styles.points}>
          {pointsForts.length > 0 && (
            <div className={styles.pointCol}>
              <span className={styles.pointLabel}>
                <ThumbsUp size={12} className={styles.pointIconGreen} /> Points forts
              </span>
              <div className={styles.pointList}>
                {pointsForts.map((p, i) => (
                  <span key={i} className={styles.pointTagGreen}>{p}</span>
                ))}
              </div>
            </div>
          )}
          {pointsFaibles.length > 0 && (
            <div className={styles.pointCol}>
              <span className={styles.pointLabel}>
                <ThumbsDown size={12} className={styles.pointIconRed} /> Points faibles
              </span>
              <div className={styles.pointList}>
                {pointsFaibles.map((p, i) => (
                  <span key={i} className={styles.pointTagRed}>{p}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Note libre */}
      {noteLibre && <p className={styles.note}>{noteLibre}</p>}

      {/* Contacts */}
      {contacts.length > 0 && (
        <div className={styles.contacts}>
          {contacts.map((c, i) => (
            <div key={i} className={styles.contact}>
              <span className={styles.contactName}>{c.prenom ? `${c.prenom} ${c.nom}` : c.nom}</span>
              {c.email && (
                <a href={`mailto:${c.email}`} className={styles.contactLink} onClick={e => e.stopPropagation()}>
                  <Mail size={11} /> {c.email}
                </a>
              )}
              {c.telephone && (
                <a href={`tel:${c.telephone}`} className={styles.contactLink} onClick={e => e.stopPropagation()}>
                  <Phone size={11} /> {c.telephone}
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      <button className={styles.editBtn} onClick={onEdit}>Modifier</button>
    </div>
  )
}
