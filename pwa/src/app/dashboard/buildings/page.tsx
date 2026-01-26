'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Select from 'react-select';
import { useCustomers, CustomerOption } from '@/hooks/useCustomers';

interface Building {
    '@id': string;
    id: number;
    name: string;
    surface: number;
    maxCapacity?: number;
    activated: boolean;
    flocks: any[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api';

export default function BuildingsPage() {
    const {
        options: customerOptions,
        loading: customersLoading
    } = useCustomers();

    const [selectedCustomerOption, setSelectedCustomerOption] = useState<CustomerOption | null>(null);

    const [buildings, setBuildings] = useState<Building[]>([]);
    const [loading, setLoading] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [showForm, setShowForm] = useState(false);

    // États pour le formulaire (Création & Édition)
    const [editingId, setEditingId] = useState<number | null>(null);
    const [surface, setSurface] = useState('');
    const [capacity, setCapacity] = useState('');
    
    // NOUVEAU : État pour le filtre de recherche
    const [searchTerm, setSearchTerm] = useState('');

    // Vérification des rôles (Admin / Super Admin)
    useEffect(() => {
        const token = localStorage.getItem('sav_token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setIsAdmin(payload.roles.includes('ROLE_ADMIN') || payload.roles.includes('ROLE_SUPER_ADMIN'));
            } catch (e) {
                console.error("Erreur token", e);
            }
        }
    }, []);

    // Chargement des bâtiments
    useEffect(() => {
        if (!selectedCustomerOption) {
            setBuildings([]);
            return;
        }

        setLoading(true);
        const token = localStorage.getItem('sav_token');
        const customerId = selectedCustomerOption.value.split('/').pop();

        fetch(`${API_URL}/buildings?customer=${customerId}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/ld+json' }
        })
            .then(res => res.json())
            .then(data => {
                const list = data['hydra:member'] || data['member'] || (Array.isArray(data) ? data : []);
                setBuildings(list);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setBuildings([]);
                setLoading(false);
            });
    }, [selectedCustomerOption]);

    // NOUVEAU : Logique de filtrage
    const filteredBuildings = buildings.filter(building => 
        building.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Initialiser l'édition
    const handleEdit = (building: Building) => {
        setEditingId(building.id);
        setSurface(building.surface ? building.surface.toString() : '100');
        setCapacity(building.maxCapacity ? building.maxCapacity.toString() : '100');
        setShowForm(true);
    };

    // Soumission du formulaire
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomerOption) return;

        const token = localStorage.getItem('sav_token');

        try {
            if (editingId) {
                // PATCH pour modification
                await fetch(`${API_URL}/buildings/${editingId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/merge-patch+json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        surface: parseFloat(surface),
                        maxCapacity: capacity ? parseInt(capacity) : null,
                    })
                });
                alert('Modification enregistrée');

            } else {
                // POST pour création
                const autoName = `Bâtiment ${buildings.length + 1}`;

                await fetch(`${API_URL}/buildings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        name: autoName,
                        surface: parseFloat(surface),
                        maxCapacity: capacity ? parseInt(capacity) : null,
                        customer: selectedCustomerOption.value,
                        activated: true
                    })
                });
                alert('Nouveau bâtiment créé');
            }

            setShowForm(false);
            setEditingId(null);
            setSurface('');
            setCapacity('');
            
            // Rechargement simple
            window.location.reload();

        } catch (err) { alert("Erreur lors de l'enregistrement"); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Supprimer définitivement ce bâtiment ?")) return;
        const token = localStorage.getItem('sav_token');

        const res = await fetch(`${API_URL}/buildings/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            setBuildings(prev => prev.filter(b => b.id !== id));
        } else {
            alert("Impossible de supprimer (Probablement lié à des données). Essayez d'archiver.");
        }
    };

