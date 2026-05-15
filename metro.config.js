const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const monorepoRoot = __dirname
const projectRoot = path.resolve(monorepoRoot, 'apps/mobile')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [monorepoRoot]

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]


// Alias @/ → apps/mobile/src/ (babel-preset-expo ne lit pas le tsconfig depuis la racine)
const srcRoot = path.resolve(projectRoot, 'src')
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@/')) {
    return context.resolveRequest(
      context,
      path.resolve(srcRoot, moduleName.slice(2)),
      platform,
    )
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
