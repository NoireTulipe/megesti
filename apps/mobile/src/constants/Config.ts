import Constants from 'expo-constants'

const DEV_API = 'http://192.168.1.100:3001' // À adapter à ton réseau local

export const Config = {
  apiBaseUrl: Constants.expoConfig?.hostUri
    ? `http://${Constants.expoConfig.hostUri!.split(':')[0]}:3001`
    : DEV_API,
} as const
