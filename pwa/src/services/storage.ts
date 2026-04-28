import localforage from 'localforage';

// 1. Stockage pour le Cache React Query (Lecture hors ligne : Clients, Visites...)
export const queryStorage = localforage.createInstance({
    name: 'SAV_TRACKER_DB',
    storeName: 'query_cache',
    driver: localforage.INDEXEDDB,
});

// 2. Stockage pour la File d'attente de Synchro (Écriture hors ligne)
export const syncQueueStorage = localforage.createInstance({
    name: 'SAV_TRACKER_DB',
    storeName: 'sync_queue',
    driver: localforage.INDEXEDDB,
});

// ─── Utilitaires TTL pour localStorage ───────────────────────────────────────

const REGISTRY_KEY = 'sav_cache_registry';

type CacheRegistry = Record<string, number>; // key → expiresAt (ms)

const loadRegistry = (): CacheRegistry => {
    try {
        return JSON.parse(localStorage.getItem(REGISTRY_KEY) || '{}');
    } catch {
        return {};
    }
};

const saveRegistry = (registry: CacheRegistry): void => {
    try {
        localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
    } catch {}
};

/**
 * Enregistre une clé localStorage avec un TTL.
 * Doit être appelé à chaque écriture dans localStorage pour les clés SAV.
 */
export const registerCacheWrite = (key: string, ttlMs: number): void => {
    const registry = loadRegistry();
    registry[key] = Date.now() + ttlMs;
    saveRegistry(registry);
};

/**
 * Supprime toutes les entrées localStorage expirées selon le registre.
 * Retourne le nombre d'entrées supprimées.
 */
export const cleanupExpiredCaches = (): number => {
    const registry = loadRegistry();
    const now = Date.now();
    const expired = Object.entries(registry).filter(([, expiresAt]) => now > expiresAt);

    expired.forEach(([key]) => {
        localStorage.removeItem(key);
        delete registry[key];
    });

    // Nettoyage des entrées visits_v3_ dont le champ timestamp est trop vieux (30j)
    const VISITS_TTL = 1000 * 60 * 60 * 24 * 30;
    const cutoff = now - VISITS_TTL;
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith('visits_v3_')) continue;
        try {
            const data = JSON.parse(localStorage.getItem(key) || '');
            if (data.timestamp && data.timestamp < cutoff) {
                keysToRemove.push(key);
            }
        } catch {}
    }

    keysToRemove.forEach((key) => {
        localStorage.removeItem(key);
        delete registry[key];
    });

    const total = expired.length + keysToRemove.length;
    if (total > 0) {
        saveRegistry(registry);
        console.log(`🧹 ${total} entrées de cache expirées supprimées`);
    }

    return total;
};
