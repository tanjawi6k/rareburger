// src/pages/manifest.json.ts
export const prerender = false;
import type { APIRoute } from 'astro';

const API_BASE_URL = import.meta.env.PUBLIC_API_URL || 'https://api.cmdola.be/api';

export const GET: APIRoute = async () => {
  try {
    const configResponse = await fetch(`${API_BASE_URL}/$config`);
    const config = await configResponse.json();
    
    const logoUrl = config.theme?.logo 
      ? `${API_BASE_URL}/images/$${config.theme.logo}`
      : '/favicon.ico';
    
    const restaurantName = config.nom || 'CMDOLA';
    
    // ✅ MODIFIÉ pour POS
    const manifest = {
      name: `${restaurantName} - Point de Vente`,
      short_name: `${restaurantName} POS`,
      description: `Terminal de caisse pour ${restaurantName}`,
      start_url: '/admin/pos',  // ✅ CHANGÉ
      display: 'standalone',
      background_color: '#1e293b',
      theme_color: '#1e293b',
      orientation: 'landscape',  // ✅ Paysage pour tablette
      icons: [
        {
          src: logoUrl,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        },
        {
          src: logoUrl,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ],
      categories: ['business', 'productivity'],  // ✅ CHANGÉ
      lang: 'fr-BE',
      dir: 'ltr'
    };

    return new Response(JSON.stringify(manifest), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error('Erreur génération manifest:', error);
    
    const fallbackManifest = {
      name: 'CMDOLA Point de Vente',
      short_name: 'POS',
      start_url: '/admin/pos',
      display: 'standalone',
      background_color: '#1e293b',
      theme_color: '#1e293b',
      orientation: 'landscape',
      icons: [
        {
          src: '/favicon.ico',
          sizes: 'any',
          type: 'image/x-icon'
        }
      ]
    };
    
    return new Response(JSON.stringify(fallbackManifest), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};