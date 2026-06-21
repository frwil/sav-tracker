"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ReportFilters } from "../components/ReportFilters";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { toPng } from 'html-to-image'; // ✅ Remplacement de html2canvas
import jsPDF from "jspdf";
import { useTranslation } from "@/i18n/I18nProvider";
import toast from "react-hot-toast";

const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];
const API_URL = process.env.NEXT_PUBLIC_API_URL;

function getRoles(): string[] {
    try {
        const token = localStorage.getItem("sav_token");
        if (!token) return [];
        return JSON.parse(atob(token.split('.')[1])).roles || [];
    } catch { return []; }
}

export default function InterventionsReport() {
    const { t } = useTranslation();
    const router = useRouter();

    useEffect(() => {
        const roles = getRoles();
        const isAdmin = roles.includes("ROLE_ADMIN") || roles.includes("ROLE_SUPER_ADMIN");
        const isTech = roles.includes("ROLE_TECHNICIAN");
        if (!isAdmin && !isTech) {
            router.replace("/dashboard/reports");
        }
    }, [router]);
    const chartRef = useRef<HTMLDivElement>(null);
    const reportRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);

    const loadData = async (filters: any) => {
        setLoading(true);
        const token = localStorage.getItem("sav_token");
        try {
            // On récupère les observations sur la période
            const techFilter = filters.technicians.map((t:any) => `visit.technician[]=${t.value}`).join('&');
            // Note: On suppose que l'API permet de filtrer les observations par date et technicien via la visite
            const url = `${API_URL}/observations?observedAt[after]=${filters.start}&observedAt[before]=${filters.end}&pagination=false&${techFilter}`;
            
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
            const observations = await res.json();

            // --- ANALYSE ÉPIDÉMIOLOGIQUE ---
            const diseases: Record<string, number> = {};
            let totalProblems = 0;
            let totalResolved = 0;

            observations.forEach((obs: any) => {
                // Problèmes détectés
                obs.detectedProblems?.forEach((pb: any) => {
                    const name = pb.description || "Indéfini";
                    diseases[name] = (diseases[name] || 0) + 1;
                    totalProblems++;
                });

                // Problèmes résolus (via resolvedProblems ou statut)
                totalResolved += (obs.resolvedProblems?.length || 0);
            });

            // Top 5 Maladies
            const topDiseases = Object.keys(diseases)
                .map(k => ({ name: k, value: diseases[k] }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 5);

            const resolutionRate = totalProblems > 0 ? ((totalResolved / totalProblems) * 100).toFixed(1) : "0";

            setData({
                raw: observations,
                kpi: { totalProblems, totalResolved, resolutionRate },
                charts: { topDiseases }
            });

        } catch (e) { 
            console.error(e);
            toast.error("Erreur chargement données"); 
        } finally { 
            setLoading(false); 
        }
    };

    // --- 1. EXPORT PDF (IMAGE) ---
    const exportPDF = async () => {
        if (!reportRef.current) return;
        const toastId = toast.loading("Génération du PDF...");
        
        try {
            // Utilisation de html-to-image
            const dataUrl = await toPng(reportRef.current, { quality: 0.95, pixelRatio: 2, backgroundColor: '#ffffff' });
            
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfW = pdf.internal.pageSize.getWidth();
            const imgProps = pdf.getImageProperties(dataUrl);
            const pdfH = (imgProps.height * pdfW) / imgProps.width;
            
            pdf.addImage(dataUrl, 'PNG', 0, 0, pdfW, pdfH);
            pdf.save(`Rapport_Sante_${new Date().toISOString().slice(0,10)}.pdf`);
            toast.success("PDF prêt !", { id: toastId });
        } catch (e) {
            console.error(e);
            toast.error("Erreur PDF", { id: toastId });
        }
    };
    
    // --- 2. EXPORT EXCEL (DATA + GRAPHIQUE) ---
    const exportExcel = async () => {
        if (!data) return;
        const toastId = toast.loading("Génération Excel...");

        try {
            const wb = new ExcelJS.Workbook();
            const ws = wb.addWorksheet(t('reports.sheet_health'));

            // A. Données Brutes
            ws.columns = [
                { header: 'Date', key: 'date', width: 15 },
                { header: 'Client', key: 'client', width: 20 },
                { header: 'Bande', key: 'flock', width: 15 },
                { header: t('reports.col_problems'), key: 'pbs', width: 40 },
                { header: 'Résolutions', key: 'res', width: 40 },
            ];

            // Style Header
            ws.getRow(1).font = { bold: true };

            data.raw.forEach((obs: any) => {
                const pbs = obs.detectedProblems?.map((p:any) => p.description).join(', ');
                if (pbs) { // On n'exporte que les lignes avec problèmes
                    ws.addRow({
                        date: new Date(obs.observedAt).toLocaleDateString(),
                        client: obs.visit?.customer?.name,
                        flock: obs.flock?.name,
                        pbs: pbs,
                        res: obs.resolvedProblems?.map((p:any) => p.description).join(', ')
                    });
                }
            });

            // B. Capture du Graphique pour l'intégrer
            if (chartRef.current) {
                const chartDataUrl = await toPng(chartRef.current, { quality: 0.95, pixelRatio: 2, backgroundColor: '#ffffff' });
                
                const imgId = wb.addImage({
                    base64: chartDataUrl,
                    extension: 'png',
                });

                // On insère l'image à droite du tableau (Colonne F, Ligne 2)
                ws.addImage(imgId, {
                    tl: { col: 6, row: 1 },
                    ext: { width: 500, height: 300 }
                });
            }

            const buffer = await wb.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Sante_${new Date().toISOString().slice(0,10)}.xlsx`);
            toast.success("Excel téléchargé !", { id: toastId });

        } catch (e) {
            console.error(e);
            toast.error("Erreur Excel", { id: toastId });
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-4 pb-20">
            <h1 className="text-2xl font-black mb-6 flex items-center gap-2">
                <span className="text-red-600">❤️‍🩹</span> Rapport Santé & Pathologies
            </h1>
            <ReportFilters onFilter={loadData} isAdmin={true} />

            {loading && <div className="text-center py-10 animate-pulse text-gray-500">Analyse épidémiologique en cours...</div>}

            {data && (
                <div className="space-y-6 animate-fade-in">
                    
                    {/* BARRE D'ACTIONS */}
                    <div className="flex justify-end gap-3 mb-4 no-print">
                        <button 
                            onClick={exportExcel} 
                            className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow hover:bg-green-700 flex items-center gap-2"
                        >
                            <span>📥</span> Excel (Data + Graph)
                        </button>
                        <button 
                            onClick={exportPDF} 
                            className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow hover:bg-red-700 flex items-center gap-2"
                        >
                            <span>📄</span> PDF (Visuel)
                        </button>
                    </div>

                    {/* ZONE IMPRIMABLE */}
                    <div ref={reportRef} className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 space-y-8">
                        <div className="text-center border-b pb-4">
                            <h2 className="text-3xl font-black text-gray-800">Surveillance Sanitaire</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Analyse des cas cliniques détectés
                            </p>
                        </div>

                        {/* KPI */}
                        <div className="grid grid-cols-3 gap-6">
                            <div className="p-4 bg-red-50 rounded-xl text-center border border-red-100">
                                <p className="text-xs font-bold text-red-800 uppercase">Alertes Totales</p>
                                <p className="text-4xl font-black text-red-900">{data.kpi.totalProblems}</p>
                            </div>
                            <div className="p-4 bg-green-50 rounded-xl text-center border border-green-100">
                                <p className="text-xs font-bold text-green-800 uppercase">Cas Résolus</p>
                                <p className="text-4xl font-black text-green-900">{data.kpi.totalResolved}</p>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-xl text-center border border-blue-100">
                                <p className="text-xs font-bold text-blue-800 uppercase">Taux Résolution</p>
                                <p className="text-4xl font-black text-blue-900">{data.kpi.resolutionRate}%</p>
                            </div>
                        </div>

                        {/* ZONE GRAPHIQUES (Pour capture Excel) */}
                        <div ref={chartRef} className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-4">
                            
                            {/* Graph 1 : Top Maladies */}
                            <div className="h-80">
                                <h3 className="font-bold text-gray-700 mb-4 text-center">Top 5 Pathologies Récurrentes</h3>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.charts.topDiseases} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" />
                                        <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} />
                                        <Tooltip />
                                        <Bar dataKey="value" fill="#EF4444" radius={[0, 4, 4, 0]} barSize={30}>
                                            {data.charts.topDiseases.map((_:any, index:number) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            
                            {/* Graph 2 : Résolution */}
                            <div className="h-80 flex flex-col justify-center items-center">
                                <h3 className="font-bold text-gray-700 mb-4 text-center">Efficacité des Traitements</h3>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie 
                                            data={[
                                                { name: 'Résolu', value: data.kpi.totalResolved },
                                                { name: 'En cours', value: data.kpi.totalProblems - data.kpi.totalResolved }
                                            ]} 
                                            cx="50%" cy="50%" innerRadius={60} outerRadius={80} 
                                            dataKey="value" label
                                        >
                                            <Cell fill="#10B981" />
                                            <Cell fill="#F59E0B" />
                                        </Pie>
                                        <Legend />
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}