const { withAndroidManifest } = require('expo/config-plugins')

/**
 * Force le launchMode de MainActivity à "singleTop" au lieu de "singleTask".
 *
 * Raison : en singleTask, onActivityResult n'est pas déclenché quand une
 * activité enfant (ex. l'écran de login SumUp) se termine — le résultat est
 * perdu. singleTop préserve le comportement « une seule instance » tout en
 * autorisant les callbacks onActivityResult des activités enfant.
 *
 * Indispensable pour SumUp (login + checkout) et tout SDK natif qui ouvre
 * une activité via startActivityForResult.
 *
 * Sans ce plugin, expo prebuild régénère singleTask et écrase la correction.
 */
module.exports = function withSingleTopLaunchMode(config) {
  return withAndroidManifest(config, (modConfig) => {
    const application = modConfig.modResults.manifest.application?.[0]
    if (!application || !application.activity) return modConfig

    const mainActivity = application.activity.find(
      (a) => a.$?.['android:name'] === '.MainActivity',
    )
    if (mainActivity) {
      mainActivity.$['android:launchMode'] = 'singleTop'
    }
    return modConfig
  })
}
