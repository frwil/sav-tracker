"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { cleanupExpiredCaches, registerCacheWrite } from "@/services/storage";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Routes HTML critiques à rendre disponibles hors ligne
const CRITICAL_ROUTES = [
    "/dashboard",
    "/dashboard/customers",
    "/dashboard/visits",
    "/dashboard/visits/new",
    "/dashboard/buildings",
    "/dashboard/prospections",
    "/dashboard/prospections/new",
    "/dashboard/reports",
    "/dashboard/settings",
    "/dashboard/reports/performance",
    "/dashboard/reports/visites",
    "/dashboard/reports/commercial",
    "/dashboard/reports/forecast",
    "/dashboard/reports/aliment",
    "/",
];

// Routes supplémentaires pour les admins
const ADMIN_ROUTES = [
    "/dashboard/admin",
    "/dashboard/admin/users",
];

// TTL des données API en cache (24h)
const CACHE_TTL = 1000 * 60 * 60 * 24;

function decodeTokenRoles(token: string): string[] {
    try {
        return JSON.parse(atob(token.split('.')[1])).roles || [];
    } catch {
        return [];
    }
}

/** Préchauffe les données API clients (nécessaires pour tous les formulaires). */
async function warmCustomers(token: string): Promise<void> {
    try {
        const res = await fetch(`${API_URL}/customers?pagination=false`, {
            headers: { Authorization: `Bearer ${token}`, Accept: "application/ld+json" },
        });
        if (!res.ok) return;
        const data = await res.json();
        const members = data['hydra:member'] || data['member'] || [];
        const options = members
            .map((c: any) => ({
                value: c['@id'] || `/api/customers/${c.id}`,
                label: c.zone ? `${c.name} (${c.zone})` : c.name,
            }))
            .sort((a: any, b: any) => a.label.localeCompare(b.label));
        localStorage.setItem('sav_customers_cache', JSON.stringify(options));
        registerCacheWrite('sav_customers_cache', CACHE_TTL);
        console.log(`🔥 ${options.length} clients mis en cache`);
    } catch (e) {
        console.warn("CacheWarmer: impossible de charger les clients", e);
    }
}

/**
 * Préchauffe les visites du jour et les stocke comme fallback offline.
 * Supporte les rôles : tous les utilisateurs.
 */
async function warmVisitsFallback(token: string): Promise<void> {
    try {
        const today = new Date();
        const start = new Date(today);
        start.setHours(0, 0, 0, 0);
        const end = new Date(today);
        end.setHours(23, 59, 59, 999);

        const params = new URLSearchParams({
            'plannedAt[after]': start.toISOString(),
            'plannedAt[before]': end.toISOString(),
            itemsPerPage: '50',
            page: '1',
        });

        const res = await fetch(`${API_URL}/visits?${params}`, {
            headers: { Authorization: `Bearer ${token}`, Accept: "application/ld+json" },
        });
        if (!res.ok) return;
        const data = await res.json();
        const visits = data['hydra:member'] || [];
        const totalItems = data['hydra:totalItems'] || visits.length;

        const cacheData = {
            visits,
            pagination: {
                currentPage: 1,
                totalPages: Math.ceil(totalItems / 20),
                totalItems,
            },
            timestamp: Date.now(),
        };
        localStorage.setItem('visits_v3_fallback', JSON.stringify(cacheData));
        registerCacheWrite('visits_v3_fallback', CACHE_TTL);
        console.log(`🔥 ${visits.length} visites du jour mises en cache (fallback)`);
    } catch (e) {
        console.warn("CacheWarmer: impossible de charger les visites", e);
    }
}

export default function CacheWarmer() {
    const router = useRouter();

    useEffect(() => {
        // 1. Nettoyage des caches expirés au démarrage
        const removed = cleanupExpiredCaches();
        if (removed > 0) console.log(`🧹 ${removed} entrées de cache expirées nettoyées`);

        const token = localStorage.getItem('sav_token');
        const roles = token ? decodeTokenRoles(token) : [];
        const isAdmin = roles.includes('ROLE_ADMIN');

        const routesToPrefetch = isAdmin
            ? [...CRITICAL_ROUTES, ...ADMIN_ROUTES]
            : CRITICAL_ROUTES;

        // 2. Préchargement des routes HTML (Next.js router)
        const htmlTimer = setTimeout(() => {
            console.log("🔥 Pré-chargement des routes HTML...");
            routesToPrefetch.forEach((route) => router.prefetch(route));
            console.log(`✅ ${routesToPrefetch.length} routes HTML pré-chargées.`);
        }, 3000);

        // 3. Préchauffage des données API (légèrement décalé pour ne pas bloquer le rendu)
        const apiTimer = setTimeout(async () => {
            if (!token || !navigator.onLine) return;
            console.log("🔥 Préchauffage des données API...");
            await Promise.allSettled([
                warmCustomers(token),
                warmVisitsFallback(token),
            ]);
            console.log("✅ Données API préchauffées.");
        }, 5000);

        return () => {
            clearTimeout(htmlTimer);
            clearTimeout(apiTimer);
        };
    }, [router]);

    return null;
}
