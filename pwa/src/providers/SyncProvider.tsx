"use client";

import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    useRef,
} from "react";
import { syncQueueStorage } from "../services/storage";
import { SyncTask, ResourceType, RESOURCE_PRIORITY } from "@/types/SyncTask";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useNetworkQuality } from "@/hooks/useNetworkQuality";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Hash djb2 déterministe pour détecter les doublons (idempotence). */
const computeIdempotencyKey = (method: string, url: string, body: unknown): string => {
    const str = `${method}|${url}|${JSON.stringify(body)}`;
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
        hash = hash >>> 0;
    }
    return hash.toString(36);
};

/** Infère le type de ressource depuis l'URL pour le tri par priorité. */
const inferResourceType = (url: string): ResourceType => {
    if (/\/customers/.test(url)) return 'customer';
    if (/\/visits/.test(url)) return 'visit';
    if (/\/buildings/.test(url)) return 'building';
    if (/\/flocks/.test(url)) return 'flock';
    if (/\/observations/.test(url)) return 'observation';
    if (/\/prospections/.test(url)) return 'prospection';
    return 'other';
};

/** Délai avant prochain essai : backoff exponentiel plafonné à 5 min. */
const computeNextRetryDelay = (retryCount: number): number =>
    Math.min(Math.pow(2, retryCount) * 1000, 5 * 60 * 1000);

// ─── Context ─────────────────────────────────────────────────────────────────

