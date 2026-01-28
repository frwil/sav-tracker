'use client';

import { useState, useEffect } from 'react';
import Select from 'react-select';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCustomers, CustomerOption } from '@/hooks/useCustomers';
import { useSync } from '@/providers/SyncProvider';

// --- TYPES ---

interface Building {
    '@id': string;
    id: number;
    name: string;
    surface: number;
    maxCapacity?: number;
    activated: boolean;
    flocks: any[]; // On garde simple ici, juste pour vérifier s'il est vide
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Fonction de fetch isolée
async function fetchBuildings(customerId: string) {
    const token = localStorage.getItem('sav_token');
    if (!token) throw new Error("Non authentifié");

    const res = await fetch(`${API_URL}/buildings?customer=${customerId}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/ld+json' }
    });

    if (!res.ok) throw new Error(`Erreur ${res.status}`);
    const data = await res.json();
    return data['hydra:member'] || [];
}

export default function BuildingsPage() {
    const queryClient = useQueryClient();
    const { addToQueue } = useSync(); // ✅ Gestion Offline

    // --- 1. SÉLECTION CLIENT ---
    const { options: customerOptions, loading: customersLoading } = useCustomers();
    const [selectedCustomerOption, setSelectedCustomerOption] = useState<CustomerOption | null>(null);

    // --- 2. CHARGEMENT DONNÉES (CACHE) ---
    const { data: buildings = [], isLoading: buildingsLoading, isError: buildingsError } = useQuery<Building[]>({
        queryKey: ['buildings', selectedCustomerOption?.value],
        queryFn: () => fetchBuildings(selectedCustomerOption!.value),
        enabled: !!selectedCustomerOption, // Ne charge que si un client est choisi
        staleTime: 1000 * 60 * 10, // Cache de 10 minutes
    });

    // --- 3. ÉTATS UI & FORMULAIRE ---
    const [isAdmin, setIsAdmin] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Champs Formulaire
    const [editingId, setEditingId] = useState<number | null>(null);
    const [name, setName] = useState(''); // Nom manuel (ex: "Bâtiment A")
    const [surface, setSurface] = useState('');
    const [capacity, setCapacity] = useState('');

    // --- 4. PERMISSIONS ---
    useEffect(() => {
        const token = localStorage.getItem('sav_token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const roles = payload.roles || [];
                setIsAdmin(roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SUPER_ADMIN'));
            } catch (e) { console.error(e); }
        }
    }, []);

    // --- 5. LOGIQUE DE FILTRAGE LOCAL ---
    const filteredBuildings = buildings.filter(b => 
        b.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // --- 6. HANDLERS (ONLINE + OFFLINE) ---

    const resetForm = () => {
        setEditingId(null);
        setName('');
        setSurface('');
        setCapacity('');
        setShowForm(false);
        setIsSubmitting(false);
    };

    const handleCreate = () => {
        resetForm();
        // Nom par défaut intelligent (ex: Bâtiment 1, 2...)
        const nextNum = buildings.length + 1;
        setName(`Bâtiment ${nextNum}`);
        setShowForm(true);
    };

    const handleEdit = (building: Building) => {
        setEditingId(building.id);
        setName(building.name);
        setSurface(building.surface.toString());
        setCapacity(building.maxCapacity ? building.maxCapacity.toString() : '');
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomerOption) return;
        setIsSubmitting(true);

        const payload = {
            name,
            surface: parseFloat(surface),
            maxCapacity: capacity ? parseInt(capacity) : null,
            customer: selectedCustomerOption.value,
            activated: true
        };

        const url = editingId ? `/buildings/${editingId}` : '/buildings';
        const method = editingId ? 'PUT' : 'POST';

        // 1. CAS OFFLINE
        if (!navigator.onLine) {
            addToQueue({ url, method: method as any, body: payload });
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

            if (!res.ok) throw new Error("Erreur API");

            queryClient.invalidateQueries({ queryKey: ['buildings', selectedCustomerOption.value] });
            resetForm();

        } catch (error) {
            console.error(error);
            if (confirm("Erreur réseau. Sauvegarder hors ligne ?")) {
                addToQueue({ url, method: method as any, body: payload });
                resetForm();
            } else {
                setIsSubmitting(false);
            }
        }
    };

    const handleToggleStatus = async (building: Building) => {
        const newStatus = !building.activated;
        const url = `/buildings/${building.id}`;
        
        // Offline
        if (!navigator.onLine) {
            addToQueue({ url, method: 'PATCH', body: { activated: newStatus } });
            alert("Action mise en file d'attente.");
            return;
        }

        // Online
        try {
            const token = localStorage.getItem('sav_token');
            await fetch(`${API_URL}${url}`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/merge-patch+json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ activated: newStatus })
            });
            queryClient.invalidateQueries({ queryKey: ['buildings', selectedCustomerOption?.value] });
        } catch (e) {
            addToQueue({ url, method: 'PATCH', body: { activated: newStatus } });
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Supprimer ce bâtiment ?")) return;
        const url = `/buildings/${id}`;

        if (!navigator.onLine) {
            addToQueue({ url, method: 'DELETE', body: {} });
            alert("Suppression locale effectuée.");
            return;
        }

        try {
            const token = localStorage.getItem('sav_token');
            await fetch(`${API_URL}${url}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            queryClient.invalidateQueries({ queryKey: ['buildings', selectedCustomerOption?.value] });
        } catch (e) {
            addToQueue({ url, method: 'DELETE', body: {} });
        }
    };

