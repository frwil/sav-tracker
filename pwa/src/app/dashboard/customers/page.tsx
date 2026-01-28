'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSync } from '@/providers/SyncProvider';

// --- TYPES ---

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

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Fonction de fetch isolée (pour React Query)
async function fetchCustomers() {
    const token = localStorage.getItem('sav_token');
    if (!token) throw new Error("Non authentifié");

    // On récupère TOUS les clients pour permettre la recherche offline
    // Pagination désactivée ou très large (itemsPerPage=500) selon vos besoins
    const res = await fetch(`${API_URL}/customers?pagination=false`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/ld+json' }
    });

    if (!res.ok) throw new Error(`Erreur ${res.status}`);
    const data = await res.json();
    return data['hydra:member'] || [];
}

export default function CustomersPage() {
    const queryClient = useQueryClient();
    const { addToQueue } = useSync(); // ✅ Gestion Offline

    // --- 1. CHARGEMENT DES DONNÉES (CACHE) ---
    const { data: customers = [], isLoading, isError } = useQuery<Customer[]>({
        queryKey: ['customers_full_list'], // Clé unique
        queryFn: fetchCustomers,
        staleTime: 1000 * 60 * 10, // Cache valide 10 minutes
        gcTime: 1000 * 60 * 60 * 24, // Garder en mémoire 24h (pour offline)
    });

    // --- 2. ÉTATS LOCAUX ---
    const [searchTerm, setSearchTerm] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);

    // Formulaire
    const [showForm, setShowForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        zone: '',
        phoneNumber: '',
        exactLocation: '',
        erpCode: ''
    });

    // --- 3. GESTION DES RÔLES ---
    useEffect(() => {
        const token = localStorage.getItem('sav_token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const roles = payload.roles || [];
                setIsAdmin(roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SUPER_ADMIN'));
            } catch (e) { console.error("Erreur token", e); }
        }
    }, []);

    // --- 4. LOGIQUE DE FILTRAGE (CLIENT-SIDE) ---
    // C'est crucial pour l'offline : on filtre le tableau en mémoire sans rappeler l'API
    const filteredCustomers = customers.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.zone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phoneNumber?.includes(searchTerm)
    );

    // --- 5. HANDLERS (ONLINE + OFFLINE) ---

    const resetForm = () => {
        setFormData({ name: '', zone: '', phoneNumber: '', exactLocation: '', erpCode: '' });
        setEditingId(null);
        setShowForm(false);
        setIsSubmitting(false);
    };

    const handleEdit = (customer: Customer) => {
        setFormData({
            name: customer.name,
            zone: customer.zone,
            phoneNumber: customer.phoneNumber || '',
            exactLocation: customer.exactLocation || '',
            erpCode: customer.erpCode || ''
        });
        setEditingId(customer.id);
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const url = editingId ? `/customers/${editingId}` : '/customers';
        const method = editingId ? 'PUT' : 'POST';
        const payload = { ...formData, activated: true };

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
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Erreur API");

            // Mettre à jour le cache immédiatement
            queryClient.invalidateQueries({ queryKey: ['customers_full_list'] });
            // On invalide aussi la liste déroulante des autres pages
            queryClient.invalidateQueries({ queryKey: ['customers'] }); 
            
            resetForm();

        } catch (error) {
            console.error(error);
            if (confirm("Erreur réseau. Sauvegarder en mode hors ligne ?")) {
                addToQueue({ url, method: method as any, body: payload });
                resetForm();
            } else {
                setIsSubmitting(false);
            }
        }
    };

    const handleToggleStatus = async (customer: Customer) => {
        // Toggle (Activer <-> Archiver)
        const newStatus = !customer.activated;
        const url = `/customers/${customer.id}`;
        const method = 'PATCH'; // Assurez-vous que votre API supporte PATCH pour partiel
        const body = { activated: newStatus };

        // Optimistic Update (Mise à jour visuelle immédiate)
        // Note: Pour faire simple, on force le refresh, mais React Query permet de modifier le cache manuellement.
        
        if (!navigator.onLine) {
            addToQueue({ url, method: 'PATCH', body: { activated: newStatus } }); // Note: API Platform demande souvent Content-Type merge-patch+json
            alert("Action mise en file d'attente (Offline)");
            return;
        }

        try {
            const token = localStorage.getItem('sav_token');
            await fetch(`${API_URL}${url}`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/merge-patch+json', // Standard API Platform pour PATCH
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
            queryClient.invalidateQueries({ queryKey: ['customers_full_list'] });
        } catch (e) {
            addToQueue({ url, method: 'PATCH', body });
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Attention : Supprimer un client supprimera tout son historique. Êtes-vous sûr ?")) return;

        const url = `/customers/${id}`;

        if (!navigator.onLine) {
            addToQueue({ url, method: 'DELETE', body: {} });
            alert("Suppression enregistrée hors-ligne.");
            return;
        }

        try {
            const token = localStorage.getItem('sav_token');
            await fetch(`${API_URL}${url}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            queryClient.invalidateQueries({ queryKey: ['customers_full_list'] });
        } catch (e) {
            addToQueue({ url, method: 'DELETE', body: {} });
        }
    };

    // --- RENDU ---

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            
            {/* Header + Recherche */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-900">
                    Clients ({filteredCustomers.length})
                </h1>
                
                <div className="flex gap-2 w-full md:w-auto">
                    <input 
                        type="text"
                        placeholder="🔍 Rechercher (Nom, Zone...)"
                        className="border p-2 rounded-lg w-full md:w-64"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button 
                        onClick={() => { resetForm(); setShowForm(true); }}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-indigo-700 whitespace-nowrap"
                    >
                        + Nouveau
                    </button>
                </div>
            </div>

            {/* Formulaire Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold mb-4">{editingId ? 'Modifier Client' : 'Nouveau Client'}</h2>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700">Nom de la structure / Éleveur *</label>
                                <input required type="text" className="w-full border p-2 rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700">Zone *</label>
                                    <input required type="text" className="w-full border p-2 rounded" value={formData.zone} onChange={e => setFormData({...formData, zone: e.target.value})} placeholder="Ex: PK14" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700">Téléphone</label>
                                    <input type="text" className="w-full border p-2 rounded" value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700">Localisation précise</label>
                                <input type="text" className="w-full border p-2 rounded" value={formData.exactLocation} onChange={e => setFormData({...formData, exactLocation: e.target.value})} placeholder="Repère géographique..." />
                            </div>

                            {isAdmin && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700">Code ERP (Admin)</label>
                                    <input type="text" className="w-full border p-2 rounded bg-gray-50" value={formData.erpCode} onChange={e => setFormData({...formData, erpCode: e.target.value})} />
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 font-bold">Annuler</button>
                                <button type="submit" disabled={isSubmitting} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50">
                                    {isSubmitting ? '...' : 'Enregistrer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Liste */}
            {isLoading ? (
                <div className="text-center py-20 text-indigo-600">Chargement des clients...</div>
            ) : isError ? (
                <div className="bg-red-50 text-red-600 p-4 rounded text-center">
                    Impossible de charger les clients. Vérifiez votre connexion.
                </div>
            ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-500">Aucun client trouvé.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCustomers.map((customer) => (
                        <div key={customer.id} className={`bg-white p-5 rounded-xl shadow-sm border-l-4 ${customer.activated ? 'border-indigo-500' : 'border-gray-300 opacity-75'} hover:shadow-md transition group`}>
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg text-gray-900 line-clamp-1">{customer.name}</h3>
                                {customer.erpCode && <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-500">{customer.erpCode}</span>}
                            </div>
                            
                            <div className="space-y-1 text-sm text-gray-600 mb-4">
                                <p>📍 {customer.zone} {customer.exactLocation && <span className="text-gray-400">- {customer.exactLocation}</span>}</p>
                                <p>📞 {customer.phoneNumber || 'Non renseigné'}</p>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                                <button 
                                    onClick={() => handleEdit(customer)}
                                    className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition"
                                >
                                    Modifier
                                </button>
                                
                                {isAdmin && (
                                    <>
                                        <button 
                                            onClick={() => handleToggleStatus(customer)}
                                            className={`text-sm font-bold px-3 py-1.5 rounded-lg transition ${customer.activated ? 'text-orange-600 bg-orange-50 hover:bg-orange-100' : 'text-green-600 bg-green-50 hover:bg-green-100'}`}
                                        >
                                            {customer.activated ? 'Archiver' : 'Activer'}
                                        </button>
                                        
                                        <button 
                                            onClick={() => handleDelete(customer.id)}
                                            className="text-sm font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition opacity-0 group-hover:opacity-100 focus:opacity-100"
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
    );
}