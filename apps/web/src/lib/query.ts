import { MutationCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export const queryClient = new QueryClient({
  // Feedback global : toute mutation qui échoue affiche un toast d'erreur,
  // sans avoir à le câbler mutation par mutation.
  mutationCache: new MutationCache({
    onError: (error) => {
      toast.error(error instanceof Error && error.message ? error.message : 'Une erreur est survenue')
    },
    // Succès : les mutations déclarent meta.successMessage pour afficher un toast
    onSuccess: (_data, _variables, _context, mutation) => {
      const message = mutation.meta?.['successMessage']
      if (typeof message === 'string') toast.success(message)
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
})
