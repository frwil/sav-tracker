'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Select from 'react-select'; 
import { useCustomers, CustomerOption } from '@/hooks/useCustomers';

// Types mis à jour
interface Building { 
    '@id': string; 
    id: number; 
    name: string; 
    activated: boolean; 
    flocks: Flock[]; 
}
interface Speculation { '@id': string; name: string; }
interface Standard { '@id': string; name: string; speculation: string | Speculation } 
interface Flock { 
    id: number; 
    name: string; 
    startDate: string; 
    subjectCount: number; 
    building?: Building; 
    speculation: Speculation;
    standard?: Standard;
    observations: any[];
    closed: boolean;
    activated: boolean;
}

export default function FlocksPage() {
    const { options: customerOptions, loading: customersLoading } = useCustomers();
    const [selectedCustomerOption, setSelectedCustomerOption] = useState<CustomerOption | null>(null);

    const [flocks, setFlocks] = useState<Flock[]>([]);
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [speculations, setSpeculations] = useState<Speculation[]>([]);
    const [standards, setStandards] = useState<Standard[]>([]);
    
    const [loadingData, setLoadingData] = useState(false);
    
    // Filtres
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState('');

    // Gestion des rôles
    const [isAdmin, setIsAdmin] = useState(false); 
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    
    const [showForm, setShowForm] = useState(false);
    const [editingFlockId, setEditingFlockId] = useState<number | null>(null);

    const [formData, setFormData] = useState({
        speculation: '',
        standard: '',
        building: '',
        startDate: new Date().toISOString().slice(0, 10),
        subjectCount: ''
    });

    // 1. Initialisation
    useEffect(() => {
        const token = localStorage.getItem('sav_token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const roles = payload.roles || [];
                setIsAdmin(roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SUPER_ADMIN'));
                setIsSuperAdmin(roles.includes('ROLE_SUPER_ADMIN'));

                const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/ld+json' };
                
                Promise.all([
                    fetch('http://localhost/api/speculations', { headers }).then(r => r.json()),
                    fetch('http://localhost/api/standards', { headers }).then(r => r.json())
                ]).then(([specsData, standardsData]) => {
                    setSpeculations(specsData['hydra:member'] || specsData['member'] || []);
                    setStandards(standardsData['hydra:member'] || standardsData['member'] || []);
                }).catch(e => console.error(e));
            } catch (e) {
                console.error("Erreur token", e);
            }
        }
    }, []);

    // 2. Chargement des données
    useEffect(() => {
        const fetchData = async () => {
            if (!selectedCustomerOption) {
                setFlocks([]);
                setBuildings([]);
                return;
            }

            setLoadingData(true);
            const token = localStorage.getItem('sav_token');
            const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/ld+json' };
            const customerId = selectedCustomerOption.value.split('/').pop(); 

            try {
                const resFlocks = await fetch(`http://localhost/api/flocks?customer=${customerId}`, { headers });
                const dataFlocks = await resFlocks.json();
                setFlocks(dataFlocks['hydra:member'] || dataFlocks['member'] || []);

                const resBuild = await fetch(`http://localhost/api/buildings?customer=${customerId}`, { headers });
                const dataBuild = await resBuild.json();
                setBuildings(dataBuild['hydra:member'] || dataBuild['member'] || []);

            } catch (err) {
                console.error(err);
            } finally {
                setLoadingData(false);
            }
        };

        fetchData();
    }, [selectedCustomerOption]);

    // --- LOGIQUE DE TRI ET FILTRE ---
    const processedFlocks = flocks
        .filter(flock => {
            // 1. On garde seulement les bandes actives (non archivées)
            if (flock.activated === false) return false;

            // 2. Filtre par Nom
            const matchesName = flock.name.toLowerCase().includes(searchTerm.toLowerCase());
            
            // 3. Filtre par Date (Si une date est sélectionnée)
            const matchesDate = filterDate 
                ? flock.startDate.startsWith(filterDate) 
                : true;

            return matchesName && matchesDate;
        })
        .sort((a, b) => {
            // 1. Priorité aux bandes EN COURS (closed: false)
            if (a.closed !== b.closed) {
                return a.closed ? 1 : -1; // Les "non-closed" (false) arrivent avant les "closed" (true)
            }
            
            // 2. Ensuite tri par date (Plus récent en premier)
            return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        });
    // --------------------------------

    // Helpers Métier
    const isBuildingOccupied = (building: Building) => {
        if (!building.flocks || building.flocks.length === 0) return false;
        return building.flocks.some(f => !f.closed);
    };

    const filteredStandards = standards.filter(std => {
        if (!formData.speculation) return false;
        const stdSpeculationId = typeof std.speculation === 'object' 
            ? (std.speculation as any)['@id'] 
            : std.speculation;
        return stdSpeculationId === formData.speculation;
    });

    const handleSpeculationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFormData({ ...formData, speculation: e.target.value, standard: '' });
    };

    // Actions
    const handleEdit = (flock: Flock) => {
        setEditingFlockId(flock.id);
        setFormData({
            speculation: flock.speculation['@id'],
            standard: flock.standard ? flock.standard['@id'] : '',
            building: flock.building ? flock.building['@id'] : '',
            startDate: new Date(flock.startDate).toISOString().slice(0, 10),
            subjectCount: flock.subjectCount.toString()
        });
        setShowForm(true);
    };

    const handleCloseFlock = async (flock: Flock) => {
        if (!confirm(`Clôturer la bande "${flock.name}" ? Cela libérera le bâtiment.`)) return;
        const token = localStorage.getItem('sav_token');

        try {
            await fetch(`http://localhost/api/flocks/${flock.id}/close`, {
                method: 'POST', 
                headers: { 'Authorization': `Bearer ${token}` }
            });
            window.location.reload();
        } catch (e) { alert("Erreur lors de la clôture"); }
    };

    const handleReopenFlock = async (flock: Flock) => {
        if (!confirm(`Réouvrir la bande "${flock.name}" ? (SuperAdmin uniquement)`)) return;
        const token = localStorage.getItem('sav_token');

        try {
            await fetch(`http://localhost/api/flocks/${flock.id}`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/merge-patch+json', 
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ closed: false, endDate: null })
            });
            window.location.reload();
        } catch (e) { alert("Erreur lors de la réouverture"); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('sav_token');
        const url = editingFlockId 
            ? `http://localhost/api/flocks/${editingFlockId}` 
            : 'http://localhost/api/flocks';
        
        const method = editingFlockId ? 'PATCH' : 'POST';
        const payload: any = {
            ...formData,
            subjectCount: parseInt(formData.subjectCount),
            startDate: new Date(formData.startDate).toISOString(),
            customer: selectedCustomerOption?.value
        };

        if (editingFlockId && !isAdmin) {
            delete payload.building;
        }

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 
                    'Content-Type': editingFlockId ? 'application/merge-patch+json' : 'application/json', 
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Erreur serveur");
            window.location.reload(); 
        } catch (err) { alert("Erreur lors de l'enregistrement"); }
    };

    const handleDelete = async (flock: Flock) => {
        const token = localStorage.getItem('sav_token');
        const hasHistory = flock.observations && flock.observations.length > 0;

        if (hasHistory) {
            if (!confirm(`⚠️ Cette bande contient ${flock.observations.length} observations (visites).\n\nElle ne peut pas être supprimée mais sera ARCHIVÉE.\n\nContinuer ?`)) {
                return;
            }
            try {
                const res = await fetch(`http://localhost/api/flocks/${flock.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/merge-patch+json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ activated: false })
                });
                if (!res.ok) throw new Error("Erreur lors de l'archivage");
                setFlocks(prev => prev.filter(f => f.id !== flock.id));
            } catch (err) { alert("Erreur lors de l'archivage."); }
        } else {
            if (!confirm("🗑️ Cette bande ne contient aucune donnée.\n\nVoulez-vous la supprimer DÉFINITIVEMENT ?")) {
                return;
            }
            try {
                const res = await fetch(`http://localhost/api/flocks/${flock.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error("Erreur lors de la suppression");
                setFlocks(prev => prev.filter(f => f.id !== flock.id));
            } catch (err) { alert("Erreur lors de la suppression."); }
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
                    />
                </div>

                {loadingData && <div className="text-center py-4">Chargement...</div>}

                {selectedCustomerOption && !loadingData && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-700">Production en cours</h2>
                            <button onClick={() => { setShowForm(!showForm); setEditingFlockId(null); setFormData({ speculation: '', standard: '', building: '', startDate: '', subjectCount: '' }); }} 
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-indigo-700">
                                {showForm ? 'Fermer' : '+ Nouvelle Bande'}
                            </button>
                        </div>

                        {showForm && (
                            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md border border-indigo-100">
                                {/* ... Formulaire (identique au précédent) ... */}
                                <h3 className="text-lg font-bold mb-4 text-gray-800">{editingFlockId ? 'Modifier la bande' : 'Nouvelle bande'}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div><label className="block text-sm font-bold text-gray-700">Spéculation</label><select className="w-full border p-2 rounded bg-white text-gray-900" required value={formData.speculation} onChange={handleSpeculationChange}><option value="">-- Choisir --</option>{speculations.map(s => <option key={s['@id']} value={s['@id']}>{s.name}</option>)}</select></div>
                                    <div><label className="block text-sm font-bold text-gray-700">Standard (Souche)</label><select className="w-full border p-2 rounded bg-white text-gray-900" value={formData.standard} onChange={e => setFormData({...formData, standard: e.target.value})} disabled={!formData.speculation}><option value="">-- Choisir --</option>{filteredStandards.map(s => <option key={s['@id']} value={s['@id']}>{s.name}</option>)}</select></div>
                                    <div><label className="block text-sm font-bold text-gray-700">Bâtiment</label><select className="w-full border p-2 rounded bg-white text-gray-900 disabled:bg-gray-100" required value={formData.building} onChange={e => setFormData({...formData, building: e.target.value})} disabled={!!editingFlockId && !isAdmin}><option value="">-- Choisir --</option>{buildings.filter(b => b.activated).map(b => { const occupied = isBuildingOccupied(b); const isCurrent = formData.building === b['@id']; return (<option key={b['@id']} value={b['@id']} disabled={occupied && !isCurrent}>{b.name} {occupied ? '(Occupé)' : '(Libre)'}</option>); })}</select></div>
                                    <div><label className="block text-sm font-bold text-gray-700">Date d'installation</label><input type="date" required className="w-full border p-2 rounded text-gray-900" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} /></div>
                                    <div><label className="block text-sm font-bold text-gray-700">Effectif</label><input type="number" required min="1" className="w-full border p-2 rounded text-gray-900" value={formData.subjectCount} onChange={e => setFormData({...formData, subjectCount: e.target.value})} /></div>
                                </div>
                                <button type="submit" className="w-full bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700">{editingFlockId ? 'Mettre à jour' : 'Lancer la bande'}</button>
                            </form>
                        )}

                        {/* BARRE DE FILTRES */}
                        <div className="flex flex-col md:flex-row gap-4 bg-gray-100 p-3 rounded-lg border border-gray-200">
                            <div className="flex-1">
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
                        </div>

                        {/* LISTE TRIÉE ET FILTRÉE */}
                        <div className="grid gap-4">
                            {processedFlocks.length === 0 && (
                                <p className="text-center text-gray-500 py-8">Aucune bande ne correspond à votre recherche.</p>
                            )}
                            
                            {processedFlocks.map(flock => (
                                <div key={flock.id} className={`bg-white p-5 rounded-xl border ${flock.closed ? 'border-gray-300 bg-gray-50' : 'border-green-200 border-l-4 border-l-green-500'} shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-md text-gray-800">{flock.name}</h3>
                                            {flock.closed ? <span className="text-xs bg-gray-200 text-gray-600 text-center px-2 py-1 rounded-full font-bold">CLÔTURÉE</span> : <span className="text-xs bg-green-100 text-green-700 text-center px-2 py-1 rounded-full font-bold animate-pulse">EN COURS</span>}
                                            <span className="text-xs bg-indigo-100 text-center text-indigo-700 px-2 py-1 rounded-full">{typeof flock.speculation === 'object' ? flock.speculation.name : 'Spéculation'}</span>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">Installée le {new Date(flock.startDate).toLocaleDateString()} • {flock.subjectCount} sujets</p>
                                        <p className="text-sm font-medium text-gray-600 mt-1">📍 {flock.building ? flock.building.name : 'Aucun bâtiment'}</p>
                                    </div>

                                    <div className="flex gap-2">
                                        {!flock.closed && (
                                            <button onClick={() => handleCloseFlock(flock)} className="text-orange-600 hover:text-orange-800 px-3 py-1 bg-orange-50 rounded text-sm font-bold border border-orange-200" title="Clôturer la bande">🏁 Clôturer</button>
                                        )}
                                        {flock.closed && isSuperAdmin && (
                                            <button onClick={() => handleReopenFlock(flock)} className="text-green-600 hover:text-green-800 px-3 py-1 bg-green-50 rounded text-sm font-bold border border-green-200" title="Réouvrir la bande">🔄 Réouvrir</button>
                                        )}
                                        <button onClick={() => handleEdit(flock)} className="text-blue-500 hover:text-blue-700 p-2 bg-blue-50 rounded hover:bg-blue-100 transition" title="Modifier">✏️</button>
                                        {isAdmin && (
                                            <button onClick={() => handleDelete(flock)} className="text-red-500 hover:text-red-700 p-2 bg-red-50 rounded hover:bg-red-100 transition" title="Supprimer">🗑️</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}