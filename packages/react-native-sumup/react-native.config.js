// Configuration d'autolinking React Native / Expo
// Permet à expo prebuild de découvrir le module natif
module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        packageImportPath: 'import com.megesti.sumup.SumUpPackage;',
        packageInstance: 'new SumUpPackage()',
      },
      ios: {
        sourceDir: './ios',
      },
    },
  },
}
