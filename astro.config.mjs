import mdx from '@astrojs/mdx'
import node from '@astrojs/node'
import react from '@astrojs/react'
import tailwind from '@astrojs/tailwind'
import UnoCSS from '@unocss/astro'
import { defineConfig } from 'astro/config'
import TherapyChatWebSocketServer from './src/lib/websocket/server'
import vercel from '@astrojs/vercel/static'

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
            'three-bundle': ['three'],
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
    configureServer: ({ httpServer }) => {
      if (httpServer) {
        new TherapyChatWebSocketServer(httpServer)
      }
    },
  },
  output: 'static',
  adapter: vercel({
    analytics: true,
    imageService: true,
    webAnalytics: {
      enabled: true,
    },
    speedInsights: {
      enabled: true,
    },
    headers: [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;",
          },
        ],
      },
      {
        source: '/assets/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_astro/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ],
    cacheControl: {
      '/*': {
        edge: {
          maxAgeSeconds: 60 * 60, // 1 hour
          staleWhileRevalidateSeconds: 60 * 60 * 24, // 24 hours
        },
        browser: {
          maxAgeSeconds: 0,
          serviceWorkerSeconds: 60 * 60 * 24, // 24 hours
        },
      },
      '/assets/*': {
        edge: {
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
          staleWhileRevalidateSeconds: 60 * 60 * 24, // 24 hours
        },
        browser: {
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
          serviceWorkerSeconds: 60 * 60 * 24 * 365, // 1 year
        },
      },
    },
  }),
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
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
