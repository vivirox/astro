// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import UnoCSS from '@unocss/astro';

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    mdx(),
    UnoCSS({
      injectReset: true,
      mode: 'global',
      safelist: ['font-sans', 'font-mono', 'font-condensed'],
      configFile: './uno.config.ts',
    }),
  ],
  vite: {
    optimizeDeps: {
      include: ['unocss'],
      exclude: [],
    },
    build: {
      chunkSizeWarningLimit: 1500,
      cssCodeSplit: true,
      cssMinify: true,
    },
    resolve: {
      alias: [
        { find: '@', replacement: '/src' },
        { find: '@lib', replacement: '/src/lib' },
        { find: '@components', replacement: '/src/components' },
        { find: '@layouts', replacement: '/src/layouts' },
        { find: '@pages', replacement: '/src/pages' },
        { find: '@utils', replacement: '/src/utils' }
      ],
    },
  },
  output: 'server',
  adapter: node({
    mode: 'standalone' // or 'middleware' if integrating with an existing server
  }),
});
