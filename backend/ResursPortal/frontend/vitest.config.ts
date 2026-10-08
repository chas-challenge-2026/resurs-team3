import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

// Reuses vite.config.ts (React plugin, "@" alias) so tests resolve imports
// the same way the app does, and layers on the vitest-specific `test`
// block rather than duplicating the plugin/alias setup.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
    },
  }),
)
