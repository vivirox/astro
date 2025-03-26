import process from 'node:process'
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import tailwind from '@astrojs/tailwind'
import vercel from '@astrojs/vercel'
import UnoCSS from '@unocss/astro'
import { defineConfig } from 'astro/config'

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
  vite: {
    optimizeDeps: {
      include: ['unocss'],
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
            'vendor': ['dayjs', 'nprogress', 'html-entities'],
          },
          assetFileNames: 'assets/[name].[hash][extname]',
          chunkFileNames: 'assets/[name].[hash].js',
          entryFileNames: 'assets/[name].[hash].js',
        },
      },
    },
    resolve: {
      alias: [
        { find: '@', replacement: '/src' },
        { find: '@lib', replacement: '/src/lib' },
        { find: '@components', replacement: '/src/components' },
        { find: '@layouts', replacement: '/src/layouts' },
        { find: '@pages', replacement: '/src/pages' },
        { find: '@utils', replacement: '/src/utils' },
      ],
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
})
