import { useThemeStore } from '@/store/themeStore'
import { Colors, Dark } from '@/constants/theme'

/** Retourne les couleurs adaptées au thème (clair ou sombre) */
export function useAppTheme() {
  const isDark = useThemeStore(s => s.isDark)
  return {
    isDark,
    colors: isDark ? { ...Colors, ...Dark } : Colors,
  }
}
