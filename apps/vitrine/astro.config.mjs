import { defineConfig } from 'astro/config'
import tailwind from '@astrojs/tailwind'
import sitemap from '@astrojs/sitemap'

// https://astro.build/config
export default defineConfig({
  site: 'https://megesti.fr',
  integrations: [
    tailwind({
      // On apporte notre propre base.css avec les tokens du SaaS
      applyBaseStyles: false,
    }),
    sitemap(),
  ],
  // Chemin de build statique déployable tel quel sur le VPS
  build: {
    format: 'directory',
  },
})
