import path from 'node:path'
import process from 'node:process'
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import starlight from '@astrojs/starlight'
import vercel from '@astrojs/vercel'
import UnoCSS from '@unocss/astro'
import { defineConfig } from 'astro/config'
import flexsearchIntegration from './src/integrations/search'
import sentry from '@sentry/astro'
import tailwind from '@astrojs/tailwind'
import db from '@astrojs/db';
import suppressEvalWarnings from './src/vite-plugins/suppress-eval-warnings'

// Determine if we're in build mode
const isBuild = process.argv.includes('build');
// Check if we have a Sentry auth token
const hasSentryToken = process.env.SENTRY_AUTH_TOKEN?.length > 0;

// Create an array of integrations and conditionally add db
const integrations = [
  starlight({
    title: 'Gradiant Ascent',
    social: {
      github: 'https://github.com/vivi/astro',
    },
    sidebar: [
      {
        label: 'Guides',
        items: [{ label: 'WebSocket', link: '/docs/websocket' }],
      },
    ],
    // Disable Starlight's default 404 page to avoid conflicts
    customCss: ['./src/styles/custom.css'],
    disable404Route: true,
    // Add explicit i18n config with default values and remove redirectToDefaultLocale
    defaultLocale: 'en',
    locales: {
      en: {
        label: 'English',
      },
    },
  }),
  sentry({
    dsn: import.meta.env.PUBLIC_SENTRY_DSN,
    autoInstrument: true,
    sourceMapsUploadOptions: {
      project: 'gradiant',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      // Only upload source maps in production builds when auth token is present
      uploadSourceMaps: process.env.NODE_ENV === 'production' && hasSentryToken,
      // Don't fail build if source map upload fails
      ignoreUploadErrors: true,
      telemetry: false,
    },
    clientSdkOptions: {
      environment: import.meta.env.PUBLIC_SENTRY_ENVIRONMENT || 'development',
      release: import.meta.env.PUBLIC_SENTRY_RELEASE,
      tracesSampleRate: 0.1,
      profilesSampleRate: 0.1,
      // Enable detailed error context in development
      debug: process.env.NODE_ENV !== 'production',
      // Don't send certain errors that are expected
      beforeSend(event, hint) {
        const error = hint?.originalException
        // Filter out known non-actionable errors
        if (
          error &&
          typeof error.message === 'string' &&
          error.message.includes('ResizeObserver loop')
        ) {
          return null
        }

        return event
      },
    },
  }),
  react(),
  mdx(),
  tailwind({
    // Configure the tailwind integration to use the config file we created
    config: {
      path: './tailwind.config.ts',
      applyBaseStyles: false,
    },
  }),
  UnoCSS({
    injectReset: true,
    mode: 'global',
    safelist: ['font-sans', 'font-mono', 'font-condensed'],
    configFile: './uno.config.ts',
  }),
  flexsearchIntegration({
    collections: ['blog', 'docs', 'guides'],
    indexPath: 'search-index.js',
    autoInclude: true,
  })
];

// Only add db integration in development mode
if (!isBuild) {
  integrations.push(db());
}

export default defineConfig({
  site: 'https://gradiantascent.xyz',
  integrations,
  content: {
    collections: ['blog', 'docs', 'guides'],
  },
  vite: {
    plugins: [suppressEvalWarnings()],
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
      // Only generate source maps when auth token is present
      sourcemap: hasSentryToken ? 'hidden' : false,
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
    runtime: 'nodejs22.x',
    // Specify static error pages
    errorPage: 'custom-404.astro',
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