    // --- RENDU ---

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <h1 className="text-2xl font-bold text-gray-900">Gestion des Bâtiments</h1>

            {/* SÉLECTEUR CLIENT */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
                <Select
                    instanceId="customer-select-buildings"
                    options={customerOptions}
                    value={selectedCustomerOption}
                    onChange={(val) => {
                        setSelectedCustomerOption(val);
                        setSearchTerm('');
                        setShowForm(false);
                    }}
                    placeholder="Sélectionner un client..."
                    isLoading={customersLoading}
                />
            </div>

            {selectedCustomerOption && (
                <>
                    {/* BARRE D'ACTIONS */}
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <input 
                            type="text" 
                            placeholder="Rechercher un bâtiment..." 
                            className="border p-2 rounded-lg flex-1"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        {!showForm && (
                            <button 
                                onClick={handleCreate}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-indigo-700 whitespace-nowrap"
                            >
                                + Ajouter Bâtiment
                            </button>
                        )}
                    </div>

                    {/* FORMULAIRE */}
                    {showForm && (
                        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-indigo-600 animate-in slide-in-from-top-4">
                            <h2 className="text-lg font-bold mb-4">{editingId ? 'Modifier' : 'Nouveau Bâtiment'}</h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700">Nom du bâtiment</label>
                                    <input required type="text" className="w-full border p-2 rounded" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Bâtiment A" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700">Surface (m²)</label>
                                        <input required type="number" step="0.1" className="w-full border p-2 rounded" value={surface} onChange={e => setSurface(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700">Capacité Max (sujets)</label>
                                        <input type="number" className="w-full border p-2 rounded" value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="Optionnel" />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button type="button" onClick={resetForm} className="px-4 py-2 text-gray-500 font-bold">Annuler</button>
                                    <button type="submit" disabled={isSubmitting} className="bg-indigo-600 text-white px-6 py-2 rounded font-bold hover:bg-indigo-700 disabled:opacity-50">
                                        {isSubmitting ? '...' : 'Enregistrer'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* LISTE */}
                    <div>
                        {buildingsLoading ? (
                            <div className="text-center py-10 text-indigo-600">Chargement...</div>
                        ) : buildingsError ? (
                            <div className="bg-red-50 p-4 rounded text-red-600">Erreur de chargement.</div>
                        ) : filteredBuildings.length === 0 ? (
                            <div className="text-center py-10 bg-gray-50 rounded border border-dashed text-gray-500">
                                Aucun bâtiment trouvé.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredBuildings.map(building => (
                                    <div key={building.id} className={`bg-white p-5 rounded-xl shadow-sm border-l-4 ${building.activated ? 'border-indigo-500' : 'border-gray-300 opacity-75'} flex justify-between items-center`}>
                                        
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900">{building.name}</h3>
                                            <p className="text-sm text-gray-600">📐 {building.surface} m² {building.maxCapacity && <span>| 🐔 Max: {building.maxCapacity}</span>}</p>
                                            {!building.activated && <span className="text-xs bg-gray-200 px-2 py-0.5 rounded text-gray-600">Archivé</span>}
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            {isAdmin && (
                                                <button 
                                                    onClick={() => handleToggleStatus(building)}
                                                    className={`text-xs font-bold px-3 py-1 rounded ${building.activated ? 'text-orange-600 bg-orange-50' : 'text-green-600 bg-green-50'}`}
                                                >
                                                    {building.activated ? 'Archiver' : 'Activer'}
                                                </button>
                                            )}
                                            
                                            <button onClick={() => handleEdit(building)} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded">
                                                Modifier
                                            </button>

                                            {(!building.flocks || building.flocks.length === 0) ? (
                                                <button onClick={() => handleDelete(building.id)} className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded">
                                                    Supprimer
                                                </button>
                                            ) : (
                                                <span className="text-xs text-gray-400 text-center cursor-help" title="Contient des lots">🔒</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}