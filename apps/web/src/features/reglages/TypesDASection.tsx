import { generateUUID } from '@/lib/utils'
import { useState } from 'react'
import { useTypesDA, useCreateTypeDA, useUpdateTypeDA, useDeleteTypeDA } from './hooks/useTypesDA'
import type { TypeDA } from './hooks/useTypesDA'
import type { RegleDA, ConditionRegle, BaseCalcul, VendeurType, TypeVente } from '@megesti/business'
import { MascoteBlock } from '@/components/MascoteBlock'
import styles from './TypesDASection.module.css'

// •"?•"? Helpers •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?

function regleVide(): RegleDA {
  return { conditions: {}, taux: 40, base: 'TTC' }
}

function estFallback(r: RegleDA): boolean {
  const c = r.conditions
  return c.vendeur === undefined && c.avecCommission === undefined && c.typeVente === undefined
}

const DEDUCT_OPTIONS = [
  { value: '',       label: 'Aucune' },
  { value: '0.3333', label: '1/3' },
  { value: '0.5',    label: '1/2' },
  { value: '0.6667', label: '2/3' },
  { value: '1',      label: '100%' },
]

function deductLabel(v: number): string {
  if (v <= 0.34) return '1/3'
  if (v <= 0.51) return '1/2'
  if (v <= 0.68) return '2/3'
  return '100%'
}

function deductKey(v: number | undefined): string {
  if (v === undefined) return ''
  if (v <= 0.34) return '0.3333'
  if (v <= 0.51) return '0.5'
  if (v <= 0.68) return '0.6667'
  return '1'
}

function describeRegle(r: RegleDA): string {
  if (estFallback(r)) return 'Défaut (toujours)'
  const parts: string[] = []
  if (r.conditions.vendeur === 'AUTEUR') parts.push("Auteur vend")
  if (r.conditions.vendeur === 'ME') parts.push("ME vend")
  if (r.conditions.avecCommission === true) parts.push("avec commission")
  if (r.conditions.avecCommission === false) parts.push("sans commission")
  if (r.conditions.typeVente) parts.push(r.conditions.typeVente.toLowerCase())
  const tauxStr = r.deductionCommission
    ? `${r.taux}% − ${deductLabel(r.deductionCommission)}×comm.`
    : `${r.taux}%`
  return (parts.join(', ') || '—') + ` → ${tauxStr}`
}

// •"?•"? … d'une règle (une ligne du tableau) •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?

