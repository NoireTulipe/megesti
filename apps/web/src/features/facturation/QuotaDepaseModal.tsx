import { createPortal } from 'react-dom'
import { usePacks, useCheckout } from './hooks/useFacturation'
import styles from './QuotaDepaseModal.module.css'

interface Props { onClose: () => void }

export function QuotaDepaseModal({ onClose }: Props) {
  const { data: packs = [] } = usePacks()
  const checkout             = useCheckout()

  const dialog = (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.accent} />

        <div className={styles.body}>
          {/* Magestine */}
          <img src="/img/mascotte/m1.png" alt="" className={styles.mascotImg} />

          <div className={styles.content}>
            <h2 className={styles.title}>Notre facturier est vide !</h2>
            <p className={styles.sub}>
              Vous avez utilisé toutes vos factures du mois.
              Rechargez en un clic pour continuer à émettre.
            </p>

            {/* Packs */}
            <div className={styles.packs}>
              {packs.map(pack => (
                <button
                  key={pack.id}
                  className={styles.packCard}
                  onClick={() => checkout.mutate(pack.id)}
                  disabled={checkout.isPending}
                >
                  <span className={styles.packCredits}>{pack.credits}</span>
                  <span className={styles.packLabel}>crédits</span>
                  <span className={styles.packPrice}>{pack.prixEuros.toFixed(2)} €</span>
                  <span className={styles.packUnit}>
                    soit {(pack.prixEuros / pack.credits * 100).toFixed(1)} cts/facture
                  </span>
                </button>
              ))}
            </div>

            <p className={styles.hint}>
              Rechargement immédiat · Facturation sécurisée via Stripe
            </p>

            <button className={styles.btnCancel} onClick={onClose}>
              Pas maintenant
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(dialog, document.body)
}
