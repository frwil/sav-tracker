'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Select from 'react-select';
import { useCustomers } from '@/hooks/useCustomers';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────

type ViewMode = 'planning' | 'in_progress' | 'completed';

interface VisitItem {
    id: number;
    customer?: { '@id': string; id: number; name: string; zone: string };
    salesRep?: { id: number; fullname: string; username: string };
    plannedAt?: string;
    visitedAt?: string;
    completedAt?: string;
    gpsCoordinates?: string;
    objective?: string;
    generalComment?: string;
    closed: boolean;
    activated: boolean;
    salesActivities?: { isCompleted: boolean }[];
    priceAudits?: any[];
    stockAudits?: any[];
    preOrders?: any[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';
const ITEMS_PER_PAGE = 20;

const selectStyles = {
    control: (b: any) => ({ ...b, borderColor: '#d1d5db', minHeight: '38px', backgroundColor: '#fff' }),
    singleValue: (b: any) => ({ ...b, color: '#111827' }),
    input: (b: any) => ({ ...b, color: '#111827' }),
    placeholder: (b: any) => ({ ...b, color: '#9ca3af' }),
    option: (b: any, s: any) => ({ ...b, color: '#111827', backgroundColor: s.isSelected ? '#e0e7ff' : s.isFocused ? '#f3f4f6' : '#fff' }),
    menu: (b: any) => ({ ...b, backgroundColor: '#fff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }),
    noOptionsMessage: (b: any) => ({ ...b, color: '#6b7280' }),
};

// ─── Composant ────────────────────────────────────────────────

export default function SalesVisitsListPage() {
    const [visits, setVisits] = useState<VisitItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('planning');
    const [page, setPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const { options: customerOptions, loading: custLoading } = useCustomers();

    const token = typeof window !== 'undefined' ? localStorage.getItem('sav_token') : null;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    // ── Charger les visites ──
    const fetchVisits = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({
                'order[visitedAt]': 'desc',
                'order[plannedAt]': 'desc',
                page: String(page),
                itemsPerPage: String(ITEMS_PER_PAGE),
            });

            // Filtre mode
            if (viewMode === 'planning') {
                params.set('closed', 'false');
                params.set('visitedAt[exists]', 'false');
            } else if (viewMode === 'in_progress') {
                params.set('closed', 'false');
                params.set('visitedAt[exists]', 'true');
            } else {
                params.set('closed', 'true');
            }
            params.set('activated', 'true');

            // Filtre client
            if (selectedCustomer) {
                params.set('customer', selectedCustomer.value);
            }

            const res = await fetch(`${API_URL}/sales_visits?${params}`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/ld+json' }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setVisits(data.member || []);
            setTotalItems(data.totalItems || 0);
        } catch {
            toast.error('Erreur chargement des visites');
        } finally {
            setLoading(false);
        }
    }, [token, viewMode, page, selectedCustomer]);

    useEffect(() => { fetchVisits(); }, [fetchVisits]);
    useEffect(() => { setPage(1); }, [viewMode, selectedCustomer]);

    // ── Stats rapides ──
    const stats = useMemo(() => {
        const total = visits.length;
        const withOrders = visits.filter(v => (v.preOrders || []).length > 0).length;
        const completedTasks = visits.reduce((sum, v) => sum + (v.salesActivities || []).filter(a => a.isCompleted).length, 0);
        const totalTasks = visits.reduce((sum, v) => sum + (v.salesActivities || []).length, 0);
        return { total, withOrders, completedTasks, totalTasks };
    }, [visits]);

    if (!token) return <div className="p-6 text-center text-red-500">Non authentifié</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <Link href="/dashboard/sales" className="text-sm text-gray-500 hover:text-gray-700">&larr; Dashboard</Link>
                    <h1 className="text-2xl font-bold text-gray-900">Visites Commerciales</h1>
                </div>
                <Link href="/dashboard/sales/new"
                    className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 shadow">
                    + Nouvelle
                </Link>
            </div>

            {/* ── Tabs ── */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                {([
                    ['planning', '📅 Planifiées'],
                    ['in_progress', '🟢 En cours'],
                    ['completed', '✅ Terminées'],
                ] as [ViewMode, string][]).map(([mode, label]) => (
                    <button key={mode} onClick={() => setViewMode(mode)}
                        className={`flex-1 py-2 rounded-md text-sm font-bold transition ${
                            viewMode === mode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}>
                        {label}
                    </button>
                ))}
            </div>

            {/* ── Filtres ── */}
            <div className="flex gap-4 items-end">
                <div className="w-72">
                    <label className="text-[10px] text-gray-500 block mb-1">Client</label>
                    <Select options={customerOptions} value={selectedCustomer}
                        onChange={v => setSelectedCustomer(v)} isClearable
                        isLoading={custLoading} placeholder="Tous les clients..."
                        styles={selectStyles} className="text-sm" />
                </div>
                <div className="text-[10px] text-gray-400">
                    {stats.total} visites • {stats.withOrders} avec commandes
                    {stats.totalTasks > 0 && ` • ${stats.completedTasks}/${stats.totalTasks} tâches`}
                </div>
            </div>

            {/* ── Liste ── */}
            {loading ? (
                <div className="space-y-3">
                    {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
                </div>
            ) : visits.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <div className="text-4xl mb-2">🏪</div>
                    <p className="font-bold">Aucune visite trouvée</p>
                    <p className="text-sm mt-1">
                        {viewMode === 'planning' ? 'Créez une nouvelle visite planifiée.' :
                         viewMode === 'in_progress' ? 'Démarrez une visite planifiée.' :
                         'Aucune visite terminée sur cette période.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {visits.map(v => {
                        const totalActs = (v.salesActivities || []).length;
                        const doneActs = (v.salesActivities || []).filter(a => a.isCompleted).length;
                        const orderCount = (v.preOrders || []).length;
                        const priceCount = (v.priceAudits || []).length;
                        const stockCount = (v.stockAudits || []).length;

                        return (
                            <Link key={v.id} href={`/dashboard/sales/${v.id}`}
                                className={`block p-5 rounded-xl border shadow-sm transition hover:shadow-md hover:border-emerald-300 ${
                                    v.closed ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-100'
                                }`}>
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-bold text-gray-900 truncate">{v.customer?.name || 'Client'}</h3>
                                            <span className="text-xs text-gray-400">{v.customer?.zone || ''}</span>
                                            {!v.closed && v.visitedAt ? (
                                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">🟢 En cours</span>
                                            ) : !v.closed && !v.visitedAt ? (
                                                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">📅 Planifiée</span>
                                            ) : (
                                                <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-bold">✅ Terminée</span>
                                            )}
                                        </div>

                                        {v.objective && <p className="text-sm text-gray-600 mt-1 truncate">🎯 {v.objective}</p>}

                                        <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-gray-400">
                                            {v.plannedAt && <span>📅 Prévue {new Date(v.plannedAt).toLocaleDateString('fr-FR')}</span>}
                                            {v.visitedAt && <span>🚀 Visitée {new Date(v.visitedAt).toLocaleDateString('fr-FR')}</span>}
                                            {v.gpsCoordinates && <span>📍 {v.gpsCoordinates.substring(0, 20)}</span>}
                                            {v.salesRep && <span>👤 {v.salesRep.fullname || v.salesRep.username}</span>}
                                        </div>

                                        {/* Barre de progression activités */}
                                        {totalActs > 0 && (
                                            <div className="mt-2 flex items-center gap-2">
                                                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden max-w-[200px]">
                                                    <div className={`h-full rounded-full transition-all ${doneActs === totalActs ? 'bg-green-500' : doneActs > totalActs / 2 ? 'bg-emerald-400' : 'bg-gray-400'}`}
                                                        style={{ width: `${(doneActs / totalActs) * 100}%` }} />
                                                </div>
                                                <span className="text-[10px] text-gray-400">{doneActs}/{totalActs} activités</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Badges */}
                                    <div className="flex flex-col gap-1 text-[10px] shrink-0">
                                        {orderCount > 0 && <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold text-center">📝 {orderCount} cmd</span>}
                                        {priceCount > 0 && <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-bold text-center">🏷️ {priceCount}</span>}
                                        {stockCount > 0 && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold text-center">📦 {stockCount}</span>}
                                    </div>
                                </div>
                            </Link>
                        );
                    })}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center gap-2 pt-4">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                                className="px-3 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30">←</button>
                            <span className="px-3 py-1 text-sm text-gray-500">{page} / {totalPages}</span>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                                className="px-3 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30">→</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
