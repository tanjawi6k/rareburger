// src/lib/api.ts
// ============================================
// CMDOLA API Client
// ============================================

// ============================================
// TYPES
// ============================================

export interface Restaurant {
  id: string;
  nom: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  username: string;
  name: string;
  roles: string[];
  restaurant: Restaurant;
}

export interface TokenPayload {
  valid: boolean;
  username?: string;
  roles?: string[];
  restaurant?: string;
  error?: string;
}

export interface UserInfo {
  username: string;
  name: string;
  roles: string[];
  restaurant: string;
}

export interface Supplement {
  id: string;
  name: string;
  price: number;
}

export interface ArticleCommande {
  id: string;
  nom: string;
  prix: number;
  quantite: number;
  supplements?: Supplement[];
  removed_ingredients?: string[];
  instructions?: string;
}

export interface AdresseLivraison {
  rue: string;
  numero: string;
  code_postal: string;
  ville: string;
}

export interface Client {
  nom: string;
  prenom?: string;
  telephone: string;
  email?: string;
  adresse?: AdresseLivraison;
}

export interface Paiement {
  mode: 'comptoir' | 'reception' | 'en_ligne';
  statut: 'en_attente' | 'en_attente_paiement' | 'paye' | 'echec';
  stripe_session_id?: string;
  paid_at?: string;
}

export type StatutCommande =
  | 'nouvelle'
  | 'en_preparation'
  | 'prete'
  | 'en_livraison'
  | 'livree'
  | 'terminee'
  | 'annulee';

export type TypeCommande = 'sur_place' | 'emporter' | 'livraison';

export interface Commande {
  id: string;
  numero: string;
  date_creation: string;
  statut: StatutCommande;
  type: TypeCommande;
  client: Client;
  articles: ArticleCommande[];
  sous_total: number;
  frais_livraison: number;
  prix_total: number;
  paiement: Paiement;
  notes?: string;
  numero_table?: string;
  heure_souhaitee?: string;
  temps_estime?: string;
  updated_at?: string;
  status_updated_at?: string;
  status_updated_by?: string;
}

export interface CommandeInput {
  client: Client;
  type: TypeCommande;
  articles: ArticleCommande[];
  sous_total: number;
  frais_livraison: number;
  prix_total: number;
  paiement: Pick<Paiement, 'mode'>;
  notes?: string;
  numero_table?: string;
  heure_souhaitee?: string;
}

export interface CommandesResponse {
  commandes: Commande[];
  total: number;
  page?: number;
  per_page?: number;
  pages?: number;
}

export interface Produit {
  id: string;
  nom: string;
  description?: string;
  prix: number;
  categorie?: string;
  image?: string;
  disponible: boolean;
  supplements?: Supplement[];
  ingredients?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Categorie {
  id: string;
  name: string;
  icon?: string;
}

export interface Menu {
  categories: Categorie[];
  supplements: Supplement[];
  produits: Produit[];
  updated_at?: string;
}

export interface Config {
  restaurant_id: string;
  nom: string;
  description?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  horaires?: Record<string, string>;
  theme?: {
    couleur_primaire: string;
    couleur_secondaire: string;
    couleur_accent: string;
  };
  modes_service?: Record<string, boolean>;
  zones_livraison?: Array<{ distance_km: number; frais: number; minimum: number }>;
  methodes_paiement?: Record<string, boolean>;
  reseaux_sociaux?: Record<string, string>;
}

export interface Stats {
  today_orders: number;
  pending_orders: number;
  today_revenue: number;
  total_orders: number;
  average_order: number;
  top_products: Array<{ nom: string; quantite: number }>;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'error';
  service: string;
  timestamp: string;
  uptime: { seconds: number; human: string };
  checks: Record<string, any>;
  warnings: string[];
  errors: string[];
  repairs: string[];
  metrics?: Record<string, any>;
}

export interface ImageInfo {
  filename: string;
  url: string;
  size: number;
  created: number;
}

export interface StripeSession {
  session_id: string;
  url: string;
}

export interface PrintResult {
  success: boolean;
  message: string;
  commande_numero: string;
}

// ============================================
// CONFIGURATION
// ============================================

const API_BASE_URL =
  (import.meta as any).env?.PUBLIC_API_URL || 'https://api.rareburger.be/api';

// ============================================
// TOKEN — cookie en priorité, localStorage en fallback
// ============================================

function getAuthToken(): string | null {
  if (typeof document === 'undefined') return null;

  // 1. Chercher dans les cookies
  for (const cookie of document.cookie.split(';')) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'admin_token') return decodeURIComponent(value);
  }

  // 2. Fallback localStorage
  try {
    return localStorage.getItem('admin_token');
  } catch {
    return null;
  }
}

