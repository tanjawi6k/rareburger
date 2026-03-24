// src/middleware.ts
import type { MiddlewareHandler } from 'astro';

// ─────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────
const AUTH_COOKIE = 'admin_token';
const IS_DEV      = import.meta.env.DEV;

const LOGIN_PATHS = new Set(['/login', '/login/']);

// Trié par longueur décroissante pour que les routes plus spécifiques
// soient évaluées en premier (/admin/pos avant /admin)
const PROTECTED_ROUTES: Array<{ path: string; roles: string[] }> = [
  { path: '/admin/pos',  roles: ['admin', 'chef', 'caissier'] },
  { path: '/admin',      roles: ['admin'] },
  { path: '/cuisine',    roles: ['admin', 'chef'] },
  { path: '/livraison',  roles: ['admin', 'livreur'] },
  { path: '/pos',        roles: ['admin', 'chef', 'caissier'] },
].sort((a, b) => b.path.length - a.path.length);

// ─────────────────────────────────────────
// Décodage JWT
// Node.js n'a pas atob() natif fiable — on utilise Buffer
// ⚠️ On ne vérifie pas la signature ici (pas de clé secrète côté middleware Astro)
//    La vérification de signature se fait côté backend Python.
//    Ce middleware protège uniquement la navigation — la vraie auth est l'API.
// ─────────────────────────────────────────
interface JWTPayload {
  username?: string;
  roles?: string[];
  name?: string;
  restaurant?: string;
  exp?: number;
  iat?: number;
}

function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Buffer.from est disponible dans Node.js (runtime Astro SSR)
    const json = Buffer.from(parts[1]!, 'base64url').toString('utf-8');
    return JSON.parse(json) as JWTPayload;
  } catch {
    return null;
  }
}

function isTokenExpired(payload: JWTPayload): boolean {
  if (!payload.exp) return false;
  return Math.floor(Date.now() / 1000) >= payload.exp;
}

// ─────────────────────────────────────────
// Redirection par défaut selon les rôles
// ─────────────────────────────────────────
function defaultRedirectForRoles(roles: string[]): string {
  if (roles.includes('admin'))    return '/admin';
  if (roles.includes('chef'))     return '/cuisine';
  if (roles.includes('livreur'))  return '/livraison';
  if (roles.includes('caissier')) return '/pos';
  return '/login';
}

// ─────────────────────────────────────────
// Middleware principal
// ─────────────────────────────────────────
export const onRequest: MiddlewareHandler = async (ctx, next) => {
  const { cookies, redirect, request } = ctx;
  const { pathname } = new URL(request.url);

  // Laisser passer les assets statiques
  if (/\.(png|jpe?g|gif|svg|ico|webp|avif|css|js|map|txt|xml|woff2?)$/i.test(pathname)) {
    return next();
  }

  // Page de login — toujours accessible
  if (LOGIN_PATHS.has(pathname)) {
    return next();
  }

  // Trouver la route protégée correspondante
  const matched = PROTECTED_ROUTES.find(
    ({ path }) => pathname === path || pathname.startsWith(path + '/')
  );

  // Route non protégée — laisser passer
  if (!matched) return next();

  // ── Route protégée ────────────────────────────
  const token = cookies.get(AUTH_COOKIE)?.value;

  if (!token) {
    if (IS_DEV) console.log(`[middleware] No token → ${pathname}`);
    return redirect(`/login?redirect=${encodeURIComponent(pathname)}`, 302);
  }

  const payload = decodeJWT(token);

  if (!payload) {
    if (IS_DEV) console.log(`[middleware] Invalid token → ${pathname}`);
    cookies.delete(AUTH_COOKIE, { path: '/' });
    return redirect('/login', 302);
  }

  if (isTokenExpired(payload)) {
    if (IS_DEV) console.log(`[middleware] Expired token → ${pathname}`);
    cookies.delete(AUTH_COOKIE, { path: '/' });
    return redirect('/login?expired=1', 302);
  }

  const userRoles = payload.roles ?? [];
  const username  = payload.username ?? 'unknown';
  const hasAccess = matched.roles.some(r => userRoles.includes(r));

  if (!hasAccess) {
    if (IS_DEV) console.log(`[middleware] ${username} (${userRoles}) denied → ${pathname}`);
    return redirect(defaultRedirectForRoles(userRoles), 302);
  }

  // Accès autorisé — injecter dans Astro.locals
  ctx.locals.user = {
    username,
    roles: userRoles,
    name:       payload.name       ?? username,
    restaurant: payload.restaurant ?? 'unknown',
  };

  if (IS_DEV) console.log(`[middleware] ${username} (${userRoles}) → ${pathname}`);

  return next();
};