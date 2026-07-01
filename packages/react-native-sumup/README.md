# @megesti/react-native-sumup

Module natif React Native pour l'intégration des terminaux SumUp Air (Bluetooth) et Solo (API REST).

## Installation

```bash
# Dans apps/mobile
npx expo prebuild                      # génère android/ + ios/
```

## API

```typescript
import { SumUp } from '@megesti/react-native-sumup'

// Vérifier la disponibilité
if (!SumUp.isAvailable()) { /* Expo Go → pas de SumUp */ }

// Init + login
// init() stocke la clé affilié ; login() ouvre l'écran de connexion SumUp natif
// (saisie du compte marchand directement sur l'appareil — aucun token à passer).
await SumUp.init('votre-cle-affilie')
await SumUp.login()

// Vérifier l'état
const ready = await SumUp.isReady()

// Encaisser
const result = await SumUp.checkout(18.50, 'EUR', 'Achat Salon')
if (result.success) {
  console.log('OK', result.transactionCode)
}

// Déconnexion
await SumUp.logout()
```

## Dépendances natives

### Android
Ajouter au `build.gradle` de l'app :
```gradle
dependencies {
    implementation 'com.sumup:merchant-sdk:4.1.0@aar'
}
```

### iOS
Ajouter au `Podfile` :
```ruby
pod 'SumUpSDK'
```

## Noop graceful
Sous Expo Go, le module natif est absent. `SumUp.isAvailable()` renvoie `false`.
Tous les appels API renvoient `{ success: false }` sans crasher.
