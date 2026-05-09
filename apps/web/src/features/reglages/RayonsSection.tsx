import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMascoteDialog } from '@/hooks/useMascoteDialog'
import {
  DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, arrayMove, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  useRayons, useCreateRayon, useUpdateRayon, useDeleteRayon,
  useCreateCategorie, useUpdateCategorie, useDeleteCategorie,
} from '../catalogue/hooks/useRayons'
import type { Rayon, Categorie } from '../catalogue/types'
import styles from './RayonsSection.module.css'

// ── Mascotte sidebar ─────────────────────────────────────────────────────────

const BookIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ display:'inline', verticalAlign:'middle' }}>
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>
)

function MascotSidebar({ state, onCreateRayon }: {
  state: 'empty' | 'no-cats' | 'ready'
  onCreateRayon: () => void
}) {
  const slugMap = { empty: 'reglages-rayons-vide', 'no-cats': 'reglages-rayons-sans-categories', ready: 'reglages-rayons-pret' }
  const { data } = useMascoteDialog(slugMap[state])
  const navigate = useNavigate()

  if (!data) return null

  return (
    <div className={styles.mascotSidebar}>
      <img src={`/img/mascotte/${data.imageName}`} alt="" className={styles.sidebarImg} />
      <div className={styles.sidebarBubblesCol}>
        {data.bulles.map((b, i) => (
          <div key={i} className={styles.sidebarBubble}>
            {b.title && <p className={styles.sidebarTitle}>{b.title}</p>}
            <p className={styles.sidebarText}>{b.text}</p>
            {b.cta && (
              <button className={styles.sidebarCta} onClick={() => {
                if (b.cta!.href) navigate(b.cta!.href)
                else onCreateRayon()
              }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                {b.cta!.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function RayonsSection() {
  const { data: rayonsFromApi = [] } = useRayons()
  const createRayon    = useCreateRayon()
  const updateRayon    = useUpdateRayon()
  const deleteRayon    = useDeleteRayon()
  const createCategorie = useCreateCategorie()
  const updateCategorie = useUpdateCategorie()
  const deleteCategorie = useDeleteCategorie()

  const [rayons, setRayons]           = useState<Rayon[]>([])
  const [expanded, setExpanded]       = useState<Set<string>>(new Set())
  const [newRayonName, setNewRayonName] = useState('')
  const [showNewRayon, setShowNewRayon] = useState(false)
  const [activeId, setActiveId]       = useState<string | null>(null)

  useEffect(() => { setRayons(rayonsFromApi) }, [rayonsFromApi])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // ── DnD ──────────────────────────────────────────────────────────────────────

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over || active.id === over.id) return
    const aStr = active.id as string, oStr = over.id as string

    // Réordonner les rayons
    if (aStr.startsWith('rayon::') && oStr.startsWith('rayon::')) {
      const fi = rayons.findIndex((r) => `rayon::${r.id}` === aStr)
      const ti = rayons.findIndex((r) => `rayon::${r.id}` === oStr)
      if (fi < 0 || ti < 0) return
      const reordered = arrayMove(rayons, fi, ti)
      setRayons(reordered)
      reordered.forEach((r, i) => {
        if (r.ordre !== i) updateRayon.mutate({ id: r.id, ordre: i })
      })
      return
    }

    // Réordonner les catégories dans un rayon
    if (aStr.startsWith('cat::') && oStr.startsWith('cat::')) {
      const [, aRayonId, aCatId] = aStr.split('::')
      const [, oRayonId, oCatId] = oStr.split('::')
      if (aRayonId !== oRayonId) return
      setRayons((prev) => prev.map((r) => {
        if (r.id !== aRayonId) return r
        const fi = r.categories.findIndex((c) => c.id === aCatId)
        const ti = r.categories.findIndex((c) => c.id === oCatId)
        const reordered = arrayMove(r.categories, fi, ti)
        reordered.forEach((c, i) => {
          if (c.ordre !== i) updateCategorie.mutate({ id: c.id, ordre: i })
        })
        return { ...r, categories: reordered }
      }))
    }
  }

  // ── Rayons ───────────────────────────────────────────────────────────────────

  async function handleAddRayon() {
    const nom = newRayonName.trim()
    if (!nom) return
    const id = crypto.randomUUID()
    await createRayon.mutateAsync({ id, nom, isLibrairie: false })
    setExpanded((prev) => new Set(prev).add(id))
    setNewRayonName('')
    setShowNewRayon(false)
  }

  async function handleRenameRayon(id: string, nom: string) {
    setRayons((prev) => prev.map((r) => r.id === id ? { ...r, nom } : r))
    await updateRayon.mutateAsync({ id, nom })
  }

  async function handleToggleLibrairie(id: string, current: boolean) {
    const newIsLibrairie = !current
    // TVA auto : 5.5 % mode librairie, 20 % mode général
    const newTVA = newIsLibrairie ? 5.5 : 20
    setRayons((prev) => prev.map((r) =>
      r.id === id ? { ...r, isLibrairie: newIsLibrairie, tauxTVA: String(newTVA) } : r
    ))
    await updateRayon.mutateAsync({ id, isLibrairie: newIsLibrairie, tauxTVA: newTVA })
  }

  async function handleUpdateTVA(id: string, taux: number) {
    setRayons((prev) => prev.map((r) => r.id === id ? { ...r, tauxTVA: String(taux) } : r))
    await updateRayon.mutateAsync({ id, tauxTVA: taux })
  }

  async function handleDeleteRayon(id: string, nom: string) {
    if (!confirm(`Supprimer le rayon « ${nom} » et toutes ses catégories ?`)) return
    try {
      setRayons((prev) => prev.filter((r) => r.id !== id))
      await deleteRayon.mutateAsync(id)
    } catch {
      alert('Impossible de supprimer ce rayon : il contient des articles.')
      setRayons(rayonsFromApi)
    }
  }

  // ── Catégories ───────────────────────────────────────────────────────────────

  async function handleAddCategorie(rayonId: string) {
    const nom = prompt('Nom de la catégorie :')?.trim()
    if (!nom) return
    const id = crypto.randomUUID()
    await createCategorie.mutateAsync({ id, rayonId, nom })
  }

  async function handleRenameCategorie(id: string, rayonId: string, nom: string) {
    setRayons((prev) => prev.map((r) =>
      r.id !== rayonId ? r : {
        ...r, categories: r.categories.map((c) => c.id === id ? { ...c, nom } : c),
      }
    ))
    await updateCategorie.mutateAsync({ id, nom })
  }

  async function handleDeleteCategorie(id: string, rayonId: string, nom: string) {
    if (!confirm(`Supprimer la catégorie « ${nom} » ?`)) return
    setRayons((prev) => prev.map((r) =>
      r.id !== rayonId ? r : { ...r, categories: r.categories.filter((c) => c.id !== id) }
    ))
    await deleteCategorie.mutateAsync(id)
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const rayonIds   = rayons.map((r) => `rayon::${r.id}`)
  const totalCats  = rayons.reduce((n, r) => n + r.categories.length, 0)

  const mascotState = rayons.length === 0 ? 'empty' as const
    : totalCats === 0 ? 'no-cats' as const
    : 'ready' as const

  return (
    <div className={styles.root}>

      {/* ── Colonne gauche : liste + formulaire ── */}
      <div className={styles.content}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={({ active }) => setActiveId(active.id as string)}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={rayonIds} strategy={verticalListSortingStrategy}>
            <div className={styles.list}>
              {rayons.map((rayon) => (
                <SortableRayon
                  key={rayon.id}
                  rayon={rayon}
                  isExpanded={expanded.has(rayon.id)}
                  onToggleExpand={() =>
                    setExpanded((prev) => {
                      const next = new Set(prev)
                      next.has(rayon.id) ? next.delete(rayon.id) : next.add(rayon.id)
                      return next
                    })
                  }
                  onRename={handleRenameRayon}
                  onToggleLibrairie={handleToggleLibrairie}
                  onUpdateTVA={handleUpdateTVA}
                  onDelete={handleDeleteRayon}
                  onAddCategorie={handleAddCategorie}
                  onRenameCategorie={handleRenameCategorie}
                  onDeleteCategorie={handleDeleteCategorie}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeId && (
              <div className={styles.dragGhost}>
                {activeId.startsWith('rayon::')
                  ? rayons.find((r) => `rayon::${r.id}` === activeId)?.nom
                  : (() => {
                      const [, rayonId, catId] = activeId.split('::')
                      return rayons.find((r) => r.id === rayonId)
                        ?.categories.find((c) => c.id === catId)?.nom
                    })()
                }
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {showNewRayon ? (
          <div className={styles.newForm}>
            <input
              className={styles.newInput}
              value={newRayonName}
              onChange={(e) => setNewRayonName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddRayon()
                if (e.key === 'Escape') { setShowNewRayon(false); setNewRayonName('') }
              }}
              placeholder="Nom du rayon (ex : Goodies, Poster…)"
              autoFocus
            />
            <button className={styles.btnConfirm} onClick={handleAddRayon}
              disabled={!newRayonName.trim() || createRayon.isPending}>
              {createRayon.isPending ? '…' : 'Créer'}
            </button>
            <button className={styles.btnCancel} onClick={() => { setShowNewRayon(false); setNewRayonName('') }}>✕</button>
          </div>
        ) : rayons.length > 0 ? (
          <button className={styles.btnAddRayon} onClick={() => setShowNewRayon(true)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nouveau rayon
          </button>
        ) : null}
      </div>

      {/* ── Colonne droite : mascotte permanente ── */}
      <MascotSidebar state={mascotState} onCreateRayon={() => setShowNewRayon(true)} />

    </div>
  )
}

// ── Rayon sortable ────────────────────────────────────────────────────────────

interface SortableRayonProps {
  rayon:             Rayon
  isExpanded:        boolean
  onToggleExpand:    () => void
  onRename:          (id: string, nom: string) => Promise<void>
  onToggleLibrairie: (id: string, current: boolean) => Promise<void>
  onUpdateTVA:       (id: string, taux: number) => Promise<void>
  onDelete:          (id: string, nom: string) => Promise<void>
  onAddCategorie:    (rayonId: string) => Promise<void>
  onRenameCategorie: (id: string, rayonId: string, nom: string) => Promise<void>
  onDeleteCategorie: (id: string, rayonId: string, nom: string) => Promise<void>
}

function SortableRayon({
  rayon, isExpanded, onToggleExpand, onRename, onToggleLibrairie, onUpdateTVA,
  onDelete, onAddCategorie, onRenameCategorie, onDeleteCategorie,
}: SortableRayonProps) {
  const [editing,     setEditing]     = useState(false)
  const [draft,       setDraft]       = useState(rayon.nom)
  const [editingTVA,  setEditingTVA]  = useState(false)
  const [draftTVA,    setDraftTVA]    = useState(String(Number(rayon.tauxTVA)))

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id:   `rayon::${rayon.id}`,
    data: { type: 'rayon' },
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  async function commitRename() {
    const nom = draft.trim()
    if (nom && nom !== rayon.nom) await onRename(rayon.id, nom)
    setEditing(false)
  }

  async function commitTVA() {
    const taux = parseFloat(draftTVA.replace(',', '.'))
    if (!isNaN(taux) && taux >= 0 && taux <= 100) await onUpdateTVA(rayon.id, taux)
    setEditingTVA(false)
  }

  const catIds = rayon.categories.map((c) => `cat::${rayon.id}::${c.id}`)

  return (
    <div ref={setNodeRef} style={style} className={`${styles.rayonItem} ${isDragging ? styles.dragging : ''}`}>
      {/* ── Header rayon ────────────────────────────────────────── */}
      <div className={styles.rayonHeader}>
        <span className={styles.dragHandle} {...attributes} {...listeners}>
          <DragDotsIcon />
        </span>

        {editing ? (
          <input
            className={styles.editInput}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter')  commitRename()
              if (e.key === 'Escape') { setDraft(rayon.nom); setEditing(false) }
            }}
            autoFocus
          />
        ) : (
          <span
            className={styles.rayonNom}
            onDoubleClick={() => { setDraft(rayon.nom); setEditing(true) }}
            title="Double-cliquer pour renommer"
          >
            {rayon.nom}
          </span>
        )}

        <span className={styles.catCount}>
          {rayon.categories.length} catégorie{rayon.categories.length !== 1 ? 's' : ''}
        </span>

        {/* Taux TVA éditable */}
        {editingTVA ? (
          <span className={styles.tvaBadgeEdit}>
            <input
              className={styles.tvaInput}
              value={draftTVA}
              onChange={e => setDraftTVA(e.target.value)}
              onBlur={commitTVA}
              onKeyDown={e => { if (e.key === 'Enter') commitTVA(); if (e.key === 'Escape') { setDraftTVA(String(Number(rayon.tauxTVA))); setEditingTVA(false) } }}
              autoFocus
              inputMode="decimal"
            />
            <span className={styles.tvaUnit}>%</span>
          </span>
        ) : (
          <button
            className={styles.tvaBadge}
            onClick={() => { setDraftTVA(String(Number(rayon.tauxTVA))); setEditingTVA(true) }}
            title="Cliquer pour modifier le taux TVA"
          >
            TVA {Number(rayon.tauxTVA)} %
          </button>
        )}

        <button
          className={`${styles.btnLibrairie} ${rayon.isLibrairie ? styles.btnLibrairieActive : ''}`}
          onClick={() => onToggleLibrairie(rayon.id, rayon.isLibrairie)}
          title={rayon.isLibrairie ? 'Mode librairie actif — TVA 5,5 % · ISBN · Auteurs' : 'Activer le mode librairie (livres)'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
        </button>

        <button
          className={styles.btnIconSm}
          onClick={() => onAddCategorie(rayon.id)}
          title="Ajouter une catégorie"
        >+</button>

        <button
          className={styles.btnExpand}
          onClick={onToggleExpand}
          title={isExpanded ? 'Réduire' : 'Développer'}
          aria-expanded={isExpanded}
        >
          {isExpanded ? '▾' : '▸'}
        </button>

        <button
          className={`${styles.btnIconSm} ${styles.btnDelete}`}
          onClick={() => onDelete(rayon.id, rayon.nom)}
          title="Supprimer le rayon"
        >×</button>
      </div>

      {/* ── Catégories ──────────────────────────────────────────── */}
      {isExpanded && (
        <div className={styles.catList}>
          {rayon.categories.length === 0 && (
            <span className={styles.catEmpty}>Aucune catégorie — cliquez sur + pour en ajouter.</span>
          )}
          <SortableContext items={catIds} strategy={verticalListSortingStrategy}>
            {rayon.categories.map((cat) => (
              <SortableCategorie
                key={cat.id}
                cat={cat}
                rayonId={rayon.id}
                onRename={onRenameCategorie}
                onDelete={onDeleteCategorie}
              />
            ))}
          </SortableContext>
        </div>
      )}
    </div>
  )
}

// ── Catégorie sortable ────────────────────────────────────────────────────────

interface SortableCategorieProps {
  cat:      Categorie
  rayonId:  string
  onRename: (id: string, rayonId: string, nom: string) => Promise<void>
  onDelete: (id: string, rayonId: string, nom: string) => Promise<void>
}

function SortableCategorie({ cat, rayonId, onRename, onDelete }: SortableCategorieProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(cat.nom)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id:   `cat::${rayonId}::${cat.id}`,
    data: { type: 'categorie', rayonId },
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  async function commitRename() {
    const nom = draft.trim()
    if (nom && nom !== cat.nom) await onRename(cat.id, rayonId, nom)
    setEditing(false)
  }

  return (
    <div ref={setNodeRef} style={style} className={`${styles.catItem} ${isDragging ? styles.dragging : ''}`}>
      <span className={styles.catHandle} {...attributes} {...listeners}>
        <DragDotsSmIcon />
      </span>

      {editing ? (
        <input
          className={styles.catEditInput}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter')  commitRename()
            if (e.key === 'Escape') { setDraft(cat.nom); setEditing(false) }
          }}
          autoFocus
        />
      ) : (
        <span
          className={styles.catNom}
          onDoubleClick={() => { setDraft(cat.nom); setEditing(true) }}
          title="Double-cliquer pour renommer"
        >
          {cat.nom}
        </span>
      )}

      <button
        className={`${styles.btnIconXs} ${styles.btnDelete}`}
        onClick={() => onDelete(cat.id, rayonId, cat.nom)}
        title="Supprimer"
      >×</button>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function DragDotsIcon() {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" fill="none" aria-hidden>
      {[2, 6, 10, 14].map((y) => (
        <g key={y}>
          <circle cx="2.5" cy={y} r="1.5" fill="currentColor" />
          <circle cx="7.5" cy={y} r="1.5" fill="currentColor" />
        </g>
      ))}
    </svg>
  )
}

function DragDotsSmIcon() {
  return (
    <svg width="8" height="12" viewBox="0 0 8 12" fill="none" aria-hidden>
      {[2, 6, 10].map((y) => (
        <g key={y}>
          <circle cx="2" cy={y} r="1.2" fill="currentColor" />
          <circle cx="6" cy={y} r="1.2" fill="currentColor" />
        </g>
      ))}
    </svg>
  )
}
