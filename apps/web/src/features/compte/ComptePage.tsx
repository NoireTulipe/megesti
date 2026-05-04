import { useState } from 'react'
import { useMonTenant, useUpdateMonTenant } from '@/features/reglages/hooks/useMonTenant'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import styles from './ComptePage.module.css'

type Tab = 'profil' | 'contacts' | 'abonnement'

const PLAN_LABELS: Record<string, string> = {
  TRIAL:        'Essai gratuit',
  AUTEUR:       'Auteur',
  EDITEUR:      'Éditeur',
  EDITEUR_PLUS: 'Éditeur + salon',
}

interface ContactDraft {
  id: string
  nom: string
  prenom: string
  email: string
  telephone: string
  fonction: string
  isOwner?: boolean
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

async function patchMe(data: { firstName?: string; lastName?: string; email?: string }) {
  return api.patch('/auth/me', data)
}

async function changePassword(current: string, newPass: string) {
  return api.patch('/auth/password', { current, new: newPass })
}

// ── Page ────────────────────────────────────────────────────────────────────────

export function ComptePage() {
  const [tab, setTab] = useState<Tab>('profil')
  const { data: tenant, isLoading } = useMonTenant()
  const updateTenant = useUpdateMonTenant()
  const user = useAuthStore(s => s.user)

  if (isLoading) return <div className={styles.loading}>Chargement…</div>
  if (!tenant) return null

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Compte</h1>
          <p className={styles.pageSubtitle}>{tenant.name}</p>
        </div>
      </header>

      <div className={styles.tabBar}>
        {([
          ['profil', (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          ), 'Profil'],
          ['contacts', (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          ), 'Contacts'],
          ['abonnement', (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/>
              <line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
              <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
            </svg>
          ), 'Abonnement'],
        ] as [Tab, JSX.Element, string][]).map(([key, icon, label]) => (
          <button
            key={key}
            className={`${styles.tabBtn} ${tab === key ? styles.tabBtnActive : ''}`}
            onClick={() => setTab(key)}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      <div className={styles.body}>
        {tab === 'profil'     && <OngletProfil     tenant={tenant} updateTenant={updateTenant} />}
        {tab === 'contacts'   && <OngletContacts   user={user} />}
        {tab === 'abonnement' && <OngletAbonnement tenant={tenant} />}
      </div>
    </div>
  )
}

// ── Onglet Profil ───────────────────────────────────────────────────────────────

function OngletProfil({ tenant, updateTenant }: {
  tenant: NonNullable<ReturnType<typeof useMonTenant>['data']>
  updateTenant: ReturnType<typeof useUpdateMonTenant>
}) {
  const [name, setName]         = useState(tenant.name)
  const [siteWeb, setSiteWeb]   = useState(tenant.siteWeb ?? '')
  const [presentation, setPres] = useState(tenant.presentation ?? '')
  const [logoUrl, setLogoUrl]   = useState(tenant.logo ?? '')
  const [nameSaved, setNameSaved]     = useState(false)
  const [siteSaved, setSiteSaved]     = useState(false)
  const [presSaved, setPresSaved]     = useState(false)
  const [logoSaved, setLogoSaved]     = useState(false)

  // MDP
  const [showPwd, setShowPwd]       = useState(false)
  const [pwdCurrent, setPwdCurrent] = useState('')
  const [pwdNew, setPwdNew]         = useState('')
  const [pwdError, setPwdError]     = useState('')
  const [pwdSaved, setPwdSaved]     = useState(false)
  const [pwdPending, setPwdPending] = useState(false)

  async function save(field: string, value: unknown, setFlag: (v: boolean) => void) {
    await updateTenant.mutateAsync({ [field]: value } as any)
    setFlag(true)
    setTimeout(() => setFlag(false), 1800)
  }

  async function handleChangePwd() {
    setPwdError('')
    setPwdSaved(false)
    if (!pwdCurrent || pwdNew.length < 8) {
      setPwdError('Le nouveau mot de passe doit faire au moins 8 caractères.')
      return
    }
    setPwdPending(true)
    try {
      await changePassword(pwdCurrent, pwdNew)
      setPwdSaved(true)
      setPwdCurrent('')
      setPwdNew('')
      setShowPwd(false)
      setTimeout(() => setPwdSaved(false), 2500)
    } catch (e: any) {
      setPwdError(e?.message === 'Mot de passe actuel incorrect'
        ? 'Mot de passe actuel incorrect.'
        : 'Une erreur est survenue.')
    } finally {
      setPwdPending(false)
    }
  }

  const hasLogo = tenant.logo || logoUrl

  return (
    <div className={styles.tabContent}>
      {/* Logo */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Logo</h2>
        <p className={styles.sectionDesc}>Apparaît dans l'application et sur vos documents.</p>
        <div className={styles.logoRow}>
          <div className={styles.logoPreview}>
            {hasLogo ? (
              <img src={tenant.logo || logoUrl} alt="Logo" className={styles.logoImg}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            ) : (
              <div className={styles.logoPlaceholder}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C4907C" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
            )}
          </div>
          <div className={styles.fieldRow} style={{ flex: 1 }}>
            <input className={styles.input} type="url" value={logoUrl}
              onChange={e => setLogoUrl(e.target.value)} placeholder="https://votre-site.fr/logo.png" />
            <button className={styles.btnSave}
              onClick={() => save('logo', logoUrl || null, setLogoSaved)}
              disabled={updateTenant.isPending || logoUrl === (tenant.logo ?? '')}>
              {logoSaved ? '✓ Enregistré' : updateTenant.isPending ? '…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </section>

      {/* Nom */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Nom de la maison d'édition</h2>
        <p className={styles.sectionDesc}>Affiché dans l'en-tête et sur les documents officiels.</p>
        <div className={styles.fieldRow}>
          <input className={styles.input} value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save('name', name.trim(), setNameSaved)} />
          <button className={styles.btnSave}
            onClick={() => save('name', name.trim(), setNameSaved)}
            disabled={updateTenant.isPending || !name.trim() || name === tenant.name}>
            {nameSaved ? '✓ Enregistré' : updateTenant.isPending ? '…' : 'Enregistrer'}
          </button>
        </div>
      </section>

      {/* Site web */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Site internet</h2>
        <p className={styles.sectionDesc}>Le site web de votre maison d'édition.</p>
        <div className={styles.fieldRow}>
          <input className={styles.input} type="url" value={siteWeb}
            onChange={e => setSiteWeb(e.target.value)} placeholder="https://www.votre-maison-edition.fr"
            onKeyDown={e => e.key === 'Enter' && save('siteWeb', siteWeb || null, setSiteSaved)} />
          <button className={styles.btnSave}
            onClick={() => save('siteWeb', siteWeb || null, setSiteSaved)}
            disabled={updateTenant.isPending || siteWeb === (tenant.siteWeb ?? '')}>
            {siteSaved ? '✓ Enregistré' : updateTenant.isPending ? '…' : 'Enregistrer'}
          </button>
        </div>
      </section>

      {/* Présentation */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Présentation</h2>
        <p className={styles.sectionDesc}>Une courte description de votre ligne éditoriale.</p>
        <textarea className={styles.textarea} rows={4} value={presentation}
          onChange={e => setPres(e.target.value)}
          placeholder="Maison d'édition indépendante fondée en… Nous publions…" />
        <div className={styles.fieldRow} style={{ marginTop: 10 }}>
          <span />
          <button className={styles.btnSave}
            onClick={() => save('presentation', presentation || null, setPresSaved)}
            disabled={updateTenant.isPending || presentation === (tenant.presentation ?? '')}>
            {presSaved ? '✓ Enregistré' : updateTenant.isPending ? '…' : 'Enregistrer'}
          </button>
        </div>
      </section>

      {/* Mot de passe */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Mot de passe</h2>
        <p className={styles.sectionDesc}>Changez le mot de passe de votre compte administrateur.</p>
        {!showPwd ? (
          <button className={styles.btnOutline} onClick={() => setShowPwd(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Changer le mot de passe
          </button>
        ) : (
          <div className={styles.pwdForm}>
            <input className={styles.input} type="password" value={pwdCurrent}
              onChange={e => setPwdCurrent(e.target.value)} placeholder="Mot de passe actuel" />
            <input className={styles.input} type="password" value={pwdNew}
              onChange={e => setPwdNew(e.target.value)} placeholder="Nouveau mot de passe (min. 8 caractères)" />
            {pwdError && <p className={styles.pwdError}>{pwdError}</p>}
            {pwdSaved && <p className={styles.pwdOk}>✓ Mot de passe modifié avec succès.</p>}
            <div className={styles.fieldRow}>
              <button className={styles.btnOutline} onClick={() => { setShowPwd(false); setPwdError(''); setPwdCurrent(''); setPwdNew('') }}>
                Annuler
              </button>
              <button className={styles.btnSave}
                onClick={handleChangePwd} disabled={pwdPending}>
                {pwdPending ? '…' : 'Enregistrer le mot de passe'}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

// ── Onglet Contacts ─────────────────────────────────────────────────────────────

function OngletContacts({ user }: { user: ReturnType<typeof useAuthStore>['user'] }) {
  const [contacts, setContacts] = useState<ContactDraft[]>([
    {
      id: 'owner',
      nom: user?.lastName ?? '',
      prenom: user?.firstName ?? '',
      email: user?.email ?? '',
      telephone: '',
      fonction: 'Propriétaire',
      isOwner: true,
    },
    { id: crypto.randomUUID(), nom: '', prenom: '', email: '', telephone: '', fonction: '' },
  ])

  function addRow() {
    setContacts(prev => [...prev, { id: crypto.randomUUID(), nom: '', prenom: '', email: '', telephone: '', fonction: '' }])
  }

  function update(id: string, field: keyof ContactDraft, val: string) {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, [field]: val } : c))
  }

  function remove(id: string) {
    setContacts(prev => prev.filter(c => c.id !== id))
  }

  async function saveOwner(contact: ContactDraft) {
    await patchMe({
      firstName: contact.prenom,
      lastName:  contact.nom,
      email:     contact.email,
    })
    useAuthStore.getState().restore() // re-fetch le user depuis le serveur
  }

  return (
    <div className={styles.tabContent}>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Contacts de la maison</h2>
            <p className={styles.sectionDesc}>Les personnes à contacter pour vos partenaires, libraires et auteurs.</p>
          </div>
          <button className={styles.btnAdd} onClick={addRow}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Ajouter
          </button>
        </div>

        <div className={styles.contactsTable}>
          <div className={styles.contactsHead}>
            <span>Nom</span>
            <span>Prénom</span>
            <span>Fonction</span>
            <span>Email</span>
            <span>Téléphone</span>
            <span />
          </div>
          {contacts.map(c => (
            <div key={c.id} className={`${styles.contactsRow} ${c.isOwner ? styles.contactsRowOwner : ''}`}>
              <input className={styles.contactInput} value={c.nom}
                onChange={e => update(c.id, 'nom', e.target.value)} placeholder="Nom" />
              <input className={styles.contactInput} value={c.prenom}
                onChange={e => update(c.id, 'prenom', e.target.value)} placeholder="Prénom" />
              <div className={styles.fonctionCell}>
                <input className={styles.contactInput} value={c.fonction}
                  onChange={e => update(c.id, 'fonction', e.target.value)} placeholder="Fonction"
                  disabled={c.isOwner} />
                {c.isOwner && <span className={styles.ownerBadge}>Propriétaire</span>}
              </div>
              <input className={styles.contactInput} value={c.email}
                onChange={e => update(c.id, 'email', e.target.value)} placeholder="email@…" />
              <input className={styles.contactInput} value={c.telephone}
                onChange={e => update(c.id, 'telephone', e.target.value)} placeholder="06…" />
              {c.isOwner ? (
                <button className={styles.btnSaveSm}
                  onClick={() => saveOwner(c)} title="Enregistrer le propriétaire">
                  ✓
                </button>
              ) : (
                <button className={styles.btnRemove} onClick={() => remove(c.id)} title="Supprimer">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

// ── Onglet Abonnement ───────────────────────────────────────────────────────────

function OngletAbonnement({ tenant }: { tenant: ReturnType<typeof useMonTenant>['data'] }) {
  return (
    <div className={styles.tabContent}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Formule actuelle</h2>
        <div className={styles.planCard}>
          <span className={styles.planBadge}>{PLAN_LABELS[tenant!.plan] ?? tenant!.plan}</span>
          <p className={styles.planDesc}>
            {tenant!.plan === 'TRIAL'
              ? 'Vous êtes en période d\'essai. Passez à la formule Éditeur pour débloquer toutes les fonctionnalités.'
              : 'Votre abonnement est actif. Gérez-le depuis votre espace Stripe (bientôt disponible).'}
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Accès auteurs</h2>
        <p className={styles.sectionDesc}>
          Donnez à vos auteurs l'accès à l'application mobile salon. Ils pourront enregistrer leurs ventes,
          et leurs données seront automatiquement intégrées à votre comptabilité.
        </p>
        <div className={styles.comingSoon}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>Disponible prochainement avec la formule <strong>Éditeur + salon</strong>. Vos auteurs recevront un accès restreint à l'app mobile.</span>
        </div>
      </section>
    </div>
  )
}
