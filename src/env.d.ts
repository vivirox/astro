/// <reference types="astro/client" />

interface ImportMetaEnv {
  // ...existing code...
  readonly TOGETHER_API_KEY: string
  readonly TOGETHER_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
