"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Select from "react-select";
import { useSync } from "@/providers/SyncProvider";
import toast from "react-hot-toast";

// --- TYPES ---
interface StatsData {
    technicianName: string;
    visitsCount: number;
    activeFlocks: number;
    portfolioSize: number;
    visitRate: number;
    visitFrequency: string;
    uniqueVisited: number;
    lateReports: number;
    healthAlerts: number;
    estimatedFeedTonnage: number;
    loading: boolean;
    pendingVisits?: number;
    pendingActive?: number;
    pendingHealthAlerts?: number;
    // Cache metadata
    cachedAt?: number;
    dateRange?: { start: string; end: string };
}

interface UserOption {
    value: number;
    label: string;
}

interface CachedTech {
    technicians: UserOption[];
    timestamp: number;
}

// --- CONSTANTES ---
const ESTIMATED_TONS_PER_FLOCK = 8;
const API_URL = process.env.NEXT_PUBLIC_API_URL;
const STATS_CACHE_PREFIX = "dashboard_stats_v1_";
const TECHS_CACHE_KEY = "dashboard_technicians_v1";
const CACHE_MAX_AGE = 1000 * 60 * 60 * 24; // 24h

// --- CACHE HELPERS ---

const getStatsCacheKey = (startDate: string, endDate: string, techIds: string = "all") => 
    `${STATS_CACHE_PREFIX}${startDate}_${endDate}_${techIds}`;

