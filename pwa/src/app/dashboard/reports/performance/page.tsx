"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { ReportFilters } from "../components/ReportFilters";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { toPng } from 'html-to-image';
import jsPDF from "jspdf";
import { useTranslation } from "@/i18n/I18nProvider";
import toast from "react-hot-toast";
import Link from "next/link";

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function PerformanceReport() {
    const { t } = useTranslation();
    const reportRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<HTMLDivElement>(null);

    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);

    // ── Détection du rôle (synchrone via lazy initializer + fallback useEffect) ──
    const [userRole, setUserRole] = useState<string>(() => {
        if (typeof window === 'undefined') return "";
        try {
            const token = localStorage.getItem("sav_token");
            if (!token) return "";
            // Support base64url (JWT standard) vers base64 (atob)
            let payload = token.split('.')[1] || "";
            payload = payload.replace(/-/g, '+').replace(/_/g, '/');
            const json = JSON.parse(atob(payload));
            const roles: string[] = json.roles || [];
            if (roles.includes('ROLE_SALES_REP')) return 'ROLE_SALES_REP';
            if (roles.includes('ROLE_TECHNICIAN')) return 'ROLE_TECHNICIAN';
            if (roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SUPER_ADMIN')) return 'ROLE_ADMIN';
            return "";
        } catch { return ""; }
    });

    // Fallback: si le lazy initializer n'a pas trouvé le rôle (ex: token stocké après init),
    // on réessaie au montage
    useEffect(() => {
        if (userRole) return;
        const token = localStorage.getItem("sav_token");
        if (!token) return;
        try {
            let payload = token.split('.')[1] || "";
            payload = payload.replace(/-/g, '+').replace(/_/g, '/');
            const json = JSON.parse(atob(payload));
            const roles: string[] = json.roles || [];
            if (roles.includes('ROLE_SALES_REP')) setUserRole('ROLE_SALES_REP');
            else if (roles.includes('ROLE_TECHNICIAN')) setUserRole('ROLE_TECHNICIAN');
            else if (roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SUPER_ADMIN')) setUserRole('ROLE_ADMIN');
        } catch {}
    }, []);

    const isSalesRep = userRole === 'ROLE_SALES_REP';
    const isTech = userRole === 'ROLE_TECHNICIAN';
    const isAdmin = userRole === 'ROLE_ADMIN';

    // ─── CHARGEMENT COMMERCIAL ────────────────────────────────────

    const loadCommercialData = async (filters: { start: string; end: string }) => {
        setLoading(true);
        const token = localStorage.getItem("sav_token");
        try {
            const url = `${API_URL}/stats/sales?start=${filters.start}&end=${filters.end}`;
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
            });
            if (!res.ok) throw new Error("Erreur réseau");
            const stats = await res.json();

            // Commandes : Livrées vs le reste
            const wonOrders = stats.ordersWon || 0;
            const pendingOrders = Math.max(0, (stats.preOrdersTaken || 0) - wonOrders);

            setData({
                commercial: true,
                stats,
                orderChart: [
                    { name: 'Livrées', value: wonOrders, fill: '#10B981' },
                    { name: 'En attente', value: pendingOrders, fill: '#F59E0B' },
                ].filter(d => d.value > 0),
            });
        } catch (e) {
            console.error(e);
            toast.error("Impossible de charger les données commerciales");
        } finally {
            setLoading(false);
        }
    };

    // ─── CHARGEMENT TECHNICIEN ────────────────────────────────────

    const loadTechData = async (filters: any) => {
        setLoading(true);
        const token = localStorage.getItem("sav_token");

        try {
            const techFilter = filters.technicians.map((t:any) => `technician[]=${t.value}`).join('&');

            const visitsUrl = `${API_URL}/visits?visitedAt[after]=${filters.start}&visitedAt[before]=${filters.end}&pagination=false&${techFilter}`;
            const customersUrl = `${API_URL}/customers?pagination=false`;

            const [resVisits, resCustomers] = await Promise.all([
                fetch(visitsUrl, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }),
                fetch(customersUrl, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } })
            ]);

            if(!resVisits.ok || !resCustomers.ok) throw new Error("Erreur réseau");

            const visits = await resVisits.json();
            const customers = await resCustomers.json();

            const visitsByTech: any = {};
            const closedVisitsByTech: any = {};
            const clientSet = new Set();
            const statusCounts: Record<string, number> = { 'CLOSED': 0, 'OPEN': 0 };

            visits.forEach((v: any) => {
                const tech = v.technician?.username || "Non assigné";
                visitsByTech[tech] = (visitsByTech[tech] || 0) + 1;
                if(v.customer) clientSet.add(v.customer.id);
                if (v.closed) {
                    statusCounts['CLOSED']++;
                    closedVisitsByTech[tech] = (closedVisitsByTech[tech] || 0) + 1;
                } else {
                    statusCounts['OPEN']++;
                }
            });

            const portfolioByTech: Record<string, number> = {};
            customers.forEach((c: any) => {
                const techName = c.affectedTo?.username || "Non assigné";
                portfolioByTech[techName] = (portfolioByTech[techName] || 0) + 1;
            });

            const chartData = Object.keys(visitsByTech).map(k => ({ name: k, value: visitsByTech[k] }));
            const nbProductiveTechs = Object.keys(closedVisitsByTech).length;
            const avgClosed = nbProductiveTechs > 0 ? (statusCounts['CLOSED'] / nbProductiveTechs).toFixed(1) : "0";

            setData({
                commercial: false,
                rawVisits: visits,
                portfolioByTech,
                chartData,
                statusCounts,
                kpi: {
                    total: visits.length,
                    uniqueClients: clientSet.size,
                    avgClosed
                }
            });

        } catch (e) {
            console.error(e);
            toast.error("Impossible de charger les données");
        } finally {
            setLoading(false);
        }
    };

    // --- EXPORTS (commun) ---
    const exportPDF = async () => {
        if (!reportRef.current) return;
        const toastId = toast.loading(t('reports.generating_pdf'));
        try {
            const dataUrl = await toPng(reportRef.current, { quality: 0.95, pixelRatio: 2 });
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfW = pdf.internal.pageSize.getWidth();
            const imgProps = pdf.getImageProperties(dataUrl);
            const pdfH = (imgProps.height * pdfW) / imgProps.width;
            pdf.addImage(dataUrl, 'PNG', 0, 0, pdfW, pdfH);
            pdf.save(`Rapport_Performance_${new Date().toISOString().slice(0,10)}.pdf`);
            toast.success(t('reports.pdf_ready'), { id: toastId });
        } catch (e) {
            toast.error(t('reports.pdf_error'), { id: toastId });
        }
    };

    const exportExcel = async () => {
        if (!data) return;
        const toastId = toast.loading(t('reports.generating_xls'));
        try {
            const workbook = new ExcelJS.Workbook();
            if (data.commercial) {
                const sheet = workbook.addWorksheet('Performance Commerciale');
                sheet.columns = [
                    { header: 'Indicateur', key: 'label', width: 30 },
                    { header: 'Valeur', key: 'value', width: 20 },
                ];
                const s = data.stats;
                sheet.addRow({ label: 'Visites planifiées', value: s.visitsPlanned });
                sheet.addRow({ label: 'Visites réalisées', value: s.visitsRealized });
                sheet.addRow({ label: 'Adhérence JP (%)', value: s.jpAdherence });
                sheet.addRow({ label: 'Taux de visite (%)', value: s.callRate });
                sheet.addRow({ label: 'Commandes prises', value: s.preOrdersTaken });
                sheet.addRow({ label: 'Commandes gagnées', value: s.ordersWon });
                sheet.addRow({ label: 'Strike rate (%)', value: s.strikeRate });
                sheet.addRow({ label: 'CA total', value: s.totalRevenue });
                sheet.addRow({ label: 'Panier moyen', value: s.avgOrderValue });
                sheet.addRow({ label: 'Conformité prix (%)', value: s.priceCompliance });
                sheet.addRow({ label: 'Taux must-stock (%)', value: s.mustStockRate });
                sheet.addRow({ label: 'Taux rupture (%)', value: s.oosRate });
                sheet.addRow({ label: 'Score fraîcheur (/5)', value: s.avgFreshness });
                sheet.addRow({ label: 'Score qualité (/5)', value: s.avgQualityScore });
                sheet.addRow({ label: 'Score visibilité (/5)', value: s.avgVisibilityScore });
                sheet.addRow({ label: "Taux d'exécution (%)", value: s.executionRate });
                sheet.addRow({ label: 'Perfect Store (/100)', value: s.perfectStoreScore });
            } else {
                const sheet = workbook.addWorksheet(t('visit.synthesis_sheet'));
                sheet.columns = [
                    { header: 'Technicien', key: 'tech', width: 20 },
                    { header: 'Client', key: 'client', width: 25 },
                    { header: 'Date', key: 'date', width: 15 },
                    { header: 'Statut', key: 'status', width: 15 },
                    { header: t('reports.col_speculation'), key: 'spec', width: 30 },
                    { header: 'Date Lancement', key: 'startDate', width: 15 },
                ];
                const sortedVisits = [...data.rawVisits].sort((a: any, b: any) => {
                    const techA = a.technician?.username || "";
                    const techB = b.technician?.username || "";
                    if (techA !== techB) return techA.localeCompare(techB);
                    return new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime();
                });
                sortedVisits.forEach((v: any) => {
                    const obs = v.observations?.[0];
                    sheet.addRow({
                        date: new Date(v.visitedAt).toLocaleDateString(),
                        client: v.customer?.name,
                        tech: v.technician?.username,
                        status: v.closed ? 'CLÔTURÉE' : 'EN COURS',
                        spec: obs ? `${obs.flock?.speculation?.name} (${obs.flock?.subjectCount})` : '',
                        startDate: obs?.flock?.startDate ? new Date(obs.flock.startDate).toLocaleDateString() : '-'
                    });
                });
                if (chartRef.current) {
                    const chartDataUrl = await toPng(chartRef.current, { quality: 0.95, pixelRatio: 2 });
                    const imageId = workbook.addImage({ base64: chartDataUrl, extension: 'png' });
                    sheet.addImage(imageId, { tl: { col: 6, row: 1 }, ext: { width: 500, height: 300 } });
                }
            }
            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Performance_${new Date().toISOString().slice(0,10)}.xlsx`);
            toast.success(t('reports.xls_ready'), { id: toastId });
        } catch(e) {
            toast.error(t('reports.xls_error'), { id: toastId });
        }
    };

    // Groupement technicien (useMemo uniquement pour les données tech)
    const groupedData = useMemo(() => {
        if (!data?.rawVisits) return {};
        const groups: any = {};
        data.rawVisits.forEach((v: any) => {
            const techName = v.technician?.username || "Non assigné";
            const clientName = v.customer?.name || "Client Inconnu";
            if (!groups[techName]) {
                groups[techName] = { clients: {}, stats: { total: 0, planned: 0, closed: 0 } };
            }
            groups[techName].stats.total++;
            if (v.closed) groups[techName].stats.closed++;
            else groups[techName].stats.planned++;
            if (!groups[techName].clients[clientName]) {
                groups[techName].clients[clientName] = [];
            }
            groups[techName].clients[clientName].push(v);
        });
        return groups;
    }, [data]);

    // ── Helpers formatage ──
    const pct = (v: number) => `${(v ?? 0).toFixed(1)}%`;
    const money = (v: number) => {
        if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + ' M';
        if (v >= 1_000) return (v / 1_000).toFixed(0) + ' K';
        return (v ?? 0).toFixed(0);
    };

    // ── Auto-load selon le rôle ──
    useEffect(() => {
        if (!userRole) return;
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
        if (isSalesRep) {
            loadCommercialData({ start, end });
        }
        // Les admins/techs utilisent ReportFilters pour déclencher le chargement
    }, [userRole]);

    // ══════════════════════════════════════════════════════════════
    // ÉTAT INITIAL : rôle non encore détecté → loader
    // ══════════════════════════════════════════════════════════════
    if (!userRole) {
        return (
            <div className="max-w-7xl mx-auto p-4 pb-20 flex items-center justify-center min-h-[50vh]">
                <div className="text-center animate-pulse">
                    <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">{t('common.loading')}...</p>
                </div>
            </div>
        );
    }

    // ══════════════════════════════════════════════════════════════
    // VUE COMMERCIALE
    // ══════════════════════════════════════════════════════════════
    if (isSalesRep) {
        const s = data?.stats;
        return (
            <div className="max-w-7xl mx-auto p-4 pb-20">
                <Link href="/dashboard/reports" className="text-indigo-600 font-bold hover:underline mb-4 inline-block">
                    ← {t('reports.back_to_center')}
                </Link>
                <h1 className="text-2xl font-black mb-6 flex items-center gap-2">
                    <span className="text-blue-600">📊</span> {t('reports.commercial_perf')}
                </h1>

                {/* Filtres dates simples (commercial) */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 items-end no-print">
                    <div className="w-full md:w-1/4">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{t('dashboard.from')}</label>
                        <input type="date" className="w-full border p-2 rounded-lg text-sm"
                            defaultValue={new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)}
                            id="comm-start" />
                    </div>
                    <div className="w-full md:w-1/4">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{t('dashboard.to')}</label>
                        <input type="date" className="w-full border p-2 rounded-lg text-sm"
                            defaultValue={new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10)}
                            id="comm-end" />
                    </div>
                    <button
                        onClick={() => {
                            const start = (document.getElementById('comm-start') as HTMLInputElement).value;
                            const end = (document.getElementById('comm-end') as HTMLInputElement).value;
                            loadCommercialData({ start, end });
                        }}
                        className="w-full md:w-auto px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition"
                    >
                        {t('common.apply')}
                    </button>
                </div>

                {loading && <div className="text-center py-10 animate-pulse text-gray-500">{t('common.loading')}...</div>}

                {s && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-end gap-3 mb-4 no-print">
                            <button onClick={exportExcel} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow hover:bg-green-700 flex items-center gap-2">
                                <span>📥</span> Excel
                            </button>
                            <button onClick={exportPDF} className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow hover:bg-red-700 flex items-center gap-2">
                                <span>📄</span> PDF
                            </button>
                        </div>

                        <div ref={reportRef} className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 space-y-8">
                            <div className="text-center border-b pb-4">
                                <h2 className="text-3xl font-black text-indigo-900 uppercase">{t('reports.commercial_synthesis')}</h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    {s.salesRepName ? `${s.salesRepName} • ` : ''}{t('reports.generated_on')} {new Date().toLocaleString()}
                                </p>
                            </div>

                            {/* ── Rangée 1 : Visites ── */}
                            <Section title="📋 Visites">
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                <KpiCard label={t('sales.visits_planned')} value={s.visitsPlanned} icon="📋" color="gray" />
                                <KpiCard label={t('sales.visits_realized')} value={s.visitsRealized} icon="✅" color="blue" />
                                <KpiCard label={t('sales.visits_on_time')} value={s.visitsOnTime} icon="🎯" color="indigo" />
                                <KpiCard label={t('sales.jp_adherence')} value={pct(s.jpAdherence)} icon="📐" color={s.jpAdherence >= 80 ? 'green' : 'red'}
                                    sub={`${s.visitsOnTime}/${s.visitsRealized} visites`} />
                                <KpiCard label={t('sales.call_rate')} value={pct(s.callRate)} icon="📶" color={s.callRate >= 80 ? 'green' : 'yellow'}
                                    sub={`${s.visitsRealized}/${s.visitsPlanned} visites`} />
                            </div>
                            </Section>

                            {/* ── Rangée 2 : Commandes ── */}
                            <Section title="🛒 Commandes">
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                <KpiCard label={t('sales.orders_taken')} value={s.preOrdersTaken} icon="📝" color="indigo" />
                                <KpiCard label={t('sales.orders_won')} value={s.ordersWon} icon="🏆" color="green" />
                                <KpiCard label={t('sales.strike_rate')} value={pct(s.strikeRate)} icon="💪" color={s.strikeRate >= 60 ? 'green' : 'yellow'}
                                    sub={`${s.ordersWon}/${s.preOrdersTaken} commandes`} />
                                <KpiCard label={t('sales.revenue')} value={money(s.totalRevenue)} icon="💰" color="blue" />
                                <KpiCard label={t('sales.avg_order')} value={money(s.avgOrderValue)} icon="🧾" color="gray"
                                    sub={s.ordersWon > 0 ? `${s.ordersWon} commandes` : undefined} />
                            </div>
                            </Section>

                            {/* ── Rangée 3 : Prix & Stock ── */}
                            <Section title="💲 Prix & Stock">
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                <KpiCard label={t('sales.price_compliance')} value={pct(s.priceCompliance)} icon="💲"
                                    color={s.priceCompliance >= 90 ? 'green' : 'red'}
                                    sub={t('sales.price_checks', { count: String(s.priceChecksDone) })}
                                    alert={s.priceCompliance > 0 && s.priceCompliance < 70} />
                                <KpiCard label={t('sales.must_stock_rate')} value={pct(s.mustStockRate)} icon="📦"
                                    color={s.mustStockRate >= 85 ? 'green' : 'red'}
                                    sub={t('sales.stock_checks', { count: String(s.stockChecksDone) })}
                                    alert={s.mustStockRate > 0 && s.mustStockRate < 50} />
                                <KpiCard label={t('sales.oos_rate')} value={pct(s.oosRate)} icon="🚫"
                                    color={s.oosRate <= 10 ? 'green' : 'red'}
                                    sub={t('sales.oos_count', { count: String(s.outOfStockCount) })}
                                    alert={s.oosRate > 10} />
                                <KpiCard label={t('sales.avg_freshness')} value={`${(s.avgFreshness ?? 0).toFixed(1)}/5`} icon="🥬"
                                    color={s.avgFreshness >= 3.5 ? 'green' : 'yellow'} />
                                <KpiCard label={t('sales.perfect_store')} value={`${(s.perfectStoreScore ?? 0).toFixed(0)}/100`} icon="⭐"
                                    color={s.perfectStoreScore >= 70 ? 'green' : 'yellow'} />
                            </div>
                            </Section>

                            {/* ── Rangée 4 : Qualité, Visibilité, Exécution ── */}
                            <Section title="🏅 Qualité & Exécution">
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                <KpiCard label={t('sales.avg_quality')} value={`${(s.avgQualityScore ?? 0).toFixed(1)}/5`} icon="🏅"
                                    color={s.avgQualityScore >= 3 ? 'green' : 'red'} />
                                <KpiCard label={t('sales.avg_visibility')} value={`${(s.avgVisibilityScore ?? 0).toFixed(1)}/5`} icon="👁️"
                                    color={s.avgVisibilityScore >= 3 ? 'green' : 'yellow'} />
                                <KpiCard label={t('sales.execution_rate')} value={pct(s.executionRate)} icon="📊"
                                    color={s.executionRate >= 80 ? 'green' : 'red'}
                                    sub={t('sales.activities_count', { done: String(s.activitiesCompleted), total: String(s.activitiesTotal) })}
                                    alert={s.executionRate > 0 && s.executionRate < 50} />
                                <KpiCard label="Prix conformes" value={s.priceCompliant} icon="✅" color="green"
                                    sub={`/${s.priceChecksDone}`} />
                                <KpiCard label="Must-Stock OK" value={s.mustStockPresent} icon="📦" color="blue"
                                    sub={`/${s.stockChecksDone}`} />
                            </div>
                            </Section>

                            {/* Graphiques */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="h-72" ref={chartRef}>
                                    <h3 className="font-bold text-gray-700 mb-4 text-center">{t('sales.order_distribution')}</h3>
                                    {data.orderChart.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="90%">
                                        <PieChart>
                                            <Pie data={data.orderChart} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                                                {data.orderChart.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill || ['#10B981', '#F59E0B'][index % 2]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    ) : <p className="text-center text-gray-400 pt-10">Aucune commande sur la période</p>}
                                </div>
                                <div className="h-72">
                                    <h3 className="font-bold text-gray-700 mb-4 text-center">{t('sales.kpi_radar')}</h3>
                                    <ResponsiveContainer width="100%" height="90%">
                                        <BarChart data={[
                                            { name: 'Prix %', value: s.priceCompliance },
                                            { name: 'Must-Stock %', value: s.mustStockRate },
                                            { name: 'Exécution %', value: s.executionRate },
                                            { name: 'Strike Rate %', value: s.strikeRate },
                                            { name: 'Call Rate %', value: s.callRate },
                                            { name: 'JP %', value: s.jpAdherence },
                                        ]} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                                            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                                            <Tooltip formatter={(v: number | undefined) => `${(v ?? 0).toFixed(1)}%`} />
                                            <Bar dataKey="value" fill="#4F46E5" radius={[0, 4, 4, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {!loading && !s && (
                    <div className="text-center py-10 text-gray-400">{t('reports.select_filters')}</div>
                )}
            </div>
        );
    }

    // ══════════════════════════════════════════════════════════════
    // VUE TECHNICIEN (existante)
    // ══════════════════════════════════════════════════════════════
    return (
        <div className="max-w-7xl mx-auto p-4 pb-20">
            <Link href="/dashboard/reports" className="text-indigo-600 font-bold hover:underline mb-4 inline-block">← {t('reports.back_to_center')}</Link>
            <h1 className="text-2xl font-black mb-6 flex items-center gap-2">
                <span className="text-blue-600">🚀</span> {t('reports.performance')}
            </h1>

            <ReportFilters onFilter={loadTechData} isAdmin={isAdmin} />

            {loading && <div className="text-center py-10 animate-pulse text-gray-500">{t('reports.calculating')}</div>}

            {data && !data.commercial && (
                <div className="space-y-6 animate-fade-in">

                    <div className="flex justify-end gap-3 mb-4 no-print">
                        <button onClick={exportExcel} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow hover:bg-green-700 flex items-center gap-2">
                            <span>📥</span> Excel
                        </button>
                        <button onClick={exportPDF} className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow hover:bg-red-700 flex items-center gap-2">
                            <span>📄</span> PDF
                        </button>
                    </div>

                    <div ref={reportRef} className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 space-y-8" id="report-content">

                        <div className="text-center border-b pb-4">
                            <h2 className="text-3xl font-black text-indigo-900 uppercase">{t('visit.synthesis')}</h2>
                            <p className="text-sm text-gray-500 mt-1">{t('reports.generated_on')} {new Date().toLocaleString()}</p>
                        </div>

                        {/* KPI GLOBAUX */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="p-4 bg-blue-50 rounded-xl text-center border border-blue-100">
                                <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wide">{t('tech.total_visits')}</p>
                                <p className="text-3xl font-black text-blue-900 mt-1">{data.kpi.total}</p>
                            </div>
                            <div className="p-4 bg-purple-50 rounded-xl text-center border border-purple-100">
                                <p className="text-[10px] font-bold text-purple-800 uppercase tracking-wide">{t('reports.portfolio_touched')}</p>
                                <p className="text-3xl font-black text-purple-900 mt-1">{data.kpi.uniqueClients}</p>
                            </div>
                            <div className="p-4 bg-indigo-50 rounded-xl text-center border border-indigo-100 relative overflow-hidden">
                                <div className="absolute top-0 right-0 bg-indigo-200 text-indigo-800 text-[9px] px-2 py-0.5 rounded-bl">{t('visit.closed_f')}</div>
                                <p className="text-[10px] font-bold text-indigo-800 uppercase tracking-wide">{t('reports.avg_per_tech')}</p>
                                <p className="text-3xl font-black text-indigo-900 mt-1">{data.kpi.avgClosed}</p>
                            </div>
                            <div className="p-2 bg-gray-50 rounded-xl border border-gray-100 flex flex-col justify-center">
                                <div className="flex justify-around items-center h-full">
                                    <div className="text-center">
                                        <span className="block text-xl font-black text-green-600">{data.statusCounts['CLOSED'] || 0}</span>
                                        <span className="text-[9px] font-bold text-green-700 uppercase">{t('visit.closed_f')}</span>
                                    </div>
                                    <div className="w-px h-8 bg-gray-300"></div>
                                    <div className="text-center">
                                        <span className="block text-xl font-black text-orange-500">{data.statusCounts['OPEN'] || 0}</span>
                                        <span className="text-[9px] font-bold text-orange-600 uppercase">{t('visit.in_progress')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* GRAPHIQUES */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="h-80" ref={chartRef} style={{ padding:'10px' }}>
                                <h3 className="font-bold text-gray-700 mb-4 text-center">{t('reports.distribution_by_tech')}</h3>
                                <ResponsiveContainer width="100%" height="95%">
                                    <BarChart data={data.chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" tick={{fontSize: 12}} />
                                        <YAxis />
                                        <Tooltip cursor={{fill: '#F3F4F6'}} />
                                        <Bar dataKey="value" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="h-80">
                                <h3 className="font-bold text-gray-700 mb-4 text-center">{t('reports.market_share')}</h3>
                                <ResponsiveContainer width="100%" height="95%">
                                    <PieChart>
                                        <Pie data={data.chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                            {data.chartData.map((entry:any, index:number) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* DÉTAILS GROUPÉS AVEC RÉCAP */}
                        <div className="mt-8 space-y-8">
                            <h3 className="font-black text-xl text-gray-900 border-b pb-2">{t('reports.activity_details')}</h3>

                            {Object.entries(groupedData).map(([techName, group]: any) => {
                                const clientsList = group.clients;
                                const uniqueClientsVisited = Object.keys(clientsList).length;
                                const portfolioSize = data.portfolioByTech[techName] || 0;
                                const visitsTotal = group.stats.total;
                                const visitsPlanned = group.stats.planned;
                                const visitsClosed = group.stats.closed;

                                return (
                                    <div key={techName} className="bg-gray-50 rounded-xl p-5 border border-gray-200 break-inside-avoid">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-gray-200 pb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-indigo-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl shadow-sm">
                                                    {techName.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-indigo-900 text-xl">{techName}</h4>
                                                    <div className="flex gap-3 text-xs mt-1">
                                                        <span className="bg-white px-2 py-1 rounded border text-gray-600">
                                                            👥 <strong>{uniqueClientsVisited}</strong> / {portfolioSize} {t('reports.clients_short')} ({uniqueClientsVisited > 0 ? ((uniqueClientsVisited / Math.max(1, portfolioSize) * 100).toFixed(1) + '%') : '0%'})
                                                        </span>
                                                        <span className="bg-white px-2 py-1 rounded border text-gray-600">
                                                            🚜 <strong>{visitsTotal}</strong> {t('reports.visits_short')} ({visitsPlanned} {t('visit.in_progress')})
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex gap-4">
                                                <div className="text-center">
                                                    <span className="block text-lg font-black text-green-600">{visitsClosed}</span>
                                                    <span className="text-[9px] uppercase font-bold text-gray-400">{t('visit.closed_f')}</span>
                                                </div>
                                                <div className="w-px bg-gray-300"></div>
                                                <div className="text-center">
                                                    <span className="block text-lg font-black text-orange-500">{visitsPlanned}</span>
                                                    <span className="text-[9px] uppercase font-bold text-gray-400">{t('visit.in_progress')}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            {Object.entries(clientsList).map(([clientName, clientVisits]: any) => (
                                                <div key={clientName} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                                                    <div className="bg-gray-100 px-4 py-2 flex justify-between items-center border-b border-gray-200">
                                                        <span className="font-bold text-gray-700">{clientName}</span>
                                                        <span className="text-xs font-bold bg-white px-2 py-1 rounded border border-gray-300">
                                                            {clientVisits.length} {t('reports.visits_short')}
                                                        </span>
                                                    </div>
                                                    <table className="w-full text-xs text-left">
                                                        <thead>
                                                            <tr className="text-gray-400 border-b border-gray-100">
                                                                <th className="px-4 py-2 font-medium">{t('common.date')}</th>
                                                                <th className="px-4 py-2 font-medium">{t('common.status')}</th>
                                                                <th className="px-4 py-2 font-medium">{t('reports.col_speculation')}</th>
                                                                <th className="px-4 py-2 font-medium">{t('visit.observations')}</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-50">
                                                            {clientVisits.map((v: any) => (
                                                                <tr key={v.id}>
                                                                    <td className="px-4 py-2 text-gray-600 whitespace-nowrap">
                                                                        {new Date(v.visitedAt).toLocaleDateString()}
                                                                    </td>
                                                                    <td className="px-4 py-2">
                                                                        {v.closed ? (
                                                                            <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-green-200">
                                                                                ✅ {t('visit.closed_f')}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-orange-200">
                                                                                ⏳ {t('visit.in_progress')}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td
                                                                        className="px-4 py-2 font-medium text-indigo-600 cursor-help border-b border-dotted border-indigo-200 hover:bg-indigo-50 transition"
                                                                        title={v.observations?.[0]?.flock?.startDate
                                                                            ? `📅 ${t('flock.start_date')} : ${new Date(v.observations[0].flock.startDate).toLocaleDateString()}`
                                                                            : t('flock.unknown_date')
                                                                        }
                                                                    >
                                                                        {v.observations?.[0]?.flock?.speculation?.name || '-'}
                                                                        {v.observations?.[0]?.flock?.subjectCount ? ` (${v.observations[0].flock.subjectCount})` : ''}
                                                                    </td>
                                                                    <td className="px-4 py-2 text-gray-500 italic truncate max-w-[200px]">
                                                                        {v.observations?.length} {t('reports.obs_recorded')}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── KPI Card (réutilisable) ───
function KpiCard({ label, value, icon, sub, color = 'gray', alert }: {
    label: string; value: string | number; icon: string; sub?: string;
    color?: string; alert?: boolean;
}) {
    const colorMap: Record<string, string> = {
        gray: 'bg-gray-50 border-gray-200', blue: 'bg-blue-50 border-blue-100',
        green: 'bg-green-50 border-green-100', red: 'bg-red-50 border-red-200',
        yellow: 'bg-amber-50 border-amber-100', indigo: 'bg-indigo-50 border-indigo-100',
    };
    return (
        <div className={`p-3 rounded-xl border ${alert ? 'bg-red-50 border-red-200' : (colorMap[color] || colorMap.gray)}`}>
            <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{icon}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</span>
            </div>
            <p className="text-2xl font-black text-gray-900">{value}</p>
            {sub && <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>}
        </div>
    );
}

// ─── Section Header ───
function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 border-b pb-2">{title}</h4>
            {children}
        </div>
    );
}