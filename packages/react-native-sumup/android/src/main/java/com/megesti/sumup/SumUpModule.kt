package com.megesti.sumup

// ⚠️ ATTENTION — Ce fichier n'est PAS utilisé par l'app mobile en l'état.
//
// L'app compile sa propre copie du module SumUp, située dans :
//   apps/mobile/android/app/src/main/java/com/megesti/app/sumup/SumUpModule.kt
//
// C'est cette copie qui est enregistrée dans MainApplication.kt
// (import com.megesti.app.sumup.SumUpPackage) et donc réellement appelée
// au runtime par NativeModules['SumUp'].
//
// Ce fichier (packages/react-native-sumup/...) n'est inclus dans le build
// natif que si un `react-native.config.js` d'autolinking le référence ET que
// l'app ne fournit pas sa propre implémentation. Ce n'est pas le cas ici.
//
// → Toute correction du module natif SumUp doit être faite dans la copie de
//   l'app. Ce fichier est conservé pour la cohérence du package et un éventuel
//   futur refactor d'autolinking propre.
