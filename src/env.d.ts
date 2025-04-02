/// <reference types="astro/client" />

/**
 * @see https://docs.astro.build/en/tutorials/add-content-collections/#create-a-collection-for-your-blog-posts
 */
/// <reference path="../.astro/types.d.ts" />

/**
 * @see https://docs.astro.build/en/guides/typescript/#infer-getstaticpaths-types
 */
/// <reference types="astro/astro-jsx" />

/**
 * @description Declares style attributes for UnoCSS's Attributify Mode to enable TypeScript integration.
 * @see https://unocss.dev/presets/attributify#typescript-support-jsx-tsx
 */
import type {
  AttributifyAttributes,
  AttributifyNames,
} from 'unocss/preset-attributify'

type Prefix = 'u-' // change it to your prefix

declare global {
  namespace astroHTML.JSX {
    interface HTMLAttributes
      extends AttributifyAttributes,
        Partial<Record<AttributifyNames<Prefix>, string>> {}
  }
}

declare namespace App {
  interface Locals {
    headers: Record<string, string>
    isPrerendered: boolean
    isSSR: boolean
    userPreferences: {
      language: string
      darkMode: boolean
      reducedMotion: boolean
      userAgent: string
      ip: string
      isIOS: boolean
      isAndroid: boolean
      isMobile: boolean
    }
  }
}

import type { SearchClient, SearchDocument } from './lib/search'

// Extend Window interface to include our global objects
interface Window {
  // FlexSearch client instance
  searchClient: SearchClient

  // Search index data
  searchIndex?: SearchDocument[]

  // Function to initialize search
  initSearch?: () => void
}

// Define module for astro:transitions
declare module 'astro:transitions' {
  import type { AstroIntegration } from 'astro'
  export const ViewTransitions: any
  export function fade(options?: { duration?: string | number }): any
  export function slide(options?: { duration?: string | number }): any
}

// Fix TypeScript errors related to HTML elements in Astro files
declare namespace astroHTML.JSX {
  interface HTMLAttributes {
    class?: string
    children?: any
  }

  interface HtmlHTMLAttributes extends HTMLAttributes {
    lang?: string
  }

  interface AnchorHTMLAttributes extends HTMLAttributes {
    href?: string
    rel?: string
    target?: string
    class?: string
    children?: any
  }
}
