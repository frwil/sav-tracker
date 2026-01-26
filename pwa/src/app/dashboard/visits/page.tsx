'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Select from 'react-select';
import { useCustomers, CustomerOption } from '@/hooks/useCustomers';
interface Visit {
    id: number;
    visitedAt: string;
    technician: { fullname: string };
    customer: { name: string; zone: string };
    gpsCoordinates?: string;
    closed: boolean;
    activated: boolean;
}

// Helper pour obtenir le début et la fin de journée/semaine/mois
const getDateRange = (type: string, dateRef: string, dateEndRef?: string) => {
    const start = new Date(dateRef);
    const end = new Date(dateEndRef || dateRef);
    
    // Reset heures
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (type === 'week') {
        // Début de semaine (Lundi)
        const day = start.getDay() || 7; 
        if (day !== 1) start.setHours(-24 * (day - 1));
        // Fin de semaine (Dimanche)
        end.setTime(start.getTime() + 6 * 24 * 60 * 60 * 1000);
        end.setHours(23, 59, 59, 999);
    } else if (type === 'month') {
        start.setDate(1);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0); // Dernier jour du mois
        end.setHours(23, 59, 59, 999);
    }

    return { 
        after: start.toISOString(), 
        before: end.toISOString() 
    };
};


export default function VisitsListPage() {
    const router = useRouter();
    const { options: customerOptions, loading: customersLoading } = useCustomers();

    const [visits, setVisits] = useState<Visit[]>([]);
    const [loading, setLoading] = useState(true);

    // --- ÉTATS DES FILTRES ---
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
    const [filterType, setFilterType] = useState('today'); // 'today', 'date', 'week', 'month', 'interval'
    const [datePrimary, setDatePrimary] = useState(new Date().toISOString().slice(0, 10)); // Date principale
    const [dateSecondary, setDateSecondary] = useState(''); // Pour l'intervalle

    useEffect(() => {
        const fetchVisits = async () => {
            setLoading(true);
            const token = localStorage.getItem('sav_token');
            if (!token) { router.push('/'); return; }

            // 1. Construction de l'URL avec filtres
            let url = 'http://localhost/api/visits?page=1';

            // Filtre Client
            if (selectedCustomer) {
                const customerId = selectedCustomer.value.split('/').pop();
                url += `&customer=${customerId}`;
            }

            // Filtre Temporel
            if (filterType !== 'all') {
                let range = { after: '', before: '' };

                if (filterType === 'today') {
                    range = getDateRange('day', new Date().toISOString());
                } else if (filterType === 'date') {
                    range = getDateRange('day', datePrimary);
                } else if (filterType === 'week') {
                    range = getDateRange('week', datePrimary);
                } else if (filterType === 'month') {
                    range = getDateRange('month', datePrimary);
                } else if (filterType === 'interval' && datePrimary && dateSecondary) {
                    range = getDateRange('interval', datePrimary, dateSecondary);
                }

                // Application des filtres de date API Platform (Standard: visitedAt[after] / [before])
                if (range.after && range.before) {
                    url += `&visitedAt[after]=${range.after}&visitedAt[before]=${range.before}`;
                }
            }

            try {
                const res = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
                });

                if (res.status === 401) {
                    localStorage.removeItem('sav_token');
                    router.push('/');
                    return;
                }

                const data = await res.json();
                
                // 2. LOGIQUE DE TRI CÔTÉ CLIENT
                // Règle 1 : Non-clôturées (En cours) en premier
                // Règle 2 : Date la plus récente en premier
                const sortedData = data.sort((a: Visit, b: Visit) => {
                    // Priorité aux visites actives (closed = false)
                    if (a.closed !== b.closed) {
                        return a.closed ? 1 : -1; 
                    }
                    // Ensuite tri par date décroissante (plus récent en haut)
                    return new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime();
                });

                setVisits(sortedData);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchVisits();
    }, [router, selectedCustomer, filterType, datePrimary, dateSecondary]);

    // Rendu dynamique du libellé de période
    const getFilterLabel = () => {
        if (filterType === 'today') return "Aujourd'hui";
        if (filterType === 'week') return "Semaine du";
        if (filterType === 'month') return "Mois de";
        return "Date";
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans">
            <div className="bg-white shadow px-6 py-4 mb-6">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <div>
                        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-indigo-600">← Retour</Link>
                        <h1 className="text-2xl font-extrabold text-gray-800">Visites Techniques</h1>
                    </div>
                    <Link href="/dashboard/visits/new" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-indigo-700 text-sm">
                        + Nouvelle Visite
                    </Link>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4">
                
                {/* --- BARRE DE FILTRES --- */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        
                        {/* 1. Type de filtre temporel */}
                        <div className="md:col-span-3">
                            <label className="block text-xs font-bold text-gray-500 mb-1">Période</label>
                            <select 
                                className="w-full border p-2 rounded-lg bg-gray-50 text-sm"
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                            >
                                <option value="today">Aujourd'hui</option>
                                <option value="date">Date précise</option>
                                <option value="week">Semaine</option>
                                <option value="month">Mois</option>
                                <option value="interval">Intervalle</option>
                                <option value="all">Tout l'historique</option>
                            </select>
                        </div>

                        {/* 2. Champs Date dynamiques */}
                        {filterType !== 'today' && filterType !== 'all' && (
                            <div className={`${filterType === 'interval' ? 'md:col-span-4' : 'md:col-span-3'} flex gap-2`}>
                                <div className="w-full">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">
                                        {filterType === 'interval' ? 'Du' : getFilterLabel()}
                                    </label>
                                    <input 
                                        type="date" 
                                        className="w-full border p-2 rounded-lg bg-white text-sm"
                                        value={datePrimary}
                                        onChange={(e) => setDatePrimary(e.target.value)}
                                    />
                                </div>
                                {filterType === 'interval' && (
                                    <div className="w-full">
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Au</label>
                                        <input 
                                            type="date" 
                                            className="w-full border p-2 rounded-lg bg-white text-sm"
                                            value={dateSecondary}
                                            onChange={(e) => setDateSecondary(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 3. Filtre Client */}
                        <div className="md:col-span-4">
                            <label className="block text-xs font-bold text-gray-500 mb-1">Filtrer par Client</label>
                            <Select
                                instanceId="customer-filter"
                                options={customerOptions}
                                value={selectedCustomer}
                                onChange={setSelectedCustomer}
                                isLoading={customersLoading}
                                placeholder="Tous les clients..."
                                isClearable
                                className="text-sm"
                                styles={{ control: (base) => ({ ...base, minHeight: '38px', borderRadius: '0.5rem' }) }}
                            />
                        </div>

                        {/* 4. Bouton Reset */}
                        <div className="md:col-span-1">
                            <button 
                                onClick={() => {
                                    setFilterType('today');
                                    setSelectedCustomer(null);
                                    setDatePrimary(new Date().toISOString().slice(0, 10));
                                }}
                                className="w-full py-2 text-xs font-bold text-gray-500 hover:text-red-600 bg-gray-100 hover:bg-red-50 rounded-lg border border-gray-200 transition"
                                title="Réinitialiser les filtres"
                            >
                                ↺ Reset
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- LISTE DES VISITES --- */}
                {loading ? (
                    <div className="text-center py-12 text-gray-500 animate-pulse">Chargement des visites...</div>
                ) : (
                    <div className="grid gap-4">
                        {visits.length === 0 && (
                            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                                <p className="text-gray-500 mb-2">Aucune visite trouvée pour ces critères.</p>
                                {filterType === 'today' && (
                                    <p className="text-sm text-indigo-600">Le planning est vide pour aujourd'hui.</p>
                                )}
                            </div>
                        )}

                        {visits.map(visit => (
                            <Link key={visit.id} href={`/dashboard/${visit.id}`}>
                                <div className={`p-5 rounded-xl border transition-all duration-200 flex justify-between items-center group shadow-sm hover:shadow-md ${
                                    visit.closed 
                                        ? 'bg-white border-gray-200 opacity-90' 
                                        : 'bg-white border-l-4 border-l-green-500 border-gray-100'
                                }`}>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h2 className="font-bold text-lg text-gray-800 group-hover:text-indigo-700 transition-colors">
                                                {visit.customer.name}
                                            </h2>
                                            {visit.closed ? (
                                                <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-gray-200">Clôturée</span>
                                            ) : (
                                                <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-green-200 animate-pulse">En cours</span>
                                            )}
                                        </div>
                                        <div className="text-sm text-gray-500 flex flex-col md:flex-row gap-1 md:gap-3">
                                            <span>📅 {new Date(visit.visitedAt).toLocaleDateString()} à {new Date(visit.visitedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            <span className="hidden md:inline">•</span>
                                            <span>📍 {visit.customer.zone}</span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">Tech: {visit.technician.fullname}</p>
                                    </div>
                                    <div className="text-2xl text-gray-300 group-hover:text-indigo-500 transition-colors">→</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}