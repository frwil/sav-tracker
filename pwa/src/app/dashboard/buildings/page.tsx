'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Select from 'react-select'; // 1. Import de React-Select
import { useCustomers, CustomerOption } from '@/hooks/useCustomers'; // 2. Import du Hook

interface Building {
    '@id': string;
    id: number;
    name: string;
    surface: number;
    maxCapacity?: number;
    activated: boolean;
    flocks: any[]; // On vérifie juste la longueur pour la suppression
}

export default function BuildingsPage() {
    // 3. Utilisation du Hook
    const { 
        options: customerOptions, 
        loading: customersLoading 
    } = useCustomers();

    // État du client sélectionné (Format React-Select)
    const [selectedCustomerOption, setSelectedCustomerOption] = useState<CustomerOption | null>(null);

    const [buildings, setBuildings] = useState<Building[]>([]);
    const [loading, setLoading] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [showForm, setShowForm] = useState(false);
    
    // Form States
    const [newName, setNewName] = useState('');
    const [newSurface, setNewSurface] = useState('');
    const [newCapacity, setNewCapacity] = useState('');

    // Check Roles au chargement
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

    // 4. Fetch des bâtiments quand le client change
    useEffect(() => {
        if (!selectedCustomerOption) {
            setBuildings([]);
            return;
        }

        setLoading(true);
        const token = localStorage.getItem('sav_token');
        
        // Extraction de l'ID depuis l'IRI (ex: "/api/customers/12" -> "12")
        const customerId = selectedCustomerOption.value.split('/').pop();

        fetch(`http://localhost/api/buildings?customer=${customerId}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
        })
        .then(res => res.json())
        .then(data => {
            setBuildings(data);
            setLoading(false);
        })
        .catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, [selectedCustomerOption]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomerOption) return;

        const token = localStorage.getItem('sav_token');
        try {
            await fetch('http://localhost/api/buildings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    name: newName,
                    surface: parseFloat(newSurface),
                    maxCapacity: newCapacity ? parseInt(newCapacity) : null,
                    customer: selectedCustomerOption.value, // 5. Envoi direct de l'IRI
                    activated: true
                })
            });
            
            // Reset du formulaire
            setShowForm(false);
            setNewName(''); setNewSurface(''); setNewCapacity('');
            
            // Rechargement manuel rapide (ou on pourrait rappeler le code du useEffect)
            // Pour faire simple ici, on déclenche un re-render via le select ou on recharge la page
            // Une méthode propre serait d'extraire la fonction fetch dans le useEffect ou en dehors.
            // Ici, on va re-déclencher le fetch en simulant un "refresh" logique ou simplement recharger la page pour garantir la synchro
             window.location.reload();

        } catch (err) { alert("Erreur création"); }
    };

    const handleDelete = async (id: number) => {
        if(!confirm("Supprimer définitivement ce bâtiment ?")) return;
        const token = localStorage.getItem('sav_token');
        
        const res = await fetch(`http://localhost/api/buildings/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if(res.ok) {
            setBuildings(prev => prev.filter(b => b.id !== id));
        } else {
            alert("Impossible de supprimer (Probablement lié à des données). Essayez d'archiver.");
        }
    };

    const handleArchive = async (id: number, currentStatus: boolean) => {
        const token = localStorage.getItem('sav_token');
        const res = await fetch(`http://localhost/api/buildings/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/merge-patch+json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ activated: !currentStatus })
        });
        
        if (res.ok) {
            // Mise à jour optimiste locale
            setBuildings(prev => prev.map(b => 
                b.id === id ? { ...b, activated: !currentStatus } : b
            ));
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
                
                {/* REMPLACEMENT SELECTEUR CLIENT */}
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
                            <button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-indigo-700">
                                {showForm ? 'Fermer' : '+ Nouveau Bâtiment'}
                            </button>
                        </div>

                        {/* FORMULAIRE AJOUT */}
                        {showForm && (
                            <form onSubmit={handleCreate} className="bg-white p-6 rounded-xl shadow-md border border-indigo-100 animate-slide-down">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div><label className="block text-sm font-bold text-gray-700">Nom</label><input type="text" required className="w-full border p-2 rounded" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Bâtiment A" /></div>
                                    <div><label className="block text-sm font-bold text-gray-700">Surface (m²)</label><input type="number" required step="0.1" className="w-full border p-2 rounded" value={newSurface} onChange={e => setNewSurface(e.target.value)} /></div>
                                    <div><label className="block text-sm font-bold text-gray-700">Capacité (Sujets)</label><input type="number" className="w-full border p-2 rounded" value={newCapacity} onChange={e => setNewCapacity(e.target.value)} /></div>
                                </div>
                                <button type="submit" className="w-full bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700">Enregistrer</button>
                            </form>
                        )}

                        {/* LISTE DES BÂTIMENTS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {buildings.length === 0 && <p className="text-gray-500 italic col-span-2">Aucun bâtiment enregistré.</p>}
                            
                            {buildings.map(building => (
                                <div key={building.id} className={`bg-white p-5 rounded-xl border ${building.activated ? 'border-gray-200' : 'border-gray-200 bg-gray-50 opacity-75'} shadow-sm relative group`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-800">{building.name}</h3>
                                            <p className="text-sm text-gray-500">{building.surface} m² • {building.maxCapacity || '?'} sujets max</p>
                                            {!building.activated && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded mt-2 inline-block">Archivé</span>}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-3xl">{building.activated ? '🏠' : '🗄️'}</div>
                                        </div>
                                    </div>

                                    {/* ACTIONS ADMIN */}
                                    {isAdmin && (
                                        <div className="mt-4 pt-3 border-t border-gray-100 flex gap-3 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleArchive(building.id, building.activated)}
                                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1 rounded"
                                            >
                                                {building.activated ? 'Archiver' : 'Réactiver'}
                                            </button>
                                            
                                            {building.flocks.length === 0 ? (
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