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
await SumUp.init('votre-cle-affilie')
await SumUp.login('token-marchand')

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
    implementation 'com.sumup:merchant-sdk:3.5.+'
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