function LigneRegle({
  regle, index, total,
  onChange, onRemove, onUp, onDown,
}: {
  regle:    RegleDA
  index:    number
  total:    number
  onChange: (r: RegleDA) => void
  onRemove: () => void
  onUp:     () => void
  onDown:   () => void
}) {
  const { conditions: c } = regle
  const isFallback = estFallback(regle)

  function setCond(patch: Partial<ConditionRegle>) {
    onChange({ ...regle, conditions: { ...c, ...patch } })
  }

  function setVendeur(v: string) {
    const vendeur = v === '' ? undefined : v as VendeurType
    onChange({ ...regle, conditions: { ...c, vendeur } })
  }

  function setCommission(v: string) {
    const avecCommission = v === '' ? undefined : v === 'true'
    onChange({ ...regle, conditions: { ...c, avecCommission } })
  }

  function setTypeVente(v: string) {
    const typeVente = v === '' ? undefined : v as TypeVente
    onChange({ ...regle, conditions: { ...c, typeVente } })
  }

  return (
    <tr className={isFallback ? styles.fallbackRow : ''}>
      <td>
        <select
          className={`${styles.condSelect}${c.vendeur === undefined ? ` ${styles.any}` : ''}`}
          value={c.vendeur ?? ''}
          onChange={(e) => setVendeur(e.target.value)}
        >
          <option value="">Tous</option>
          <option value="AUTEUR">Auteur</option>
          <option value="ME">ME</option>
        </select>
      </td>
      <td>
        <select
          className={`${styles.condSelect}${c.avecCommission === undefined ? ` ${styles.any}` : ''}`}
          value={c.avecCommission === undefined ? '' : String(c.avecCommission)}
          onChange={(e) => setCommission(e.target.value)}
        >
          <option value="">Tous</option>
          <option value="true">Oui</option>
          <option value="false">Non</option>
        </select>
      </td>
      <td>
        <select
          className={`${styles.condSelect}${c.typeVente === undefined ? ` ${styles.any}` : ''}`}
          value={c.typeVente ?? ''}
          onChange={(e) => setTypeVente(e.target.value)}
        >
          <option value="">Tous</option>
          <option value="DIRECTE">Directe</option>
          <option value="SALON">Salon</option>
          <option value="DEPOT">Dépôt</option>
        </select>
      </td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            type="number"
            className={styles.tauxInput}
            value={regle.taux}
            min={0} max={100} step={0.5}
            onChange={(e) => onChange({ ...regle, taux: Number(e.target.value) })}
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-soft)' }}>%</span>
        </div>
      </td>
      <td>
        <select
          className={styles.condSelect}
          value={deductKey(regle.deductionCommission)}
          onChange={(e) => onChange({ ...regle, deductionCommission: e.target.value === '' ? undefined : Number(e.target.value) })}
        >
          {DEDUCT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </td>
      <td>
        <select
          className={styles.baseSelect}
          value={regle.base}
          onChange={(e) => onChange({ ...regle, base: e.target.value as BaseCalcul })}
          style={{ width: 70 }}
        >
          <option value="TTC">TTC</option>
          <option value="HT">HT</option>
        </select>
      </td>
      <td>
        {isFallback
          ? <span className={styles.fallbackBadge}>… défaut</span>
          : (
            <div className={styles.orderBtns}>
              <button className={styles.btnOrder} onClick={onUp}  disabled={index === 0}     title="Monter">↑</button>
              <button className={styles.btnOrder} onClick={onDown} disabled={index === total - 1} title="Descendre">↓</button>
            </div>
          )
        }
      </td>
      <td>
        {!isFallback && (
          <button className={styles.btnRemoveRow} onClick={onRemove} title="Supprimer">×</button>
        )}
      </td>
    </tr>
  )
}

// •"?•"? … complet d'un barème •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?

