import { defineConfig } from 'vite';

/**
 * Custom Vite configuration to suppress eval warnings
 * This configuration is merged with the Astro Vite configuration
 */
export default defineConfig({
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress eval warnings from flexsearch
        if (
          warning.code === 'EVAL' && 
          warning.id && 
          warning.id.includes('flexsearch')
        ) {
          return;
        }
        
        // Forward all other warnings
        warn(warning);
      }
    }
  }
}); 