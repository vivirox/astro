import process from 'node:process'
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import tailwind from '@astrojs/tailwind'
import vercel from '@astrojs/vercel'
import UnoCSS from '@unocss/astro'
import { defineConfig } from 'astro/config'
import path from 'path'

export default defineConfig({
  site: 'https://vivi.rocks',
  integrations: [
    react(),
    mdx(),
    UnoCSS({
      injectReset: true,
      mode: 'global',
      safelist: ['font-sans', 'font-mono', 'font-condensed'],
      configFile: './uno.config.ts',
    }),
    tailwind(),
  ],
  content: {
    collections: ['blog', 'docs']
  },
  vite: {
    optimizeDeps: {
      include: ['unocss', 'three'],
      exclude: [],
    },
    build: {
      chunkSizeWarningLimit: 1500,
      cssCodeSplit: true,
      cssMinify: true,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'ui-vendor': ['@radix-ui/react-icons', '@radix-ui/react-slot'],
            'three-vendor': ['three'],
            'vendor': ['dayjs', 'nprogress', 'html-entities'],
          },
          assetFileNames: 'assets/[name].[hash][extname]',
          chunkFileNames: 'assets/[name].[hash].js',
          entryFileNames: 'assets/[name].[hash].js',
        },
      },
    },
    resolve: {
      alias: {
        '~': path.resolve('./src'),
        '@': path.resolve('./src'),
        '@components': path.resolve('./src/components'),
        '@layouts': path.resolve('./src/layouts'),
        '@utils': path.resolve('./src/utils'),
        '@lib': path.resolve('./src/lib')
      }
    },
    ssr: {
      noExternal: ['react'],
    },
  },
  output: 'server',
  adapter: vercel({
    analytics: true,
    imageService: true,
  }),
  server: {
    port: process.env.PORT ? Number.parseInt(process.env.PORT) : 3000,
    host: process.env.HOST || 'localhost',
  },
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
    domains: ['vivi.rocks'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.vivi.rocks',
      },
    ],
  },
  typescript: {
    // Enable TypeScript strict mode
    strict: true,
    // Allow JavaScript files
    allowJS: true,
    // Show TypeScript errors in dev server
    reportTypeErrors: true
  }
})