function EditeurDA({
  initial, onSave, onCancel, isLoading,
}: {
  initial:   { nom: string; lignes: RegleDA[] }
  onSave:    (nom: string, lignes: RegleDA[]) => void
  onCancel:  () => void
  isLoading: boolean
}) {
  const [nom,    setNom]    = useState(initial.nom)
  const [lignes, setLignes] = useState<RegleDA[]>(
    initial.lignes.length > 0 ? initial.lignes : [regleVide()]
  )

  function updateLigne(i: number, r: RegleDA) {
    setLignes(ls => ls.map((l, idx) => idx === i ? r : l))
  }

  function removeLigne(i: number) {
    setLignes(ls => ls.filter((_, idx) => idx !== i))
  }

  function addLigne() {
    // Insère avant la dernière si elle est fallback
    setLignes(ls => {
      const last = ls[ls.length - 1]
      if (last && estFallback(last) && ls.length > 0) {
        return [...ls.slice(0, -1), regleVide(), last]
      }
      return [...ls, regleVide()]
    })
  }

  function moveLigne(i: number, dir: -1 | 1) {
    setLignes(ls => {
      const next = [...ls]
      const tmp = next[i]!
      next[i] = next[i + dir]!
      next[i + dir] = tmp
      return next
    })
  }

  const canSave = nom.trim().length > 0 && lignes.length > 0

  return (
    <div className={styles.editor}>
      <div className={styles.editorTitle}>
        {initial.nom ? 'Modifier le barème' : 'Nouveau barème'}
      </div>

      <div>
        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>
          Nom du barème
        </label>
        <input
          className={styles.nomInput}
          placeholder="ex. Contrat standard"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          autoFocus
        />
      </div>

      <div>
        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
          Règles de calcul
        </label>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Vendeur</th>
                <th>Commission PDV</th>
                <th>Type de vente</th>
                <th>Taux</th>
                <th>Déduction comm.</th>
                <th>Base</th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((r, i) => (
                <LigneRegle
                  key={i}
                  regle={r} index={i} total={lignes.length}
                  onChange={(nr) => updateLigne(i, nr)}
                  onRemove={() => removeLigne(i)}
                  onUp={()   => moveLigne(i, -1)}
                  onDown={()  => moveLigne(i,  1)}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 8 }}>
          <button className={styles.btnAddRule} onClick={addLigne}>+ Ajouter une règle</button>
        </div>
      </div>

      <p className={styles.hint}>
        Les règles sont évaluées dans l'ordre — la première qui correspond au contexte de vente s'applique.
        Une ligne sans conditions sert de règle par défaut (fallback).
      </p>

      <MascoteBlock slug="reglages-da-bareme" />

      <div className={styles.editorFooter}>
        <button className={styles.btnCancel} onClick={onCancel}>Annuler</button>
        <button
          className={styles.btnSave}
          disabled={!canSave || isLoading}
          onClick={() => onSave(nom.trim(), lignes)}
        >
          {isLoading ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}

// •"?•"? Section principale •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?

type Mode =
  | { type: 'list' }
  | { type: 'create' }
  | { type: 'edit'; typeDA: TypeDA }

export function TypesDASection() {
  const [mode, setMode] = useState<Mode>({ type: 'list' })

  const { data: typesDA = [] } = useTypesDA()
  const create = useCreateTypeDA()
  const update = useUpdateTypeDA()
  const remove = useDeleteTypeDA()

  async function handleSave(nom: string, lignes: RegleDA[]) {
    const formule = { lignes }
    if (mode.type === 'create') {
      await create.mutateAsync({ id: generateUUID(), nom, formule })
    } else if (mode.type === 'edit') {
      await update.mutateAsync({ id: mode.typeDA.id, nom, formule })
    }
    setMode({ type: 'list' })
  }

  async function handleDelete(t: TypeDA) {
    if (t._count.contrats > 0) {
      alert(`Ce barème est utilisé par ${t._count.contrats} contrat(s) et ne peut pas être supprimé.`)
      return
    }
    if (!confirm(`Supprimer le barème "${t.nom}" ?`)) return
    await remove.mutateAsync(t.id)
  }

  const isSaving = create.isPending || update.isPending

  if (mode.type !== 'list') {
    return (
      <div className={styles.root}>
        <EditeurDA
          initial={
            mode.type === 'edit'
              ? { nom: mode.typeDA.nom, lignes: mode.typeDA.formule.lignes }
              : { nom: '', lignes: [
                  { conditions: { vendeur: 'AUTEUR' },                    taux: 50, base: 'TTC' },
                  { conditions: { vendeur: 'ME', avecCommission: false }, taux: 40, base: 'TTC' },
                  { conditions: { vendeur: 'ME', avecCommission: true },  taux: 40, base: 'TTC', deductionCommission: 0.6667 },
                  { conditions: {},                                       taux: 35, base: 'TTC' },
                ] }
          }
          onSave={handleSave}
          onCancel={() => setMode({ type: 'list' })}
          isLoading={isSaving}
        />
      </div>
    )
  }

  return (
    <div className={styles.root}>
      <div className={styles.list}>
        {typesDA.length === 0 && (
          <div className={styles.empty}>
            Aucun barème de droits d'auteur — créez-en un pour commencer.
          </div>
        )}
        {typesDA.map((t) => (
          <div key={t.id} className={styles.card}>
            <div className={styles.cardInfo}>
              <div className={styles.cardNom}>{t.nom}</div>
              <div className={styles.cardMeta}>
                {t.formule.lignes.length} règle{t.formule.lignes.length > 1 ? 's' : ''}
                {' · '}
                {t._count.contrats} contrat{t._count.contrats > 1 ? 's' : ''}
                {' · '}
                {t.formule.lignes.map(describeRegle).join(' / ')}
              </div>
            </div>
            <div className={styles.cardActions}>
              <button className={styles.btnEdit} onClick={() => setMode({ type: 'edit', typeDA: t })}>
                Modifier
              </button>
              <button className={styles.btnDelete} onClick={() => handleDelete(t)} title="Supprimer">×</button>
            </div>
          </div>
        ))}
      </div>

      <button className={styles.btnAdd} onClick={() => setMode({ type: 'create' })}>
        + Nouveau barème
      </button>

      <MascoteBlock slug="reglages-da-bareme" />
    </div>
  )
}




