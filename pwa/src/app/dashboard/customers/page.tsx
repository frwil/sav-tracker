'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Customer {
    '@id': string;
    id: number;
    name: string;
    zone: string;
    phoneNumber?: string;
    exactLocation?: string;
    erpCode?: string;
    activated: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api';

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Permissions
    const [isAdmin, setIsAdmin] = useState(false);

    // Formulaire
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        zone: '',
        phoneNumber: '',
        exactLocation: '',
        erpCode: ''
    });

    // 1. Initialisation (Token & Rôles)
    useEffect(() => {
        const token = localStorage.getItem('sav_token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const roles = payload.roles || [];
                setIsAdmin(roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SUPER_ADMIN'));
                loadCustomers(token);
            } catch (e) {
                console.error("Erreur token", e);
            }
        }
    }, []);

    const loadCustomers = async (token: string) => {
        try {
            const res = await fetch(`${API_URL}/customers`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/ld+json' }
            });
            const data = await res.json();
            const list = data['hydra:member'] || data['member'] || [];
            setCustomers(list);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Filtre local (Nom) et gestion de l'archivage (on cache les archivés par défaut sauf si on veut les voir - ici on cache)
    const filteredCustomers = customers.filter(c => {
        // Optionnel: décommenter si on veut cacher les archivés de la liste principale
        // if (!c.activated) return false; 
        return c.name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    // Gestion du Formulaire
    const handleEdit = (customer: Customer) => {
        setEditingId(customer.id);
        setFormData({
            name: customer.name,
            zone: customer.zone,
            phoneNumber: customer.phoneNumber || '',
            exactLocation: customer.exactLocation || '',
            erpCode: customer.erpCode || ''
        });
        setShowForm(true);
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingId(null);
        setFormData({ name: '', zone: '', phoneNumber: '', exactLocation: '', erpCode: '' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('sav_token');
        
        try {
            if (editingId) {
                // UPDATE (PATCH)
                const res = await fetch(`${API_URL}/customers/${editingId}`, {
                    method: 'PATCH',
                    headers: { 
                        'Content-Type': 'application/merge-patch+json', // Important pour API Platform
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify(formData)
                });
                if(!res.ok) throw new Error("Erreur modification");
                alert("Client modifié !");
            } else {
                // CREATE (POST)
                const res = await fetch(`${API_URL}/customers`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json', 
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify({ ...formData, activated: true })
                });
                if(!res.ok) throw new Error("Erreur création");
                alert("Client créé !");
            }
            
            // Recharger la liste et fermer
            if (token) loadCustomers(token);
            resetForm();

        } catch (err) {
            console.error(err);
            alert("Une erreur est survenue.");
        }
    };

    // Actions Admin : Archiver / Supprimer
    const handleArchive = async (customer: Customer) => {
        const token = localStorage.getItem('sav_token');
        const newStatus = !customer.activated;
        
        if (!confirm(newStatus ? "Réactiver ce client ?" : "Archiver ce client ? Il n'apparaîtra plus dans les sélections.")) return;

        try {
            await fetch(`${API_URL}/customers/${customer.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/merge-patch+json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ activated: newStatus })
            });
            if (token) loadCustomers(token);
        } catch (e) { alert("Erreur lors de l'action"); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("ATTENTION : Supprimer définitivement ? Cela peut entraîner des erreurs si le client a des visites liées.")) return;
        const token = localStorage.getItem('sav_token');

        try {
            const res = await fetch(`${API_URL}/customers/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setCustomers(prev => prev.filter(c => c.id !== id));
            } else {
                alert("Impossible de supprimer (Probablement lié à des données). Préférez l'archivage.");
            }
        } catch (e) { alert("Erreur suppression"); }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans">
            <div className="bg-white shadow px-6 py-4 mb-6">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <div>
                        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-indigo-600">← Retour</Link>
                        <h1 className="text-2xl font-extrabold text-gray-800">Portefeuille Clients</h1>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4">
                
                {/* Header Actions */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div className="relative w-full md:w-96">
                        <input 
                            type="text" 
                            placeholder="🔍 Rechercher un client..." 
                            className="w-full border p-3 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => { resetForm(); setShowForm(!showForm); }}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow hover:bg-indigo-700 transition w-full md:w-auto"
                    >
                        {showForm ? 'Fermer' : '+ Nouveau Client'}
                    </button>
                </div>

                {/* FORMULAIRE */}
                {showForm && (
                    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-lg border border-indigo-100 mb-8 animate-slide-down">
                        <h3 className="text-lg font-bold mb-4 text-gray-800">{editingId ? 'Modifier le client' : 'Ajouter un client'}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nom / Raison Sociale *</label>
                                <input type="text" required className="w-full border p-2 rounded-lg" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toLocaleUpperCase()})} placeholder="Ex: Ferme de l'Espoir" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Zone / Ville *</label>
                                <input type="text" required className="w-full border p-2 rounded-lg" value={formData.zone} onChange={e => setFormData({...formData, zone: e.target.value})} placeholder="Ex: Douala - Bonabéri" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Téléphone</label>
                                <input type="text" className="w-full border p-2 rounded-lg" value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Code ERP (Facultatif)</label>
                                <input type="text" className="w-full border p-2 rounded-lg" value={formData.erpCode} onChange={e => setFormData({...formData, erpCode: e.target.value})} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Localisation Précise</label>
                                <input type="text" className="w-full border p-2 rounded-lg" value={formData.exactLocation} onChange={e => setFormData({...formData, exactLocation: e.target.value})} placeholder="Ex: Carrefour Y, 200m à gauche" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={resetForm} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Annuler</button>
                            <button type="submit" className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700">Enregistrer</button>
                        </div>
                    </form>
                )}

                {/* LISTE DES CLIENTS */}
                {loading ? (
                    <div className="text-center py-10 text-gray-500">Chargement des clients...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredCustomers.length === 0 && <p className="col-span-full text-center text-gray-400 italic">Aucun client trouvé.</p>}
                        
                        {filteredCustomers.map(customer => (
                            <div key={customer.id} className={`bg-white p-5 rounded-2xl border ${customer.activated ? 'border-gray-100' : 'border-gray-200 bg-gray-50 opacity-75'} shadow-sm hover:shadow-md transition group`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-2xl">
                                        {customer.activated ? '👤' : '🗄️'}
                                    </div>
                                    <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{customer.erpCode || 'Pas de code'}</span>
                                </div>
                                
                                <h3 className="font-bold text-lg text-gray-800 mb-1">{customer.name}</h3>
                                <div className="text-sm text-gray-500 mb-4 flex flex-col gap-1">
                                    <span>📍 {customer.zone}</span>
                                    <span>📞 {customer.phoneNumber || 'Non renseigné'}</span>
                                </div>

                                <div className="border-t border-gray-100 pt-3 flex justify-end gap-2">
                                    {/* Tout le monde peut modifier les infos (Technicien & Admin) */}
                                    <button 
                                        onClick={() => handleEdit(customer)}
                                        className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition"
                                    >
                                        Modifier
                                    </button>

                                    {/* Admin Only : Archiver & Supprimer */}
                                    {isAdmin && (
                                        <>
                                            <button 
                                                onClick={() => handleArchive(customer)}
                                                className={`text-sm font-bold px-3 py-1.5 rounded-lg transition ${customer.activated ? 'text-orange-600 bg-orange-50 hover:bg-orange-100' : 'text-green-600 bg-green-50 hover:bg-green-100'}`}
                                            >
                                                {customer.activated ? 'Archiver' : 'Activer'}
                                            </button>
                                            
                                            {/* La suppression est souvent impossible à cause des contraintes FK, donc on la met en dernier recours */}
                                            <button 
                                                onClick={() => handleDelete(customer.id)}
                                                className="text-sm font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition opacity-0 group-hover:opacity-100"
                                                title="Suppression définitive"
                                            >
                                                🗑️
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}