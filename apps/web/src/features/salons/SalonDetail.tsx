import { generateUUID } from '@/lib/utils'
import { useState } from 'react'
import type { Salon, ContactSalon, CreateSalonPayload } from './hooks/useSalons'
import { salonCA } from './hooks/useSalons'
import { useCreateSalon, useUpdateSalon } from './hooks/useSalons'
import { useTypesSalon, useCreateTypeSalon } from './hooks/useTypesSalon'
import styles from './SalonDetail.module.css'

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function toDateInput(iso: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

function formatDateFr(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// â”€â”€ Star rating â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function StarRating({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [hover, setHover] = useState<number | null>(null)
  const displayed = hover ?? value ?? 0
  return (
    <div className={styles.starsEdit}>
      {Array.from({ length: 5 }).map((_, i) => (
        <button
          key={i}
          type="button"
          className={`${styles.starBtn}${i < displayed ? ` ${styles.starBtnActive}` : ''}`}
          onMouseEnter={() => setHover(i + 1)}
          onMouseLeave={() => setHover(null)}
          onClick={() => onChange(i + 1 === value ? null : i + 1)}
          title={`${i + 1} Ã©toile${i > 0 ? 's' : ''}`}
        >
          â˜…
        </button>
      ))}
      {value !== null && (
        <button type="button" className={styles.starClear} onClick={() => onChange(null)} title="Supprimer la note">âœ•</button>
      )}
    </div>
  )
}

// â”€â”€ Type selector â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function TypeSelector({
  value, onChange,
}: {
  value: string | null
  onChange: (id: string | null) => void
}) {
  const [newLib, setNewLib] = useState('')
  const { data: types = [] } = useTypesSalon()
  const create = useCreateTypeSalon()

  async function handleCreate() {
    const lib = newLib.trim()
    if (!lib) return
    const t = await create.mutateAsync(lib)
    onChange(t.id)
    setNewLib('')
  }

  return (
    <div className={styles.typeRow}>
      <button
        type="button"
        className={`${styles.typeChip}${value === null ? ` ${styles.typeChipActive}` : ''}`}
        onClick={() => onChange(null)}
      >
        Aucun
      </button>
      {types.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`${styles.typeChip}${value === t.id ? ` ${styles.typeChipActive}` : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.libelle}
        </button>
      ))}
      <input
        className={styles.typeNewInput}
        placeholder="+ Nouveau type"
        value={newLib}
        onChange={(e) => setNewLib(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
      />
      {newLib.trim() && (
        <button type="button" className={styles.typeAddBtn} onClick={handleCreate}>
          {create.isPending ? 'â€¦' : 'Ajouter'}
        </button>
      )}
    </div>
  )
}

// â”€â”€ Draft contact â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface DraftContact {
  id:        string
  nom:       string
  prenom:    string
  email:     string
  telephone: string
}

function contactFromServer(c: ContactSalon): DraftContact {
  return { id: c.id, nom: c.nom, prenom: c.prenom ?? '', email: c.email ?? '', telephone: c.telephone ?? '' }
}

// â”€â”€ Panneau principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface Props {
  salon?:   Salon        // undefined = crÃ©ation
  onDone:   () => void
  onCancel: () => void
}

export function SalonDetail({ salon, onDone, onCancel }: Props) {
  const isEdit = Boolean(salon)
  const create = useCreateSalon()
  const update = useUpdateSalon()

  const [nom,               setNom]              = useState(salon?.nom               ?? '')
  const [avecPDV,           setAvecPDV]          = useState<boolean>(
    isEdit ? (salon?.pointDeVente?.actif ?? false) : true
  )
  const [typeSalonId,       setTypeSalonId]      = useState<string | null>(salon?.typeSalonId ?? null)
  const [dateDebut,         setDateDebut]        = useState(toDateInput(salon?.dateDebut ?? null))
  const [dateFin,           setDateFin]          = useState(toDateInput(salon?.dateFin ?? null))
  const [periodeHabituelle, setPeriodeHabituelle]= useState(salon?.periodeHabituelle ?? '')
  const [dureeJours,        setDureeJours]       = useState(String(salon?.dureeJours ?? ''))
  const [adresse,           setAdresse]          = useState(salon?.adresse ?? '')
  const [ville,             setVille]            = useState(salon?.ville ?? '')
  const [pays,              setPays]             = useState(salon?.pays ?? '')
  const [prixPrevuFixe,     setPrixPrevuFixe]    = useState(String(salon?.prixPrevuFixe ?? ''))
  const [prixPrevuPct,      setPrixPrevuPct]     = useState(String(salon?.prixPrevuPct  ?? ''))
  const [note,              setNote]             = useState<number | null>(salon?.note ?? null)
  const [commentaires,      setCommentaires]     = useState(salon?.commentaires ?? '')
  const [contacts, setContacts]                  = useState<DraftContact[]>(
    salon?.contacts.map(contactFromServer) ?? []
  )

  function addContact() {
    setContacts((cs) => [...cs, { id: generateUUID(), nom: '', prenom: '', email: '', telephone: '' }])
  }

  function updateContact(i: number, field: keyof DraftContact, val: string) {
    setContacts((cs) => cs.map((c, idx) => idx === i ? { ...c, [field]: val } : c))
  }

  function removeContact(i: number) {
    setContacts((cs) => cs.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    const payload: CreateSalonPayload = {
      id:                salon?.id ?? generateUUID(),
      nom,
      creerPointDeVente: avecPDV,
      typeSalonId:       typeSalonId ?? undefined,
      dateDebut:        dateDebut ? `${dateDebut}T00:00:00.000Z` : undefined,
      dateFin:          dateFin   ? `${dateFin}T00:00:00.000Z`   : undefined,
      periodeHabituelle: periodeHabituelle || undefined,
      dureeJours:       dureeJours ? Number(dureeJours) : undefined,
      adresse:          adresse  || undefined,
      ville:            ville    || undefined,
      pays:             pays     || undefined,
      prixPrevuFixe:    prixPrevuFixe ? Number(prixPrevuFixe) : undefined,
      prixPrevuPct:     prixPrevuPct  ? Number(prixPrevuPct)  : undefined,
      note:             note ?? undefined,
      commentaires:     commentaires || undefined,
      contacts:         contacts.filter((c) => c.nom.trim()).map((c) => ({
        id:        c.id,
        nom:       c.nom.trim(),
        prenom:    c.prenom.trim() || undefined,
        email:     c.email.trim()  || undefined,
        telephone: c.telephone.trim() || undefined,
      })),
    }
    if (isEdit && salon) {
      await update.mutateAsync({ id: salon.id, ...payload })
    } else {
      await create.mutateAsync(payload)
    }
    onDone()
  }

  const ca = salon ? salonCA(salon) : 0
  const isSaving = create.isPending || update.isPending
  const canSave  = nom.trim().length > 0

  return (
    <div className={styles.panel}>
      {/* â”€â”€ Header â”€â”€ */}
      <div className={styles.panelHeader}>
        <h2 className={styles.panelNom}>{nom || 'Nouveau salon'}</h2>
        <div className={styles.panelMeta}>
          {salon?.typeSalon && <span className={`${styles.badge} ${styles.badgeType}`}>{salon.typeSalon.libelle}</span>}
          {periodeHabituelle && <span className={`${styles.badge} ${styles.badgePeriode}`}>{periodeHabituelle}</span>}
          {dateDebut && <span style={{ fontSize: '0.78rem', color: 'var(--text-soft)' }}>{formatDateFr(dateDebut ? `${dateDebut}T00:00:00Z` : null)}</span>}
        </div>
      </div>

      {/* â”€â”€ BanniÃ¨re CA (mode Ã©dition uniquement) â”€â”€ */}
      {isEdit && (
        <div className={styles.caBanner}>
          <div>
            <div className={styles.caMain}>{ca.toFixed(2)} â‚¬</div>
            <div className={styles.caSub}>CA total sur {salon!.sessions.length} session{salon!.sessions.length > 1 ? 's' : ''}</div>
          </div>
        </div>
      )}

      {/* â”€â”€ Corps scrollable â”€â”€ */}
      <div className={styles.body}>

        {/* Infos gÃ©nÃ©rales */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Informations gÃ©nÃ©rales</h3>
          <div className={styles.field}>
            <label className={styles.label}>Nom du salon *</label>
            <input className={styles.input} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="ex. Salon du livre de Paris" autoFocus />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Type</label>
            <TypeSelector value={typeSalonId} onChange={setTypeSalonId} />
          </div>

          {/* Case PDV miroir */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={avecPDV}
              onChange={(e) => setAvecPDV(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--ink)', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.85rem', color: 'var(--ink)' }}>
              Utiliser ce salon comme point de vente
            </span>
            {isEdit && salon?.pointDeVente && (
              <span style={{
                fontSize: '0.7rem', padding: '2px 8px', borderRadius: 20,
                background: avecPDV ? 'rgba(16,185,129,0.12)' : 'var(--ink-faint)',
                color: avecPDV ? '#065F46' : 'var(--text-soft)',
              }}>
                {avecPDV ? 'Actif' : 'DÃ©sactivÃ©'}
              </span>
            )}
          </label>
          {avecPDV && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-soft)', margin: '0 0 0 26px' }}>
              Un point de vente Â« {nom || 'ce salon'} Â» sera disponible Ã  l'ouverture des sessions de caisse.
              Les ventes seront automatiquement liÃ©es Ã  ce salon.
            </p>
          )}
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.label}>PÃ©riode habituelle</label>
              <input className={styles.input} value={periodeHabituelle} onChange={(e) => setPeriodeHabituelle(e.target.value)} placeholder="ex. Printemps" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>DurÃ©e (jours)</label>
              <input className={styles.input} type="number" min={1} value={dureeJours} onChange={(e) => setDureeJours(e.target.value)} placeholder="3" />
            </div>
          </div>
        </section>

        {/* Dates */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Dates du prochain salon</h3>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.label}>Date de dÃ©but</label>
              <input className={styles.input} type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Date de fin</label>
              <input className={styles.input} type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
            </div>
          </div>
        </section>

        {/* Lieu */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Lieu</h3>
          <div className={styles.field}>
            <label className={styles.label}>Adresse</label>
            <input className={styles.input} value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="Rue, numÃ©roâ€¦" />
          </div>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.label}>Ville</label>
              <input className={styles.input} value={ville} onChange={(e) => setVille(e.target.value)} placeholder="Paris" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Pays</label>
              <input className={styles.input} value={pays} onChange={(e) => setPays(e.target.value)} placeholder="France" />
            </div>
          </div>
        </section>

        {/* Finances */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Finances</h3>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.label}>Participation fixe (â‚¬)</label>
              <input className={styles.input} type="number" min={0} step={0.01} value={prixPrevuFixe} onChange={(e) => setPrixPrevuFixe(e.target.value)} placeholder="0.00" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Commission lieu (%)</label>
              <input className={styles.input} type="number" min={0} max={100} step={0.5} value={prixPrevuPct} onChange={(e) => setPrixPrevuPct(e.target.value)} placeholder="0" />
            </div>
          </div>
        </section>

        {/* Contacts */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Contacts</h3>
          <div className={styles.contactList}>
            {contacts.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '8px', padding: '0 12px', marginBottom: -4 }}>
                {['Nom *', 'PrÃ©nom', 'Email', 'TÃ©lÃ©phone', ''].map((h) => (
                  <span key={h} style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-soft)' }}>{h}</span>
                ))}
              </div>
            )}
            {contacts.map((c, i) => (
              <div key={c.id} className={styles.contactRow}>
                <input className={styles.contactInput} value={c.nom}       onChange={(e) => updateContact(i, 'nom',       e.target.value)} placeholder="Nom" />
                <input className={styles.contactInput} value={c.prenom}    onChange={(e) => updateContact(i, 'prenom',    e.target.value)} placeholder="PrÃ©nom" />
                <input className={styles.contactInput} value={c.email}     onChange={(e) => updateContact(i, 'email',     e.target.value)} placeholder="email@â€¦" />
                <input className={styles.contactInput} value={c.telephone} onChange={(e) => updateContact(i, 'telephone', e.target.value)} placeholder="06â€¦" />
                <button className={styles.btnRemoveContact} onClick={() => removeContact(i)} title="Supprimer">Ã—</button>
              </div>
            ))}
          </div>
          <button className={styles.btnAddContact} onClick={addContact}>+ Ajouter un contact</button>
        </section>

        {/* Note & commentaires */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Note & commentaires</h3>
          <div className={styles.field}>
            <label className={styles.label}>Note globale</label>
            <StarRating value={note} onChange={setNote} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Commentaires</label>
            <textarea className={styles.textarea} value={commentaires} onChange={(e) => setCommentaires(e.target.value)} placeholder="Observations, points Ã  amÃ©liorer, anecdotesâ€¦" />
          </div>
        </section>

        {/* Historique CA (lecture seule) */}
        {isEdit && salon!.sessions.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Historique des sessions</h3>
            <div className={styles.sessionList}>
              {salon!.sessions.map((s) => {
                const sessionCA = s.ventes.filter((v) => v.statut === 'VALIDEE').reduce((sum, v) => sum + Number(v.totalTTC), 0)
                return (
                  <div key={s.id} className={styles.sessionRow}>
                    <div>
                      <span className={styles.sessionNom}>Session</span>
                      <span className={styles.sessionDate}> Â· {s.statut === 'FERMEE' ? 'ClÃ´turÃ©e' : 'En cours'}</span>
                    </div>
                    <span className={styles.sessionCA}>{sessionCA.toFixed(2)} â‚¬</span>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>

      {/* â”€â”€ Footer â”€â”€ */}
      <div className={styles.footer}>
        <button className={styles.btnCancel} onClick={onCancel}>Annuler</button>
        <button className={styles.btnSave} disabled={!canSave || isSaving} onClick={handleSave}>
          {isSaving ? 'Enregistrementâ€¦' : isEdit ? 'Enregistrer' : 'CrÃ©er le salon'}
        </button>
      </div>
    </div>
  )
}




