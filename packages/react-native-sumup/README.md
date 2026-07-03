# @megesti/react-native-sumup

Façade TypeScript de l'intégration SumUp (terminaux Air/Solo).

## ⚠️ Architecture — important

Ce package ne contient **que la façade TypeScript** (`src/index.ts` + types).
**L'implémentation native Android vit dans l'app mobile**, pas ici :

```
apps/mobile/android/app/src/main/java/com/megesti/app/sumup/
├── SumUpModule.kt     ← la vraie implémentation (login, checkout, etc.)
└── SumUpPackage.kt    ← enregistrée dans MainApplication.kt
```

Le bridge se fait par le nom : la façade appelle `NativeModules['SumUp']`, qui
est fourni au runtime par le `SumUpModule` natif de l'app (enregistré sous le
nom `"SumUp"` via `getName()`).

Historiquement ce package embarquait sa propre copie native (Android + iOS),
mais elle n'était **jamais compilée** — l'app fournissait déjà la sienne. Ce
code natif mort a été supprimé le 2026-07-03 pour éviter la confusion.

## API

```typescript
import { SumUp } from '@megesti/react-native-sumup'

// Le module natif est-il disponible ? (false en Expo Go)
SumUp.isAvailable()

// Init (idempotent) — configure le SDK SumUp + stocke l'affiliate key
await SumUp.init('sup_afk_xxx')

// Login : ouvre l'écran SumUp natif (compte marchand de la ME)
const ok = await SumUp.login()

// État de connexion
const ready = await SumUp.isReady()

// Encaisser sur le terminal
const result = await SumUp.checkout(18.50, 'EUR', 'Achat Salon')
if (result.success) {
  console.log('OK', result.transactionCode)
}

// Déconnexion
await SumUp.logout()
```

## Noop graceful

Si le module natif est absent (Expo Go), `isAvailable()` renvoie `false` et tous
les appels API renvoient `{ success: false }` sans crasher.

## Ajouter un module natif (iOS)

Pour iOS, il faudra créer un `SumUpModule.swift` + `SumUpModule.m` (bridging)
dans l'app mobile (pas ici), équivalent du module Kotlin Android. Ajouter aussi
`pod 'SumUpSDK'` au Podfile. Voir le module Android pour le contrat à respecter.