    const handleArchive = async (id: number, currentStatus: boolean) => {
        const token = localStorage.getItem('sav_token');
        const res = await fetch(`${API_URL}/buildings/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/merge-patch+json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ activated: !currentStatus })
        });

        if (res.ok) {
            setBuildings(prev => prev.map(b =>
                b.id === id ? { ...b, activated: !currentStatus } : b
            ));
        }
    };

    const toggleForm = () => {
        if (showForm) {
            setShowForm(false);
            setEditingId(null);
            setSurface('');
            setCapacity('');
        } else {
            setShowForm(true);
            setEditingId(null);
            setSurface('');
            setCapacity('');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans">
            <div className="bg-white shadow px-6 py-4 mb-6">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <div>
                        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-indigo-600">← Retour</Link>
                        <h1 className="text-2xl font-extrabold text-gray-800">Gestion des Bâtiments</h1>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4">

                {/* SELECTEUR CLIENT */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6">
                    <label className="block text-sm font-bold text-gray-700 mb-2">📂 Sélectionner un Client</label>
                    <Select
                        instanceId="customer-select-buildings"
                        options={customerOptions}
                        value={selectedCustomerOption}
                        onChange={setSelectedCustomerOption}
                        isLoading={customersLoading}
                        placeholder="Rechercher un client..."
                        isClearable
                        className="text-sm"
                        styles={{
                            control: (base) => ({
                                ...base,
                                borderColor: '#D1D5DB',
                                borderRadius: '0.5rem',
                                padding: '2px'
                            })
                        }}
                    />
                </div>

                {loading && <div className="text-center py-4 text-gray-500">Chargement des bâtiments...</div>}

                {selectedCustomerOption && !loading && (
                    <div className="space-y-6 animate-fade-in">
                        {/* HEADER ACTIONS */}
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-700">Parc Immobilier : {selectedCustomerOption.label}</h2>
                            <button onClick={toggleForm} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-indigo-700">
                                {showForm ? 'Fermer' : '+ Nouveau Bâtiment'}
                            </button>
                        </div>

                        {/* FORMULAIRE (AJOUT / MODIFICATION) */}
                        {showForm && (
                            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md border border-indigo-100 animate-slide-down">
                                <h3 className="text-lg font-bold mb-4 text-gray-800">
                                    {editingId ? 'Modifier le bâtiment' : 'Nouveau Bâtiment (Nom auto)'}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700">Surface (m²)</label>
                                        <input
                                            type="number"
                                            required
                                            step="0.1"
                                            className="w-full border p-2 rounded"
                                            value={surface}
                                            onChange={e => setSurface(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700">Capacité (Sujets)</label>
                                        <input
                                            type="number"
                                            className="w-full border p-2 rounded"
                                            value={capacity}
                                            onChange={e => setCapacity(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700">
                                    {editingId ? 'Mettre à jour' : 'Enregistrer'}
                                </button>
                            </form>
                        )}

                        {/* NOUVEAU : BARRE DE RECHERCHE */}
                        <div className="bg-gray-100 p-3 rounded-lg border border-gray-200">
                            <label className="block text-xs font-bold text-gray-500 mb-1">🔍 Rechercher par Nom</label>
                            <input 
                                type="text" 
                                placeholder="Ex: Bâtiment 1..." 
                                className="w-full border p-2 rounded text-sm bg-white" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* LISTE DES BÂTIMENTS (UTILISATION DU TABLEAU FILTRÉ) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredBuildings.length === 0 && <p className="text-gray-500 italic col-span-2 text-center py-4">Aucun bâtiment ne correspond à votre recherche.</p>}

                            {filteredBuildings.map(building => (
                                <div key={building.id} className={`bg-white p-5 rounded-xl border ${building.activated ? 'border-gray-200' : 'border-gray-200 bg-gray-50 opacity-75'} shadow-sm relative group`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-800">{building.name} </h3>
                                            <p className="text-sm text-gray-500">{building.surface} m² • {building.maxCapacity || '?'} sujets max</p>
                                            {!building.activated && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded mt-2 inline-block">Archivé</span>}
                                            {building.flocks && building.flocks.length > 0 && (<span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded mt-2 inline-block">Occupé - {building.flocks[0].name}</span>)}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-3xl">{building.activated ? '🏠' : '🗄️'}</div>
                                        </div>
                                    </div>

                                    {/* ACTIONS ADMIN UNIQUEMENT */}
                                    {isAdmin && (
                                        <div className="mt-4 pt-3 border-t border-gray-100 flex gap-3 justify-end group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleArchive(building.id, building.activated)}
                                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1 rounded"
                                            >
                                                {building.activated ? 'Archiver' : 'Réactiver'}
                                            </button>

                                            <button
                                                onClick={() => handleEdit(building)}
                                                className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1 rounded"
                                            >
                                                Modifier
                                            </button>

                                            {building.flocks && building.flocks.length === 0 ? (
                                                <button onClick={() => handleDelete(building.id)} className="text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 px-3 py-1 rounded">
                                                    Supprimer
                                                </button>
                                            ) : (
                                                <span className="text-xs text-gray-400 cursor-not-allowed" title="Contient des historiques">Suppression impossible</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}