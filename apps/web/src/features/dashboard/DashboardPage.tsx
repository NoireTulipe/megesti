import { useState } from 'react'
import { Check } from 'lucide-react'
import { Icon } from '@/components/Icon'
import { Modal } from '@/components/ui/Modal'
import { MetricCard } from './MetricCard'
import { AlertItem } from './AlertItem'
import { ActivityItem } from './ActivityItem'
import { QuickBtn } from './QuickBtn'
import { useDashboardStats } from './hooks/useDashboardStats'
import { useTotauxReversements } from '@/features/reversements/hooks/useReversements'
import { useAlertesDA } from '@/features/droitsAuteur/hooks/useDroitsAuteur'
// Note: totaux côté API calculent déjà le net basé sur montantAjuste ou montantTTC brut
// Les totaux affinés (après commission) sont calculés côté page Reversements
import { useNavigate } from 'react-router-dom'
import type { AlertData, ActivityData } from './data'
import { METRIC_CA, METRIC_COMMANDES, METRIC_DROITS, QUICK_ACTIONS, IN_PREP } from './data'

// ── Form styles partagés dans la page ──────────────────────
const inputCss: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 12,
  border: '1.5px solid rgba(28,58,94,0.15)',
  fontFamily: 'Plus Jakarta Sans', fontSize: 13, color: 'var(--text)',
  background: 'var(--white)', outline: 'none', marginBottom: 12,
}
const submitCss: React.CSSProperties = {
  width: '100%', padding: 12, borderRadius: 12,
  background: 'var(--ink)', border: 'none', color: 'white',
  fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: 600,
  cursor: 'pointer', marginTop: 4,
}

// ── Toast ──────────────────────────────────────────────────
function Toast({ msg }: { msg: string }) {
  return (
    <div style={{
      background: 'var(--ink)', color: 'white', padding: '12px 18px',
      borderRadius: 12, fontSize: 13, fontWeight: 500,
      boxShadow: '0 4px 20px rgba(28,58,94,0.3)',
      display: 'flex', alignItems: 'center', gap: 8,
      animation: 'slideIn 0.25s ease',
    }}>
      <Check size={14} color="var(--sage)" />
      {msg}
    </div>
  )
}

// ── InPrep card ────────────────────────────────────────────
function InPrepCard() {
  return (
    <div style={{
      width: 200, flexShrink: 0,
      background: 'linear-gradient(160deg, #F7EFE5 0%, #EDE0D0 100%)',
      borderRadius: 28, padding: '24px 22px',
      border: '1.5px solid rgba(201,147,58,0.2)',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      boxShadow: '0 4px 20px rgba(201,147,58,0.1)',
      position: 'relative', overflow: 'hidden',
    }}>
      <svg style={{ position: 'absolute', bottom: -20, right: -20, opacity: 0.25, animation: 'floatA 10s ease-in-out infinite' }} width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="var(--gold)" strokeWidth="20" />
      </svg>
      <div>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gold)', marginBottom: 10 }}>
          En préparation
        </div>
        <div style={{ fontFamily: 'DM Serif Display', fontSize: 16, fontStyle: 'italic', color: 'var(--ink)', lineHeight: 1.35, marginBottom: 6 }}>
          {IN_PREP.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-mid)' }}>{IN_PREP.author}</div>
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 10, color: 'var(--text-soft)', marginBottom: 5 }}>Parution prévue</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>{IN_PREP.release}</div>
        <div style={{ marginTop: 10, height: 4, borderRadius: 100, background: 'rgba(201,147,58,0.15)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${IN_PREP.progress}%`, borderRadius: 100,
            background: 'linear-gradient(90deg, var(--gold), #E8B350)',
            animation: 'growBar 1.2s 0.6s cubic-bezier(0.4,0,0.2,1) both',
          }} />
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-soft)', marginTop: 4 }}>{IN_PREP.progressLabel}</div>
      </div>
    </div>
  )
}

