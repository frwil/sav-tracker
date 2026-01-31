import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const config: NextConfig = {
  // Vos configurations Next.js existantes (images, etc.)
  reactStrictMode: true,
  // Note : swcMinify est activé par défaut dans Next.js désormais, inutile de l'ajouter.
};

const pwaConfig = withPWA({
  dest: "public",
  // 🚀 CRITIQUE : Cache automatique des routes
  cacheOnFrontEndNav: true, 
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: false,
  // ❌ LIGNE À SUPPRIMER : swcMinify: true,
  disable: process.env.NODE_ENV === "development", // Désactiver en dev
  workboxOptions: {
    disableDevLogs: true,
    // Configuration avancée du cache (Runtime Caching)
    runtimeCaching: [
      {
        // Cache les pages HTML (Navigation)
        urlPattern: ({ request }) => request.mode === "navigate",
        handler: "NetworkFirst",
        options: {
          cacheName: "pages",
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 jours
          },
        },
      },
      {
        // Cache les fichiers JS/CSS (Webpack chunks)
        urlPattern: ({ request }) =>
          request.destination === "style" ||
          request.destination === "script" ||
          request.destination === "worker",
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-resources",
          expiration: {
            maxEntries: 100,
          },
        },
      },
      {
        // Cache les images
        urlPattern: ({ request }) => request.destination === "image",
        handler: "CacheFirst",
        options: {
          cacheName: "images",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          },
        },
      },
    ],
  },
});

export default pwaConfig(config);