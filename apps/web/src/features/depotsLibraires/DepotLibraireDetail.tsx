import { generateUUID } from '@/lib/utils'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  useDepotLibraireDetail, useUpdateDepotLibraire,
  useCreateContact, useUpdateContact, useDeleteContact,
  useEnvoyerArticle, useRetirerArticle, useConfirmerVente,
} from './hooks/useDepotsLibraires'
import type { DepotLibraireList, ContactDepot } from './hooks/useDepotsLibraires'
import { useArticles } from '@/features/catalogue/hooks/useArticles'
import sty from '@/features/auteurs/AuteursPage.module.css'

type TabId = 'infos' | 'contacts' | 'stock' | 'ventes'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'infos',    label: 'Informations', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
  { id: 'contacts', label: 'Contacts',     icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75' },
  { id: 'stock',    label: 'Stock dÃ©posÃ©', icon: 'M20 7l-8-4-8 4m16 0-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { id: 'ventes',   label: 'Ventes',       icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z' },
]

const fmtDate  = (s: string) => new Date(s).toLocaleDateString('fr-FR', { day:'numeric', month:'short', year:'numeric' })
const fmtEuro  = (v: number) => v.toLocaleString('fr-FR', { style:'currency', currency:'EUR' })

// â”€â”€ Onglet Informations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TabInfos({ depot, depotId }: { depot: ReturnType<typeof useDepotLibraireDetail>['data']; depotId: string }) {
  const update  = useUpdateDepotLibraire()
  const [edit, setEdit] = useState(false)
  const [nom,   setNom]   = useState(depot?.nom ?? '')
  const [addr,  setAddr]  = useState(depot?.adresse ?? '')
  const [cFix,  setCFix]  = useState(depot?.commissionFixe   ? String(Number(depot.commissionFixe))   : '')
  const [cPct,  setCPct]  = useState(depot?.commissionPourcent ? String(Number(depot.commissionPourcent)) : '')

  if (!depot) return null

  async function save() {
    await update.mutateAsync({
      id:                 depotId,
      nom,
      adresse:            addr || null,
      commissionFixe:     cFix ? Number(cFix) : null,
      commissionPourcent: cPct ? Number(cPct) : null,
    })
    setEdit(false)
  }

  if (!edit) return (
    <div className={sty['profil-grid']}>
      <div className={sty['profil-field']}><label>Nom</label><span>{depot.nom}</span></div>
      <div className={sty['profil-field']}><label>Adresse</label><span>{depot.adresse || 'â€”'}</span></div>
      <div className={sty['profil-field']}><label>Commission fixe</label><span>{depot.commissionFixe ? fmtEuro(Number(depot.commissionFixe)) : 'â€”'}</span></div>
      <div className={sty['profil-field']}><label>Commission %</label><span>{depot.commissionPourcent ? `${Number(depot.commissionPourcent)} %` : 'â€”'}</span></div>
      <div className={`${sty['profil-field']} ${sty.full}`} style={{ gridColumn:'1/-1' }}>
        <button
          type="button"
          onClick={() => setEdit(true)}
          style={{ alignSelf:'flex-start', height:34, padding:'0 16px', background:'var(--terra-faint)', border:'1.5px solid var(--terra-light)', color:'var(--terra-dark)', borderRadius:'var(--r-pill)', fontSize:'0.82rem', fontWeight:600, cursor:'pointer' }}
        >
          Modifier les informations
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        {[
          { label:'Nom *', val:nom, set:setNom, placeholder:'Nom de la librairie' },
          { label:'Adresse', val:addr, set:setAddr, placeholder:'Rue, villeâ€¦' },
          { label:'Commission fixe (â‚¬)', val:cFix, set:setCFix, placeholder:'0.00', type:'number' },
          { label:'Commission (%)' ,    val:cPct, set:setCPct, placeholder:'0', type:'number' },
        ].map(f => (
          <div key={f.label} style={{ display:'flex', flexDirection:'column', gap:5 }}>
            <label style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-soft)' }}>{f.label}</label>
            <input
              type={f.type ?? 'text'}
              value={f.val}
              onChange={e => f.set(e.target.value)}
              placeholder={f.placeholder}
              style={{ padding:'9px 12px', border:'1.5px solid var(--cream-dark)', borderRadius:10, fontSize:'0.875rem', outline:'none', background:'#fff' }}
            />
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        <button type="button" onClick={() => setEdit(false)} style={{ height:36, padding:'0 18px', background:'transparent', border:'1.5px solid var(--cream-dark)', borderRadius:'var(--r-pill)', fontSize:'0.85rem', cursor:'pointer', color:'var(--text-soft)' }}>Annuler</button>
        <button type="button" onClick={save} disabled={!nom.trim() || update.isPending} style={{ height:36, padding:'0 22px', background:'var(--ink-mid)', color:'#fff', border:'none', borderRadius:'var(--r-pill)', fontSize:'0.85rem', fontWeight:600, cursor:'pointer' }}>
          {update.isPending ? 'Enregistrementâ€¦' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}

// â”€â”€ Onglet Contacts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TabContacts({ depot, depotId }: { depot: ReturnType<typeof useDepotLibraireDetail>['data']; depotId: string }) {
  const create = useCreateContact(depotId)
  const update = useUpdateContact(depotId)
  const del    = useDeleteContact(depotId)
  const [editing, setEditing] = useState<ContactDepot | null | 'new'>(null)
  const empty = { id: generateUUID(), nom:'', prenom:'', email:'', telephone:'' }
  const [f, setF] = useState(empty)

  const contacts = depot?.contacts ?? []

  function openNew()          { setF({ ...empty, id: generateUUID() }); setEditing('new') }
  function openEdit(c: ContactDepot) { setF({ ...c, prenom:c.prenom??'', email:c.email??'', telephone:c.telephone??'' }); setEditing(c) }

  async function save() {
    if (editing === 'new') {
      await create.mutateAsync({ id: f.id, nom: f.nom, prenom: f.prenom||undefined, email: f.email||undefined, telephone: f.telephone||undefined })
    } else if (editing) {
      await update.mutateAsync({ id: (editing as ContactDepot).id, nom: f.nom, prenom: f.prenom||undefined, email: f.email||undefined, telephone: f.telephone||undefined })
    }
    setEditing(null)
  }

  const field = (label: string, val: string, cb: (v:string)=>void, placeholder='') => (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      <label style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-soft)' }}>{label}</label>
      <input value={val} onChange={e=>cb(e.target.value)} placeholder={placeholder} style={{ padding:'9px 12px', border:'1.5px solid var(--cream-dark)', borderRadius:10, fontSize:'0.875rem', outline:'none', background:'#fff' }} />
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {contacts.length === 0 && !editing && (
        <p style={{ color:'var(--text-soft)', fontStyle:'italic', fontSize:'0.85rem' }}>Aucun contact enregistrÃ©.</p>
      )}
      {contacts.map(c => (
        <div key={c.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'var(--cream)', border:'1px solid var(--cream-dark)', borderRadius:14 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:'0.88rem', color:'var(--ink)' }}>{c.prenom ? `${c.prenom} ${c.nom}` : c.nom}</div>
            <div style={{ fontSize:'0.75rem', color:'var(--text-soft)', marginTop:2, display:'flex', gap:12 }}>
              {c.email     && <span>âœ‰ {c.email}</span>}
              {c.telephone && <span>â˜Ž {c.telephone}</span>}
            </div>
          </div>
          <button type="button" onClick={() => openEdit(c)} style={{ width:28, height:28, border:'1.5px solid var(--cream-dark)', borderRadius:8, background:'transparent', cursor:'pointer', color:'var(--text-soft)', display:'flex', alignItems:'center', justifyContent:'center' }}>âœŽ</button>
          <button type="button" onClick={() => del.mutate(c.id)}  style={{ width:28, height:28, border:'1.5px solid #FECACA', borderRadius:8, background:'#FEF2F2', cursor:'pointer', color:'#DC2626', display:'flex', alignItems:'center', justifyContent:'center' }}>Ã—</button>
        </div>
      ))}

      {editing && (
        <div style={{ padding:16, background:'#fff', border:'1.5px solid var(--terra-light)', borderRadius:14, display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {field('Nom *',      f.nom,       v => setF(s=>({...s,nom:v})))}
            {field('PrÃ©nom',     f.prenom??'',v => setF(s=>({...s,prenom:v})))}
            {field('Email',      f.email??'', v => setF(s=>({...s,email:v})), 'contact@librairie.fr')}
            {field('TÃ©lÃ©phone',  f.telephone??'', v => setF(s=>({...s,telephone:v})), '01 23 45 67 89')}
          </div>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button type="button" onClick={() => setEditing(null)} style={{ height:34, padding:'0 16px', background:'transparent', border:'1.5px solid var(--cream-dark)', borderRadius:'var(--r-pill)', fontSize:'0.82rem', cursor:'pointer', color:'var(--text-soft)' }}>Annuler</button>
            <button type="button" onClick={save} disabled={!f.nom.trim()} style={{ height:34, padding:'0 18px', background:'var(--ink-mid)', color:'#fff', border:'none', borderRadius:'var(--r-pill)', fontSize:'0.82rem', fontWeight:600, cursor:'pointer' }}>
              {editing === 'new' ? 'Ajouter' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      {!editing && (
        <button type="button" onClick={openNew} style={{ alignSelf:'flex-start', height:34, padding:'0 16px', border:'1.5px dashed var(--cream-dark)', borderRadius:10, background:'transparent', color:'var(--text-soft)', fontSize:'0.8rem', fontWeight:600, cursor:'pointer' }}>
          + Ajouter un contact
        </button>
      )}
    </div>
  )
}

// â”€â”€ Onglet Stock dÃ©posÃ© â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TabStock({ depot, depotId }: { depot: ReturnType<typeof useDepotLibraireDetail>['data']; depotId: string }) {
  const envoyer  = useEnvoyerArticle(depotId)
  const retirer  = useRetirerArticle(depotId)
  const { data: articles = [] } = useArticles(undefined, undefined, true)
  const [showForm, setShowForm] = useState(false)
  const [articleId, setArticleId] = useState('')
  const [qte, setQte]             = useState('')
  const [notes, setNotes]         = useState('')

  const stock = depot?.articles ?? []

  async function sendArticle() {
    if (!articleId || !qte) return
    await envoyer.mutateAsync({ id: generateUUID(), articleId, quantiteEnvoyee: Number(qte), notes: notes || undefined })
    setArticleId(''); setQte(''); setNotes(''); setShowForm(false)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {stock.length === 0 && !showForm && (
        <p style={{ color:'var(--text-soft)', fontStyle:'italic', fontSize:'0.85rem' }}>Aucun article en dÃ©pÃ´t pour l'instant.</p>
      )}

      {stock.map(a => {
        const restant = a.quantiteEnvoyee - a.quantiteVendue
        return (
          <div key={a.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 14px', background:'var(--cream)', border:'1px solid var(--cream-dark)', borderRadius:14 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:'0.88rem', color:'var(--ink)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.article.nom}</div>
              <div style={{ fontSize:'0.72rem', color:'var(--text-soft)', marginTop:3, display:'flex', gap:12 }}>
                <span>EnvoyÃ© : <strong>{a.quantiteEnvoyee}</strong></span>
                <span>Vendu : <strong style={{ color:'var(--sage)' }}>{a.quantiteVendue}</strong></span>
                <span>Restant : <strong style={{ color: restant <= 0 ? '#DC2626' : 'var(--ink)' }}>{restant}</strong></span>
                <span>{fmtDate(a.dateEnvoi)}</span>
              </div>
            </div>
            <button type="button" onClick={() => retirer.mutate(a.id)} title="Retirer du dÃ©pÃ´t (retour stock)"
              style={{ height:28, padding:'0 12px', border:'1.5px solid var(--cream-dark)', borderRadius:20, background:'transparent', color:'var(--text-soft)', fontSize:'0.72rem', fontWeight:600, cursor:'pointer' }}>
              Retirer
            </button>
          </div>
        )
      })}

      {showForm && (
        <div style={{ padding:16, background:'#fff', border:'1.5px solid var(--terra-light)', borderRadius:14, display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              <label style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-soft)' }}>Article *</label>
              <select value={articleId} onChange={e => setArticleId(e.target.value)} style={{ padding:'9px 12px', border:'1.5px solid var(--cream-dark)', borderRadius:10, fontSize:'0.875rem', outline:'none', background:'#fff' }}>
                <option value="">â€” Choisir â€”</option>
                {articles.map(a => <option key={a.id} value={a.id}>{a.nom} ({a.stock} en stock)</option>)}
              </select>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              <label style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-soft)' }}>QuantitÃ© *</label>
              <input type="number" min={1} value={qte} onChange={e => setQte(e.target.value)} placeholder="ex. 5" style={{ padding:'9px 12px', border:'1.5px solid var(--cream-dark)', borderRadius:10, fontSize:'0.875rem', outline:'none', background:'#fff' }} />
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            <label style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-soft)' }}>Notes</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optionnel" style={{ padding:'9px 12px', border:'1.5px solid var(--cream-dark)', borderRadius:10, fontSize:'0.875rem', outline:'none', background:'#fff' }} />
          </div>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button type="button" onClick={() => setShowForm(false)} style={{ height:34, padding:'0 16px', background:'transparent', border:'1.5px solid var(--cream-dark)', borderRadius:'var(--r-pill)', fontSize:'0.82rem', cursor:'pointer', color:'var(--text-soft)' }}>Annuler</button>
            <button type="button" onClick={sendArticle} disabled={!articleId || !qte || envoyer.isPending} style={{ height:34, padding:'0 18px', background:'var(--ink-mid)', color:'#fff', border:'none', borderRadius:'var(--r-pill)', fontSize:'0.82rem', fontWeight:600, cursor:'pointer' }}>
              {envoyer.isPending ? 'Envoiâ€¦' : 'Envoyer en dÃ©pÃ´t'}
            </button>
          </div>
        </div>
      )}

      {!showForm && (
        <button type="button" onClick={() => setShowForm(true)} style={{ alignSelf:'flex-start', height:34, padding:'0 16px', border:'1.5px dashed var(--cream-dark)', borderRadius:10, background:'transparent', color:'var(--text-soft)', fontSize:'0.8rem', fontWeight:600, cursor:'pointer' }}>
          + Envoyer des articles en dÃ©pÃ´t
        </button>
      )}
    </div>
  )
}

// â”€â”€ Onglet Ventes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TabVentes({ depot, depotId }: { depot: ReturnType<typeof useDepotLibraireDetail>['data']; depotId: string }) {
  const confirmer = useConfirmerVente(depotId)
  const [selected, setSelected] = useState<string>('')
  const [qte, setQte]           = useState('')
  const [success, setSuccess]   = useState<string | null>(null)

  const stock = (depot?.articles ?? []).filter(a => a.quantiteEnvoyee - a.quantiteVendue > 0)

  async function confirm() {
    if (!selected || !qte) return
    const r = await confirmer.mutateAsync({ articleDepotId: selected, quantite: Number(qte) })
    const comm = r.commission ? ` (commission : ${fmtEuro(r.commission)})` : ''
    setSuccess(`Vente enregistrÃ©e${comm}`)
    setSelected(''); setQte('')
    setTimeout(() => setSuccess(null), 4000)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ padding:20, background:'var(--cream)', border:'1px solid var(--cream-dark)', borderRadius:16 }}>
        <p style={{ fontWeight:700, fontSize:'0.88rem', color:'var(--ink)', marginBottom:14 }}>Confirmer une vente</p>
        {stock.length === 0 ? (
          <p style={{ color:'var(--text-soft)', fontStyle:'italic', fontSize:'0.85rem' }}>Aucun article disponible Ã  la vente dans ce dÃ©pÃ´t.</p>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:12 }}>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <label style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-soft)' }}>Article</label>
                <select value={selected} onChange={e => setSelected(e.target.value)} style={{ padding:'9px 12px', border:'1.5px solid var(--cream-dark)', borderRadius:10, fontSize:'0.875rem', outline:'none', background:'#fff' }}>
                  <option value="">â€” Choisir â€”</option>
                  {stock.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.article.nom} Â· {a.quantiteEnvoyee - a.quantiteVendue} dispo
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <label style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-soft)' }}>QtÃ© vendue</label>
                <input type="number" min={1} value={qte} onChange={e => setQte(e.target.value)} placeholder="ex. 3" style={{ width:90, padding:'9px 12px', border:'1.5px solid var(--cream-dark)', borderRadius:10, fontSize:'0.875rem', outline:'none', background:'#fff' }} />
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <button type="button" onClick={confirm} disabled={!selected || !qte || confirmer.isPending}
                style={{ height:38, padding:'0 20px', background:'linear-gradient(135deg,var(--sage),#4A7A55)', color:'#fff', border:'none', borderRadius:'var(--r-pill)', fontSize:'0.85rem', fontWeight:600, cursor:'pointer', boxShadow:'0 3px 12px rgba(107,143,113,0.35)' }}>
                {confirmer.isPending ? 'Enregistrementâ€¦' : 'âœ“ Confirmer la vente'}
              </button>
              {success && <span style={{ fontSize:'0.82rem', color:'var(--sage)', fontWeight:600 }}>âœ“ {success}</span>}
            </div>
          </div>
        )}
      </div>

      <div>
        <p style={{ fontWeight:700, fontSize:'0.82rem', color:'var(--text-soft)', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.08em' }}>RÃ©capitulatif dÃ©pÃ´t</p>
        {depot?.articles.map(a => (
          <div key={a.id} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--cream-dark)', fontSize:'0.82rem', color:'var(--ink)' }}>
            <span>{a.article.nom}</span>
            <span style={{ color:'var(--text-soft)' }}>{a.quantiteVendue} / {a.quantiteEnvoyee} vendus Â· {fmtEuro(a.quantiteVendue * Number(a.article.prixVenteHT))} HT</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// â”€â”€ Composant principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface Props {
  depot:   DepotLibraireList
  isOpen:  boolean
  onClose: () => void
  onEdit:  () => void
}

export function DepotLibraireDetail({ depot, isOpen, onClose }: Props) {
  const [tab, setTab] = useState<TabId>('infos')
  const { data: detail } = useDepotLibraireDetail(isOpen ? depot.id : undefined)

  const nbContacts = detail?.contacts.length ?? depot.contacts.length
  const nbRestant  = (detail?.articles ?? depot.articles).reduce((s, a) => s + (a.quantiteEnvoyee - a.quantiteVendue), 0)

  if (!isOpen) return null

  return createPortal(
    <div className={sty.backdrop} onClick={onClose}>
      <div className={`${sty.modal} ${sty['modal-xl']}`} style={{ display:'flex', flexDirection:'column' }}
        role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>

        <button className={sty['modal-close']} onClick={onClose} aria-label="Fermer">âœ•</button>

        {/* Header */}
        <div className={sty['detail-header']}>
          <div className={sty['detail-hero']}>
            <div className={sty['detail-avatar']} style={{ background:'linear-gradient(135deg,#6B8F71,#85A88A)', fontSize:'2rem' }}>
              ðŸ“¦
            </div>
            <div className={sty['detail-hero-info']}>
              <div className={sty['detail-hero-name']}>{depot.nom}</div>
              {depot.adresse && <div className={sty['detail-hero-civil']}>{depot.adresse}</div>}
              <div className={sty['detail-hero-pills']}>
                <span className={`${sty['detail-hero-pill']} ${sty['detail-hero-pill-contrats']}`}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  </svg>
                  {nbContacts} contact{nbContacts !== 1 ? 's' : ''}
                </span>
                <span className={`${sty['detail-hero-pill']} ${sty['detail-hero-pill-livres']}`}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  </svg>
                  {nbRestant} ex. en dÃ©pÃ´t
                </span>
                {(depot.commissionPourcent || depot.commissionFixe) && (
                  <span className={sty['detail-hero-pill']}>
                    Commission {depot.commissionPourcent ? `${Number(depot.commissionPourcent)} %` : `${Number(depot.commissionFixe).toFixed(2)} â‚¬`}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className={sty['detail-tabs']}>
            {TABS.map(t => (
              <button key={t.id} className={`${sty['detail-tab']} ${tab === t.id ? sty.active : ''}`} onClick={() => setTab(t.id)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {t.icon.split(' M ').map((seg, i) => <path key={i} d={i === 0 ? seg : `M ${seg}`} />)}
                </svg>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Corps */}
        <div className={sty['detail-body']}>
          {tab === 'infos'    && <TabInfos    depot={detail} depotId={depot.id} />}
          {tab === 'contacts' && <TabContacts depot={detail} depotId={depot.id} />}
          {tab === 'stock'    && <TabStock    depot={detail} depotId={depot.id} />}
          {tab === 'ventes'   && <TabVentes   depot={detail} depotId={depot.id} />}
        </div>
      </div>
    </div>,
    document.body
  )
}




