'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Select from 'react-select'; 
import { useCustomers, CustomerOption } from '@/hooks/useCustomers';

// --- TYPES ---

interface Building { 
    '@id': string; 
    id: number; 
    name: string; 
    activated: boolean; 
    flocks: Flock[]; 
}

interface Speculation { '@id': string; name: string; }
interface Standard { '@id': string; name: string; speculation: string | Speculation } 

// On précise le type Observation pour l'intellisense
interface FlockObservation {
    id: number;
    observedAt: string;
    problems?: string;
}

interface Flock { 
    id: number; 
    name: string; 
    startDate: string; 
    subjectCount: number; 
    building?: Building; 
    speculation: Speculation;
    standard?: Standard;
    observations: FlockObservation[]; // Typage amélioré
    closed: boolean;
    activated: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api';

export default function FlocksPage() {
    // --- HOOKS & STATES ---
    const { options: customerOptions, loading: customersLoading } = useCustomers();
    const [selectedCustomerOption, setSelectedCustomerOption] = useState<CustomerOption | null>(null);

    const [flocks, setFlocks] = useState<Flock[]>([]);
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [speculations, setSpeculations] = useState<Speculation[]>([]);
    const [standards, setStandards] = useState<Standard[]>([]);
    
    const [loadingData, setLoadingData] = useState(false);
    const [userRoles, setUserRoles] = useState<string[]>([]);

    // Filtres
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [showOnlyAlerts, setShowOnlyAlerts] = useState(false); // 👈 NOUVEAU STATE

    // Formulaire
    const [showForm, setShowForm] = useState(false);
    const [editingFlockId, setEditingFlockId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        speculation: '',
        standard: '',
        building: '',
        startDate: '',
        subjectCount: ''
    });

    // --- CHARGEMENT ---

