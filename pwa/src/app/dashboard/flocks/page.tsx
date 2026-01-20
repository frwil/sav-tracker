'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Select from 'react-select'; // 1. On utilise Select directement
import { useCustomers, CustomerOption } from '@/hooks/useCustomers'; // 2. On importe le Hook

// Types simplifiés
interface Building { '@id': string; id: number; name: string; activated: boolean; flocks: any[] }
interface Speculation { '@id': string; name: string; }
interface Standard { '@id': string; name: string; }
interface Flock { 
    id: number; 
    name: string; 
    startDate: string; 
    subjectCount: number; 
    building?: Building; 
    speculation: Speculation;
    observations: any[];
}

export default function FlocksPage() {
    // 3. Utilisation du Hook pour les clients
    const { 
        options: customerOptions, 
        loading: customersLoading 
    } = useCustomers();

    // État pour le client sélectionné (format React-Select)
    const [selectedCustomerOption, setSelectedCustomerOption] = useState<CustomerOption | null>(null);

    const [flocks, setFlocks] = useState<Flock[]>([]);
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [speculations, setSpeculations] = useState<Speculation[]>([]);
    const [standards, setStandards] = useState<Standard[]>([]);
    
    const [loadingData, setLoadingData] = useState(false); // Renommé pour éviter conflit avec loading du hook
    const [isAdmin, setIsAdmin] = useState(false);
    const [showForm, setShowForm] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        speculation: '',
        standard: '',
        building: '',
        startDate: new Date().toISOString().slice(0, 10),
        subjectCount: ''
    });

    // Initialisation (Token & Données statiques)
    useEffect(() => {
        const token = localStorage.getItem('sav_token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setIsAdmin(payload.roles.includes('ROLE_ADMIN') || payload.roles.includes('ROLE_SUPER_ADMIN'));
                
                const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/ld+json' };
                // On utilise Promise.all pour paralléliser
                Promise.all([
                    fetch('http://localhost/api/speculations', { headers }).then(r=>r.json()),
                    fetch('http://localhost/api/standards', { headers }).then(r=>r.json())
                ]).then(([specsData, standardsData]) => {
                    setSpeculations(specsData['hydra:member'] || []);
                    setStandards(standardsData['hydra:member'] || []);
                });
            } catch (e) {
                console.error("Erreur lecture token", e);
            }
        }
    }, []);

    // 4. Fetch des données liées au client (Bandes + Bâtiments)
    useEffect(() => {
        const fetchData = async () => {
            if (!selectedCustomerOption) {
                setFlocks([]);
                setBuildings([]);
                return;
            }

            setLoadingData(true);
            const token = localStorage.getItem('sav_token');
            const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' };

            // Extraction de l'ID depuis l'IRI (ex: "/api/customers/5" -> "5")
            // C'est nécessaire car ton backend filtre par ?customer={id}
            const customerId = selectedCustomerOption.value.split('/').pop(); 

            try {
                // 1. Charger les Bandes du client
                const resFlocks = await fetch(`http://localhost/api/flocks?customer=${customerId}`, { headers });
                const dataFlocks = await resFlocks.json();
                setFlocks(dataFlocks);

                // 2. Charger les Bâtiments
                const resBuild = await fetch(`http://localhost/api/buildings?customer=${customerId}`, { headers });
                const dataBuild = await resBuild.json();
                setBuildings(dataBuild);
            } catch (err) {
                console.error("Erreur chargement données client", err);
            } finally {
                setLoadingData(false);
            }
        };

        fetchData();
    }, [selectedCustomerOption]); // Se déclenche quand on change le client via le Select

    // LOGIQUE DE DISPONIBILITÉ DES BÂTIMENTS
    const availableBuildings = buildings.filter(b => {
        if (!b.activated) return false;
        return true; 
    });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomerOption) return alert("Aucun client sélectionné");

        const token = localStorage.getItem('sav_token');
        
        const selectedBuilding = buildings.find(b => b['@id'] === formData.building);
        if (selectedBuilding && selectedBuilding.flocks.length > 0) {
            if (!confirm(`Le bâtiment ${selectedBuilding.name} contient déjà des bandes. Êtes-vous sûr que la précédente est sortie ?`)) return;
        }

        try {
            await fetch('http://localhost/api/flocks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    ...formData,
                    subjectCount: parseInt(formData.subjectCount),
                    startDate: new Date(formData.startDate).toISOString(),
                    customer: selectedCustomerOption.value // On envoie l'IRI fourni par le hook directement
                })
            });
            setShowForm(false);
            setFormData({...formData, subjectCount: ''});
            
            // On force le rechargement. Note: Idéalement, on extrairait fetchData hors du useEffect pour l'appeler ici.
            // Astuce rapide : simuler un changement ou recharger la page. 
            // Mieux : Déclencher un refresh via un state counter, mais pour l'instant on laisse l'utilisateur voir le résultat au refresh ou on copie la logique fetchData ici.
             window.location.reload(); 
        } catch (err) { alert("Erreur création"); }
    };

    const handleDelete = async (flock: Flock) => {
        if(!confirm("Supprimer cette bande ?")) return;
        const token = localStorage.getItem('sav_token');
        
        if (flock.observations.length > 0) {
            alert("Cette bande contient des observations. Elle sera archivée (Soft Delete).");
            return;
        }

        const res = await fetch(`http://localhost/api/flocks/${flock.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        // Mise à jour optimiste de l'UI
        if(res.ok) {
            setFlocks(prev => prev.filter(f => f.id !== flock.id));
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans">
            <div className="bg-white shadow px-6 py-4 mb-6">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <div>
                        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-indigo-600">← Retour</Link>
                        <h1 className="text-2xl font-extrabold text-gray-800">Gestion des Bandes</h1>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4">
                
                {/* REMPLACEMENT DE CUSTOMER SELECTOR PAR LE HOOK */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6">
                    <label className="block text-sm font-bold text-gray-700 mb-2">📂 Sélectionner un Client</label>
                    <Select
                        instanceId="customer-select"
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

                {/* Loading indicator pour les données (Bandes/Bâtiments) */}
                {loadingData && <div className="text-center py-4 text-gray-500">Chargement des données du client...</div>}

                {selectedCustomerOption && !loadingData && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-700">Production en cours</h2>
                            <button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-indigo-700">
                                {showForm ? 'Fermer' : '+ Nouvelle Bande'}
                            </button>
                        </div>

                        {showForm && (
                            <form onSubmit={handleCreate} className="bg-white p-6 rounded-xl shadow-md border border-indigo-100 animate-slide-down">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    {/* ... (Le reste du formulaire reste identique) ... */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700">Spéculation</label>
                                        <select className="w-full border p-2 rounded bg-white" required value={formData.speculation} onChange={e => setFormData({...formData, speculation: e.target.value})}>
                                            <option value="">-- Choisir --</option>
                                            {speculations.map(s => <option key={s['@id']} value={s['@id']}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700">Standard (Souche)</label>
                                        <select className="w-full border p-2 rounded bg-white" value={formData.standard} onChange={e => setFormData({...formData, standard: e.target.value})}>
                                            <option value="">-- Choisir --</option>
                                            {standards.map(s => <option key={s['@id']} value={s['@id']}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700">Bâtiment</label>
                                        <select className="w-full border p-2 rounded bg-white" required value={formData.building} onChange={e => setFormData({...formData, building: e.target.value})}>
                                            <option value="">-- Choisir --</option>
                                            {availableBuildings.map(b => (
                                                <option key={b['@id']} value={b['@id']}>
                                                    {b.name} {b.flocks.length > 0 ? '(⚠️ Occupé ?)' : '(Libre)'}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700">Date d'installation</label>
                                        <input type="date" required className="w-full border p-2 rounded" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700">Effectif</label>
                                        <input type="number" required min="1" className="w-full border p-2 rounded" value={formData.subjectCount} onChange={e => setFormData({...formData, subjectCount: e.target.value})} />
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700">Lancer la bande</button>
                            </form>
                        )}

                        <div className="grid gap-4">
                            {flocks.length === 0 && <p className="text-gray-500 italic">Aucune bande trouvée pour ce client.</p>}
                            {flocks.map(flock => (
                                <div key={flock.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center group">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-lg text-gray-800">{flock.name}</h3>
                                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">{flock.speculation?.name}</span>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Installée le {new Date(flock.startDate).toLocaleDateString()} • {flock.subjectCount} sujets
                                        </p>
                                        <p className="text-sm font-medium text-gray-600 mt-1">
                                            📍 {flock.building ? flock.building.name : 'Aucun bâtiment'}
                                        </p>
                                    </div>

                                    {isAdmin && (
                                        <button onClick={() => handleDelete(flock)} className="text-red-500 hover:text-red-700 p-2 opacity-0 group-hover:opacity-100 transition-opacity" title="Supprimer/Archiver">
                                            🗑️
                                        </button>
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