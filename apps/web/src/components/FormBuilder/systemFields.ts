import type { EntityType } from '@megesti/shared'
import type { BuilderField } from './types'

export const SYSTEM_FIELDS: Record<EntityType, BuilderField[]> = {
  livre: [
    { id: 'sys::titre',           labelFr: 'Titre',               fieldType: 'text',     required: true,  thesaurusId: null, options: null, isSystem: true },
    { id: 'sys::isbn',            labelFr: 'ISBN',                fieldType: 'text',     required: false, thesaurusId: null, options: null, isSystem: true, halfWidth: true },
    { id: 'sys::prix',            labelFr: 'Prix',                fieldType: 'number',   required: false, thesaurusId: null, options: null, isSystem: true, halfWidth: true },
    { id: 'sys::datePublication', labelFr: 'Date de publication', fieldType: 'date',     required: false, thesaurusId: null, options: null, isSystem: true, halfWidth: true },
    { id: 'sys::genre',           labelFr: 'Genre',               fieldType: 'text',     required: false, thesaurusId: null, options: null, isSystem: true, halfWidth: true },
    { id: 'sys::description',     labelFr: 'Description',         fieldType: 'textarea', required: false, thesaurusId: null, options: null, isSystem: true },
    { id: 'sys::couvertureUrl',   labelFr: 'Couverture (URL)',    fieldType: 'text',     required: false, thesaurusId: null, options: null, isSystem: true },
  ],
  auteur: [
    { id: 'sys::prenom',     labelFr: 'Prénom',      fieldType: 'text',     required: false, thesaurusId: null, options: null, isSystem: true, halfWidth: true },
    { id: 'sys::nom',        labelFr: 'Nom',         fieldType: 'text',     required: true,  thesaurusId: null, options: null, isSystem: true, halfWidth: true },
    { id: 'sys::pseudonyme', labelFr: 'Pseudonyme',  fieldType: 'text',     required: false, thesaurusId: null, options: null, isSystem: true, halfWidth: true },
    { id: 'sys::email',      labelFr: 'Email',       fieldType: 'text',     required: false, thesaurusId: null, options: null, isSystem: true, halfWidth: true },
    { id: 'sys::bio',        labelFr: 'Biographie',  fieldType: 'textarea', required: false, thesaurusId: null, options: null, isSystem: true },
    { id: 'sys::photoUrl',   labelFr: 'Photo (URL)', fieldType: 'text',     required: false, thesaurusId: null, options: null, isSystem: true },
  ],
  maisonEdition: [
    { id: 'sys::nom',       labelFr: 'Nom',        fieldType: 'text',     required: true,  thesaurusId: null, options: null, isSystem: true },
    { id: 'sys::siret',     labelFr: 'SIRET',      fieldType: 'text',     required: false, thesaurusId: null, options: null, isSystem: true, halfWidth: true },
    { id: 'sys::email',     labelFr: 'Email',      fieldType: 'text',     required: false, thesaurusId: null, options: null, isSystem: true, halfWidth: true },
    { id: 'sys::telephone', labelFr: 'Téléphone',  fieldType: 'text',     required: false, thesaurusId: null, options: null, isSystem: true, halfWidth: true },
    { id: 'sys::adresse',   labelFr: 'Adresse',    fieldType: 'textarea', required: false, thesaurusId: null, options: null, isSystem: true },
  ],
  depotLibraire: [
    { id: 'sys::nom',     labelFr: 'Nom du dépôt', fieldType: 'text',     required: true,  thesaurusId: null, options: null, isSystem: true },
    { id: 'sys::adresse', labelFr: 'Adresse',      fieldType: 'textarea', required: false, thesaurusId: null, options: null, isSystem: true, halfWidth: true },
    { id: 'sys::contact', labelFr: 'Contact',      fieldType: 'text',     required: false, thesaurusId: null, options: null, isSystem: true, halfWidth: true },
  ],
  salon: [
    { id: 'sys::nom',       labelFr: 'Nom du salon',  fieldType: 'text', required: true,  thesaurusId: null, options: null, isSystem: true },
    { id: 'sys::lieu',      labelFr: 'Lieu',           fieldType: 'text', required: false, thesaurusId: null, options: null, isSystem: true, halfWidth: true },
    { id: 'sys::dateDebut', labelFr: 'Date de début',  fieldType: 'date', required: false, thesaurusId: null, options: null, isSystem: true, halfWidth: true },
    { id: 'sys::dateFin',   labelFr: 'Date de fin',    fieldType: 'date', required: false, thesaurusId: null, options: null, isSystem: true, halfWidth: true },
  ],
}
