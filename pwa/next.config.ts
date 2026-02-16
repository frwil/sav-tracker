import type { NextConfig } from "next";
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: false,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      // 1. Cache des Pages HTML (Navigation)
      {
        urlPattern: ({ request }: any) => request.mode === "navigate",
        handler: "NetworkFirst",
        options: {
          cacheName: "pages",
          expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 }, // 30 jours
        },
      },
      // 2. Cache des données Next.js (RSC / JSON)
      {
        urlPattern: /\/_next\/data\/.+\/.+\.json$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "next-data",
          expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 }, // 24h
        },
      },
      // 3. 🔥 NOUVEAU : Cache de l'API (Indispensable pour le Offline-First)
      {
        urlPattern: /\/api\/.*/i, // Capture toutes les routes commençant par /api/
        handler: "StaleWhileRevalidate", // Sert le cache immédiatement, puis met à jour en arrière-plan
        options: {
          cacheName: "api-cache",
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 24 * 60 * 60, // Garde les données API pendant 24h
          },
          cacheableResponse: {
            statuses: [0, 200], // Cache les succès (200) et les réponses opaques (0)
          },
        },
      },
      // 4. Cache des fichiers statiques (JS/CSS/Workers)
      {
        urlPattern: ({ request }: any) =>
          request.destination === "style" ||
          request.destination === "script" ||
          request.destination === "worker",
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-resources",
          expiration: { maxEntries: 100 },
        },
      },
      // 5. Cache des images
      {
        urlPattern: ({ request }: any) => request.destination === "image",
        handler: "CacheFirst",
        options: {
          cacheName: "images",
          expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  //swcMinify: true, // ✅ Moved here (Next.js config)
};

export default withPWA(nextConfig);