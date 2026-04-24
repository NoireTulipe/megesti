import type { IconName } from '@/components/Icon'

export interface MetricData {
  label: string
  rawValue: number
  unit: string
  trend: number
  trendLabel: string
  sparkData: number[]
  color: string
  accent: string
}

export interface AlertData {
  id: string
  iconName: IconName
  text: string
  sub?: string
}

export interface ActivityData {
  id: string
  initials: string
  color: string
  text: string
  time: string
  detail?: string
  isLast?: boolean
}

export interface QuickActionData {
  id: string
  label: string
  iconName: IconName
  color: string
  bgColor: string
  sub: string
}

export const METRIC_CA: MetricData = {
  label: "Chiffre d'affaires",
  rawValue: 8340,
  unit: '€',
  trend: 12,
  trendLabel: '+12 %',
  sparkData: [52, 58, 61, 55, 67, 72, 68, 74, 80, 83, 78, 84],
  color: '#1C3A5E',
  accent: '#2A5F8A',
}

export const METRIC_COMMANDES: MetricData = {
  label: 'Commandes',
  rawValue: 47,
  unit: 'cmd',
  trend: 7,
  trendLabel: '+7 %',
  sparkData: [28, 31, 35, 30, 38, 40, 37, 44, 42, 45, 47, 47],
  color: '#D95F3B',
  accent: '#E8633A',
}

export const METRIC_DROITS: MetricData = {
  label: 'Droits à reverser',
  rawValue: 1260,
  unit: '€',
  trend: -3,
  trendLabel: '−3 %',
  sparkData: [14, 16, 15, 17, 13, 14, 12, 13, 13, 12, 12, 11],
  color: '#C9933A',
  accent: '#D9A34A',
}

export const ALERTS: AlertData[] = [
  {
    id: '1',
    iconName: 'book',
    text: 'Stock faible sur 2 titres',
    sub: "Le Phare d'Aubeterre · Carnets de Finistère",
  },
  {
    id: '2',
    iconName: 'receipt',
    text: '2 dépôts librairie à relancer',
    sub: "L'Arbre à Lettres · Le Passage (Rennes)",
  },
  {
    id: '3',
    iconName: 'clock',
    text: 'Salon du livre de Rennes — dans 5 jours',
    sub: 'Vérifier la caisse et les exemplaires dédicacés',
  },
]

export const ACTIVITY: ActivityData[] = [
  {
    id: '1',
    initials: 'ML',
    color: 'linear-gradient(135deg,#C9933A,#E8633A)',
    text: "Commande · <strong>Lib. Passages</strong> — 6 ex. <em>Le Phare d'Aubeterre</em>",
    time: 'Ce matin',
  },
  {
    id: '2',
    initials: 'SB',
    color: 'linear-gradient(135deg,#3A7A5E,#5C8F6A)',
    text: 'Bon de fab. validé · <strong>Carnets de Finistère</strong> — 500 ex.',
    time: 'Ce matin',
    detail: 'Imprimerie Cloître, Brest',
  },
  {
    id: '3',
    initials: 'ML',
    color: 'linear-gradient(135deg,#C9933A,#E8633A)',
    text: "Facture · <strong>L'Arbre à Lettres</strong> — 340 €",
    time: 'Hier',
  },
  {
    id: '4',
    initials: 'PV',
    color: 'linear-gradient(135deg,#4A6FA5,#2A5A8E)',
    text: 'Contrat signé · <strong>P. Veyrat</strong> — <em>Les Îles Grises</em>',
    time: 'Hier',
  },
  {
    id: '5',
    initials: 'SB',
    color: 'linear-gradient(135deg,#3A7A5E,#5C8F6A)',
    text: "Stock · <em>Le Phare d'Aubeterre</em> — <strong>12 ex.</strong> restants",
    time: 'Lundi',
    isLast: true,
  },
]

export const QUICK_ACTIONS: QuickActionData[] = [
  { id: 'sale',    label: 'Nouvelle vente', iconName: 'tag',     color: 'var(--ink)',   bgColor: 'var(--ink-faint)',   sub: 'Enregistrer' },
  { id: 'book',    label: 'Nouveau livre',  iconName: 'book',    color: 'var(--terra)', bgColor: 'var(--terra-light)', sub: 'Au catalogue' },
  { id: 'event',   label: 'Événement',      iconName: 'salons',  color: 'var(--sage)',  bgColor: 'var(--sage-light)',  sub: 'Salon, dédicace' },
  { id: 'invoice', label: 'Facture',        iconName: 'receipt', color: 'var(--gold)',  bgColor: 'var(--gold-light)',  sub: 'Générer' },
]

export const IN_PREP = {
  title: 'Les Îles Grises',
  author: 'Pierre Veyrat',
  release: 'Printemps 2027',
  progress: 35,
  progressLabel: '35 % — manuscrit relu',
}
