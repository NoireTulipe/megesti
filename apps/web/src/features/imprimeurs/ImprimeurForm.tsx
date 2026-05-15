import { generateUUID } from '@/lib/utils'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X, ExternalLink } from 'lucide-react'
import { useCreateImprimeur, useUpdateImprimeur } from './hooks/useImprimeurs'
import type { Imprimeur } from './hooks/useImprimeurs'
import styles from '@/styles/entityForm.module.css'
import fStyles from './ImprimeurForm.module.css'

const contactSchema = z.object({
  nom:       z.string().min(1, 'Requis'),
  prenom:    z.string().optional(),
  email:     z.string().email('Email invalide').optional().or(z.literal('')),
  telephone: z.string().optional(),
})

const schema = z.object({
  nom:          z.string().min(1, 'Requis'),
  lienCommande: z.string().url('URL invalide').optional().or(z.literal('')),
  noteLibre:    z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface ContactRow { nom: string; prenom: string; email: string; telephone: string }
interface PointRow   { value: string }

interface Props {
  onClose:    () => void
  imprimeur?: Imprimeur
}

export function ImprimeurForm({ onClose, imprimeur }: Props) {
  const isEdit = Boolean(imprimeur)
  const create = useCreateImprimeur()
  const update = useUpdateImprimeur()

  const [contacts,  setContacts]  = useState<ContactRow[]>(
    imprimeur?.contacts.map(c => ({
      nom: c.nom, prenom: c.prenom ?? '', email: c.email ?? '', telephone: c.telephone ?? '',
    })) ?? []
  )
  const [forts,   setForts]   = useState<PointRow[]>(
    (imprimeur?.pointsForts  ?? []).map(v => ({ value: v }))
  )
  const [faibles, setFaibles] = useState<PointRow[]>(
    (imprimeur?.pointsFaibles ?? []).map(v => ({ value: v }))
  )

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nom:          imprimeur?.nom          ?? '',
      lienCommande: imprimeur?.lienCommande ?? '',
      noteLibre:    imprimeur?.noteLibre    ?? '',
    },
  })

  async function onSubmit(values: FormValues) {
    const payload = {
      nom:           values.nom,
      lienCommande:  values.lienCommande || null,
      noteLibre:     values.noteLibre    || null,
      pointsForts:   forts.map(r => r.value).filter(Boolean),
      pointsFaibles: faibles.map(r => r.value).filter(Boolean),
      contacts: contacts
        .filter(c => c.nom.trim())
        .map(({ nom, prenom, email, telephone }) => ({
          nom,
          prenom:    prenom    || null,
          email:     email     || null,
          telephone: telephone || null,
        })),
    }
    if (isEdit) {
      await update.mutateAsync({ id: imprimeur!.id, ...payload })
    } else {
      await create.mutateAsync({ id: generateUUID(), ...payload })
    }
    onClose()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>

      {/* Infos générales */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>Identification</p>
        <div className={styles.field}>
          <label className={styles.label}>Nom <span className={styles.req}>*</span></label>
          <input className={`${styles.input} ${errors.nom ? styles.inputError : ''}`} {...register('nom')} autoFocus />
          {errors.nom && <span className={styles.error}>{errors.nom.message}</span>}
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Lien commande en ligne</label>
          <div className={fStyles.urlField}>
            <input className={`${styles.input} ${errors.lienCommande ? styles.inputError : ''}`} {...register('lienCommande')} placeholder="https://…" />
            <ExternalLink size={14} className={fStyles.urlIcon} />
          </div>
          {errors.lienCommande && <span className={styles.error}>{errors.lienCommande.message}</span>}
        </div>
      </div>

      {/* Points forts / faibles */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>…</p>
        <div className={fStyles.pointsGrid}>
          <PointList
            label="Points forts"
            color="#22c55e"
            items={forts}
            onChange={setForts}
            placeholder="Ex : délais rapides"
          />
          <PointList
            label="Points faibles"
            color="#ef4444"
            items={faibles}
            onChange={setFaibles}
            placeholder="Ex : tarifs élevés"
          />
        </div>
        <div className={styles.field} style={{ marginTop: 12 }}>
          <label className={styles.label}>Note libre</label>
          <textarea className={styles.textarea} rows={3} {...register('noteLibre')} placeholder="Observations, conditions tarifaires…" />
        </div>
      </div>

      {/* Contacts */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>Contacts</p>
        {contacts.map((c, i) => (
          <ContactRow key={i} contact={c} onChange={updated => setContacts(prev => prev.map((x, j) => j === i ? updated : x))} onRemove={() => setContacts(prev => prev.filter((_, j) => j !== i))} />
        ))}
        <button
          type="button"
          className={fStyles.addBtn}
          onClick={() => setContacts(prev => [...prev, { nom: '', prenom: '', email: '', telephone: '' }])}
        >
          <Plus size={13} /> Ajouter un contact
        </button>
      </div>

      {(create.isError || update.isError) && (
        <p className={styles.errorGlobal}>Une erreur est survenue. Veuillez réessayer.</p>
      )}

      <div className={styles.actions}>
        <button type="button" className={styles.btnSecondary} onClick={onClose}>Annuler</button>
        <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
          {isSubmitting ? 'Enregistrement…' : isEdit ? 'Enregistrer' : "Créer l'imprimeur"}
        </button>
      </div>
    </form>
  )
}

// •"?•"? Sous-composants •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?

function PointList({ label, color, items, onChange, placeholder }: {
  label: string; color: string; items: PointRow[]; onChange: (rows: PointRow[]) => void; placeholder: string
}) {
  return (
    <div className={fStyles.pointList}>
      <div className={fStyles.pointListHeader} style={{ color }}>
        <span className={fStyles.pointDot} style={{ background: color }} />
        {label}
      </div>
      {items.map((row, i) => (
        <div key={i} className={fStyles.pointRow}>
          <input
            className={fStyles.pointInput}
            value={row.value}
            onChange={e => onChange(items.map((x, j) => j === i ? { value: e.target.value } : x))}
            placeholder={placeholder}
          />
          <button
            type="button"
            className={fStyles.removeBtn}
            onClick={() => onChange(items.filter((_, j) => j !== i))}
          >
            <X size={12} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className={fStyles.addSmallBtn}
        onClick={() => onChange([...items, { value: '' }])}
      >
        <Plus size={11} /> Ajouter
      </button>
    </div>
  )
}

function ContactRow({ contact, onChange, onRemove }: {
  contact: ContactRow; onChange: (c: ContactRow) => void; onRemove: () => void
}) {
  const upd = (key: keyof ContactRow) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...contact, [key]: e.target.value })

  return (
    <div className={fStyles.contactCard}>
      <div className={fStyles.contactGrid}>
        <input className={fStyles.contactInput} placeholder="Nom *" value={contact.nom} onChange={upd('nom')} />
        <input className={fStyles.contactInput} placeholder="Prénom" value={contact.prenom} onChange={upd('prenom')} />
        <input className={fStyles.contactInput} placeholder="Email" type="email" value={contact.email} onChange={upd('email')} />
        <input className={fStyles.contactInput} placeholder="Téléphone" value={contact.telephone} onChange={upd('telephone')} />
      </div>
      <button type="button" className={fStyles.removeContactBtn} onClick={onRemove}>
        <X size={13} />
      </button>
    </div>
  )
}




