import sty from '@/features/auteurs/AuteursPage.module.css'
import type { DepotLibraireList } from './hooks/useDepotsLibraires'
import { sageGradient as cardGradient } from '@/lib/gradients'

interface Props {
  depot:   DepotLibraireList
  onClick: () => void
}

export function DepotLibraireCard({ depot, onClick }: Props) {
  const gradient     = cardGradient(depot.nom)
  const nbContacts   = depot.contacts.length
  const nbArticles   = depot.articles.reduce((s, a) => s + (a.quantiteEnvoyee - a.quantiteVendue), 0)
  const commission   = depot.commissionPourcent
    ? `${Number(depot.commissionPourcent)} %`
    : depot.commissionFixe ? `${Number(depot.commissionFixe).toFixed(2)} € fixe` : null

  return (
    <article
      className={sty['auteur-card']}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      <div className={sty['card-bg']} style={{
        background: `radial-gradient(ellipse at 80% 20%,${gradient.match(/#[A-Fa-f0-9]{6}/)?.[0] ?? '#6B8F71'}18 0%,transparent 70%)`,
      }} />

      <div className={sty['card-avatar']} style={{ background: gradient, fontSize: '1.3rem' }}>
        📦
      </div>

      <div className={sty['card-body']}>
        <div className={sty['card-nom']}>{depot.nom}</div>
        {depot.adresse && (
          <div className={sty['card-civil']}>{depot.adresse}</div>
        )}
        {commission && (
          <div className={sty['card-email']}>Commission {commission}</div>
        )}
        <div className={sty['card-pills']}>
          {nbContacts > 0 && (
            <span className={`${sty['card-pill']} ${sty['pill-contrats']}`}>
              {nbContacts} contact{nbContacts > 1 ? 's' : ''}
            </span>
          )}
          {nbArticles > 0 && (
            <span className={`${sty['card-pill']} ${sty['pill-livres']}`}>
              {nbArticles} ex. en dépôt
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
