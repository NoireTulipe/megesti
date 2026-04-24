import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateAuteur } from './hooks/useAuteurs'
import styles from './AuteurForm.module.css'

const schema = z.object({
  prenom:     z.string().min(1, 'Requis'),
  nom:        z.string().min(1, 'Requis'),
  pseudonyme: z.string().optional(),
  email:      z.string().email('Email invalide').optional().or(z.literal('')),
  bio:        z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  onClose: () => void
}

export function AuteurForm({ onClose }: Props) {
  const createAuteur = useCreateAuteur()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(values: FormValues) {
    await createAuteur.mutateAsync({
      id:         crypto.randomUUID(),
      prenom:     values.prenom,
      nom:        values.nom,
      pseudonyme: values.pseudonyme || undefined,
      email:      values.email     || undefined,
      bio:        values.bio       || undefined,
    })
    onClose()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>Prénom *</label>
          <input className={styles.input} {...register('prenom')} />
          {errors.prenom && <span className={styles.error}>{errors.prenom.message}</span>}
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Nom *</label>
          <input className={styles.input} {...register('nom')} />
          {errors.nom && <span className={styles.error}>{errors.nom.message}</span>}
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Pseudonyme</label>
        <input className={styles.input} {...register('pseudonyme')} placeholder="Optionnel" />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Email</label>
        <input className={styles.input} type="email" {...register('email')} placeholder="Optionnel" />
        {errors.email && <span className={styles.error}>{errors.email.message}</span>}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Biographie</label>
        <textarea className={styles.textarea} rows={4} {...register('bio')} placeholder="Quelques mots sur l'auteur·ice…" />
      </div>

      {createAuteur.isError && (
        <p className={styles.errorGlobal}>Erreur lors de la création. Réessayez.</p>
      )}

      <div className={styles.actions}>
        <button type="button" className={styles.btnSecondary} onClick={onClose}>Annuler</button>
        <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
          {isSubmitting ? 'Enregistrement…' : 'Créer l\'auteur·ice'}
        </button>
      </div>
    </form>
  )
}