interface SyncContextType {
    queue: SyncTask[];
    addToQueue: (task: Omit<SyncTask, "id" | "timestamp" | "retryCount" | "maxRetries" | "nextRetryAt" | "idempotencyKey" | "resourceType">) => void;
    processQueue: () => Promise<void>;
    isSyncing: boolean;
    isOnline: boolean;
    networkQuality: 'offline' | 'slow' | 'good';
    refreshAllData: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType>({
    queue: [],
    addToQueue: () => {},
    processQueue: async () => {},
    isSyncing: false,
    isOnline: true,
    networkQuality: 'good',
    refreshAllData: async () => {},
});

export const useSync = () => useContext(SyncContext);

// ─── Provider ────────────────────────────────────────────────────────────────

export default function SyncProvider({ children }: { children: React.ReactNode }) {
    const [queue, setQueue] = useState<SyncTask[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    const queryClient = useQueryClient();
    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    const { quality: networkQuality, isOnline } = useNetworkQuality();

    // Ref pour éviter les closures périmées dans processQueue
    const queueRef = useRef<SyncTask[]>([]);
    const isSyncingRef = useRef(false);

    useEffect(() => { queueRef.current = queue; }, [queue]);
    useEffect(() => { isSyncingRef.current = isSyncing; }, [isSyncing]);

    // ── Chargement initial depuis IndexedDB ──────────────────────────────────
    useEffect(() => {
        const loadQueue = async () => {
            try {
                const savedQueue = await syncQueueStorage.getItem<SyncTask[]>("queue");
                if (savedQueue && Array.isArray(savedQueue)) {
                    setQueue(savedQueue);
                    console.log(`📂 ${savedQueue.length} tâches chargées depuis IndexedDB`);
                }
            } catch (e) {
                console.error("Erreur lecture IndexedDB", e);
            } finally {
                setIsLoaded(true);
            }
        };
        loadQueue();
    }, []);

    // ── Persistance automatique ──────────────────────────────────────────────
    useEffect(() => {
        if (isLoaded) {
            syncQueueStorage
                .setItem("queue", queue)
                .catch((e) => console.error("Erreur écriture IndexedDB", e));
        }
    }, [queue, isLoaded]);

    // ── Rafraîchissement global ──────────────────────────────────────────────
    const refreshAllData = useCallback(async () => {
        if (!navigator.onLine) {
            toast("Pas de connexion internet pour mettre à jour.", { icon: "📴" });
            return;
        }

        const toastId = toast.loading("Mise à jour des données...");

        try {
            const token = localStorage.getItem("sav_token");
            if (!token) return;

            const resCustomers = await fetch(`${API_URL}/customers?pagination=false`, {
                headers: { Authorization: `Bearer ${token}`, Accept: "application/ld+json" },
            });

            if (resCustomers.ok) {
                const data = await resCustomers.json();
                const members = data['hydra:member'] || data['member'] || [];
                const options = members
                    .map((c: any) => ({
                        value: c['@id'] || `/api/customers/${c.id}`,
                        label: c.zone ? `${c.name} (${c.zone})` : c.name,
                    }))
                    .sort((a: any, b: any) => a.label.localeCompare(b.label));
                localStorage.setItem('sav_customers_cache', JSON.stringify(options));
            }

            await queryClient.invalidateQueries();
            toast.success("Données à jour !", { id: toastId });
        } catch (e) {
            console.error("Erreur refreshAllData", e);
            toast.error("Erreur lors de la mise à jour", { id: toastId });
        }
    }, [API_URL, queryClient]);

    // ── Log erreur synchro ───────────────────────────────────────────────────
    const logSyncError = useCallback(async (item: SyncTask, errorMsg: string, token: string) => {
        try {
            await fetch(`${API_URL}/audit_logs`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    action: "SYNC_ERROR",
                    endpoint: `${item.method} ${item.url}`,
                    errorMessage: errorMsg,
                    requestPayload: item.body,
                }),
            });
        } catch (e) {
            console.error("Impossible d'envoyer le log d'erreur", e);
        }
    }, [API_URL]);

    // ── Moteur de synchronisation ────────────────────────────────────────────
    const processQueue = useCallback(async () => {
        const currentQueue = queueRef.current;
        if (currentQueue.length === 0 || isSyncingRef.current || !navigator.onLine) return;

        if (networkQuality === 'slow') {
            toast("⚠️ Connexion instable détectée. Synchronisation prudente...", { duration: 3000 });
        }

        setIsSyncing(true);
        const token = localStorage.getItem("sav_token");

        if (!token) {
            setIsSyncing(false);
            return;
        }

        // Filtrer les tâches prêtes (nextRetryAt dépassé) et trier par priorité de ressource
        const now = Date.now();
        const readyTasks = currentQueue
            .filter((t) => t.nextRetryAt <= now)
            .sort((a, b) => {
                const pa = RESOURCE_PRIORITY[a.resourceType] ?? 99;
                const pb = RESOURCE_PRIORITY[b.resourceType] ?? 99;
                if (pa !== pb) return pa - pb;
                return a.timestamp - b.timestamp; // FIFO au sein d'un même type
            });

        if (readyTasks.length === 0) {
            setIsSyncing(false);
            return;
        }

        const toRemove: string[] = [];
        const toUpdate: ({ id: string } & Partial<SyncTask>)[] = [];
        let successCount = 0;

        for (const item of readyTasks) {
            try {
                const res = await fetch(`${API_URL}${item.url}`, {
                    method: item.method,
                    headers: {
                        "Content-Type": item.method === "PATCH"
                            ? "application/merge-patch+json"
                            : "application/json",
                        Authorization: `Bearer ${token}`,
                        "Idempotency-Key": item.idempotencyKey,
                    },
                    body: item.method !== 'DELETE' ? JSON.stringify(item.body) : undefined,
                });

                if (res.ok) {
                    console.log(`✅ Synchro réussie : ${item.method} ${item.url}`);
                    toRemove.push(item.id);
                    successCount++;
                } else if (res.status >= 500) {
                    // Erreur serveur → retry avec backoff
                    const newRetryCount = item.retryCount + 1;
                    if (newRetryCount > item.maxRetries) {
                        const msg = `Abandon après ${item.maxRetries} tentatives sur ${item.url}`;
                        toast.error(`❌ ${msg}`);
                        logSyncError(item, `${res.status} - max retries atteint`, token).catch(console.error);
                        toRemove.push(item.id);
                    } else {
                        const delay = computeNextRetryDelay(newRetryCount);
                        toast(`🔁 Erreur serveur sur ${item.url}. Nouvel essai dans ${Math.round(delay / 1000)}s`, { duration: 4000 });
                        toUpdate.push({ id: item.id, retryCount: newRetryCount, nextRetryAt: Date.now() + delay });
                    }
                } else {
                    // Erreur client 4xx → échec permanent, on abandonne
                    const errorJson = await res.json().catch(() => ({}));
                    const errorMsg = errorJson["hydra:description"] || errorJson.detail || `Erreur ${res.status}`;
                    toast.error(`❌ Échec définitif sur ${item.url} (${res.status})`);
                    console.error(`❌ Erreur API (${res.status}) sur ${item.url} - Abandon.`);
                    logSyncError(item, `Status ${res.status}: ${errorMsg}`, token).catch(console.error);
                    toRemove.push(item.id);
                }
            } catch {
                // Erreur réseau → retry avec backoff
                const newRetryCount = item.retryCount + 1;
                if (newRetryCount > item.maxRetries) {
                    toast.error(`❌ Abandon de ${item.url} après ${item.maxRetries} erreurs réseau`);
                    logSyncError(item, 'Max network retries atteint', token).catch(console.error);
                    toRemove.push(item.id);
                } else {
                    const delay = computeNextRetryDelay(newRetryCount);
                    console.warn(`🌐 Erreur réseau sur ${item.url}. Retry #${newRetryCount} dans ${delay}ms`);
                    toUpdate.push({ id: item.id, retryCount: newRetryCount, nextRetryAt: Date.now() + delay });
                    break; // Pause : le réseau est coupé, inutile de continuer
                }
            }
        }

        setQueue((prev) => {
            let updated = prev.filter((t) => !toRemove.includes(t.id));
            updated = updated.map((t) => {
                const patch = toUpdate.find((u) => u.id === t.id);
                return patch ? { ...t, ...patch } : t;
            });
            return updated;
        });

        if (successCount > 0) {
            const allDone = readyTasks.every((t) => toRemove.includes(t.id));
            if (allDone) setTimeout(() => refreshAllData(), 1000);
        }

        setIsSyncing(false);
    }, [API_URL, networkQuality, refreshAllData, logSyncError]);

    // ── Retry périodique pour les tâches en attente de backoff ──────────────
    useEffect(() => {
        const interval = setInterval(() => {
            if (!navigator.onLine || isSyncingRef.current) return;
            const hasReady = queueRef.current.some((t) => t.nextRetryAt <= Date.now());
            if (hasReady) processQueue();
        }, 30_000);
        return () => clearInterval(interval);
    }, [processQueue]);

    // ── Gestion événements réseau ────────────────────────────────────────────
    useEffect(() => {
        const handleOnline = () => {
            toast.success("🟢 Connexion rétablie !");
            processQueue();
            refreshAllData();
        };

        const handleOffline = () => {
            toast("📴 Mode hors ligne activé");
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        if (navigator.onLine && queue.length > 0 && isLoaded) {
            processQueue();
        }

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, [processQueue, refreshAllData, queue.length, isLoaded]);

    // ── Alerte connexion instable ────────────────────────────────────────────
    useEffect(() => {
        if (networkQuality === 'slow' && isOnline) {
            toast("⚠️ Connexion instable détectée. Les données peuvent être partielles.", {
                icon: "📶",
                duration: 5000,
                id: "network-slow",
            });
        }
    }, [networkQuality, isOnline]);

    // ── addToQueue avec idempotence ──────────────────────────────────────────
    const addToQueue = useCallback((
        taskData: Omit<SyncTask, "id" | "timestamp" | "retryCount" | "maxRetries" | "nextRetryAt" | "idempotencyKey" | "resourceType">
    ) => {
        const idempotencyKey = computeIdempotencyKey(taskData.method, taskData.url, taskData.body);
        const resourceType = inferResourceType(taskData.url);

        if (queueRef.current.some((t) => t.idempotencyKey === idempotencyKey)) {
            toast("⚠️ Cette action est déjà en attente de synchronisation.", { duration: 3000 });
            return;
        }

        const newTask: SyncTask = {
            ...taskData,
            id: crypto.randomUUID ? crypto.randomUUID() : `task-${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            retryCount: 0,
            maxRetries: 3,
            nextRetryAt: 0,
            idempotencyKey,
            resourceType,
        };

        setQueue((prev) => [...prev, newTask]);
        toast("💾 Action sauvegardée localement.", {
            icon: "💾",
            style: { background: "#e4c61c", color: "#000" },
            duration: 3000,
        });

        if (navigator.onLine) {
            setTimeout(() => processQueue(), 500);
        }
    }, [processQueue]);

    // ── Badge de statut ──────────────────────────────────────────────────────
    const pendingCount = queue.filter((t) => t.nextRetryAt <= Date.now()).length;
    const retryCount = queue.length - pendingCount;

    const badgeColor = isSyncing
        ? "bg-blue-600 text-white"
        : networkQuality === 'slow'
        ? "bg-orange-400 text-orange-900"
        : isOnline
        ? "bg-yellow-400 text-yellow-900"
        : "bg-gray-800 text-white";

    return (
        <SyncContext.Provider value={{
            queue,
            addToQueue,
            processQueue,
            isSyncing,
            isOnline,
            networkQuality,
            refreshAllData,
        }}>
            {children}

            {queue.length > 0 && (
                <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-1 animate-in fade-in slide-in-from-bottom-4">
                    <div className={`px-4 py-2 rounded-full shadow-lg font-bold text-xs flex items-center gap-2 transition-colors ${badgeColor}`}>
                        {isSyncing ? (
                            <>🔄 Synchronisation...</>
                        ) : networkQuality === 'slow' && isOnline ? (
                            <>📶 Connexion instable ({queue.length})</>
                        ) : isOnline ? (
                            <>⏳ En attente ({pendingCount}{retryCount > 0 ? ` · ${retryCount} en retry` : ''})</>
                        ) : (
                            <>🌐 Hors ligne ({queue.length})</>
                        )}
                    </div>
                </div>
            )}
        </SyncContext.Provider>
    );
}
