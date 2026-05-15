import { type ReactNode } from 'react'
import styles from './PageHero.module.css'

interface PageHeroProps {
  title: string
  subtitle?: ReactNode
  /** Contenu à droite du titre (selecteurs, boutons, badges…) */
  children?: ReactNode
  /** Contenu additionnel sous la rangée titre (dates custom, métriques, filtres…) */
  extra?: ReactNode
}

export function PageHero({ title, subtitle, children, extra }: PageHeroProps) {
  return (
    <header className={styles.hero}>
      <div className={styles.heroBlob} aria-hidden="true" />
      <div className={styles.heroContent}>
        <div>
          <h1 className={styles.heroTitle}>{title}</h1>
          {subtitle && <p className={styles.heroSub}>{subtitle}</p>}
        </div>
        {children && <div className={styles.heroActions}>{children}</div>}
      </div>
      {extra}
    </header>
  )
}