    useEffect(() => {
        const token = localStorage.getItem('sav_token');
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setUserRoles(payload.roles || []);
        }
    }, []);

    // Charger les données quand un client est sélectionné
    useEffect(() => {
        if (!selectedCustomerOption) return;

        const fetchData = async () => {
            setLoadingData(true);
            const token = localStorage.getItem('sav_token');
            const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' };
            const customerId = selectedCustomerOption.value.split('/').pop();

            try {
                // 1. Charger les bâtiments du client (qui contiennent les bandes)
                const buildRes = await fetch(`${API_URL}/buildings?customer=${customerId}`, { headers });
                const buildData = await buildRes.json();
                setBuildings(buildData);

                // 2. Extraire les bandes
                let allFlocks: Flock[] = [];
                buildData.forEach((b: any) => {
                    if (b.flocks) allFlocks = [...allFlocks, ...b.flocks];
                });
                setFlocks(allFlocks);

                // 3. Charger les référentiels pour le formulaire
                const specRes = await fetch(`${API_URL}/speculations`, { headers });
                setSpeculations(await specRes.json());

                const stdRes = await fetch(`${API_URL}/standards`, { headers });
                setStandards(await stdRes.json());

            } catch (e) {
                console.error("Erreur chargement", e);
            } finally {
                setLoadingData(false);
            }
        };

        fetchData();
    }, [selectedCustomerOption]);

    // --- HELPER : DÉTECTION D'ALERTE ---
    const getFlockAlertStatus = (flock: Flock): string | null => {
        if (!flock.observations || flock.observations.length === 0) return null;
        
        // Trouver la dernière observation en date
        // On trie par date décroissante pour être sûr d'avoir la plus récente
        const sortedObs = [...flock.observations].sort((a, b) => 
            new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime()
        );
        const lastObs = sortedObs[0];

        // Si la dernière observation contient des problèmes non vides
        if (lastObs.problems && lastObs.problems.trim().length > 0) {
            return lastObs.problems;
        }
        return null;
    };

    // --- LOGIQUE DE TRI ET FILTRE ---
    const processedFlocks = flocks
        .filter(flock => {
            if (flock.activated === false) return false;

            // Filtre ALERTE
            if (showOnlyAlerts) {
                const hasAlert = getFlockAlertStatus(flock) !== null;
                // Si on veut voir que les alertes, on exclut celles qui vont bien OU qui sont fermées
                if (!hasAlert || flock.closed) return false;
            }

            const matchesName = flock.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesDate = filterDate ? flock.startDate.startsWith(filterDate) : true;

            return matchesName && matchesDate;
        })
        .sort((a, b) => {
            // Tri Intelligent : 
            // 1. Alertes actives en premier
            // 2. Bandes ouvertes ensuite
            // 3. Bandes fermées à la fin
            // 4. Tri par date d'installation

            const alertA = !a.closed && getFlockAlertStatus(a) !== null;
            const alertB = !b.closed && getFlockAlertStatus(b) !== null;
            
            if (alertA !== alertB) return alertA ? -1 : 1; // Alertes en haut
            if (a.closed !== b.closed) return a.closed ? 1 : -1; // Ouvertes avant Fermées
            
            return new Date(b.startDate).getTime() - new Date(a.startDate).getTime(); // Plus récentes en premier
        });

    // --- ACTIONS (Clôture, Delete...) ---
    
    const handleCloseFlock = async (flock: Flock) => {
        if (!confirm("Voulez-vous vraiment clôturer cette bande ?")) return;
        const token = localStorage.getItem('sav_token');
        try {
            await fetch(`${API_URL}/flocks/${flock.id}/close`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Recharger simple : on cache la bande localement
            setFlocks(prev => prev.map(f => f.id === flock.id ? { ...f, closed: true } : f));
        } catch (e) { alert("Erreur clôture"); }
    };

    const handleReopenFlock = async (flock: Flock) => {
        if (!confirm("Réouvrir cette bande ?")) return;
        const token = localStorage.getItem('sav_token');
        try {
            // On fait un PATCH manuel pour remettre closed=false
            await fetch(`${API_URL}/flocks/${flock.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/merge-patch+json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ closed: false })
            });
            setFlocks(prev => prev.map(f => f.id === flock.id ? { ...f, closed: false } : f));
        } catch (e) { alert("Erreur réouverture"); }
    };

    const handleDelete = async (flock: Flock) => {
        if (!confirm("SUPPRIMER DÉFINITIVEMENT ?")) return;
        const token = localStorage.getItem('sav_token');
        try {
            await fetch(`${API_URL}/flocks/${flock.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setFlocks(prev => prev.filter(f => f.id !== flock.id));
        } catch (e) { alert("Erreur suppression"); }
    };

    // Gestion Formulaire (Simplifiée pour l'affichage)
    const handleEdit = (flock: Flock) => {
        setEditingFlockId(flock.id);
        setFormData({
            speculation: flock.speculation['@id'] || '',
            standard: flock.standard ? flock.standard['@id'] : '',
            building: flock.building ? flock.building['@id'] : '',
            startDate: flock.startDate.split('T')[0],
            subjectCount: flock.subjectCount.toString()
        });
        setShowForm(true);
    };

    const isAdmin = userRoles.includes('ROLE_ADMIN') || userRoles.includes('ROLE_SUPER_ADMIN');
    const isSuperAdmin = userRoles.includes('ROLE_SUPER_ADMIN');

    // --- RENDER ---
    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans">
            {/* Header */}
            <div className="bg-white shadow px-6 py-6 mb-6">
                <h1 className="text-xl font-extrabold text-gray-800">Gestion des Bandes</h1>
                <p className="text-xs text-gray-400 mt-1">Suivi des cycles de production</p>
            </div>

            <div className="max-w-5xl mx-auto px-4">
                
                {/* Sélecteur Client */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Sélectionner un client</label>
                    <Select 
                        options={customerOptions} 
                        onChange={setSelectedCustomerOption} 
                        isLoading={customersLoading}
                        placeholder="Rechercher un client..."
                        className="text-sm"
                    />
                </div>

                {selectedCustomerOption && !loadingData && (
                    <div className="space-y-6 animate-fade-in">
                        
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-700">Production en cours</h2>
                            <button onClick={() => { setShowForm(!showForm); setEditingFlockId(null); setFormData({ speculation: '', standard: '', building: '', startDate: '', subjectCount: '' }); }} 
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-indigo-700 text-sm">
                                {showForm ? 'Fermer' : '+ Nouvelle Bande'}
                            </button>
                        </div>

                        {/* --- FORMULAIRE D'AJOUT (Masqué pour lisibilité, à insérer ici si besoin) --- */}
                        {showForm && (
                           <div className="bg-gray-100 p-4 rounded border text-center text-gray-500 mb-4">
                               {/* Intégrez ici votre composant de formulaire NewFlockForm si vous l'avez extrait */}
                               (Formulaire de création/édition)
                           </div>
                        )}

                        {/* --- BARRE DE FILTRES --- */}
                        <div className="flex flex-col md:flex-row gap-4 bg-gray-100 p-3 rounded-lg border border-gray-200 items-end">
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-bold text-gray-500 mb-1">🔍 Rechercher par Nom</label>
                                <input 
                                    type="text" 
                                    placeholder="Ex: Lot 12..." 
                                    className="w-full border p-2 rounded text-sm bg-white" 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="w-full md:w-48">
                                <label className="block text-xs font-bold text-gray-500 mb-1">📅 Date d'installation</label>
                                <input 
                                    type="date" 
                                    className="w-full border p-2 rounded text-sm bg-white"
                                    value={filterDate}
                                    onChange={(e) => setFilterDate(e.target.value)}
                                />
                            </div>
                            
                            {/* BOUTON FILTRE ALERTES */}
                            <div>
                                <button 
                                    onClick={() => setShowOnlyAlerts(!showOnlyAlerts)}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold border transition flex items-center gap-2 ${showOnlyAlerts ? 'bg-red-600 text-white border-red-700 shadow-inner' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                                >
                                    <span>{showOnlyAlerts ? '🔴' : '⚠️'}</span>
                                    <span>Alertes Critiques</span>
                                </button>
                            </div>
                        </div>

                        {/* --- LISTE DES BANDES --- */}
                        <div className="grid gap-4">
                            {processedFlocks.length === 0 && (
                                <p className="text-center text-gray-500 py-8">Aucune bande ne correspond à votre recherche.</p>
                            )}
                            
                            {processedFlocks.map(flock => {
                                const alertProblem = getFlockAlertStatus(flock);
                                const isAlert = !!alertProblem && !flock.closed;

                                return (
                                    <div key={flock.id} className={`bg-white p-5 rounded-xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all
                                        ${flock.closed ? 'border-gray-300 bg-gray-50 opacity-75' : 
                                          isAlert ? 'border-red-400 bg-red-50 border-l-4 border-l-red-600 shadow-red-100' : 
                                          'border-green-200 border-l-4 border-l-green-500'}
                                    `}>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <h3 className="font-bold text-md text-gray-800">{flock.name}</h3>
                                                
                                                {/* BADGES D'ÉTAT */}
                                                {flock.closed ? (
                                                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full font-bold">CLÔTURÉE</span>
                                                ) : isAlert ? (
                                                    <span className="text-xs bg-red-600 text-white px-2 py-1 rounded-full font-bold animate-pulse">🚨 ALERTE SANITAIRE</span>
                                                ) : (
                                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">RAS</span>
                                                )}
                                                
                                                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                                                    {typeof flock.speculation === 'object' ? flock.speculation.name : 'Spéculation'}
                                                </span>
                                            </div>

                                            <p className="text-sm text-gray-500">Installée le {new Date(flock.startDate).toLocaleDateString()} • {flock.subjectCount} sujets</p>
                                            <p className="text-sm font-medium text-gray-600 mt-1">📍 {flock.building ? flock.building.name : 'Aucun bâtiment'}</p>
                                            
                                            {/* AFFICHAGE DU PROBLÈME */}
                                            {isAlert && (
                                                <div className="mt-2 text-xs font-bold text-red-700 bg-white/50 p-2 rounded border border-red-200 flex items-start gap-2">
                                                    <span>⚠️</span>
                                                    <span>Dernier problème : "{alertProblem?.substring(0, 80)}{alertProblem && alertProblem.length > 80 ? '...' : ''}"</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-2">
                                            {!flock.closed && (
                                                <button onClick={() => handleCloseFlock(flock)} className="text-orange-600 hover:text-orange-800 px-3 py-1 bg-orange-50 rounded text-sm font-bold border border-orange-200">🏁 Clôturer</button>
                                            )}
                                            {flock.closed && isSuperAdmin && (
                                                <button onClick={() => handleReopenFlock(flock)} className="text-green-600 hover:text-green-800 px-3 py-1 bg-green-50 rounded text-sm font-bold border border-green-200">🔄 Réouvrir</button>
                                            )}
                                            <button onClick={() => handleEdit(flock)} className="text-blue-500 hover:text-blue-700 p-2 bg-blue-50 rounded hover:bg-blue-100 transition">✏️</button>
                                            {isAdmin && (
                                                <button onClick={() => handleDelete(flock)} className="text-red-500 hover:text-red-700 p-2 bg-red-50 rounded hover:bg-red-100 transition">🗑️</button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}