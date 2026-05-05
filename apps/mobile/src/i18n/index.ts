import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Au démarrage, on utilise les locales partagées du package shared s'il existe,
// sinon on définit les locales minimales ici.
import fr from './fr.json'
import en from './en.json'

i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr }, en: { translation: en } },
  lng: 'fr',
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
})

export default i18n
