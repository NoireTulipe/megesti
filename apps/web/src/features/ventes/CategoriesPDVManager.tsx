import { generateUUID } from '@/lib/utils'
import { useState } from 'react'
import {
  useCategoriesPointDeVente,
  useCreateCategoriePointDeVente,
  useUpdateCategoriePointDeVente,
  useDeleteCategoriePointDeVente,
} from './hooks/useCategoriesPointDeVente'
import styles from './CategoriesPDVManager.module.css'

export function CategoriesPDVManager() {
  const { data: categories = [], isLoading } = useCategoriesPointDeVente()
  const create  = useCreateCategoriePointDeVente()
  const update  = useUpdateCategoriePointDeVente()
  const remove  = useDeleteCategoriePointDeVente()

  const [newNom,   setNewNom]   = useState('')
  const [editId,   setEditId]   = useState<string | null>(null)
  const [editNom,  setEditNom]  = useState('')
  const [isAdding, setIsAdding] = useState(false)

  async function handleAdd() {
    if (!newNom.trim()) return
    setIsAdding(true)
    try {
      await create.mutateAsync({ id: generateUUID(), nom: newNom.trim(), ordre: categories.length })
      setNewNom('')
    } finally {
      setIsAdding(false)
    }
  }

  async function handleUpdate(id: string) {
    if (!editNom.trim()) return
    await update.mutateAsync({ id, nom: editNom.trim() })
    setEditId(null)
  }

  function startEdit(id: string, nom: string) {
    setEditId(id)
    setEditNom(nom)
  }

  return (
    <div className={styles.root}>
      {isLoading && <p className={styles.loading}>Chargementâ€¦</p>}

      <ul className={styles.list}>
        {categories.map((cat) => (
          <li key={cat.id} className={styles.item}>
            {editId === cat.id ? (
              <div className={styles.editRow}>
                <input
                  className={styles.input}
                  value={editNom}
                  onChange={(e) => setEditNom(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleUpdate(cat.id); if (e.key === 'Escape') setEditId(null) }}
                  autoFocus
                />
                <button className={styles.btnSave}   onClick={() => handleUpdate(cat.id)}>âœ“</button>
                <button className={styles.btnCancel} onClick={() => setEditId(null)}>âœ•</button>
              </div>
            ) : (
              <div className={styles.readRow}>
                <span className={styles.nom}>{cat.nom}</span>
                <div className={styles.actions}>
                  <button className={styles.btnEdit}   onClick={() => startEdit(cat.id, cat.nom)}>âœŽ</button>
                  <button
                    className={styles.btnDelete}
                    onClick={() => { if (confirm(`Supprimer Â« ${cat.nom} Â» ?`)) remove.mutate(cat.id) }}
                  >âœ•</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {categories.length === 0 && !isLoading && (
        <p className={styles.empty}>Aucune catÃ©gorie. Ajoutez-en une ci-dessous.</p>
      )}

      <div className={styles.addRow}>
        <input
          className={styles.input}
          value={newNom}
          onChange={(e) => setNewNom(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
          placeholder="Nouvelle catÃ©gorie (ex : Salon, Centre commercialâ€¦)"
        />
        <button className={styles.btnAdd} onClick={handleAdd} disabled={isAdding || !newNom.trim()}>
          + Ajouter
        </button>
      </div>
    </div>
  )
}




