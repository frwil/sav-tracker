'use client';
import { useState, useEffect } from 'react';
import { useSync } from '@/providers/SyncProvider'; // ✅ Import Sync
import { API_URL, Speculation, Standard } from '../shared';

export const NewBuildingForm = ({ customerIri, existingBuildings, onSuccess, onCancel }: any) => {
    const { addToQueue } = useSync(); // ✅ Hook
    const [name, setName] = useState(`Bâtiment ${(existingBuildings?.length || 0) + 1}`);
    const [surface, setSurface] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true);
        const url = '/buildings';
        const body = { name, surface: parseFloat(surface), customer: customerIri, activated: true };

        // ✅ Gestion Offline
        if (!navigator.onLine) {
            addToQueue({ url, method: 'POST', body });
            alert("🌐 Hors ligne : Bâtiment sauvegardé localement.");
            onSuccess(); // Update Optimiste
            return;
        }

        const token = localStorage.getItem('sav_token');
        try {
            const res = await fetch(`${API_URL}${url}`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
                body: JSON.stringify(body) 
            });
            if (res.ok) onSuccess();
        } catch (e) { alert("Erreur"); } finally { setLoading(false); }
    };
    return ( <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg border mb-4"><h4 className="font-bold text-sm mb-2">Nouveau Bâtiment</h4><div className="flex gap-2"><input className="border p-2 rounded flex-1" value={name} onChange={e=>setName(e.target.value)} /><input type="number" className="border p-2 rounded w-24" placeholder="m²" value={surface} onChange={e=>setSurface(e.target.value)} /><button type="submit" className="bg-blue-600 text-white px-3 py-2 rounded">OK</button><button type="button" onClick={onCancel} className="bg-gray-200 text-gray-600 px-3 py-2 rounded">X</button></div></form>);
};

export const NewFlockForm = ({ buildingIri, onSuccess, onCancel }: any) => {
    const { addToQueue } = useSync(); // ✅ Hook
    const [loading, setLoading] = useState(false);
    const [speculations, setSpeculations] = useState<Speculation[]>([]);
    const [formData, setFormData] = useState({ name: '', speculation: '', startDate: '', subjectCount: '' });

    useEffect(() => {
        const loadRefs = async () => {
            if (!navigator.onLine) return; // Pas de chargement des specs en offline (il faudrait un cache)
            const token = localStorage.getItem('sav_token');
            const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/ld+json' };
            try {
                const res = await fetch(`${API_URL}/speculations`, { headers });
                if (res.ok) setSpeculations((await res.json())['hydra:member'] || []);
            } catch (e) {}
        };
        loadRefs();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true);
        const url = '/flocks';
        const body = { ...formData, subjectCount: parseInt(formData.subjectCount), building: buildingIri, activated: true, closed: false };

        // ✅ Gestion Offline
        if (!navigator.onLine) {
            addToQueue({ url, method: 'POST', body });
            alert("🌐 Hors ligne : Bande sauvegardée localement.");
            onSuccess();
            return;
        }

        const token = localStorage.getItem('sav_token');
        try {
            await fetch(`${API_URL}${url}`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
                body: JSON.stringify(body) 
            });
            onSuccess();
        } catch (e) { alert("Erreur"); } finally { setLoading(false); }
    };
    return (<form onSubmit={handleSubmit} className="bg-indigo-50 p-4 rounded mb-4"><h4 className="font-bold text-sm mb-2">Nouvelle Bande</h4><div className="grid grid-cols-2 gap-2"><input className="border p-2" placeholder="Nom" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} /><input type="number" className="border p-2" placeholder="Effectif" value={formData.subjectCount} onChange={e=>setFormData({...formData, subjectCount: e.target.value})} /><input type="date" className="border p-2" value={formData.startDate} onChange={e=>setFormData({...formData, startDate: e.target.value})} /><select className="border p-2" value={formData.speculation} onChange={e=>setFormData({...formData, speculation: e.target.value})}><option value="">Spéculation</option>{speculations.map(s=><option key={s['@id']} value={s['@id']}>{s.name}</option>)}</select></div><div className="flex gap-2 mt-2 justify-end"><button type="button" onClick={onCancel} className="text-gray-500 text-xs font-bold">Annuler</button><button type="submit" className="bg-indigo-600 text-white px-3 py-2 rounded text-xs font-bold">Créer</button></div></form>);
};