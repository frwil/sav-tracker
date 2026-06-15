'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────

interface SalesVisitItem {
    id: number;
    customer?: { id: number; name: string; zone: string };
    salesRep?: { id: number; fullname: string; username: string };
    plannedAt?: string;
    visitedAt?: string;
    completedAt?: string;
    objective?: string;
    gpsCoordinates?: string;
    closed: boolean;
    activated: boolean;
    priceAudits?: any[];
    stockAudits?: any[];
    preOrders?: any[];
    salesActivities?: any[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

// ─── Composant ────────────────────────────────────────────────

export default function SalesVisitsListPage() {
    const [visits, setVisits] = useState<SalesVisitItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');
    const [currentUser, setCurrentUser] = useState<any>(null);

    const token = typeof window !== 'undefined' ? localStorage.getItem('sav_token') : null;

    useEffect(() => {
        if (!token) return;
        try { setCurrentUser(JSON.parse(atob(token.split('.')[1]))); } catch {}
    }, [token]);

    const fetchVisits = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({ order: 'visitedAt', 'order[visitedAt]': 'desc', itemsPerPage: '50' });
            if (filter !== 'all') params.set('closed', filter === 'closed' ? 'true' : 'false');

            const res = await fetch(`${API_URL}/sales_visits?${params}`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/ld+json' }
            });
            const data = await res.json();
            setVisits(data.member || []);
        } catch {
            toast.error('Erreur chargement');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchVisits(); }, [filter, token]);

    if (!token) return <div className="p-6 text-center text-red-500">Non authentifié</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <Link href="/dashboard/sales" className="text-sm text-gray-500 hover:text-gray-700">&larr; Performance</Link>
                    <h1 className="text-2xl font-bold text-gray-900">Visites commerciales</h1>
                </div>
                <Link href="/dashboard/sales/new"
                    className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 shadow">
                    + Nouvelle
                </Link>
            </div>

            {/* ── Filtres ── */}
            <div className="flex gap-2">
                {(['all', 'open', 'closed'] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                            filter === f ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}>
                        {f === 'all' ? '📋 Toutes' : f === 'open' ? '🟢 En cours' : '🔒 Clôturées'}
                    </button>
                ))}
            </div>

            {/* ── Liste ── */}
            {loading ? (
                <div className="text-center text-gray-400 py-12 animate-pulse">Chargement...</div>
            ) : visits.length === 0 ? (
                <div className="text-center text-gray-400 py-12">Aucune visite trouvée.</div>
            ) : (
                <div className="space-y-3">
                    {visits.map(v => {
                        const completedTasks = (v.salesActivities || []).filter((a: any) => a.isCompleted).length;
                        const totalTasks = (v.salesActivities || []).length;
                        const hasOrders = (v.preOrders || []).length > 0;

                        return (
                            <Link key={v.id} href={`/dashboard/sales/${v.id}`}
                                className={`block p-4 rounded-xl border shadow-sm transition hover:shadow-md ${
                                    v.closed ? 'bg-gray-50 border-gray-200' : 'bg-white border-emerald-200'
                                }`}>
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-gray-900">{v.customer?.name || 'Client'}</h3>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                                v.closed ? 'bg-gray-200 text-gray-600' : 'bg-emerald-100 text-emerald-700'
                                            }`}>
                                                {v.closed ? '🔒 Clôturée' : '🟢 Ouverte'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5">{v.customer?.zone || ''}</p>
                                        <div className="flex gap-4 mt-2 text-[10px] text-gray-400">
                                            {v.plannedAt && <span>📅 {new Date(v.plannedAt).toLocaleDateString('fr-FR')}</span>}
                                            {v.visitedAt && <span>🚀 {new Date(v.visitedAt).toLocaleDateString('fr-FR')}</span>}
                                            {v.objective && <span className="truncate max-w-[200px]">🎯 {v.objective}</span>}
                                        </div>
                                    </div>
                                    <div className="text-right text-[10px] space-y-1">
                                        {totalTasks > 0 && <div className="text-gray-500">📋 {completedTasks}/{totalTasks}</div>}
                                        {(v.priceAudits || []).length > 0 && <div className="text-gray-500">🏷️ {(v.priceAudits || []).length}</div>}
                                        {hasOrders && <div className="text-emerald-600 font-bold">📝 {(v.preOrders || []).length} cmd</div>}
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
