import sty from '@/features/auteurs/AuteursPage.module.css'
import type { PointDeVente } from './hooks/usePointsDeVente'
import { inkGradient as cardGradient } from '@/lib/gradients'

interface Props {
  pdv:     PointDeVente
  onClick: () => void
}

export function PointDeVenteCard({ pdv, onClick }: Props) {
  const gradient   = cardGradient(pdv.nom)
  const commission = pdv.commissionPourcent
    ? `${Number(pdv.commissionPourcent)} %`
    : pdv.commissionFixe ? `${Number(pdv.commissionFixe).toFixed(2)} € fixe` : null

  return (
    <article
      className={sty['auteur-card']}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      <div className={sty['card-bg']} style={{
        background: `radial-gradient(ellipse at 80% 20%,${gradient.match(/#[A-Fa-f0-9]{6}/)?.[0] ?? '#3D5470'}18 0%,transparent 70%)`,
      }} />

      <div className={sty['card-avatar']} style={{ background: gradient, fontSize: '1.3rem' }}>
        🏪
      </div>

      <div className={sty['card-body']}>
        <div className={sty['card-nom']}>{pdv.nom}</div>
        {pdv.categorie && (
          <div className={sty['card-civil']}>{pdv.categorie.nom}</div>
        )}
        {pdv.salon && (
          <div className={sty['card-civil']}>Salon : {pdv.salon.nom}</div>
        )}
        <div className={sty['card-email']}>
          {pdv.encaissementDirect ? 'Encaissement direct' : 'Via caisse PDV'}
          {commission ? ` · ${commission}` : ''}
        </div>
        <div className={sty['card-pills']}>
          {pdv.contacts.length > 0 && (
            <span className={`${sty['card-pill']} ${sty['pill-contrats']}`}>
              {pdv.contacts.length} contact{pdv.contacts.length > 1 ? 's' : ''}
            </span>
          )}
          {commission && (
            <span className={`${sty['card-pill']} ${sty['pill-livres']}`}>
              Commission {commission}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