// ============================================
// FETCH DE BASE
// ============================================

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    console.error('❌ Réseau:', url, msg);
    throw new Error(`Erreur réseau : ${msg}`);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({
      error: `HTTP ${response.status} ${response.statusText}`,
    }));
    const msg = body?.error || body?.message || `Erreur ${response.status}`;
    console.error('❌ API:', response.status, url, msg);
    throw new Error(msg);
  }

  return response.json() as Promise<T>;
}

// Fetch sans Content-Type (pour FormData)
async function apiFetchForm<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (e) {
    throw new Error(`Erreur réseau : ${e instanceof Error ? e.message : e}`);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
    throw new Error(body?.error || `Erreur ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// ============================================
// 🔐 AUTH
// ============================================

export const auth = {
  login: (username: string, password: string) =>
    apiFetch<AuthResponse>(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  verify: () =>
    apiFetch<TokenPayload>(`${API_BASE_URL}/auth/verify`),

  me: () =>
    apiFetch<UserInfo>(`${API_BASE_URL}/auth/me`),
};

// ============================================
// ⚙️ CONFIG
// ============================================

export const config = {
  get: () =>
    apiFetch<Config>(`${API_BASE_URL}/config`),

  update: (data: Partial<Config>) =>
    apiFetch<{ success: boolean; updated_at: string }>(`${API_BASE_URL}/config`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ============================================
// 🍽️ MENU
// ============================================

export const menu = {
  get: () =>
    apiFetch<Menu>(`${API_BASE_URL}/menu`),

  addProduct: (product: Omit<Produit, 'id' | 'created_at' | 'updated_at'>) =>
    apiFetch<Produit>(`${API_BASE_URL}/menu`, {
      method: 'POST',
      body: JSON.stringify(product),
    }),

  /** Remplace le menu complet (catégories + produits + suppléments) */
  replaceAll: (menuData: Menu) =>
    apiFetch<Menu>(`${API_BASE_URL}/menu`, {
      method: 'PUT',
      body: JSON.stringify(menuData),
    }),

  getProduct: (productId: string) =>
    apiFetch<Produit>(`${API_BASE_URL}/menu/${productId}`),

  updateProduct: (productId: string, data: Partial<Produit>) =>
    apiFetch<Produit>(`${API_BASE_URL}/menu/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteProduct: (productId: string) =>
    apiFetch<{ success: boolean }>(`${API_BASE_URL}/menu/${productId}`, {
      method: 'DELETE',
    }),
};

// ============================================
// 📦 COMMANDES
// ============================================

export const commandes = {
  /** Liste paginée (admin/chef/caissier) */
  list: (page = 1, perPage = 50) =>
    apiFetch<CommandesResponse>(
      `${API_BASE_URL}/commandes?page=${page}&per_page=${perPage}`
    ),

  /** Commandes actives — public, pour l'interface cuisine */
  listActives: () =>
    apiFetch<CommandesResponse>(`${API_BASE_URL}/commandes/actives`),

  /** Commandes archivées (terminées/annulées) */
  listArchives: (
    period: 'today' | 'week' | 'month' | 'all' = 'all',
    statut: 'terminee' | 'annulee' | 'all' = 'all'
  ) => {
    const params = new URLSearchParams({ period, statut });
    return apiFetch<CommandesResponse>(
      `${API_BASE_URL}/commandes/archives?${params}`
    );
  },

  /** Créer une commande — public */
  create: (data: CommandeInput) =>
    apiFetch<Commande>(`${API_BASE_URL}/commandes`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Détail d'une commande (admin/chef/caissier) */
  get: (commandeId: string) =>
    apiFetch<Commande>(`${API_BASE_URL}/commandes/${commandeId}`),

  /** Récupération publique (pour la page confirmation client) */
  getPublic: (commandeId: string) =>
    apiFetch<Commande>(`${API_BASE_URL}/commandes/public/${commandeId}`),

  /** Suivi public par numéro de commande */
  track: (numero: string) =>
    apiFetch<Partial<Commande>>(`${API_BASE_URL}/commandes/track/${numero}`),

  /** Mise à jour libre (admin) */
  update: (commandeId: string, data: Partial<Commande>) =>
    apiFetch<Commande>(`${API_BASE_URL}/commandes/${commandeId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Suppression (admin) */
  delete: (commandeId: string) =>
    apiFetch<{ success: boolean }>(`${API_BASE_URL}/commandes/${commandeId}`, {
      method: 'DELETE',
    }),

  /** Changement de statut (admin/chef/caissier) */
  updateStatus: (commandeId: string, statut: StatutCommande) =>
    apiFetch<Commande>(`${API_BASE_URL}/commandes/${commandeId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ statut }),
    }),
};

