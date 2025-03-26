import 'astro'

declare global {
  interface Window {
    browserInfo: {
      language: string
      languages: string[]
      prefersDarkMode: boolean
      prefersReducedMotion: boolean
      userAgent: string
      url: string
      pathname: string
      host: string
    }
    pageData: {
      isSSR: boolean
      isPrerendered: boolean
      darkMode: boolean
      language: string
      userAgent: string
      path: string
      isMobile: boolean
    }
  }
}

declare module 'astro' {
  interface AstroGlobal {
    locals: Locals
  }
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
    user?: {
      id: string
      name?: string
      email?: string
      role?: string
    }
  }
}
