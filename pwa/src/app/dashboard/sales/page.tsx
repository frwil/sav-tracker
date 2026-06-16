'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Select from 'react-select';
import { useTranslation } from '@/i18n/I18nProvider';
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
    const { t } = useTranslation();
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
            if (!roles.includes('ROLE_SALES_REP') && !roles.includes('ROLE_ADMIN') && !roles.includes('ROLE_SUPER_ADMIN')) {
                router.push('/dashboard');
                return;
            }
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
            toast.error(t('error.load_stats'));
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
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">&larr; {t('dashboard.back_dashboard')}</Link>
            <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>

            {/* ── Filtres ── */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-end">
                <div>
                    <label className="text-[10px] text-gray-500 block mb-1">{t('dashboard.from')}</label>
                    <input type="date" value={startDate}
                        onChange={e => { if (!e.target.value) return; setStartDate(e.target.value); fetchStats(e.target.value, endDate); }}
                        className="border p-2 rounded text-sm text-gray-900 bg-white" />
                </div>
                <div>
                    <label className="text-[10px] text-gray-500 block mb-1">{t('dashboard.to')}</label>
                    <input type="date" value={endDate}
                        onChange={e => { if (!e.target.value) return; setEndDate(e.target.value); fetchStats(startDate, e.target.value); }}
                        className="border p-2 rounded text-sm text-gray-900 bg-white" />
                </div>
                {isAdmin && (
                    <div className="min-w-[250px]">
                        <label className="text-[10px] text-gray-500 block mb-1">{t('dashboard.sales_reps')}</label>
                        <Select isMulti options={allReps} value={selectedReps}
                            onChange={v => setSelectedReps(v as UserOption[])}
                            placeholder={t('dashboard.all_reps')} styles={selectStyles} className="text-sm" />
                    </div>
                )}
            </div>

            {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>}

            {/* ── KPIs Visites ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card label={t('kpi.call_rate')} value={`${s?.callRate ?? 0}%`}
                    sub={`${s?.visitsRealized ?? 0}/${s?.visitsPlanned ?? 0} visites`}
                    icon="📞" tooltip={t('kpi.call_rate_tip')} percent color="blue" />
                <Card label={t('kpi.jp_adherence')} value={`${s?.jpAdherence ?? 0}%`}
                    sub={`${s?.visitsOnTime ?? 0}/${s?.visitsRealized ?? 0} faites le jour J`}
                    icon="📍" tooltip={t('kpi.jp_tip')} percent
                    color={+(s?.jpAdherence ?? 0) < 50 ? 'red' : 'green'} alert={+(s?.jpAdherence ?? 0) < 50} />
                <Card label={t('kpi.strike_rate')} value={`${s?.strikeRate ?? 0}%`}
                    sub={`${s?.ordersWon ?? 0}/${s?.preOrdersTaken ?? 0} commandes gagnées`}
                    icon="🎯" tooltip={t('kpi.strike_tip')} percent
                    color={+(s?.strikeRate ?? 0) < 50 ? 'orange' : 'green'} />
                <Card label={t('kpi.avg_order')} value={formatMoney(s?.avgOrderValue ?? 0)}
                    sub={`CA total : ${formatMoney(s?.totalRevenue ?? 0)} FCFA`}
                    icon="💰" tooltip={t('kpi.avg_order_tip')} />
            </div>

            {/* ── KPIs Prix & Stock ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card label={t('kpi.price_compliance')} value={`${s?.priceCompliance ?? 0}%`}
                    sub={`${s?.priceCompliant ?? 0}/${s?.priceChecksDone ?? 0} relevés conformes`}
                    icon="🏷️" tooltip={t('kpi.price_tip')}
                    percent color={+(s?.priceCompliance ?? 0) < 60 ? 'red' : 'green'} alert={+(s?.priceCompliance ?? 0) < 60} />
                <Card label={t('kpi.must_stock')} value={`${s?.mustStockRate ?? 0}%`}
                    sub={`${s?.mustStockPresent ?? 0} produits obligatoires présents`}
                    icon="📦" tooltip={t('kpi.must_stock_tip')} percent
                    color={+(s?.mustStockRate ?? 0) < 80 ? 'orange' : 'green'} />
                <Card label={t('kpi.oos')} value={`${s?.oosRate ?? 0}%`}
                    sub={`${s?.outOfStockCount ?? 0}/${s?.stockChecksDone ?? 0} contrôles en rupture`}
                    icon="🚫" tooltip={t('kpi.oos_tip')} percent
                    alert={+(s?.oosRate ?? 0) > 5} color={+(s?.oosRate ?? 0) > 5 ? 'red' : 'green'} />
                <Card label={t('kpi.freshness')} value={`${s?.avgFreshness ?? 0}/5`}
                    sub={`Sur ${s?.stockChecksDone ?? 0} contrôles stock`}
                    icon="🥬" tooltip={t('kpi.freshness_tip')} />
            </div>

            {/* ── KPIs Qualité & Exécution ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card label={t('kpi.quality')} value={`${s?.avgQualityScore ?? 0}/5`}
                    icon="✨" tooltip={t('kpi.quality_tip')} />
                <Card label={t('kpi.visibility')} value={`${s?.avgVisibilityScore ?? 0}/5`}
                    icon="👁️" tooltip={t('kpi.visibility_tip')} />
                <Card label={t('kpi.execution')} value={`${s?.executionRate ?? 0}%`}
                    sub={`${s?.activitiesCompleted ?? 0}/${s?.activitiesTotal ?? 0} tâches faites`}
                    icon="✅" tooltip={t('kpi.execution_tip')} percent
                    color={+(s?.executionRate ?? 0) < 70 ? 'red' : 'green'} />
                <Card label={t('kpi.act_per_visit')} value={s ? (s.activitiesTotal / Math.max(s.visitsRealized, 1)).toFixed(0) : '0'}
                    sub={`${s?.activitiesTotal ?? 0} activités sur ${s?.visitsRealized ?? 0} visites`}
                    icon="📋" tooltip={t('kpi.act_tip')} />
            </div>

            {/* ── Perfect Store Score ── */}
            {s && (
                <div className={`p-6 rounded-xl shadow-sm border text-center ${
                    (s.perfectStoreScore ?? 0) >= 80 ? 'bg-green-50 border-green-200' :
                    (s.perfectStoreScore ?? 0) >= 50 ? 'bg-orange-50 border-orange-200' :
                    'bg-red-50 border-red-200'
                }`}>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">{t('kpi.perfect_store')}</div>
                    <div className={`text-4xl font-black ${
                        (s.perfectStoreScore ?? 0) >= 80 ? 'text-green-600' :
                        (s.perfectStoreScore ?? 0) >= 50 ? 'text-orange-500' :
                        'text-red-500'
                    }`}>
                        {s.perfectStoreScore ?? 0}<span className="text-lg">/100</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 mt-3 max-w-md mx-auto">
                        <div className={`h-3 rounded-full transition-all ${
                            (s.perfectStoreScore ?? 0) >= 80 ? 'bg-green-500' :
                            (s.perfectStoreScore ?? 0) >= 50 ? 'bg-orange-400' :
                            'bg-red-500'
                        }`} style={{ width: `${Math.min(s.perfectStoreScore ?? 0, 100)}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2">{t('kpi.perfect_store_weight')}</p>
                </div>
            )}

            {/* ── Section visites ── */}
            {s && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 text-center text-sm text-gray-500">
                    📊 {t('dashboard.stats_summary', { name: s.salesRepName || 'Commercial', planned: s.visitsPlanned, realized: s.visitsRealized, onTime: s.visitsOnTime, orders: s.preOrdersTaken, won: s.ordersWon, price: s.priceChecksDone, stock: s.stockChecksDone })}
                </div>
            )}

            <div className="flex justify-center gap-4">
                <Link href="/dashboard/sales/visits" className="inline-block px-6 py-3 bg-white border-2 border-emerald-600 text-emerald-700 font-bold rounded-xl hover:bg-emerald-50 transition">
                    {t('dashboard.see_visits')}
                </Link>
                <Link href="/dashboard/sales/new" className="inline-block px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-700 transition">
                    {t('dashboard.new_visit')}
                </Link>
            </div>
        </div>
    );
}
