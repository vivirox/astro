import path from 'node:path'
import process from 'node:process'
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import starlight from '@astrojs/starlight'
import tailwind from '@astrojs/tailwind'
import vercel from '@astrojs/vercel'
import UnoCSS from '@unocss/astro'
import { defineConfig } from 'astro/config'
import flexsearchIntegration from './src/integrations/search'

export default defineConfig({
  site: 'https://gradiantascent.xyz',
  integrations: [
    starlight({
      title: 'Gradiant Documentation',
      social: {
        github: 'https://github.com/vivi/gradiant',
      },
      sidebar: [
        {
          label: 'Guides',
          items: [{ label: 'WebSocket', link: '/docs/websocket' }],
        },
      ],
    }),
    react(),
    mdx(),
    UnoCSS({
      injectReset: true,
      mode: 'global',
      safelist: ['font-sans', 'font-mono', 'font-condensed'],
      configFile: './uno.config.ts',
    }),
    tailwind(),
    flexsearchIntegration({
      collections: ['blog', 'docs', 'guides'],
      indexPath: '_search-index.js',
      autoInclude: true,
    }),
  ],
  content: {
    collections: ['blog', 'docs', 'guides'],
  },
  vite: {
    resolve: {
      alias: {
        '~': path.resolve('./src'),
        '@': path.resolve('./src'),
        '@components': path.resolve('./src/components'),
        '@layouts': path.resolve('./src/layouts'),
        '@utils': path.resolve('./src/utils'),
        '@lib': path.resolve('./src/lib'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'ui-vendor': ['@radix-ui/react-icons', '@radix-ui/react-slot'],
            'three-vendor': ['three'],
            'p5-vendor': ['p5'],
            'vendor': ['dayjs', 'nprogress', 'html-entities'],
          },
        },
      },
    },
  },
  output: 'server',
  adapter: vercel({
    analytics: true,
    imageService: true,
    // KNOWN ISSUE: The Vercel adapter tries to run pagefind during build even when using flexsearch
    // We've implemented a workaround in scripts/cleanup-search.ts that:
    // 1. Creates a dummy pagefind.js file to prevent runtime errors
    // 2. Removes any pagefind artifacts that might be created
    // This should be fixed in a future version of @astrojs/vercel
  }),
  server: {
    port: process.env.PORT ? Number.parseInt(process.env.PORT) : 3000,
    host: process.env.HOST || 'localhost',
  },
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
    domains: ['gradiantascent.xyz'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.gradiantascent.xyz',
      },
    ],
  },
  typescript: {
    strict: true,
    allowJS: true,
    reportTypeErrors: true,
  },
})