// ============================================
// 🖼️ IMAGES
// ============================================

export const images = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return apiFetchForm<{ success: boolean; filename: string; url: string; size: number }>(
      `${API_BASE_URL}/upload-image`,
      { method: 'POST', body: formData }
    );
  },

  delete: (filename: string) =>
    apiFetch<{ success: boolean }>(`${API_BASE_URL}/delete-image/${filename}`, {
      method: 'DELETE',
    }),

  list: () =>
    apiFetch<{ images: ImageInfo[] }>(`${API_BASE_URL}/images`),

  /** URL publique d'une image */
  getUrl: (filename: string) =>
    `${API_BASE_URL}/images/${filename}`,
};

// ============================================
// 📊 STATS
// ============================================

export const stats = {
  general: () =>
    apiFetch<Stats>(`${API_BASE_URL}/stats`),

  /**
   * Télécharge le CSV directement via un lien
   * (ouvre dans un nouvel onglet ou déclenche le download)
   */
  downloadExport: (period: 'today' | 'week' | 'month' | 'all') => {
    const token = getAuthToken();
    if (!token) throw new Error('Non authentifié');

    // Fetch avec header Auth puis déclenche le download
    fetch(`${API_BASE_URL}/export/${period}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Erreur ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `commandes_${period}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch((e) => console.error('Export CSV:', e));
  },
};

// ============================================
// 🏥 HEALTH
// ============================================

export const health = {
  check: () =>
    apiFetch<HealthStatus>(`${API_BASE_URL}/health`),

  checkDeep: () =>
    apiFetch<HealthStatus>(`${API_BASE_URL}/health?deep=true`),

  repair: () =>
    apiFetch<HealthStatus>(`${API_BASE_URL}/health?deep=true&repair=true`),
};

// ============================================
// 💳 STRIPE
// ============================================

export const stripe = {
  createCheckoutSession: (orderId: string) =>
    apiFetch<StripeSession>(`${API_BASE_URL}/stripe/create-checkout-session`, {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId }),
    }),
};

// ============================================
// 🖨️ PRINT
// ============================================

export const print = {
  printTicket: (commandeId: string) =>
    apiFetch<PrintResult>(`${API_BASE_URL}/print-ticket`, {
      method: 'POST',
      body: JSON.stringify({ commande_id: commandeId }),
    }),
};

// ============================================
// Export
// ============================================

export const api = {
  auth,
  config,
  menu,
  commandes,
  images,
  stats,
  health,
  stripe,
  print,
  API_BASE_URL,
};

export default api;