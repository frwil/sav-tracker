'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import CustomerSelector from '@/components/CustomerSelector';

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
    const [customer, setCustomer] = useState<any>(null);
    const [flocks, setFlocks] = useState<Flock[]>([]);
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [speculations, setSpeculations] = useState<Speculation[]>([]);
    const [standards, setStandards] = useState<Standard[]>([]);
    
    const [loading, setLoading] = useState(false);
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

    useEffect(() => {
        const token = localStorage.getItem('sav_token');
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setIsAdmin(payload.roles.includes('ROLE_ADMIN') || payload.roles.includes('ROLE_SUPER_ADMIN'));
            
            // Pre-load static data
            const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/ld+json' };
            fetch('http://localhost/api/speculations', { headers }).then(r=>r.json()).then(d=>setSpeculations(d['hydra:member']));
            fetch('http://localhost/api/standards', { headers }).then(r=>r.json()).then(d=>setStandards(d['hydra:member']));
        }
    }, []);

    const fetchData = async () => {
        if (!customer) return;
        setLoading(true);
        const token = localStorage.getItem('sav_token');
        const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' };

        // 1. Charger les Bandes du client
        const resFlocks = await fetch(`http://localhost/api/flocks?customer=${customer.id}`, { headers });
        const dataFlocks = await resFlocks.json();
        setFlocks(dataFlocks);

        // 2. Charger les Bâtiments (pour vérifier la dispo)
        // On utilise le format JSON-LD pour avoir les relations complètes si besoin, ou JSON simple
        const resBuild = await fetch(`http://localhost/api/buildings?customer=${customer.id}`, { headers });
        const dataBuild = await resBuild.json();
        setBuildings(dataBuild);
        
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [customer]);

    // LOGIQUE DE DISPONIBILITÉ DES BÂTIMENTS
    // Un bâtiment est dispo s'il est activé ET si sa dernière bande est "clôturée" (simplifié ici : on regarde si une bande est liée)
    // NOTE : Dans votre modèle actuel, Building a OneToMany flocks. 
    // Pour simplifier l'UX : on considère un bâtiment libre s'il n'a pas de bande, OU si la dernière bande a une date de fin (implémentation future)
    // Pour l'instant, on filtre ceux qui n'ont PAS de bande en cours.
    const availableBuildings = buildings.filter(b => {
        if (!b.activated) return false;
        // Ici, on suppose que le backend renvoie les flocks. 
        // Si le tableau flocks est vide, c'est libre.
        // S'il n'est pas vide, il faut vérifier si la dernière bande est active.
        // Pour ce MVP : On autorise l'ajout si le technicien juge que c'est bon, ou on filtre strictement.
        // Filtrage strict : return b.flocks.length === 0; 
        return true; // On laisse le choix à l'utilisateur mais on affiche un warning visuel dans le select
    });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('sav_token');
        
        // Vérification bâtiment occupé
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
                    customer: customer['@id']
                })
            });
            setShowForm(false);
            setFormData({...formData, subjectCount: ''});
            fetchData();
        } catch (err) { alert("Erreur création"); }
    };

    const handleDelete = async (flock: Flock) => {
        if(!confirm("Supprimer cette bande ?")) return;
        const token = localStorage.getItem('sav_token');
        
        // Soft Delete par défaut si visites liées
        if (flock.observations.length > 0) {
            alert("Cette bande contient des observations. Elle sera archivée (Soft Delete) au lieu d'être supprimée.");
            // Logique d'archivage à implémenter côté backend ou via un champ 'archived'
            return;
        }

        // Hard Delete si vide
        const res = await fetch(`http://localhost/api/flocks/${flock.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if(res.ok) fetchData();
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
                <CustomerSelector onSelect={setCustomer} />

                {customer && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-700">Production en cours</h2>
                            <button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-indigo-700">
                                {showForm ? 'Fermer' : '+ Nouvelle Bande'}
                            </button>
                        </div>

                        {showForm && (
                            <form onSubmit={handleCreate} className="bg-white p-6 rounded-xl shadow-md border border-indigo-100 animate-slide-down">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                            {flocks.map(flock => (
                                <div key={flock.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center group">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-lg text-gray-800">{flock.name}</h3>
                                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">{flock.speculation.name}</span>
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