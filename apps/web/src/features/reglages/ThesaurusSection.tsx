import { generateUUID } from '@/lib/utils'
import { useState } from 'react'
import { useThesauri, useCreateThesaurus, useDeleteThesaurus, useCreateThesaurusEntry } from './hooks/useThesaurus'
import type { Thesaurus, ThesaurusEntry } from './hooks/useThesaurus'
import { Modal } from '@/components/ui/Modal'
import styles from './ThesaurusSection.module.css'

export function ThesaurusSection() {
  const { data: thesauri = [], isLoading } = useThesauri()
  const createThesaurus = useCreateThesaurus()
  const deleteThesaurus = useDeleteThesaurus()

  const [selected, setSelected]       = useState<Thesaurus | null>(null)
  const [showCreate, setShowCreate]   = useState(false)
  const [newName, setNewName]         = useState('')
  const [newDesc, setNewDesc]         = useState('')
  const [creating, setCreating]       = useState(false)

  async function handleCreateThesaurus() {
    if (!newName.trim()) return
    setCreating(true)
    const created = await createThesaurus.mutateAsync({
      id:   generateUUID(),
      name: { fr: newName.trim() },
      description: newDesc.trim() ? { fr: newDesc.trim() } : undefined,
    })
    setNewName('')
    setNewDesc('')
    setShowCreate(false)
    setSelected(created)
    setCreating(false)
  }

  if (isLoading) return <p className={styles.loading}>Chargementâ€¦</p>

  return (
    <div className={styles.layout}>
      {/* Colonne gauche â€” liste des thÃ©saurus */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarTitle}>Vos thÃ©saurus</span>
          <button className={styles.btnAdd} onClick={() => setShowCreate(true)}>+</button>
        </div>

        {thesauri.length === 0 && (
          <div className={styles.empty}>
            <p>Aucun thÃ©saurus.</p>
            <button className={styles.btnEmptyAdd} onClick={() => setShowCreate(true)}>
              CrÃ©er le premier
            </button>
          </div>
        )}

        {thesauri.map((t) => (
          <button
            key={t.id}
            className={`${styles.thesaurusItem} ${selected?.id === t.id ? styles.thesaurusItemActive : ''}`}
            onClick={() => setSelected(t)}
          >
            <span className={styles.thesaurusName}>{t.nameFr}</span>
            <span className={styles.thesaurusCount}>{t.entries.length}</span>
          </button>
        ))}
      </div>

      {/* Colonne droite â€” dÃ©tail */}
      <div className={styles.detail}>
        {!selected && (
          <div className={styles.detailEmpty}>
            <p>SÃ©lectionnez un thÃ©saurus pour gÃ©rer ses entrÃ©es.</p>
          </div>
        )}
        {selected && (
          <ThesaurusDetail
            thesaurus={thesauri.find((t) => t.id === selected.id) ?? selected}
            onDelete={() => { deleteThesaurus.mutate(selected.id); setSelected(null) }}
          />
        )}
      </div>

      {/* Modal crÃ©ation thÃ©saurus */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nouveau thÃ©saurus" size="md">
        <div className={styles.createForm}>
          <div className={styles.field}>
            <label className={styles.label}>Nom <span className={styles.req}>*</span></label>
            <input
              className={styles.input}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex : Genre littÃ©raire, Type de reliureâ€¦"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateThesaurus() }}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Description</label>
            <textarea
              className={styles.textarea}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              rows={3}
              placeholder="Optionnel"
            />
          </div>
          <div className={styles.actions}>
            <button className={styles.btnSecondary} onClick={() => setShowCreate(false)}>Annuler</button>
            <button className={styles.btnPrimary} onClick={handleCreateThesaurus} disabled={creating || !newName.trim()}>
              {creating ? 'CrÃ©ationâ€¦' : 'CrÃ©er'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function ThesaurusDetail({ thesaurus, onDelete }: { thesaurus: Thesaurus; onDelete: () => void }) {
  const createEntry = useCreateThesaurusEntry()
  const [newLabel, setNewLabel]   = useState('')
  const [parentId, setParentId]   = useState<string>('')
  const [adding, setAdding]       = useState(false)

  const roots    = thesaurus.entries.filter((e) => !e.parentId)
  const children = (pid: string) => thesaurus.entries.filter((e) => e.parentId === pid)

  async function handleAddEntry() {
    if (!newLabel.trim()) return
    setAdding(true)
    await createEntry.mutateAsync({
      thesaurusId: thesaurus.id,
      id:          generateUUID(),
      label:       { fr: newLabel.trim() },
      position:    thesaurus.entries.length,
      parentId:    parentId || null,
    })
    setNewLabel('')
    setParentId('')
    setAdding(false)
  }

  return (
    <div className={styles.detailContent}>
      <div className={styles.detailHeader}>
        <div>
          <h2 className={styles.detailTitle}>{thesaurus.nameFr}</h2>
          <p className={styles.detailCount}>{thesaurus.entries.length} entrÃ©e{thesaurus.entries.length !== 1 ? 's' : ''}</p>
        </div>
        <button className={styles.btnDanger} onClick={() => { if (confirm('Supprimer ce thÃ©saurus ?')) onDelete() }}>
          Supprimer
        </button>
      </div>

      {/* Arbre des entrÃ©es */}
      <div className={styles.tree}>
        {roots.length === 0 && <p className={styles.treeEmpty}>Aucune entrÃ©e. Ajoutez-en ci-dessous.</p>}
        {roots.map((entry) => (
          <EntryNode key={entry.id} entry={entry} children={children(entry.id)} />
        ))}
      </div>

      {/* Formulaire ajout */}
      <div className={styles.addEntry}>
        <p className={styles.addEntryTitle}>Ajouter une entrÃ©e</p>
        <div className={styles.addEntryRow}>
          <input
            className={styles.input}
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="LibellÃ©â€¦"
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddEntry() }}
          />
          {roots.length > 0 && (
            <select className={styles.select} value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">EntrÃ©e racine</option>
              {roots.map((r) => <option key={r.id} value={r.id}>{r.labelFr}</option>)}
            </select>
          )}
          <button
            className={styles.btnPrimary}
            onClick={handleAddEntry}
            disabled={adding || !newLabel.trim()}
          >
            {adding ? 'â€¦' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EntryNode({ entry, children }: { entry: ThesaurusEntry; children: ThesaurusEntry[] }) {
  return (
    <div className={styles.treeNode}>
      <div className={styles.treeEntry}>
        <span className={styles.treeDot} />
        <span className={styles.treeLabel}>{entry.labelFr}</span>
      </div>
      {children.length > 0 && (
        <div className={styles.treeChildren}>
          {children.map((c) => (
            <div key={c.id} className={styles.treeEntry}>
              <span className={styles.treeChildDot} />
              <span className={styles.treeLabel}>{c.labelFr}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}




