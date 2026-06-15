'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Select from 'react-select';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────

interface SalesStats {
    salesRepId?: number;
    salesRepName?: string;
    visitsPlanned: number;
    visitsRealized: number;
    visitsOnTime: number;
    jpAdherence: number;
    callRate: number;
    preOrdersTaken: number;
    ordersWon: number;
    strikeRate: number;
    totalRevenue: number;
    avgOrderValue: number;
    priceChecksDone: number;
    priceCompliant: number;
    priceCompliance: number;
    stockChecksDone: number;
    mustStockPresent: number;
    outOfStockCount: number;
    mustStockRate: number;
    oosRate: number;
    avgFreshness: number;
    avgQualityScore: number;
    avgVisibilityScore: number;
    activitiesTotal: number;
    activitiesCompleted: number;
    executionRate: number;
}

interface UserOption { value: string; label: string; }

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

const selectStyles = {
    control: (b: any) => ({ ...b, borderColor: '#d1d5db', minHeight: '38px', backgroundColor: '#fff' }),
    singleValue: (b: any) => ({ ...b, color: '#111827' }),
    multiValue: (b: any) => ({ ...b, backgroundColor: '#e0e7ff' }),
    multiValueLabel: (b: any) => ({ ...b, color: '#1e40af' }),
    multiValueRemove: (b: any) => ({ ...b, color: '#1e40af', ':hover': { backgroundColor: '#c7d2fe', color: '#1e3a8a' } }),
    input: (b: any) => ({ ...b, color: '#111827' }),
    placeholder: (b: any) => ({ ...b, color: '#9ca3af' }),
    option: (b: any, s: any) => ({ ...b, color: '#111827', backgroundColor: s.isSelected ? '#e0e7ff' : s.isFocused ? '#f3f4f6' : '#fff', ':active': { backgroundColor: '#e0e7ff' } }),
    menu: (b: any) => ({ ...b, backgroundColor: '#fff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }),
    noOptionsMessage: (b: any) => ({ ...b, color: '#6b7280' }),
};

// ─── Helpers ──────────────────────────────────────────────────

const formatMoney = (v: number) => {
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + ' M';
    if (v >= 1_000) return (v / 1_000).toFixed(0) + ' K';
    return v.toString();
};

// ─── Composant ────────────────────────────────────────────────

export default function SalesDashboard() {
    const router = useRouter();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    const [startDate, setStartDate] = useState(monthStart);
    const [endDate, setEndDate] = useState(monthEnd);
    const [stats, setStats] = useState<SalesStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [allReps, setAllReps] = useState<UserOption[]>([]);
    const [selectedReps, setSelectedReps] = useState<UserOption[]>([]);

    // ── Auth ──
    useEffect(() => {
        const token = localStorage.getItem('sav_token');
        if (!token) { router.push('/'); return; }
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setCurrentUser(payload);
            const roles: string[] = payload.roles || [];
            setIsAdmin(roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SUPER_ADMIN'));
        } catch { router.push('/'); }
    }, [router]);

    // ── Charger la liste des commerciaux ──
    useEffect(() => {
        if (!isAdmin) return;
        const token = localStorage.getItem('sav_token');
        fetch(`${API_URL}/users?roles[]=ROLE_SALES_REP`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/ld+json' }
        })
        .then(r => r.json())
        .then(d => setAllReps((d.member || []).map((u: any) => ({ value: u.id, label: u.fullname || u.username }))))
        .catch(() => {});
    }, [isAdmin]);

    // ── Charger les stats ──
    const fetchStats = async (customStart?: string, customEnd?: string) => {
        const token = localStorage.getItem('sav_token');
        if (!token) return;

        setLoading(true);
        setError('');

        const s = customStart || startDate;
        const e = customEnd || endDate;
        let url = `${API_URL}/stats/sales?start=${s}&end=${e}`;

        if (isAdmin && selectedReps.length > 0) {
            url += selectedReps.map(r => `&sales_reps[]=${r.value}`).join('');
        }

        try {
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setStats(data);
        } catch (err: any) {
            setError(err.message || 'Erreur chargement');
            toast.error('Impossible de charger les statistiques');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (currentUser) fetchStats(); }, [currentUser, selectedReps]);

    // ── KPI Card ──
    const Card = ({ label, value, sub, icon, tooltip, color = 'gray', alert, percent }: {
        label: string; value: string | number; sub?: string; icon: string; tooltip: string;
        color?: string; alert?: boolean; percent?: boolean;
    }) => {
        const [tip, setTip] = useState(false);
        return (
            <div className={`p-4 rounded-xl border shadow-sm ${alert ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
                <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${alert ? 'text-red-600' : 'text-gray-500'}`}>{label}</span>
                    <div className="relative">
                        <button onClick={() => setTip(!tip)} onBlur={() => setTimeout(() => setTip(false), 200)}
                            className="text-base p-1 rounded hover:bg-gray-100 cursor-help" title={tooltip}>{icon}</button>
                        {tip && <div className="absolute right-0 top-full mt-1 w-52 p-2 bg-gray-900 text-white text-[10px] rounded-lg shadow-xl z-50">{tooltip}</div>}
                    </div>
                </div>
                <div className="text-xl font-extrabold text-gray-900">{loading ? '...' : value}</div>
                {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
                {percent && !loading && (
                    <div className="w-full bg-gray-100 rounded-full h-1 mt-2">
                        <div className={`h-1 rounded-full ${+value >= 80 ? 'bg-green-500' : +value >= 50 ? 'bg-orange-400' : 'bg-red-500'}`}
                            style={{ width: Math.min(+value, 100) + '%' }} />
                    </div>
                )}
            </div>
        );
    };

    const s = stats;

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">&larr; Tableau de bord</Link>
            <h1 className="text-2xl font-bold text-gray-900">Performance Commerciale</h1>

            {/* ── Filtres ── */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-end">
                <div>
                    <label className="text-[10px] text-gray-500 block mb-1">Du</label>
                    <input type="date" value={startDate}
                        onChange={e => { if (!e.target.value) return; setStartDate(e.target.value); fetchStats(e.target.value, endDate); }}
                        className="border p-2 rounded text-sm text-gray-900 bg-white" />
                </div>
                <div>
                    <label className="text-[10px] text-gray-500 block mb-1">Au</label>
                    <input type="date" value={endDate}
                        onChange={e => { if (!e.target.value) return; setEndDate(e.target.value); fetchStats(startDate, e.target.value); }}
                        className="border p-2 rounded text-sm text-gray-900 bg-white" />
                </div>
                {isAdmin && (
                    <div className="min-w-[250px]">
                        <label className="text-[10px] text-gray-500 block mb-1">Commerciaux</label>
                        <Select isMulti options={allReps} value={selectedReps}
                            onChange={v => setSelectedReps(v as UserOption[])}
                            placeholder="Tous les commerciaux..." styles={selectStyles} className="text-sm" />
                    </div>
                )}
            </div>

            {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>}

            {/* ── KPIs Visites ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card label="Call Rate" value={`${s?.callRate ?? 0}%`}
                    sub={`${s?.visitsRealized ?? 0}/${s?.visitsPlanned ?? 0} visites`}
                    icon="📞" tooltip="Taux de visite : visites réalisées / visites planifiées sur la période." percent color="blue" />
                <Card label="JP Adherence" value={`${s?.jpAdherence ?? 0}%`}
                    sub={`${s?.visitsOnTime ?? 0}/${s?.visitsRealized ?? 0} faites le jour J`}
                    icon="📍" tooltip="Adhérence au plan de tournée : % de visites réalisées le jour prévu." percent
                    color={+(s?.jpAdherence ?? 0) < 50 ? 'red' : 'green'} alert={+(s?.jpAdherence ?? 0) < 50} />
                <Card label="Strike Rate" value={`${s?.strikeRate ?? 0}%`}
                    sub={`${s?.ordersWon ?? 0}/${s?.preOrdersTaken ?? 0} commandes gagnées`}
                    icon="🎯" tooltip="Taux de conversion : précommandes livrées / précommandes prises." percent
                    color={+(s?.strikeRate ?? 0) < 50 ? 'orange' : 'green'} />
                <Card label="Panier Moyen" value={formatMoney(s?.avgOrderValue ?? 0)}
                    sub={`CA total : ${formatMoney(s?.totalRevenue ?? 0)} FCFA`}
                    icon="💰" tooltip="Panier moyen : chiffre d'affaires total / nombre de commandes livrées." />
            </div>

            {/* ── KPIs Prix & Stock ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card label="Conformité Prix" value={`${s?.priceCompliance ?? 0}%`}
                    sub={`${s?.priceCompliant ?? 0}/${s?.priceChecksDone ?? 0} relevés conformes`}
                    icon="🏷️" tooltip="Conformité RRP : % de prix relevés dans la fourchette ±5% du prix recommandé."
                    percent color={+(s?.priceCompliance ?? 0) < 60 ? 'red' : 'green'} alert={+(s?.priceCompliance ?? 0) < 60} />
                <Card label="Must-Stock" value={`${s?.mustStockRate ?? 0}%`}
                    sub={`${s?.mustStockPresent ?? 0} produits obligatoires présents`}
                    icon="📦" tooltip="Taux Must-Stock : % de SKU obligatoires présents dans le point de vente." percent
                    color={+(s?.mustStockRate ?? 0) < 80 ? 'orange' : 'green'} />
                <Card label="Ruptures (OOS)" value={`${s?.oosRate ?? 0}%`}
                    sub={`${s?.outOfStockCount ?? 0}/${s?.stockChecksDone ?? 0} contrôles en rupture`}
                    icon="🚫" tooltip="Out of Stock : % de contrôles où le produit était en rupture. Un taux élevé = perte de vente." percent
                    alert={+(s?.oosRate ?? 0) > 5} color={+(s?.oosRate ?? 0) > 5 ? 'red' : 'green'} />
                <Card label="Fraîcheur" value={`${s?.avgFreshness ?? 0}/5`}
                    sub={`Sur ${s?.stockChecksDone ?? 0} contrôles stock`}
                    icon="🥬" tooltip="Score fraîcheur moyen (1=périmé, 5=très frais). Mesure la rotation et la gestion des dates." />
            </div>

            {/* ── KPIs Qualité & Exécution ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card label="Qualité PDV" value={`${s?.avgQualityScore ?? 0}/5`}
                    icon="✨" tooltip="Score qualité moyen du point de vente : état des sacs, stockage, hygiène, nuisibles." />
                <Card label="Visibilité" value={`${s?.avgVisibilityScore ?? 0}/5`}
                    icon="👁️" tooltip="Score visibilité moyen : présence d'affiches, banderoles, branding, enseigne." />
                <Card label="Exécution" value={`${s?.executionRate ?? 0}%`}
                    sub={`${s?.activitiesCompleted ?? 0}/${s?.activitiesTotal ?? 0} tâches faites`}
                    icon="✅" tooltip="Taux d'exécution : % des activités de la check-list complétées lors des visites." percent
                    color={+(s?.executionRate ?? 0) < 70 ? 'red' : 'green'} />
                <Card label="Act. / Visite" value={s ? (s.activitiesTotal / Math.max(s.visitsRealized, 1)).toFixed(0) : '0'}
                    sub={`${s?.activitiesTotal ?? 0} activités sur ${s?.visitsRealized ?? 0} visites`}
                    icon="📋" tooltip="Nombre moyen d'activités réalisées par visite commerciale." />
            </div>

            {/* ── Section visites ── */}
            {s && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 text-center text-sm text-gray-500">
                    📊 {s.salesRepName || 'Commercial'} — {s.visitsPlanned} visites planifiées,
                    {s.visitsRealized} réalisées, {s.visitsOnTime} à l'heure •
                    {s.preOrdersTaken} précommandes, {s.ordersWon} livrées •
                    {s.priceChecksDone} relevés prix, {s.stockChecksDone} contrôles stock
                </div>
            )}

            <div className="flex justify-center gap-4">
                <Link href="/dashboard/sales/visits" className="inline-block px-6 py-3 bg-white border-2 border-emerald-600 text-emerald-700 font-bold rounded-xl hover:bg-emerald-50 transition">
                    📋 Voir les visites
                </Link>
                <Link href="/dashboard/sales/new" className="inline-block px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-700 transition">
                    + Nouvelle visite
                </Link>
            </div>
        </div>
    );
}
