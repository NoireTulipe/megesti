import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import styles from './RaccordementSection.module.css'

type PdpStatut = 'A_CONFIGURER' | 'DOSSIER_SOUMIS' | 'KYB_EN_COURS' | 'ACTIF'

interface Raccordement {
  pdpStatut:      PdpStatut
  pdpActivatedAt: string | null
  siret:          string | null
  pdpDossier: {
    representantPrenom: string
    representantNom:    string
    representantEmail:  string
    soumisAt:           string
    cniPurgeeAt:        string | null
  } | null
}

const ETAPES: { statut: PdpStatut; label: string }[] = [
  { statut: 'A_CONFIGURER',   label: 'Dossier à compléter' },
  { statut: 'DOSSIER_SOUMIS', label: 'Dossier transmis' },
  { statut: 'KYB_EN_COURS',   label: 'Vérification en cours' },
  { statut: 'ACTIF',          label: 'Facturation active' },
]

function useRaccordement() {
  return useQuery({
    queryKey: ['facturation', 'raccordement'],
    queryFn:  () => api.get<Raccordement>('/facturation/raccordement'),
  })
}

export function RaccordementSection() {
  const { data, isLoading } = useRaccordement()
  const qc = useQueryClient()

  const [form, setForm] = useState({ prenom: '', nom: '', email: '' })
  const [cniRecto, setCniRecto] = useState<File | null>(null)
  const [cniVerso, setCniVerso] = useState<File | null>(null)
  const [consentement, setConsentement] = useState(false)
  const [error, setError] = useState('')

  const soumettre = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append('representantPrenom', form.prenom)
      fd.append('representantNom',    form.nom)
      fd.append('representantEmail',  form.email)
      fd.append('consentement', String(consentement))
      if (cniRecto) fd.append('cniRecto', cniRecto)
      if (cniVerso) fd.append('cniVerso', cniVerso)
      return api.upload('/facturation/raccordement', fd)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facturation', 'raccordement'] })
      setError('')
      setCniRecto(null); setCniVerso(null); setConsentement(false)
    },
    onError: (e: Error) => setError(e.message),
  })

  if (isLoading || !data) return <p className={styles.loading}>Chargement…</p>

  const etapeIndex   = ETAPES.findIndex(e => e.statut === data.pdpStatut)
  const formOuvert   = data.pdpStatut === 'A_CONFIGURER' || data.pdpStatut === 'DOSSIER_SOUMIS'
  const formComplet  = form.prenom && form.nom && form.email && cniRecto && cniVerso && consentement

  return (
    <div className={styles.section}>

      {/* ── Barre de progression ── */}
      <div className={styles.steps}>
        {ETAPES.map((etape, i) => (
          <div key={etape.statut} className={styles.step}>
            <div className={`${styles.stepDot} ${i < etapeIndex ? styles.stepDone : ''} ${i === etapeIndex ? styles.stepCurrent : ''}`}>
              {i < etapeIndex ? '✓' : i + 1}
            </div>
            <span className={`${styles.stepLabel} ${i === etapeIndex ? styles.stepLabelCurrent : ''}`}>
              {etape.label}
            </span>
            {i < ETAPES.length - 1 && <div className={`${styles.stepBar} ${i < etapeIndex ? styles.stepBarDone : ''}`} />}
          </div>
        ))}
      </div>

      {/* ── État courant ── */}
      {data.pdpStatut === 'ACTIF' && (
        <div className={styles.stateOk}>
          <span className={styles.stateIcon}>✅</span>
          <div>
            <p className={styles.stateTitle}>Votre facturation électronique est active</p>
            <p className={styles.stateDesc}>
              Vous pouvez émettre et recevoir des factures électroniques
              {data.pdpActivatedAt && <> depuis le {new Date(data.pdpActivatedAt).toLocaleDateString('fr-FR')}</>}.
              {data.pdpDossier?.cniPurgeeAt && ' Votre pièce d\'identité a été définitivement supprimée de nos serveurs.'}
            </p>
          </div>
        </div>
      )}

      {data.pdpStatut === 'KYB_EN_COURS' && (
        <div className={styles.stateInfo}>
          <span className={styles.stateIcon}>🔎</span>
          <div>
            <p className={styles.stateTitle}>Vérification d'identité en cours</p>
            <p className={styles.stateDesc}>
              Votre dossier est en cours de traitement auprès de la Plateforme Agréée.
              Vous serez notifié dès l'activation — aucune action n'est requise de votre part.
            </p>
          </div>
        </div>
      )}

      {data.pdpStatut === 'DOSSIER_SOUMIS' && data.pdpDossier && (
        <div className={styles.stateInfo}>
          <span className={styles.stateIcon}>📬</span>
          <div>
            <p className={styles.stateTitle}>Dossier bien reçu</p>
            <p className={styles.stateDesc}>
              Transmis le {new Date(data.pdpDossier.soumisAt).toLocaleDateString('fr-FR')} pour{' '}
              {data.pdpDossier.representantPrenom} {data.pdpDossier.representantNom}.
              Besoin de corriger une information ? Soumettez simplement le formulaire à nouveau.
            </p>
          </div>
        </div>
      )}

      {/* ── Formulaire de raccordement ── */}
      {formOuvert && (
        <form
          className={styles.form}
          onSubmit={e => { e.preventDefault(); if (formComplet) soumettre.mutate() }}
        >
          <h4 className={styles.formTitle}>
            {data.pdpStatut === 'A_CONFIGURER' ? 'Demander le raccordement' : 'Corriger le dossier'}
          </h4>
          <p className={styles.formDesc}>
            Pour raccorder votre entreprise au réseau de facturation électronique (obligatoire
            dès septembre 2026), nous avons besoin de l'identité de votre représentant légal.
            Megesti s'occupe de toutes les démarches.
          </p>

          {!data.siret && (
            <div className={styles.warn}>
              ⚠️ Renseignez d'abord votre SIRET dans le bloc « Facturation électronique » ci-dessous.
            </div>
          )}

          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.label}>Prénom du représentant légal <span className={styles.req}>*</span></label>
              <input className={styles.input} value={form.prenom}
                onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Nom du représentant légal <span className={styles.req}>*</span></label>
              <input className={styles.input} value={form.nom}
                onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
            </div>
            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label className={styles.label}>E-mail du représentant légal <span className={styles.req}>*</span></label>
              <input className={styles.input} type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Pièce d'identité — recto <span className={styles.req}>*</span></label>
              <input className={styles.fileInput} type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={e => setCniRecto(e.target.files?.[0] ?? null)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Pièce d'identité — verso <span className={styles.req}>*</span></label>
              <input className={styles.fileInput} type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={e => setCniVerso(e.target.files?.[0] ?? null)} />
            </div>
          </div>

          <p className={styles.rgpd}>
            🔒 Votre pièce d'identité est chiffrée dès réception, accessible uniquement à
            l'équipe Megesti pour la vérification réglementaire, et <strong>définitivement
            supprimée</strong> une fois votre raccordement activé.
          </p>

          <label className={styles.consent}>
            <input type="checkbox" checked={consentement}
              onChange={e => setConsentement(e.target.checked)} />
            <span>
              Je certifie être le représentant légal de l'entreprise (ou dûment habilité) et je
              mandate Megesti pour procéder à son raccordement à une Plateforme Agréée
              immatriculée par la DGFiP (SUPER PDP) et gérer ses lignes d'annuaire, afin
              d'émettre et recevoir des factures électroniques. <span className={styles.req}>*</span>
            </span>
          </label>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.actions}>
            <button type="submit" className={styles.btnSubmit}
              disabled={!formComplet || soumettre.isPending}>
              {soumettre.isPending ? 'Envoi en cours…' : 'Transmettre mon dossier'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
