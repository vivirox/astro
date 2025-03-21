import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import robotsTxt from 'astro-robots-txt'
import astroExpressiveCode from 'astro-expressive-code'
import mdx from '@astrojs/mdx'
import UnoCSS from '@unocss/astro'
import * as path from 'path'

import { remarkPlugins, rehypePlugins } from './plugins'
import { SITE } from './src/config'

export default defineConfig({
  site: SITE.website,
  base: SITE.base,
  integrations: [
    sitemap(),
    robotsTxt(),
    UnoCSS({
      injectReset: true,
      mode: 'global',
      safelist: ['font-inter', 'font-mono', 'font-condensed'],
      configFile: './uno.config.ts',
    }),
    astroExpressiveCode({
      themes: ['vitesse-dark'],
      styleOverrides: {
        codeBackground: 'var(--c-bg)',
        scrollbarThumbColor: 'var(--c-scrollbar)',
      },
    }),
    mdx(),
  ],
  markdown: {
    syntaxHighlight: false,
    remarkPlugins,
    rehypePlugins,
  },
  vite: {
    optimizeDeps: {
      include: ['unocss'],
      exclude: [],
    },
    build: {
      chunkSizeWarningLimit: 1500,
      cssCodeSplit: true,
      cssMinify: true,
      assetsInlineLimit: 4096,
      manifest: true,
      rollupOptions: {
        output: {
          assetFileNames: 'assets/[name].[hash][extname]',
          chunkFileNames: 'assets/[name].[hash].js',
          entryFileNames: 'assets/[name].[hash].js',
          manualChunks: {
            'three-bundle': ['three'],
            'vendor': [
              // Add other large dependencies here
            ],
          },
        },
      },
    },
    plugins: [],
    ssr: {
      noExternal: ['react'],
    },
    resolve: {
      alias: [{ find: '@', replacement: path.resolve('./src') }],
      mainFields: ['module', 'jsnext:main', 'jsnext', 'main'],
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
    },
  },
})