// ── Dashboard ──────────────────────────────────────────────
export function DashboardPage() {
  const [modal, setModal] = useState<string | null>(null)
  const [saleSubmitted, setSaleSubmitted] = useState(false)
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string }>>([])

  const { data: stats }     = useDashboardStats()
  const { data: totauxRev } = useTotauxReversements()
  const { data: alertesDA } = useAlertesDA()
  const navigate = useNavigate()

  const fmtDateCourt = (s: string) =>
    new Date(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

  const alertesDA_items: AlertData[] = [
    ...(alertesDA?.retard ?? []).map((c) => ({
      id:       `da-retard-${c.id}`,
      iconName: 'coins' as const,
      text:     `Droits d'auteur en retard — ${c.auteur.prenom} ${c.auteur.nom}`,
      sub:      `Échéance dépassée du ${fmtDateCourt(c.prochainVersement)}${c.article ? ` · ${c.article.nom}` : ''}`,
    })),
    ...(alertesDA?.bientot ?? []).map((c) => ({
      id:       `da-bientot-${c.id}`,
      iconName: 'coins' as const,
      text:     `Droits d'auteur à verser — ${c.auteur.prenom} ${c.auteur.nom}`,
      sub:      `Échéance le ${fmtDateCourt(c.prochainVersement)}${c.article ? ` · ${c.article.nom}` : ''}`,
    })),
  ]

  const alertes: AlertData[] = [
    ...alertesDA_items,
    ...(stats?.alertesStock ?? []).map((a) => ({
      id:       a.id,
      iconName: 'book' as const,
      text:     `Stock faible : ${a.nom}`,
      sub:      `${a.stock} ex. restant${a.stock > 1 ? 's' : ''} (alerte à ${a.stockAlerte})`,
    })),
  ]

  const activite: ActivityData[] = stats?.activiteRecente.length
    ? stats.activiteRecente.map((v, i) => ({
        id: v.id,
        initials: `#${v.numero}`,
        color: 'linear-gradient(135deg,#1C3A5E,#2A5F8A)',
        text: `Vente · <strong>${v.modePaiement}</strong>${v.premierArticle ? ` — <em>${v.premierArticle}</em>` : ''} — ${Number(v.totalTTC).toFixed(2)} €`,
        time: new Date(v.dateVente).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        isLast: i === stats.activiteRecente.length - 1,
      }))
    : []

  const addToast = (msg: string) => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200)
  }

  return (
    <div style={{ padding: '28px 32px 40px', display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* ── Widget reversements en attente ── */}
      {totauxRev && totauxRev.enAttente.nb > 0 && (
        <button
          onClick={() => navigate('/reversements')}
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
            border: '1.5px solid rgba(201,147,58,0.4)',
            borderRadius: 16, padding: '14px 20px',
            cursor: 'pointer', textAlign: 'left', width: '100%',
            animation: 'fadeUp 0.4s ease both',
          }}
        >
          <span style={{ fontSize: '1.6rem', flexShrink: 0 }}>💰</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#92400E', margin: '0 0 2px' }}>
              {totauxRev.enAttente.nb} reversement{totauxRev.enAttente.nb > 1 ? 's' : ''} en attente
            </p>
            <p style={{ fontSize: 12, color: '#B45309', margin: 0 }}>
              {Number(totauxRev.enAttente.montant).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € à recevoir de vos points de vente partenaires
            </p>
          </div>
          <span style={{ fontSize: 13, color: '#92400E', fontWeight: 600, flexShrink: 0 }}>Voir →</span>
        </button>
      )}

      {/* ── Titre ── */}
      <div className="zone-animate" style={{ animationDelay: '0ms' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: 'DM Serif Display', fontSize: 30, color: 'var(--ink)', fontWeight: 400, letterSpacing: '-0.01em' }}>
              Bonjour, Marie —{' '}
              <span style={{ fontStyle: 'italic', color: 'var(--terra)' }}>avril 2026</span>
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-soft)', marginTop: 5 }}>
              Votre maison d'édition se porte bien ce mois-ci.
            </p>
          </div>
          <svg width="120" height="40" viewBox="0 0 120 40" style={{ opacity: 0.15, flexShrink: 0 }}>
            <path d="M10,35 Q60,-10 110,35" fill="none" stroke="var(--terra)" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M20,35 Q60,0 100,35" fill="none" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* ── Métriques ── */}
      <div className="zone-animate" style={{ display: 'flex', gap: 16, animationDelay: '80ms', alignItems: 'stretch' }}>
        <MetricCard {...METRIC_CA} rawValue={stats?.caMois.totalTTC ?? METRIC_CA.rawValue} large delay={0} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <MetricCard {...METRIC_COMMANDES} rawValue={stats?.caMois.nombreVentes ?? METRIC_COMMANDES.rawValue} delay={120} />
          <MetricCard {...METRIC_DROITS} delay={200} />
        </div>
        <InPrepCard />
      </div>

      {/* ── Alertes / Actions / Activité ── */}
      <div className="zone-animate" style={{ display: 'flex', gap: 16, alignItems: 'flex-start', animationDelay: '200ms' }}>

        {/* Alertes */}
        <div style={{
          flex: '1 1 38%',
          background: 'linear-gradient(150deg, #FEF6F2 0%, #FDE8E0 100%)',
          borderRadius: 28, padding: '22px 22px 14px',
          border: '1.5px solid rgba(217,95,59,0.18)',
          boxShadow: '0 4px 20px rgba(217,95,59,0.07)',
          position: 'relative', overflow: 'hidden',
        }}>
          <svg style={{ position: 'absolute', top: -10, right: -10, opacity: 0.08, pointerEvents: 'none' }} width="120" height="120" viewBox="0 0 120 120">
            <path d="M10,60 Q60,-20 110,60 Q60,140 10,60" fill="var(--terra)" />
          </svg>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Icon name="alert" size={14} color="var(--terra)" />
            <span style={{ fontFamily: 'DM Serif Display', fontSize: 16, color: 'var(--terra)', fontStyle: 'italic' }}>
              Alertes &amp; rappels
            </span>
            <span style={{ marginLeft: 'auto', background: 'var(--terra)', color: 'white', fontSize: 10, fontWeight: 700, borderRadius: 100, padding: '2px 8px' }}>
              {alertes.length}
            </span>
          </div>
          {alertes.length > 0
            ? alertes.map((a, i) => <AlertItem key={a.id} {...a} index={i} />)
            : <p style={{ fontSize: 12, color: 'var(--text-soft)', textAlign: 'center', padding: '12px 0' }}>Aucune alerte</p>
          }
        </div>

        {/* Actions rapides */}
        <div style={{ flex: '1 1 28%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-soft)', paddingLeft: 4, marginBottom: 2 }}>
            Actions rapides
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {QUICK_ACTIONS.map(action => (
              <QuickBtn key={action.id} {...action} onClick={() => setModal(action.id)} />
            ))}
          </div>
        </div>

        {/* Activité */}
        <div style={{
          flex: '1 1 34%',
          background: 'var(--white)', borderRadius: 28, padding: '22px',
          boxShadow: 'var(--shadow-card)', border: '1.5px solid rgba(28,58,94,0.06)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <span style={{ fontFamily: 'DM Serif Display', fontSize: 16, color: 'var(--ink)', fontStyle: 'italic' }}>
              Activité récente
            </span>
            <button style={{ fontSize: 11, color: 'var(--terra)', fontWeight: 700, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans', letterSpacing: '0.04em' }}>
              Tout voir →
            </button>
          </div>
          {activite.length > 0
            ? activite.map((item, i) => <ActivityItem key={item.id} {...item} index={i} />)
            : <p style={{ fontSize: 12, color: 'var(--text-soft)', textAlign: 'center', padding: '12px 0' }}>Aucune vente ce mois-ci</p>
          }
        </div>
      </div>

      {/* ── Toasts ── */}
      <div style={{ position: 'fixed', bottom: 80, right: 24, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 600 }}>
        {toasts.map(t => <Toast key={t.id} msg={t.msg} />)}
      </div>

      {/* ── Modals ── */}
      {modal === 'sale' && (
        <Modal title="Nouvelle vente" onClose={() => { setModal(null); setSaleSubmitted(false) }}>
          {saleSubmitted ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <p style={{ fontFamily: 'DM Serif Display', fontSize: 20, color: 'var(--ink)' }}>Vente enregistrée !</p>
              <button onClick={() => { setModal(null); setSaleSubmitted(false); addToast('Vente ajoutée avec succès') }} style={submitCss}>Fermer</button>
            </div>
          ) : (
            <form onSubmit={e => { e.preventDefault(); setSaleSubmitted(true) }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Titre</label>
              <input placeholder="ex. Le Phare d'Aubeterre" style={{ ...inputCss, marginTop: 4 }} />
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Librairie / Client</label>
              <input placeholder="ex. Librairie L'Arbre à Lettres" style={{ ...inputCss, marginTop: 4 }} />
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Qté</label>
                  <input type="number" defaultValue={5} style={{ ...inputCss, marginTop: 4 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Prix unit. (€)</label>
                  <input type="number" defaultValue={18} style={{ ...inputCss, marginTop: 4 }} />
                </div>
              </div>
              <button type="submit" style={submitCss}>Enregistrer la vente</button>
            </form>
          )}
        </Modal>
      )}

      {modal === 'book' && (
        <Modal title="Nouveau livre au catalogue" onClose={() => setModal(null)}>
          <form onSubmit={e => { e.preventDefault(); setModal(null); addToast('Titre ajouté au catalogue') }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Titre</label>
            <input placeholder="Titre du livre" style={{ ...inputCss, marginTop: 4 }} />
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Auteur</label>
            <input placeholder="Nom, prénom" style={{ ...inputCss, marginTop: 4 }} />
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Date de parution prévue</label>
            <input type="date" style={{ ...inputCss, marginTop: 4 }} />
            <button type="submit" style={submitCss}>Ajouter au catalogue</button>
          </form>
        </Modal>
      )}

      {modal === 'event' && (
        <Modal title="Nouvel événement" onClose={() => setModal(null)}>
          <form onSubmit={e => { e.preventDefault(); setModal(null); addToast('Événement créé') }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nom de l'événement</label>
            <input placeholder="ex. Salon du livre de Rennes" style={{ ...inputCss, marginTop: 4 }} />
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Date</label>
            <input type="date" style={{ ...inputCss, marginTop: 4 }} />
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Lieu</label>
            <input placeholder="Ville ou adresse" style={{ ...inputCss, marginTop: 4 }} />
            <button type="submit" style={submitCss}>Créer l'événement</button>
          </form>
        </Modal>
      )}

      {modal === 'invoice' && (
        <Modal title="Nouvelle facture" onClose={() => setModal(null)}>
          <form onSubmit={e => { e.preventDefault(); setModal(null); addToast('Facture créée') }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Destinataire</label>
            <input placeholder="ex. Librairie Le Passage" style={{ ...inputCss, marginTop: 4 }} />
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Montant (€)</label>
            <input type="number" placeholder="0.00" style={{ ...inputCss, marginTop: 4 }} />
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Objet</label>
            <input placeholder="ex. Fourniture d'ouvrages — mars 2026" style={{ ...inputCss, marginTop: 4 }} />
            <button type="submit" style={submitCss}>Générer la facture</button>
          </form>
        </Modal>
      )}
    </div>
  )
}
