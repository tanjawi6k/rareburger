/// <reference types="astro/client" />

// ─────────────────────────────────────────
// SSR — utilisateur authentifié (middleware)
// ─────────────────────────────────────────
declare namespace App {
  interface Locals {
    user?: {
      username: string;
      roles: string[];
      name: string;
      restaurant: string;
    };
  }
}

// ─────────────────────────────────────────
// Variables d'environnement publiques
// ─────────────────────────────────────────
interface ImportMetaEnv {
  readonly PUBLIC_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// ─────────────────────────────────────────
// Extensions de window
// Propriétés globales exposées par les scripts is:inline
// ─────────────────────────────────────────
declare global {
  interface Window {
    /** Suppléments du menu, chargés SSR et exposés aux modaux produit */
    allSupplements: Array<{
      id: string;
      name: string;
      price: number;
    }>;

    /** Change le thème DaisyUI actif — persiste dans cookie + localStorage */
    setTheme: (name: string) => void;
  }
}

export {};