const getCachedStats = (startDate: string, endDate: string, techIds?: string): StatsData | null => {
    try {
        const cached = localStorage.getItem(getStatsCacheKey(startDate, endDate, techIds));
        if (!cached) return null;
        const parsed = JSON.parse(cached);
        // Vérifier si le cache n'est pas trop vieux
        if (Date.now() - parsed.cachedAt > CACHE_MAX_AGE) {
            localStorage.removeItem(getStatsCacheKey(startDate, endDate, techIds));
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
};

const setCachedStats = (startDate: string, endDate: string, stats: StatsData, techIds?: string) => {
    try {
        const dataToCache = {
            ...stats,
            cachedAt: Date.now(),
            dateRange: { start: startDate, end: endDate }
        };
        localStorage.setItem(getStatsCacheKey(startDate, endDate, techIds), JSON.stringify(dataToCache));
    } catch (e) {
        console.warn('Stats cache write failed:', e);
    }
};

const getCachedTechnicians = (): UserOption[] | null => {
    try {
        const cached = localStorage.getItem(TECHS_CACHE_KEY);
        if (!cached) return null;
        const parsed: CachedTech = JSON.parse(cached);
        if (Date.now() - parsed.timestamp > CACHE_MAX_AGE) {
            localStorage.removeItem(TECHS_CACHE_KEY);
            return null;
        }
        return parsed.technicians;
    } catch {
        return null;
    }
};

const setCachedTechnicians = (technicians: UserOption[]) => {
    try {
        localStorage.setItem(TECHS_CACHE_KEY, JSON.stringify({
            technicians,
            timestamp: Date.now()
        }));
    } catch (e) {
        console.warn('Tech cache write failed:', e);
    }
};

const clearStatsCache = () => {
    Object.keys(localStorage)
        .filter(key => key.startsWith(STATS_CACHE_PREFIX))
        .forEach(key => localStorage.removeItem(key));
};

// --- COMPOSANTS UI ---
const MenuCard = ({ title, icon, href, color, description, disabled = false }: any) => {
    const content = (
        <div className={`group relative overflow-hidden bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-300 ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
            <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110 opacity-50`}></div>
            <div className="relative z-10">
                <div className={`w-12 h-12 bg-${color}-100 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    {icon}
                </div>
                <h3 className="font-bold text-lg text-gray-800 mb-1 group-hover:text-indigo-700 transition-colors">
                    {title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                    {description}
                </p>
                {disabled && (
                    <span className="text-xs text-orange-500 mt-2 block">📡 Nécessite une connexion</span>
                )}
            </div>
        </div>
    );

    if (disabled) {
        return <div className="cursor-not-allowed">{content}</div>;
    }

    return <Link href={href}>{content}</Link>;
};

const StatCard = ({
    label,
    value,
    subValue,
    icon,
    tooltip,
    color,
    loading,
    isPercent,
    alert,
    pending,
}: any) => {
    const [showTooltip, setShowTooltip] = useState(false);

    return (
    <div className={`p-5 rounded-xl border shadow-sm flex flex-col justify-between h-full transition-all ${alert ? "bg-red-50 border-red-200" : "bg-white border-gray-100"} break-inside-avoid print:border-gray-300 print:shadow-none`}>
        <div className="flex justify-between items-start mb-2">
            <p className={`text-xs font-bold uppercase tracking-wider ${alert ? "text-red-600" : "text-gray-500 print:text-black"}`}>
                {label}
            </p>
            {icon && (
                <div className="relative print:hidden">
                    <button
                        type="button"
                        onClick={() => setShowTooltip(!showTooltip)}
                        onBlur={() => setTimeout(() => setShowTooltip(false), 200)}
                        className={`text-lg p-1.5 rounded-lg bg-${color || "gray"}-50 hover:bg-${color || "gray"}-100 transition-colors cursor-help`}
                        title={tooltip}
                        aria-label={tooltip}
                    >
                        {icon}
                    </button>
                    {showTooltip && (
                        <div className="absolute right-0 top-full mt-1 w-56 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-top-1">
                            <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 rotate-45"></div>
                            {tooltip}
                        </div>
                    )}
                </div>
            )}
        </div>
        <div>
            <div className="flex items-end gap-2 mb-1">
                {loading ? (
                    <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
                ) : (
                    <div className="flex items-center gap-2">
                        <h4 className={`text-2xl font-extrabold ${alert ? "text-red-700" : "text-gray-900 print:text-black"}`}>
                            {value}
                        </h4>
                        {pending > 0 && (
                            <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full font-bold border border-yellow-200 animate-pulse print:hidden"
                                title="Données en attente de synchronisation">
                                +{pending} ⏳
                            </span>
                        )}
                    </div>
                )}
                {alert && !loading && <span className="text-lg print:hidden">⚠️</span>}
            </div>
            {subValue && (
                <p className={`text-[10px] ${alert ? "text-red-500" : "text-gray-400 print:text-gray-600"}`}>
                    {subValue}
                </p>
            )}
        </div>
        {isPercent && !loading && (
            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3 overflow-hidden print:border print:border-gray-200">
                <div className={`h-full rounded-full ${parseFloat(value) >= 80 ? "bg-green-500" : parseFloat(value) >= 50 ? "bg-orange-400" : "bg-red-500"} print:bg-black`}
                    style={{ width: parseFloat(value) > 100 ? "100%" : value }}></div>
            </div>
        )}
    </div>
    );
};

// --- COMPOSANT PAGE ---

export default function DashboardHome() {
    const router = useRouter();
    const printRef = useRef<HTMLDivElement>(null);
    const { queue, processQueue } = useSync();
    const preloadRef = useRef<Set<string>>(new Set());

    // États réseau
    const [isOfflineMode, setIsOfflineMode] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [cacheAge, setCacheAge] = useState<number | null>(null);

    // Context Utilisateur
    const [activeTab, setActiveTab] = useState<"menu" | "stats">("menu");
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isSupport, setIsSupport] = useState(false);
    const [isSalesRep, setIsSalesRep] = useState(false);

    // ── Charger stats commerciales ──
    const loadSalesStats = async (authToken: string, start: string, end: string) => {
        setLoadingSalesStats(true);
        try {
            const res = await fetch(`${API_URL}/stats/sales?start=${start}&end=${end}`, {
                headers: { Authorization: `Bearer ${authToken}`, Accept: 'application/json' }
            });
            if (res.ok) {
                const data = await res.json();
                setSalesStats(data);
            }
        } catch { /* silencieux */ }
        finally { setLoadingSalesStats(false); }
    };

    // Filtres — initialisés au mois courant
    const nowRef = useRef(new Date());
    const monthStart = new Date(nowRef.current.getFullYear(), nowRef.current.getMonth(), 1).toISOString().slice(0, 10);
    const monthEnd = new Date(nowRef.current.getFullYear(), nowRef.current.getMonth() + 1, 0).toISOString().slice(0, 10);
    const [startDate, setStartDate] = useState(monthStart);
    const [endDate, setEndDate] = useState(monthEnd);
    const [allTechnicians, setAllTechnicians] = useState<UserOption[]>([]);
    const [selectedTechnicians, setSelectedTechnicians] = useState<UserOption[]>([]);

    // Sales stats for ROLE_SALES_REP
    const [salesStats, setSalesStats] = useState<any>(null);
    const [loadingSalesStats, setLoadingSalesStats] = useState(false);
    const [techniciansLoaded, setTechniciansLoaded] = useState(false);

    // Données Stats
    const [aggregatedStats, setAggregatedStats] = useState<StatsData | null>(null);
    const [technicianStatsList, setTechnicianStatsList] = useState<StatsData[]>([]);
    const [loadingStats, setLoadingStats] = useState(false);

    // Modal conversion prospection (conservé de l'original)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [prospectionSourceId, setProspectionSourceId] = useState<string | null>(null);

    // --- INITIALISATION ---

    useEffect(() => {
        const token = localStorage.getItem("sav_token");
        if (!token) {
            router.push("/");
            return;
        }

        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            setCurrentUser(payload);
            const roles = payload.roles || [];
            const support = roles.includes("ROLE_ADMIN") ||
                          roles.includes("ROLE_SUPER_ADMIN") ||
                          roles.includes("ROLE_OPERATOR");
            setIsSupport(support);
            setIsSalesRep(roles.includes("ROLE_SALES_REP"));

            // Charger stats commerciales si ROLE_SALES_REP
            if (roles.includes("ROLE_SALES_REP")) {
                loadSalesStats(token, monthStart, monthEnd);
            }

            // Charger techniciens depuis cache immédiatement
            const cachedTechs = getCachedTechnicians();
            if (cachedTechs) {
                setAllTechnicians(cachedTechs);
                setTechniciansLoaded(true);
            }

            // Puis fetch si online
            if (support) {
                fetchTechnicians(token, cachedTechs !== null);
            }

            // Charger stats initiales depuis cache ou API
            const startIso = new Date(monthStart).toISOString();
            const endIso = new Date(monthEnd).toISOString();
            
            loadInitialStats(token, payload, support, startIso, endIso);

        } catch (e) {
            console.error("Erreur init", e);
            router.push("/");
        }

        // Listeners online/offline
        const handleOnline = async () => {
            setIsOfflineMode(false);
            toast.success("Connexion rétablie 🌐", { id: 'online-back' });

            if (queue.length > 0 && processQueue) {
                setIsSyncing(true);
                toast.loading("Synchronisation...", { id: 'syncing' });
                try {
                    await processQueue();
                    toast.success("Synchronisation terminée ✅", { id: 'syncing' });
                    clearStatsCache();
                    // Refresh stats après sync
                    const token = localStorage.getItem("sav_token");
                    if (token) {
                        const s = new Date(startDate).toISOString();
                        const e = new Date(endDate);
                        e.setHours(23, 59, 59, 999);
                        handleSearch(token, s, e.toISOString(), true);
                    }
                } catch {
                    toast.error("Erreur de synchronisation", { id: 'syncing' });
                } finally {
                    setIsSyncing(false);
                }
            }
        };

        const handleOffline = () => {
            setIsOfflineMode(true);
            toast("Mode hors ligne 📡", { id: 'offline' });
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        if (!navigator.onLine) handleOffline();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Chargement initial des stats
    const loadInitialStats = async (token: string, user: any, support: boolean, startIso: string, endIso: string) => {
        const techIds = support && selectedTechnicians.length > 0 
            ? selectedTechnicians.map(t => t.value).join(',')
            : "all";
            
        // Essayer cache d'abord
        const cached = getCachedStats(startDate, endDate, techIds);
        if (cached) {
            setAggregatedStats(cached);
            setCacheAge(Date.now() - cached.cachedAt!);
            if (!navigator.onLine) {
                setIsOfflineMode(true);
                return;
            }
            // Continue pour refresh en background si online
        }

        if (!support) {
            const stats = await fetchSingleStats(token, user.id, user.username || "Moi", startIso, endIso);
            if (stats) {
                setAggregatedStats(stats);
                setCachedStats(startDate, endDate, stats, "all");
            }
        } else {
            await loadGlobalStats(token, startIso, endIso);
        }
    };

    // --- FETCH TECHNICIENS ---

    const fetchTechnicians = async (token: string, useCacheFirst = false) => {
        if (!navigator.onLine) {
            if (!useCacheFirst) {
                const cached = getCachedTechnicians();
                if (cached) setAllTechnicians(cached);
            }
            return;
        }

        try {
            const res = await fetch(`${API_URL}/users?pagination=false`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            });
            const users = await res.json();
            const techs = users
                .filter((u: any) => u.roles.includes("ROLE_TECHNICIAN"))
                .map((u: any) => ({ value: u.id, label: u.username }));
            
            setAllTechnicians(techs);
            setCachedTechnicians(techs);
            setTechniciansLoaded(true);
        } catch (e) {
            console.error("Erreur chargement techs", e);
            // Fallback cache en cas d'erreur
            const cached = getCachedTechnicians();
            if (cached) setAllTechnicians(cached);
        }
    };

    // --- FETCH STATS ---

    const fetchSingleStats = async (
        token: string,
        uId: number | null,
        name: string,
        startIso: string,
        endIso: string,
        useCache: boolean = true
    ): Promise<StatsData | null> => {
        
        // Vérifier cache si demandé et pas de force refresh
        if (useCache && navigator.onLine) {
            const cacheKey = uId ? `user_${uId}` : "global";
            const cached = getCachedStats(startDate, endDate, cacheKey);
            if (cached && Date.now() - cached.cachedAt! < 5 * 60 * 1000) { // 5min fraîcheur
                return cached;
            }
        }

        if (!navigator.onLine) {
            // Dernier recours: cache même s'il est vieux
            const cacheKey = uId ? `user_${uId}` : "global";
            const cached = getCachedStats(startDate, endDate, cacheKey);
            if (cached) {
                setIsOfflineMode(true);
                return { ...cached, loading: false };
            }
            toast.error("Statistiques non disponibles hors ligne");
            return null;
        }

        const headers = {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
        };
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        const twoDaysAgoIso = twoDaysAgo.toISOString();

        try {
            const techFilter = uId ? `&technician=${uId}` : "";
            const techFilterVisit = uId ? `&visit.technician=${uId}` : "";
            const techFilterPortfolio = uId ? `&technician=${uId}` : "";

            // Parallélisation des requêtes
            const [visitsRes, flocksRes, portfolioRes, lateRes, healthRes] = await Promise.all([
                fetch(`${API_URL}/visits?visitedAt[after]=${startIso}&visitedAt[before]=${endIso}&pagination=false${techFilter}`, { headers }),
                fetch(`${API_URL}/visits?exists[endDate]=false${techFilter}`, { headers }),
                uId 
                    ? fetch(`${API_URL}/portfolio_histories?pagination=false${techFilterPortfolio}`, { headers })
                    : fetch(`${API_URL}/customers?activated=true&pagination=false`, { headers }),
                fetch(`${API_URL}/visits?closed=false&visitedAt[before]=${twoDaysAgoIso}${techFilter}`, { headers }),
                fetch(`${API_URL}/observations?observedAt[after]=${startIso}&observedAt[before]=${endIso}&pagination=false${techFilterVisit}`, { headers })
            ]);

            // Vérifier erreurs
            if (!visitsRes.ok || !flocksRes.ok || !portfolioRes.ok || !lateRes.ok || !healthRes.ok) {
                throw new Error("Une ou plusieurs requêtes ont échoué");
            }

            const [visitsData, flocksData, portfolioData, lateData, healthData] = await Promise.all([
                visitsRes.json(),
                flocksRes.json(),
                portfolioRes.json(),
                lateRes.json(),
                healthRes.json()
            ]);

            // Extraction données
            const getArray = (d: any) => Array.isArray(d) ? d : d["hydra:member"] || [];
            const getCount = (d: any) => Array.isArray(d) ? d.length : d["hydra:totalItems"] || 0;

            const visitsArray = getArray(visitsData);
            const visitsCount = visitsArray.length;
            const uniqueVisited = new Set(
                visitsArray.map((v: any) => v.customer?.["@id"] || v.customer?.id).filter(Boolean)
            ).size;

            let portfolioSize = 0;
            if (!uId) {
                portfolioSize = getCount(portfolioData);
            } else {
                const histArray = getArray(portfolioData);
                const activeSet = new Set();
                const pStart = new Date(startIso);
                const pEnd = new Date(endIso);
                histArray.forEach((h: any) => {
                    const hStart = new Date(h.startDate);
                    const hEnd = h.endDate ? new Date(h.endDate) : null;
                    if (hStart <= pEnd && (hEnd === null || hEnd >= pStart)) {
                        const cid = h.customer?.["@id"] || h.customer?.id;
                        if (cid) activeSet.add(cid);
                    }
                });
                portfolioSize = activeSet.size;
            }

            const activeFlocks = getCount(flocksData);
            const lateReports = getCount(lateData);
            
            const obsArray = getArray(healthData);
            const healthAlerts = obsArray.filter((o: any) => o.problems && o.problems.trim() !== "").length;

            const estimatedFeedTonnage = activeFlocks * ESTIMATED_TONS_PER_FLOCK;
            const visitRate = portfolioSize > 0 ? Math.round((uniqueVisited / portfolioSize) * 100) : 0;
            const frequencyVal = uniqueVisited > 0 ? (visitsCount / uniqueVisited).toFixed(1) : "0";

            const stats: StatsData = {
                technicianName: name,
                visitsCount,
                activeFlocks,
                portfolioSize,
                visitRate,
                visitFrequency: frequencyVal,
                uniqueVisited,
                lateReports,
                healthAlerts,
                estimatedFeedTonnage,
                loading: false,
                cachedAt: Date.now(),
                dateRange: { start: startDate, end: endDate }
            };

            // Sauvegarder dans cache
            const cacheKey = uId ? `user_${uId}` : "global";
            setCachedStats(startDate, endDate, stats, cacheKey);

            return stats;

        } catch (e) {
            console.error("Erreur fetch stats", e);
            
            // Fallback cache
            const cacheKey = uId ? `user_${uId}` : "global";
            const cached = getCachedStats(startDate, endDate, cacheKey);
            if (cached) {
                toast("Données en cache (erreur réseau)", { id: 'cache-fallback' });
                return { ...cached, loading: false };
            }
            
            return null;
        }
    };

    // --- LOGIQUE DE FUSION OPTIMISTE ---

    const displayedStats = useMemo(() => {
        if (!aggregatedStats) return null;
        if (loadingStats) return aggregatedStats;

        const stats = { ...aggregatedStats };
        const s = new Date(startDate);
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);

        let pendingVisitsCount = 0;
        let pendingActive = 0;
        let pendingAlerts = 0;

        queue.forEach((item: any) => {
            if (item.method !== "POST") return;

            if (item.url === "/visits") {
                const d = new Date(item.body.visitedAt || new Date());
                if (d >= s && d <= e) {
                    pendingVisitsCount++;
                    if (!item.body.endDate && !item.body.closed) {
                        pendingActive++;
                    }
                }
            }

            if (item.url === "/observations") {
                const d = new Date(item.body.observedAt || new Date());
                if (d >= s && d <= e) {
                    const hasPb = (item.body.detectedProblems && item.body.detectedProblems.length > 0) ||
                                (item.body.problems && item.body.problems.trim() !== "");
                    if (hasPb) pendingAlerts++;
                }
            }
        });

        stats.visitsCount += pendingVisitsCount;
        stats.activeFlocks += pendingActive;
        stats.healthAlerts += pendingAlerts;
        stats.estimatedFeedTonnage += pendingActive * ESTIMATED_TONS_PER_FLOCK;
        stats.pendingVisits = pendingVisitsCount;
        stats.pendingActive = pendingActive;
        stats.pendingHealthAlerts = pendingAlerts;

        return stats;
    }, [aggregatedStats, queue, startDate, endDate, loadingStats]);

    // --- HANDLERS ---

    const handleSearch = async (token?: string, customStart?: string, customEnd?: string, forceRefresh = false) => {
        setLoadingStats(true);
        
        const authToken = token || localStorage.getItem("sav_token");
        if (!authToken) return;

        const s = customStart || new Date(startDate).toISOString();
        const e = customEnd || new Date(endDate);
        if(typeof e!='string') e.setHours(23,59,59);
        const endIso = customEnd || (typeof e!='string' ? e.toISOString() : e);

        // Vérifier cache d'abord si pas force refresh
        if (!forceRefresh) {
            const techIds = isSupport && selectedTechnicians.length > 0 
                ? selectedTechnicians.map(t => t.value).join(',')
                : "all";
            const cached = getCachedStats(startDate, endDate, techIds);
            if (cached) {
                setAggregatedStats(cached);
                setCacheAge(Date.now() - cached.cachedAt!);
                if (!navigator.onLine) {
                    setLoadingStats(false);
                    return;
                }
            }
        }

        if (!isSupport) {
            const stats = await fetchSingleStats(authToken, currentUser.id, currentUser.username, s, endIso, !forceRefresh);
            if (stats) {
                setAggregatedStats(stats);
                setTechnicianStatsList([]);
            }
        } else {
            if (selectedTechnicians.length === 0) {
                await loadGlobalStats(authToken, s, endIso, forceRefresh);
                setTechnicianStatsList([]);
            } else {
                // Stats individuelles avec préchargement parallèle
                const promises = selectedTechnicians.map((tech) =>
                    fetchSingleStats(authToken, tech.value, tech.label, s, endIso, !forceRefresh)
                );
                const statsList = (await Promise.all(promises)).filter(Boolean) as StatsData[];
                setTechnicianStatsList(statsList);

                // Calcul cumul
                const cumul = statsList.reduce((acc, curr) => ({
                    technicianName: "CUMUL SÉLECTION",
                    visitsCount: acc.visitsCount + curr.visitsCount,
                    activeFlocks: acc.activeFlocks + curr.activeFlocks,
                    portfolioSize: acc.portfolioSize + curr.portfolioSize,
                    uniqueVisited: acc.uniqueVisited + curr.uniqueVisited,
                    lateReports: acc.lateReports + curr.lateReports,
                    healthAlerts: acc.healthAlerts + curr.healthAlerts,
                    estimatedFeedTonnage: acc.estimatedFeedTonnage + curr.estimatedFeedTonnage,
                    visitRate: 0,
                    visitFrequency: "0",
                    loading: false,
                }), {
                    technicianName: "",
                    visitsCount: 0,
                    activeFlocks: 0,
                    portfolioSize: 0,
                    uniqueVisited: 0,
                    lateReports: 0,
                    healthAlerts: 0,
                    estimatedFeedTonnage: 0,
                    visitRate: 0,
                    visitFrequency: "0",
                    loading: false,
                });

                cumul.visitRate = cumul.portfolioSize > 0 ? Math.round((cumul.uniqueVisited / cumul.portfolioSize) * 100) : 0;
                cumul.visitFrequency = cumul.uniqueVisited > 0 ? (cumul.visitsCount / cumul.uniqueVisited).toFixed(1) : "0";

                setAggregatedStats(cumul);
                
                // Sauvegarder cumul dans cache
                const techIds = selectedTechnicians.map(t => t.value).join(',');
                setCachedStats(startDate, endDate, cumul, techIds);
            }
        }
        
        setLoadingStats(false);
    };

    const loadGlobalStats = async (token: string, startIso: string, endIso: string, forceRefresh = false) => {
        const stats = await fetchSingleStats(token, null, "Vue d'ensemble (Tous)", startIso, endIso, !forceRefresh);
        if (stats) setAggregatedStats(stats);
    };

    const handlePrint = () => window.print();

    // --- RENDER HELPERS ---

    const renderStatsSection = (data: StatsData, isMain = false) => (
        <div className={`mb-8 break-inside-avoid ${isMain ? "" : "opacity-90 scale-95 origin-left"}`}>
            <h3 className={`font-bold mb-4 flex items-center gap-2 ${isMain ? "text-xl text-indigo-900 border-b pb-2 print:text-black print:border-black" : "text-lg text-gray-700 print:text-gray-900"}`}>
                {isMain ? "📊" : "👤"} {data.technicianName}
                {data.cachedAt && !navigator.onLine && (
                    <span className="text-xs text-orange-500 font-normal">(offline)</span>
                )}
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <StatCard
                    label="Taux Couv."
                    value={`${data.visitRate}%`}
                    subValue={`${data.uniqueVisited}/${data.portfolioSize} clients`}
                    isPercent={true}
                    loading={data.loading}
                    icon="🎯"
                    color="blue"
                    tooltip="Taux de couverture : pourcentage des clients du portefeuille ayant reçu au moins une visite sur la période. Un taux élevé (>80%) indique une bonne couverture terrain."
                />
                <StatCard
                    label="Intensité"
                    value={data.visitFrequency}
                    subValue="Visites / Client / Période"
                    loading={data.loading}
                    icon="🔄"
                    color="purple"
                    tooltip="Intensité de suivi : nombre moyen de visites par client sur la période. Mesure la fréquence à laquelle chaque éleveur est visité."
                />
                <StatCard
                    label="Cheptel Actif"
                    value={data.activeFlocks.toString()}
                    subValue="Lots en cours"
                    loading={data.loading}
                    icon="🐣"
                    color="indigo"
                    pending={data.pendingActive}
                    tooltip="Cheptel actif : nombre de bandes (lots d'animaux) actuellement en cours d'élevage chez les clients visités. Permet d'estimer le potentiel aliment."
                />
                <StatCard
                    label="Alertes Santé"
                    value={data.healthAlerts.toString()}
                    subValue="Observations avec problèmes"
                    loading={data.loading}
                    alert={data.healthAlerts > 0}
                    icon="❤️‍🩹"
                    color={data.healthAlerts > 0 ? "red" : "green"}
                    pending={data.pendingHealthAlerts}
                    tooltip="Alertes santé : nombre d'observations ayant détecté un problème (mortalité, maladie, baisse de poids). Un chiffre élevé nécessite une attention immédiate."
                />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    label="Visites Tot."
                    value={data.visitsCount.toString()}
                    loading={data.loading}
                    icon="📝"
                    color="gray"
                    pending={data.pendingVisits}
                    tooltip="Visites totales : nombre de visites réalisées (clôturées) sur la période. Inclut les visites planifiées et spontanées."
                />
                <StatCard
                    label="Retards"
                    value={data.lateReports.toString()}
                    loading={data.loading}
                    alert={data.lateReports > 0}
                    icon="⏰"
                    color={data.lateReports > 0 ? "orange" : "green"}
                    tooltip="Retards de rapport : visites non clôturées dans les 48h suivant la date de visite. Un retard rend les données inexploitables pour le pilotage."
                />
                <div className="col-span-2 bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col justify-center print:bg-white print:border-gray-300">
                    <p className="text-blue-800 text-xs font-bold uppercase mb-1 print:text-black">
                        Potentiel Aliment
                    </p>
                    <h4 className="text-xl font-extrabold text-blue-900 print:text-black">
                        {data.loading ? "..." : `~ ${data.estimatedFeedTonnage} T`}
                    </h4>
                    <p className="text-[10px] text-blue-600 mt-1 print:text-gray-600">
                        Estimation sur cheptel actif
                    </p>
                </div>
            </div>
        </div>
    );

    const isStale = cacheAge && cacheAge > CACHE_MAX_AGE;

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans">
            {/* Bannières d'état */}
            {isOfflineMode && (
                <div className="bg-orange-500 text-white text-xs font-bold text-center py-1">
                    📡 Mode Hors Ligne {isStale && `(${Math.round(cacheAge! / 3600000)}h)`}
                </div>
            )}
            {isStale && !isOfflineMode && (
                <div className="bg-yellow-500 text-white text-xs font-bold text-center py-1">
                    ⚠️ Données potentiellement obsolètes
                </div>
            )}
            {isSyncing && (
                <div className="bg-blue-500 text-white text-xs font-bold text-center py-1 animate-pulse">
                    🔄 Synchronisation...
                </div>
            )}

            {/* HEADER */}
            <div className="print:hidden bg-gradient-to-r from-indigo-900 to-indigo-800 text-white px-6 pt-8 pb-20 rounded-b-[3rem] shadow-xl mb-8">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div>
                        <p className="text-indigo-200 text-sm font-medium mb-1 uppercase tracking-wide">
                            Tableau de bord
                        </p>
                        <h1 className="text-3xl font-extrabold tracking-tight mb-2">
                            {currentUser?.username}
                        </h1>
                        {isOfflineMode && (
                            <span className="text-xs bg-orange-500/50 px-2 py-1 rounded text-orange-100">
                                Mode hors ligne
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* CONTENU PRINCIPAL */}
            <div className="max-w-6xl mx-auto px-4 -mt-16 relative z-10 print:mt-0 print:max-w-full print:px-0">
                
                {/* MENU ONGLETS */}
                <div className="print:hidden flex bg-white p-1.5 rounded-xl shadow-lg border border-gray-100 mb-8 w-fit mx-auto md:mx-0">
                    <button
                        onClick={() => setActiveTab("menu")}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "menu" ? "bg-indigo-100 text-indigo-700" : "text-gray-500"}`}
                    >
                        Applications
                    </button>
                    <button
                        onClick={() => setActiveTab("stats")}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "stats" ? "bg-indigo-100 text-indigo-700" : "text-gray-500"}`}
                    >
                        Performance
                    </button>
                </div>

                {activeTab === "menu" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                        {/* Cartes communes à tous les rôles */}
                        <MenuCard title="Clients" icon="👥" href="/dashboard/customers" color="blue"
                            description="Gérer le portefeuille client." />
                        <MenuCard title="Rapports" icon="📈" href="/dashboard/reports" color="pink"
                            description="Analyses, graphiques et exports Excel." />

                        {/* Cartes Technicien */}
                        {!isSalesRep && (
                            <>
                                <MenuCard title="Visites" icon="🚜" href="/dashboard/visits" color="indigo"
                                    description="Rapports et interventions." />
                                <MenuCard title="Prospections" icon="🔭" href="/dashboard/prospections" color="purple"
                                    description="Suivi des prospects et consultations." />
                                <MenuCard title="Bandes" icon="🐣" href="/dashboard/flocks" color="green"
                                    description="Suivi des lots en cours." />
                                <MenuCard title="Bâtiments" icon="🏠" href="/dashboard/buildings" color="orange"
                                    description="Infrastructures." />
                            </>
                        )}

                        {/* Carte Commune — Performance Comm. */}
                        <MenuCard title="Performance Comm." icon="🏪" href="/dashboard/sales" color="emerald"
                            description="KPIs commerciaux : visites, prix, stock, commandes." />

                        {/* Cartes Visites (commercial) */}
                        {isSalesRep && (
                            <MenuCard title="Visites Commerciales" icon="🏪" href="/dashboard/sales/visits" color="emerald"
                                description="Planifier et suivre mes visites en provenderie." />
                        )}

                        {/* Admin */}
                        {isSupport && (
                            <>
                                <MenuCard title="Utilisateurs" icon="🔐" href="/dashboard/users" color="red"
                                    description="Administration des accès."
                                    disabled={isOfflineMode && !getCachedTechnicians()} />
                                <MenuCard title="Config" icon="⚙️" href="/dashboard/settings" color="gray"
                                    description="Paramètres globaux." disabled={isOfflineMode} />
                            </>
                        )}
                    </div>
                ) : (
                    <div ref={printRef} className="space-y-8 animate-fade-in print:w-full print:bg-white">
                        
                        {/* BARRE DE FILTRES */}
                        <div className="print:hidden bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
                            <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">
                                Filtrer les rapports {cacheAge && `• Cache ${Math.round(cacheAge / 60000)}min`}
                            </h3>
                            <div className="flex flex-col md:flex-row gap-4 items-end">
                                <div className="w-full md:w-1/4">
                                    <label className="text-xs text-gray-500 block mb-1">Du</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (!val) return; // ignore les valeurs vides
                                            setStartDate(val);
                                            const token = localStorage.getItem("sav_token");
                                            if (token) {
                                                const d = new Date(val);
                                                if (isNaN(d.getTime())) return; // date invalide
                                                const s = d.toISOString();
                                                const ed = new Date(endDate);
                                                ed.setHours(23, 59, 59, 999);
                                                handleSearch(token, s, ed.toISOString(), true);
                                            }
                                        }}
                                        className="w-full border p-2 rounded-lg text-sm text-gray-900 bg-white"
                                        disabled={isOfflineMode && !aggregatedStats}
                                    />
                                </div>
                                <div className="w-full md:w-1/4">
                                    <label className="text-xs text-gray-500 block mb-1">Au</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (!val) return;
                                            setEndDate(val);
                                            const token = localStorage.getItem("sav_token");
                                            if (token) {
                                                const ed = new Date(val);
                                                if (isNaN(ed.getTime())) return;
                                                const s = new Date(startDate);
                                                if (isNaN(s.getTime())) return;
                                                ed.setHours(23, 59, 59, 999);
                                                handleSearch(token, s.toISOString(), ed.toISOString(), true);
                                            }
                                        }}
                                        className="w-full border p-2 rounded-lg text-sm text-gray-900 bg-white"
                                        disabled={isOfflineMode && !aggregatedStats}
                                    />
                                </div>

                                {isSupport && (
                                    <div className="w-full md:w-1/3">
                                        <label className="text-xs text-gray-500 block mb-1">
                                            Techniciens {techniciansLoaded ? "" : "(chargement...)"}
                                        </label>
                                        <Select
                                            isMulti
                                            options={allTechnicians}
                                            value={selectedTechnicians}
                                            onChange={(val) => {
                                                setSelectedTechnicians(val as UserOption[]);
                                                const token = localStorage.getItem("sav_token");
                                                if (token) {
                                                    const s = new Date(startDate).toISOString();
                                                    const e = new Date(endDate);
                                                    e.setHours(23, 59, 59, 999);
                                                    setTimeout(() => handleSearch(token, s, e.toISOString(), true), 0);
                                                }
                                            }}
                                            placeholder={isOfflineMode && allTechnicians.length === 0 ? "Offline - données limitées" : "Choisir..."}
                                            className="text-sm"
                                            isDisabled={isOfflineMode && allTechnicians.length === 0}
                                            styles={{
                                                control: (base) => ({ ...base, borderColor: '#d1d5db', minHeight: '38px' }),
                                                singleValue: (base) => ({ ...base, color: '#111827' }),
                                                multiValue: (base) => ({ ...base, backgroundColor: '#e0e7ff' }),
                                                multiValueLabel: (base) => ({ ...base, color: '#1e40af' }),
                                                multiValueRemove: (base) => ({ ...base, color: '#1e40af', ':hover': { backgroundColor: '#c7d2fe', color: '#1e3a8a' } }),
                                                input: (base) => ({ ...base, color: '#111827' }),
                                                placeholder: (base) => ({ ...base, color: '#9ca3af' }),
                                                option: (base, state) => ({
                                                    ...base,
                                                    color: '#111827',
                                                    backgroundColor: state.isSelected ? '#e0e7ff' : state.isFocused ? '#f3f4f6' : '#fff',
                                                    ':active': { backgroundColor: '#e0e7ff' },
                                                }),
                                                menu: (base) => ({ ...base, backgroundColor: '#fff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }),
                                                noOptionsMessage: (base) => ({ ...base, color: '#6b7280' }),
                                            }}
                                        />
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            const token = localStorage.getItem("sav_token");
                                            if (token) handleSearch(token, undefined, undefined, true);
                                        }}
                                        disabled={loadingStats || isOfflineMode}
                                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {loadingStats ? "..." : "🔄 Actualiser"}
                                    </button>
                                    <button
                                        onClick={handlePrint}
                                        className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 transition"
                                        title="Imprimer / PDF"
                                    >
                                        🖨️
                                    </button>
                                </div>
                            </div>
                            {isOfflineMode && (
                                <p className="text-xs text-orange-500 mt-2">
                                    📡 Mode hors ligne : Les statistiques affichées proviennent du cache local.
                                    Certaines fonctionnalités peuvent être limitées.
                                </p>
                            )}
                        </div>

                        {/* ENTÊTE D'IMPRESSION */}
                        <div className="hidden print:flex flex-row justify-between items-end mb-8 border-b-2 border-black pb-4 pt-4">
                            <div>
                                <h1 className="text-3xl font-extrabold text-black uppercase tracking-tight">SAV Tracker</h1>
                                <p className="text-sm text-gray-600 mt-1 font-medium">Rapport de Performance Technique</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-black">
                                    {new Date(startDate).toLocaleDateString("fr-FR")} <span className="mx-1">au</span> {new Date(endDate).toLocaleDateString("fr-FR")}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Édité par {currentUser?.username} le {new Date().toLocaleDateString("fr-FR")}
                                    {isOfflineMode && " • Mode hors ligne"}
                                </p>
                            </div>
                        </div>

                        {/* STATS PRINCIPALES */}
                        {displayedStats ? (
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 print:shadow-none print:border-none print:p-0">
                                {renderStatsSection(displayedStats, true)}
                            </div>
                        ) : loadingStats ? (
                            <div className="text-center py-12 text-gray-500 animate-pulse">
                                <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                                <p>Chargement des statistiques...</p>
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-200">
                                <div className="text-4xl mb-4">📊</div>
                                <p className="text-gray-500 font-medium">Aucune statistique disponible</p>
                                {isOfflineMode && (
                                    <p className="text-sm text-gray-400 mt-2">
                                        Connectez-vous pour charger les données initiales
                                    </p>
                                )}
                            </div>
                        )}

                        {/* STATS COMMERCIALES */}
                        {isSalesRep && salesStats && (
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-200 print:shadow-none print:border-none print:p-0">
                                <h3 className="text-sm font-bold text-emerald-700 mb-4 flex items-center gap-2">
                                    🏪 Performance Commerciale
                                    {loadingSalesStats && <span className="animate-pulse text-xs text-gray-400">...</span>}
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <StatCard label="Call Rate" value={`${salesStats.callRate ?? 0}%`}
                                        subValue={`${salesStats.visitsRealized ?? 0}/${salesStats.visitsPlanned ?? 0} visites`}
                                        icon="📞" color="blue" isPercent />
                                    <StatCard label="JP Adherence" value={`${salesStats.jpAdherence ?? 0}%`}
                                        subValue={`${salesStats.visitsOnTime ?? 0} faites le jour J`}
                                        icon="📍" color={+(salesStats.jpAdherence ?? 0) < 50 ? 'red' : 'green'} isPercent
                                        alert={+(salesStats.jpAdherence ?? 0) < 50} />
                                    <StatCard label="Strike Rate" value={`${salesStats.strikeRate ?? 0}%`}
                                        subValue={`${salesStats.ordersWon ?? 0}/${salesStats.preOrdersTaken ?? 0} gagnées`}
                                        icon="🎯" color="emerald" isPercent />
                                    <StatCard label="Execution" value={`${salesStats.executionRate ?? 0}%`}
                                        subValue={`${salesStats.activitiesCompleted ?? 0}/${salesStats.activitiesTotal ?? 0} tâches`}
                                        icon="✅" color={+(salesStats.executionRate ?? 0) < 70 ? 'orange' : 'green'} isPercent />
                                </div>
                            </div>
                        )}

                        {/* STATS PAR TECHNICIEN */}
                        {technicianStatsList.length > 0 && (
                            <div className="mt-8">
                                <h3 className="text-gray-500 font-bold uppercase text-xs mb-4 border-b pb-2 print:text-black print:border-black">
                                    Détail par Technicien
                                </h3>
                                <div className="grid gap-6">
                                    {technicianStatsList.map((stats, idx) => (
                                        <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-100 print:bg-white print:border-gray-300 print:break-inside-avoid">
                                            {renderStatsSection(stats, false)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style jsx global>{`
                @media print {
                    @page { margin: 1cm; size: auto; }
                    body { background: white; -webkit-print-color-adjust: exact; }
                    nav, header, footer, button { display: none !important; }
                    .print\\:hidden { display: none !important; }
                    .print\\:block { display: block !important; }
                    .print\\:flex { display: flex !important; }
                    .print\\:shadow-none { box-shadow: none !important; }
                    .print\\:border-none { border: none !important; }
                    .print\\:mt-0 { margin-top: 0 !important; }
                    .print\\:max-w-full { max-width: 100% !important; }
                    .print\\:px-0 { padding-left: 0 !important; padding-right: 0 !important; }
                    .print\\:text-black { color: black !important; }
                    .print\\:border-black { border-color: black !important; }
                    .break-inside-avoid { break-inside: avoid; }
                }
            `}</style>
        </div>
    );
}