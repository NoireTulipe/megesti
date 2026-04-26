import type { EntityType, FieldType } from '@megesti/shared'

export interface FixedField {
  id:        string
  labelFr:   string
  fieldType: FieldType
  required?: boolean
  halfWidth?: boolean
}

export interface FixedSection {
  id:     string
  label:  string
  fields: FixedField[]
}

// Champs système communs à tous les articles (non-custom, colonnes DB)
export const ARTICLE_FIXED_FIELDS: FixedField[] = [
  { id: 'nom',             labelFr: 'Nom',                   fieldType: 'text',     required: true },
  { id: 'reference',       labelFr: 'Référence',             fieldType: 'text',     halfWidth: true },
  { id: 'prixVenteHT',     labelFr: 'Prix de vente HT',      fieldType: 'number',   halfWidth: true },
  { id: 'prixAchatHT',     labelFr: "Prix d'achat HT",       fieldType: 'number',   halfWidth: true },
  { id: 'prixAchatLotHT',  labelFr: 'Prix lot HT',           fieldType: 'number',   halfWidth: true },
  { id: 'prixAchatLotQte', labelFr: 'Qté par lot',           fieldType: 'number',   halfWidth: true },
  { id: 'stock',           labelFr: 'Stock',                 fieldType: 'number',   halfWidth: true },
  { id: 'description',     labelFr: 'Description',           fieldType: 'textarea' },
  { id: 'imageUrl',        labelFr: 'Image (URL)',            fieldType: 'text' },
]

// Champs librairie — affichés uniquement si rayon.isLibrairie = true
export const ARTICLE_LIBRAIRE_FIELDS: FixedField[] = [
  { id: 'isbn',            labelFr: 'ISBN',                  fieldType: 'text',   halfWidth: true },
  { id: 'datePublication', labelFr: 'Date de publication',   fieldType: 'date',   halfWidth: true },
]

export const FIXED_SECTIONS: Record<EntityType, FixedSection[]> = {
  auteur: [
    {
      id: 'identite', label: 'Identité',
      fields: [
        { id: 'prenom',     labelFr: 'Prénom',    fieldType: 'text', halfWidth: true },
        { id: 'nom',        labelFr: 'Nom',        fieldType: 'text', required: true, halfWidth: true },
        { id: 'pseudonyme', labelFr: 'Pseudonyme', fieldType: 'text' },
      ],
    },
    {
      id: 'contact', label: 'Contact',
      fields: [
        { id: 'email', labelFr: 'Email', fieldType: 'text' },
      ],
    },
    {
      id: 'biographie', label: 'Biographie',
      fields: [
        { id: 'bio',      labelFr: 'Biographie',  fieldType: 'textarea' },
        { id: 'photoUrl', labelFr: 'Photo (URL)', fieldType: 'text' },
      ],
    },
  ],
  maisonEdition: [
    {
      id: 'informations', label: 'Informations',
      fields: [
        { id: 'nom',   labelFr: 'Nom',   fieldType: 'text', required: true },
        { id: 'siret', labelFr: 'SIRET', fieldType: 'text', halfWidth: true },
        { id: 'email', labelFr: 'Email', fieldType: 'text', halfWidth: true },
      ],
    },
    {
      id: 'adresse', label: 'Adresse',
      fields: [
        { id: 'telephone', labelFr: 'Téléphone', fieldType: 'text' },
        { id: 'adresse',   labelFr: 'Adresse',   fieldType: 'textarea' },
      ],
    },
  ],
  depotLibraire: [
    {
      id: 'informations', label: 'Informations',
      fields: [
        { id: 'nom',     labelFr: 'Nom du dépôt', fieldType: 'text', required: true },
        { id: 'contact', labelFr: 'Contact',       fieldType: 'text' },
      ],
    },
    {
      id: 'adresse', label: 'Adresse',
      fields: [
        { id: 'adresse', labelFr: 'Adresse', fieldType: 'textarea' },
      ],
    },
  ],
  pointDeVente: [
    {
      id: 'informations', label: 'Informations',
      fields: [
        { id: 'nom',                labelFr: 'Nom du point de vente', fieldType: 'text',   required: true },
        { id: 'commissionFixe',     labelFr: 'Commission fixe (€)',   fieldType: 'number', halfWidth: true },
        { id: 'commissionPourcent', labelFr: 'Commission (%)',         fieldType: 'number', halfWidth: true },
      ],
    },
    {
      id: 'encaissement', label: 'Encaissement',
      fields: [
        { id: 'encaissementDirect', labelFr: 'Encaissement direct (ME)', fieldType: 'boolean' },
      ],
    },
  ],
  salon: [
    {
      id: 'informations', label: 'Informations',
      fields: [
        { id: 'nom',  labelFr: 'Nom du salon', fieldType: 'text', required: true },
        { id: 'lieu', labelFr: 'Lieu',          fieldType: 'text' },
      ],
    },
    {
      id: 'dates', label: 'Dates',
      fields: [
        { id: 'dateDebut', labelFr: 'Date de début', fieldType: 'date', halfWidth: true },
        { id: 'dateFin',   labelFr: 'Date de fin',   fieldType: 'date', halfWidth: true },
      ],
    },
  ],
}
