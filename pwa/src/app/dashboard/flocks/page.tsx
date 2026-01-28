'use client';

import { useState } from 'react';
import Select from 'react-select'; 
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCustomers, CustomerOption } from '@/hooks/useCustomers';
import { useSync } from '@/providers/SyncProvider';

// --- TYPES ---

interface Speculation { '@id': string; name: string; }
interface Standard { '@id': string; name: string; speculation: string | Speculation } 

interface Building { 
    '@id': string; 
    id: number; 
    name: string; 
    activated: boolean; 
    flocks: Flock[]; 
}

// On précise le type Observation pour l'intellisense
interface FlockObservation {
    id: number;
    observedAt: string;
    problems?: string;
}

interface Flock { 
    '@id': string;
    id: number; 
    name: string; 
    startDate: string; 
    subjectCount: number; 
    building?: Building; 
    speculation: Speculation;
    standard?: Standard;
    observations: FlockObservation[]; 
    closed: boolean;
    activated: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Petit helper pour les fetchs authentifiés
async function fetchWithAuth(url: string) {
    const token = localStorage.getItem('sav_token');
    if (!token) throw new Error("Non authentifié");
    
    const res = await fetch(`${API_URL}${url}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/ld+json' }
    });
    
    if (!res.ok) throw new Error(`Erreur ${res.status}`);
    const data = await res.json();
    return data['hydra:member'] || data;
}

export default function FlocksPage() {
    const queryClient = useQueryClient();
    const { addToQueue } = useSync(); // ✅ Gestion Offline des actions
    const { options: customerOptions, loading: customersLoading } = useCustomers();
    
    const [selectedCustomerOption, setSelectedCustomerOption] = useState<CustomerOption | null>(null);

    // --- 1. REQUÊTES AVEC CACHE (Lecture Offline) ---

    // A. Récupérer les lots du client sélectionné
    const { data: flocks = [], isLoading: flocksLoading, isError: flocksError } = useQuery<Flock[]>({
        queryKey: ['flocks', selectedCustomerOption?.value],
        queryFn: () => fetchWithAuth(`/flocks?customer=${selectedCustomerOption?.value}&order[startDate]=DESC`),
        enabled: !!selectedCustomerOption?.value, // Ne se lance que si un client est choisi
        staleTime: 1000 * 60 * 5, // Cache frais 5 min
    });

    // B. Récupérer les dépendances (Bâtiments, Spéculations, Standards) en parallèle
    // Ces données seront mises en cache et disponibles offline pour le formulaire
    const { data: buildings = [] } = useQuery<Building[]>({
        queryKey: ['buildings', selectedCustomerOption?.value],
        queryFn: () => fetchWithAuth(`/buildings?customer=${selectedCustomerOption?.value}`),
        enabled: !!selectedCustomerOption?.value
    });

    const { data: speculations = [] } = useQuery<Speculation[]>({
        queryKey: ['speculations'],
        queryFn: () => fetchWithAuth(`/speculations`),
        staleTime: 1000 * 60 * 60 * 24 // Cache très long (ça change peu)
    });

    const { data: standards = [] } = useQuery<Standard[]>({
        queryKey: ['standards'],
        queryFn: () => fetchWithAuth(`/standards`),
        staleTime: 1000 * 60 * 60 * 24
    });

    // --- ÉTATS DU FORMULAIRE ---
    const [isFormVisible, setFormVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingFlock, setEditingFlock] = useState<Flock | null>(null);

    // Champs formulaire
    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [subjectCount, setSubjectCount] = useState<number>(0);
    const [selectedBuilding, setSelectedBuilding] = useState<string>('');
    const [selectedSpeculation, setSelectedSpeculation] = useState<string>('');
    const [selectedStandard, setSelectedStandard] = useState<string>('');

    // --- HANDLERS (Modifiés pour Offline) ---

    const resetForm = () => {
        setEditingFlock(null);
        setName('');
        setStartDate(new Date().toISOString().split('T')[0]);
        setSubjectCount(0);
        setSelectedBuilding('');
        setSelectedSpeculation('');
        setSelectedStandard('');
        setFormVisible(false);
        setIsSubmitting(false);
    };

    const handleCreate = () => {
        resetForm();
        setFormVisible(true);
    };

    const handleEdit = (flock: Flock) => {
        setEditingFlock(flock);
        setName(flock.name);
        setStartDate(flock.startDate ? new Date(flock.startDate).toISOString().split('T')[0] : '');
        setSubjectCount(flock.subjectCount);
        setSelectedBuilding(flock.building ? flock.building['@id'] : '');
        setSelectedSpeculation(typeof flock.speculation === 'string' ? flock.speculation : flock.speculation['@id']);
        setSelectedStandard(flock.standard ? (typeof flock.standard === 'string' ? flock.standard : flock.standard['@id']) : '');
        setFormVisible(true);
    };

    // ✅ Gestionnaire de soumission unifié (Online + Offline)
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomerOption) return;
        setIsSubmitting(true);

        const payload = {
            name,
            startDate,
            subjectCount: Number(subjectCount),
            customer: selectedCustomerOption.value,
            building: selectedBuilding || null,
            speculation: selectedSpeculation,
            standard: selectedStandard || null,
            activated: true
        };

        const url = editingFlock ? `/flocks/${editingFlock.id}` : '/flocks';
        const method = editingFlock ? 'PUT' : 'POST';

        // 1. CAS OFFLINE
        if (!navigator.onLine) {
            addToQueue({
                url: url, // Attention: pour l'édition, l'URL doit être complète ou relative gérée par SyncProvider
                method: method as any, // 'POST' | 'PUT'
                body: payload
            });
            resetForm();
            return;
        }

        // 2. CAS ONLINE
        try {
            const token = localStorage.getItem('sav_token');
            const res = await fetch(`${API_URL}${url}`, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Erreur API');

            // Rafraîchir la liste via React Query
            queryClient.invalidateQueries({ queryKey: ['flocks', selectedCustomerOption.value] });
            resetForm();

        } catch (error) {
            console.error(error);
            // Fallback en cas d'erreur réseau inattendue
            if (window.confirm("Erreur réseau. Sauvegarder en mode hors ligne ?")) {
                addToQueue({ url, method: method as any, body: payload });
                resetForm();
            } else {
                alert("Une erreur est survenue.");
                setIsSubmitting(false);
            }
        }
    };

    // ✅ Actions rapides (Delete / Close / Reopen) avec support Offline
    const handleAction = async (action: 'DELETE' | 'CLOSE' | 'REOPEN', flock: Flock) => {
        let url = `/flocks/${flock.id}`;
        let method = 'DELETE';
        let body = {};

        if (action === 'CLOSE') {
            url = `/close_flock/${flock.id}`; // Endpoint custom ou PATCH
            method = 'POST'; // Selon votre contrôleur Symfony
        } else if (action === 'REOPEN') {
            // Logique de réouverture (ex: PATCH closed=false)
            url = `/flocks/${flock.id}`;
            method = 'PATCH';
            body = { closed: false };
        }

        if (!confirm("Êtes-vous sûr ?")) return;

        // Offline
        if (!navigator.onLine) {
            addToQueue({ url, method: method as any, body });
            // Optimistic UI update (optionnel) ou juste feedback
            alert("Action enregistrée hors-ligne !");
            return;
        }

        // Online
        try {
            const token = localStorage.getItem('sav_token');
            const res = await fetch(`${API_URL}${url}`, {
                method,
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json' // Nécessaire pour PATCH
                },
                body: method !== 'DELETE' ? JSON.stringify(body) : undefined
            });
            
            if (!res.ok) throw new Error("Erreur");
            queryClient.invalidateQueries({ queryKey: ['flocks', selectedCustomerOption?.value] });
        } catch (e) {
            addToQueue({ url, method: method as any, body });
            alert("Erreur réseau : Action mise en file d'attente.");
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Gestion des Lots</h1>
                {/* On cache le bouton Créer si aucun client n'est sélectionné */}
                {selectedCustomerOption && !isFormVisible && (
                    <button onClick={handleCreate} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-indigo-700 transition flex items-center gap-2">
                        <span>+</span> Nouveau Lot
                    </button>
                )}
            </div>

            {/* SÉLECTEUR CLIENT */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-2">Sélectionner un client</label>
                <Select
                    instanceId="customer-select-flocks"
                    options={customerOptions}
                    value={selectedCustomerOption}
                    onChange={setSelectedCustomerOption}
                    placeholder="Rechercher un client..."
                    isLoading={customersLoading}
                />
            </div>

            {/* FORMULAIRE (Modal ou Inline) */}
            {isFormVisible && (
                <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-indigo-600 animate-in slide-in-from-top-4">
                    <h2 className="text-lg font-bold mb-4">{editingFlock ? 'Modifier le lot' : 'Nouveau lot'}</h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        <div className="col-span-2">
                            <label className="block text-sm font-bold text-gray-700">Nom du lot</label>
                            <input type="text" required className="w-full border p-2 rounded" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Lot B3 - Janvier" />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700">Date de mise en place</label>
                            <input type="date" required className="w-full border p-2 rounded" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700">Effectif de départ</label>
                            <input type="number" required className="w-full border p-2 rounded" value={subjectCount} onChange={e => setSubjectCount(Number(e.target.value))} />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700">Spéculation</label>
                            <select className="w-full border p-2 rounded" value={selectedSpeculation} onChange={e => setSelectedSpeculation(e.target.value)} required>
                                <option value="">-- Choisir --</option>
                                {speculations.map(s => <option key={s['@id']} value={s['@id']}>{s.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700">Souche (Standard)</label>
                            <select className="w-full border p-2 rounded" value={selectedStandard} onChange={e => setSelectedStandard(e.target.value)}>
                                <option value="">-- Aucun --</option>
                                {standards
                                    .filter(s => !selectedSpeculation || (typeof s.speculation === 'object' ? s.speculation['@id'] === selectedSpeculation : s.speculation === selectedSpeculation))
                                    .map(s => <option key={s['@id']} value={s['@id']}>{s.name}</option>)
                                }
                            </select>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-bold text-gray-700">Bâtiment (Optionnel)</label>
                            <select className="w-full border p-2 rounded" value={selectedBuilding} onChange={e => setSelectedBuilding(e.target.value)}>
                                <option value="">-- Aucun --</option>
                                {buildings.map(b => <option key={b['@id']} value={b['@id']}>{b.name}</option>)}
                            </select>
                        </div>

                        <div className="col-span-2 flex justify-end gap-3 mt-4">
                            <button type="button" onClick={resetForm} className="px-4 py-2 text-gray-500 font-bold">Annuler</button>
                            <button type="submit" disabled={isSubmitting} className="bg-indigo-600 text-white px-6 py-2 rounded font-bold hover:bg-indigo-700 disabled:opacity-50">
                                {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* LISTE DES LOTS */}
            <div>
                {!selectedCustomerOption ? (
                    <div className="text-center py-10 text-gray-500">
                        <p>Veuillez sélectionner un client pour voir ses lots.</p>
                    </div>
                ) : flocksLoading ? (
                    <div className="text-center py-10 text-indigo-600">Chargement des lots...</div>
                ) : flocksError ? (
                    <div className="bg-red-50 text-red-600 p-4 rounded">Erreur lors du chargement des lots (Vérifiez votre connexion si c'est la première fois).</div>
                ) : flocks.length === 0 ? (
                    <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <p className="text-gray-500">Aucun lot trouvé pour ce client.</p>
                        <button onClick={handleCreate} className="mt-2 text-indigo-600 font-bold hover:underline">Créer le premier lot</button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {flocks.map((flock) => (
                            <div key={flock.id} className={`bg-white p-5 rounded-xl shadow-sm border-l-4 ${flock.closed ? 'border-gray-400 opacity-75' : 'border-green-500'} flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
                                
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-lg font-bold text-gray-900">{flock.name}</h3>
                                        {flock.closed && <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full font-bold">CLÔTURÉ</span>}
                                        {!flock.closed && <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">ACTIF</span>}
                                    </div>
                                    
                                    <div className="text-sm text-gray-600 space-y-1">
                                        <p>📅 Début : {new Date(flock.startDate).toLocaleDateString()}</p>
                                        <p>🐔 Effectif : <strong>{flock.subjectCount}</strong> sujets</p>
                                        <p>🏷️ {flock.speculation?.name} {flock.standard ? `(${flock.standard.name})` : ''}</p>
                                        {flock.building && <p>🏠 {flock.building.name}</p>}
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                                    {!flock.closed && (
                                        <button 
                                            onClick={() => handleAction('CLOSE', flock)} 
                                            className="bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1.5 rounded text-sm font-bold hover:bg-orange-100"
                                        >
                                            🏁 Clôturer
                                        </button>
                                    )}
                                    {flock.closed && (
                                        <button 
                                            onClick={() => handleAction('REOPEN', flock)}
                                            className="bg-gray-100 text-gray-700 border border-gray-300 px-3 py-1.5 rounded text-sm font-bold hover:bg-gray-200"
                                        >
                                            🔓 Réouvrir
                                        </button>
                                    )}
                                    <button onClick={() => handleEdit(flock)} className="bg-blue-50 text-blue-600 border border-blue-200 p-1.5 rounded hover:bg-blue-100" title="Modifier">
                                        ✏️
                                    </button>
                                    <button onClick={() => handleAction('DELETE', flock)} className="bg-red-50 text-red-600 border border-red-200 p-1.5 rounded hover:bg-red-100" title="Supprimer">
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}