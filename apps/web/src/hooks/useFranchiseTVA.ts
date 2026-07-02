import { useMonTenant } from '@/features/reglages/hooks/useMonTenant'

/**
 * Retourne true si le tenant est en franchise en base de TVA (art. 293 B CGI).
 * Quand true : toutes les ventes sont HT=TTC, TVA=0.
 * Utilisé dans les calculs de panier, d'article et d'affichage.
 */
export function useFranchiseTVA(): boolean {
  const { data } = useMonTenant()
  return data?.franchiseTva ?? false
}
