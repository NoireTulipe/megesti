import Constants from 'expo-constants'

const DEV_HOST = 'http://192.168.1.100:3001'

const host = Constants.expoConfig?.hostUri
  ? `http://${Constants.expoConfig.hostUri!.split(':')[0]}:3001`
  : DEV_HOST

export const Config = {
  apiBaseUrl:          `${host}/api`,
  uploadBaseUrl:       host,
  sumupAffiliateKey:   'sup_afk_k9GalLMZmEcZyzmJXC8pppIHmpC6CLRo',   // clé développeur MeGesti sur dashboard.sumup.com
} as const
