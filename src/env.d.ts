/// <reference types="astro/client" />
import type { Session } from "./lib/auth/types";

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_ANON_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    session?: Session;
  }
}

declare namespace Astro {
  interface Locals extends App.Locals {}
}
