"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ReportFilters } from "../components/ReportFilters";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { toPng } from 'html-to-image';
import jsPDF from "jspdf";
import { useTranslation } from '@/i18n/I18nProvider';
import { useAuthContext } from '@/providers/AuthProvider';
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6', '#EC4899'];

export default function CommercialReport() {
    const { t } = useTranslation();
    const router = useRouter();
    const { isAdmin, isSalesRep } = useAuthContext();

    useEffect(() => {
        if (!isAdmin && !isSalesRep) {
            router.replace("/dashboard/reports");
        }
    }, [router, isAdmin, isSalesRep]);
    const chartRef = useRef<HTMLDivElement>(null);
    const reportRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);
    const [selectedSalesReps, setSelectedSalesReps] = useState<{ value: string; label: string }[]>([]);

    const loadData = async (filters: any) => {
        setLoading(true);
        setSelectedSalesReps(filters.technicians || []);
        const token = localStorage.getItem("sav_token");
        try {
            const params = new URLSearchParams({
                start: filters.start,
                end: filters.end,
            });
            filters.technicians?.forEach((t: any) => params.append('sales_reps[]', t.value));

            const url = `${API_URL}/stats/sales?${params}`;
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const stats = await res.json();

            // Build chart data
            const charts = {
                // Price & Stock
                priceStock: [
                    { name: 'Conformité Prix', value: stats.priceCompliance ?? 0, fill: '#10B981' },
                    { name: 'Must-Stock', value: stats.mustStockRate ?? 0, fill: '#3B82F6' },
                    { name: 'Taux OOS', value: stats.oosRate ?? 0, fill: '#EF4444' },
                ],
                // Quality & Visibility
                qualityVis: [
                    { name: 'Qualité PDV', score: (stats.avgQualityScore ?? 0) * 20, value: stats.avgQualityScore ?? 0 },
                    { name: 'Visibilité', score: (stats.avgVisibilityScore ?? 0) * 20, value: stats.avgVisibilityScore ?? 0 },
                    { name: 'Fraîcheur', score: (stats.avgFreshness ?? 0) * 20, value: stats.avgFreshness ?? 0 },
                ],
                // Visits
                visits: [
                    { name: 'Call Rate', value: stats.callRate ?? 0 },
                    { name: 'JP Adherence', value: stats.jpAdherence ?? 0 },
                    { name: 'Strike Rate', value: stats.strikeRate ?? 0 },
                    { name: 'Execution', value: stats.executionRate ?? 0 },
                ],
                // Conversion funnel
                funnel: [
                    { name: 'Visites Planifiées', value: stats.visitsPlanned ?? 0 },
                    { name: 'Visites Réalisées', value: stats.visitsRealized ?? 0 },
                    { name: 'Précommandes', value: stats.preOrdersTaken ?? 0 },
                    { name: 'Livrées', value: stats.ordersWon ?? 0 },
                ],
            };

            setData({ stats, charts });

        } catch (e) {
            console.error(e);
            toast.error("Erreur chargement données");
        } finally {
            setLoading(false);
        }
    };

    // --- EXPORT PDF ---
    const exportPDF = async () => {
        if (!reportRef.current) return;
        const toastId = toast.loading("Génération du PDF...");
        try {
            const dataUrl = await toPng(reportRef.current, { quality: 0.95, pixelRatio: 2, backgroundColor: '#ffffff' });
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfW = pdf.internal.pageSize.getWidth();
            const imgProps = pdf.getImageProperties(dataUrl);
            const pdfH = (imgProps.height * pdfW) / imgProps.width;
            pdf.addImage(dataUrl, 'PNG', 0, 0, pdfW, pdfH);
            pdf.save(`Rapport_Commercial_${new Date().toISOString().slice(0, 10)}.pdf`);
            toast.success("PDF prêt !", { id: toastId });
        } catch (e) {
            console.error(e);
            toast.error("Erreur PDF", { id: toastId });
        }
    };

    // --- EXPORT EXCEL ---
    const exportExcel = async () => {
        if (!data) return;
        const toastId = toast.loading("Génération Excel...");
        try {
            const wb = new ExcelJS.Workbook();
            const ws = wb.addWorksheet('Performance Commerciale');

            // A. KPIs
            ws.columns = [
                { header: 'KPI', key: 'kpi', width: 25 },
                { header: 'Valeur', key: 'value', width: 15 },
            ];
            ws.getRow(1).font = { bold: true };

            const s = data.stats;
            const kpis = [
                ['Call Rate', `${s.callRate}%`],
                ['JP Adherence', `${s.jpAdherence}%`],
                ['Strike Rate', `${s.strikeRate}%`],
                ['Conformité Prix', `${s.priceCompliance}%`],
                ['Must-Stock', `${s.mustStockRate}%`],
                ['Taux OOS', `${s.oosRate}%`],
                ['Score Qualité', `${s.avgQualityScore}/5`],
                ['Score Visibilité', `${s.avgVisibilityScore}/5`],
                ['Taux Exécution', `${s.executionRate}%`],
                ['Panier Moyen', `${s.avgOrderValue} FCFA`],
            ];
            kpis.forEach(([kpi, value]: any) => ws.addRow({ kpi, value }));

            // B. Capture du graphique
            if (chartRef.current) {
                const chartDataUrl = await toPng(chartRef.current, { quality: 0.95, pixelRatio: 2, backgroundColor: '#ffffff' });
                const imgId = wb.addImage({ base64: chartDataUrl, extension: 'png' });
                ws.addImage(imgId, { tl: { col: 4, row: 1 }, ext: { width: 600, height: 350 } });
            }

            const buffer = await wb.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Commercial_${new Date().toISOString().slice(0, 10)}.xlsx`);
            toast.success("Excel téléchargé !", { id: toastId });
        } catch (e) {
            console.error(e);
            toast.error("Erreur Excel", { id: toastId });
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-4 pb-20">
            <h1 className="text-2xl font-black mb-6 flex items-center gap-2">
                <span className="text-emerald-600">🏪</span> {t('report.title')}
            </h1>

            <ReportFilters onFilter={loadData} isAdmin={true} />

            {loading && <div className="text-center py-10 animate-pulse text-gray-500">{t('report.analyzing')}</div>}

            {data && (
                <div className="space-y-6 animate-fade-in">

                    {/* BARRE D'ACTIONS */}
                    <div className="flex justify-end gap-3 mb-4 no-print">
                        <button onClick={exportExcel}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow hover:bg-green-700 flex items-center gap-2">
                            <span>📥</span> Excel (Data + Graph)
                        </button>
                        <button onClick={exportPDF}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow hover:bg-red-700 flex items-center gap-2">
                            <span>📄</span> PDF (Visuel)
                        </button>
                    </div>

                    {/* ZONE IMPRIMABLE */}
                    <div ref={reportRef} className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 space-y-8">

                        <div className="text-center border-b pb-4">
                            <h2 className="text-3xl font-black text-gray-800">{t('report.title')}</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                {data.stats.salesRepName || 'Tous les commerciaux'} • {t('report.period')}
                            </p>
                        </div>

                        {/* KPI CARDS */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {[
                                ['Call Rate', `${data.stats.callRate}%`, '📞', 'blue'],
                                ['JP Adherence', `${data.stats.jpAdherence}%`, '📍', 'teal'],
                                ['Strike Rate', `${data.stats.strikeRate}%`, '🎯', 'green'],
                                ['Prix Conforme', `${data.stats.priceCompliance}%`, '🏷️', 'purple'],
                                ['Exécution', `${data.stats.executionRate}%`, '✅', 'emerald'],
                            ].map(([label, value, icon, color]) => (
                                <div key={label as string} className="p-4 bg-gray-50 rounded-xl text-center border">
                                    <p className="text-xs font-bold text-gray-500 uppercase">{icon} {label}</p>
                                    <p className="text-2xl font-black text-gray-800">{value}</p>
                                </div>
                            ))}
                        </div>

                        {/* GRAPHIQUES */}
                        <div ref={chartRef} className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-2">

                            {/* Visits KPIs */}
                            <div className="h-72">
                                <h3 className="font-bold text-gray-600 mb-2 text-center">KPIs Visites & Exécution</h3>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.charts.visits}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                        <YAxis domain={[0, 100]} unit="%" />
                                        <Tooltip formatter={(v: number | undefined) => `${(v ?? 0).toFixed(0)}%`} />
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                            {data.charts.visits.map((_: any, i: number) => (
                                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Price & Stock */}
                            <div className="h-72">
                                <h3 className="font-bold text-gray-600 mb-2 text-center">Prix & Stock</h3>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.charts.priceStock}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                        <YAxis domain={[0, 100]} unit="%" />
                                        <Tooltip formatter={(v: number | undefined) => `${(v ?? 0).toFixed(0)}%`} />
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                            {data.charts.priceStock.map((entry: any, i: number) => (
                                                <Cell key={i} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Quality & Visibility Radar-style */}
                            <div className="h-72">
                                <h3 className="font-bold text-gray-600 mb-2 text-center">Qualité & Visibilité</h3>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.charts.qualityVis} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis domain={[0, 100]} unit="%" type="number" />
                                        <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
                                        <Tooltip formatter={(v: number | undefined) => `${(v ?? 0).toFixed(0)}%`} />
                                        <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                                            {data.charts.qualityVis.map((_: any, i: number) => (
                                                <Cell key={i} fill={COLORS[i + 3]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Conversion Funnel */}
                            <div className="h-72">
                                <h3 className="font-bold text-gray-600 mb-2 text-center">Entonnoir de Conversion</h3>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={data.charts.funnel} cx="50%" cy="50%" innerRadius={40} outerRadius={80}
                                            dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                                            {data.charts.funnel.map((_: any, i: number) => (
                                                <Cell key={i} fill={COLORS[i]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                        </div>

                        {/* Summary */}
                        <div className="text-center text-xs text-gray-400 border-t pt-4">
                            {data.stats.visitsPlanned} visites planifiées • {data.stats.visitsRealized} réalisées •
                            {data.stats.preOrdersTaken} précommandes • {data.stats.ordersWon} livrées •
                            CA: {(data.stats.totalRevenue ?? 0).toLocaleString()} FCFA
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
