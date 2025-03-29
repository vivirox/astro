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
import { modulesTransformPlugin } from './src/lib/vite/module-transform.js'

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
    react({
      include: ['**/*.tsx', '**/*.jsx'],
      exclude: [],
      ssr: true,
    }),
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
    optimizeDeps: {
      include: ['unocss', 'three'],
      exclude: ['react', 'react-dom'],
      esbuildOptions: {
        jsx: 'automatic',
        jsxImportSource: 'react',
      },
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
        '@lib': path.resolve('./src/lib'),
      },
      mainFields: ['browser', 'module', 'main'],
      conditions: ['browser', 'module', 'import', 'default'],
    },
    plugins: [
      modulesTransformPlugin(),
      {
        name: 'vite-plugin-handle-react-esm',
        enforce: 'pre',
        resolveId(id) {
          return null
        },
        load(id) {
          if (id.includes('node_modules/react/index.js')) {
            return `
              import * as React from './cjs/react.development.js';
              export default React;
              export const {
                Children, Component, Fragment, Profiler, PureComponent,
                StrictMode, Suspense, cloneElement, createContext,
                createElement, createFactory, createRef, forwardRef,
                isValidElement, lazy, memo, useCallback, useContext,
                useDebugValue, useEffect, useImperativeHandle, useLayoutEffect,
                useMemo, useReducer, useRef, useState, version, startTransition
              } = React;
            `
          }

          if (id.includes('node_modules/react-dom/index.js')) {
            return `
              import * as ReactDOM from './cjs/react-dom.development.js';
              export default ReactDOM;
              export const {
                createPortal, findDOMNode, flushSync, hydrate, render,
                unmountComponentAtNode, unstable_batchedUpdates, version,
                createRoot, hydrateRoot
              } = ReactDOM;
            `
          }

          return null
        },
      },
    ],
    ssr: {
      external: ['react', 'react-dom', 'react-dom/server'],
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
