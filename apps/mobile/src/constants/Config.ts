import Constants from 'expo-constants'

// Hôte de production — défaut du build release (pas de Metro, donc pas de hostUri).
export const PROD_HOST = 'https://api.megesti.com'

// Fallback de développement local, au cas où hostUri serait absent en dev.
const DEV_HOST = 'http://192.168.1.100:3001'

// En dev (Expo Go / Metro), hostUri expose l'IP de la machine de dev → on l'utilise.
// En prod (build release), hostUri est absent → on tombe sur l'API de production.
const host = Constants.expoConfig?.hostUri
  ? `http://${Constants.expoConfig.hostUri!.split(':')[0]}:3001`
  : PROD_HOST

const apiBaseUrl = `${host}/api`

export const Config = {
  apiBaseUrl:          apiBaseUrl,
  uploadBaseUrl:       host,
  sumupAffiliateKey:   'sup_afk_k9GalLMZmEcZyzmJXC8pppIHmpC6CLRo',   // clé développeur MeGesti sur dashboard.sumup.com
} as const

// URL par défaut figée au démarrage, avant toute mutation par le DevMenu.
// Sert de cible au bouton « Réinitialiser » : en dev = IP locale, en prod = API prod.
export const INITIAL_API_URL = apiBaseUrl
// URL de production stable, pour un reset explicite vers la prod si besoin.
export const PROD_API_URL = `${PROD_HOST}/api`
