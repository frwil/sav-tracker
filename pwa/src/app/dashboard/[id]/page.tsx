'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSync } from '@/providers/SyncProvider'; // ✅ Import Sync
import { API_URL, Visit } from './shared';
import { NewBuildingForm, NewFlockForm } from './components/Forms';
import { FlockItem } from './components/FlockItem';

export default function VisitDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { addToQueue } = useSync(); // ✅ Hook Sync
    const [visit, setVisit] = useState<Visit | null>(null);
    const [loading, setLoading] = useState(true);
    const [showNewBuilding, setShowNewBuilding] = useState(false);
    const [showNewFlockForBuilding, setShowNewFlockForBuilding] = useState<string | null>(null);

    const fetchVisit = async () => {
        const token = localStorage.getItem('sav_token');
        if (!token) { router.push('/'); return; }
        
        // En offline, si pas de données, on ne peut pas fetcher (sauf si React Query cache est actif ailleurs)
        if (!navigator.onLine && !visit) {
            console.warn("Hors ligne : affichage limité.");
        }

        try {
            const res = await fetch(`${API_URL}/visits/${id}`, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/ld+json' } });
            if (res.ok) setVisit(await res.json());
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { fetchVisit(); }, [id]);

    const hasAtLeastOneObservation = () => {
        return visit && visit.observations && visit.observations.length > 0;
    };

    const handleCloseVisit = async () => {
        if (!visit) return;
        if (!hasAtLeastOneObservation()) { 
            alert("⚠️ IMPOSSIBLE DE TERMINER !\n\nVous devez saisir au moins une observation pour valider la visite."); 
            return; 
        }
        if (!confirm("Voulez-vous vraiment clôturer cette visite ?\nCette action est irréversible.")) return;
        
        const url = `/visits/${visit.id}/close`;
        const method = 'PATCH';
        const body = {};

        // ✅ Gestion Offline
        if (!navigator.onLine) {
            addToQueue({ url, method, body });
            alert("🌐 Hors ligne : La clôture sera synchronisée dès le retour de la connexion.");
            // On redirige pour donner l'impression que c'est fini
            router.push('/dashboard/visits'); 
            return;
        }

        const token = localStorage.getItem('sav_token');
        try {
            await fetch(`${API_URL}${url}`, { 
                method, 
                headers: { 'Content-Type': 'application/merge-patch+json', 'Authorization': `Bearer ${token}` }, 
                body: JSON.stringify(body) 
            });
            fetchVisit();
            alert('Visite clôturée avec succès.');
            router.push('/dashboard/visits');
        } catch (e) { alert("Erreur lors de la clôture."); }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-indigo-600 animate-pulse">Chargement...</div>;
    if (!visit) return <div className="p-8 text-center">Visite introuvable (ou problème connexion)</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-24 font-sans">
             {/* Header */}
             <div className={`px-6 py-8 pb-12 rounded-b-[3rem] shadow-xl text-white mb-6 ${visit.closed ? 'bg-gray-800' : 'bg-gradient-to-r from-indigo-600 to-purple-600'}`}>
                <div className="max-w-4xl mx-auto flex justify-between items-start">
                    <div>
                        <Link href="/dashboard/visits" className="text-indigo-200 text-xs font-bold uppercase mb-2 block">← Retour</Link>
                        <h1 className="text-3xl font-extrabold">{visit.customer.name}</h1>
                        <p className="text-sm opacity-90">📍 {visit.customer.zone}</p>
                        <p className="text-sm font-bold bg-white/20 inline-block px-2 py-0.5 rounded mt-1">👨‍🔧 @{visit.technician?.fullname || 'Technicien'}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-bold">{new Date(visit.visitedAt).toLocaleDateString()}</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mt-2 ${visit.closed ? 'bg-gray-700' : 'bg-white/20'}`}>{visit.closed ? '🔒 CLÔTURÉE' : '🟢 EN COURS'}</span>
                    </div>
                </div>
             </div>
             
             <div className="max-w-4xl mx-auto px-4 -mt-8 relative z-10 space-y-6">
                {!visit.closed && <div className="flex justify-end"><button onClick={() => setShowNewBuilding(!showNewBuilding)} className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-bold shadow hover:bg-indigo-50 text-sm transition">{showNewBuilding ? 'Annuler' : '+ Nouveau Bâtiment'}</button></div>}
                
                {showNewBuilding && <NewBuildingForm customerIri={visit.customer['@id']} existingBuildings={visit.customer.buildings || []} onSuccess={()=>{setShowNewBuilding(false);fetchVisit()}} onCancel={()=>setShowNewBuilding(false)} />}
                
                {visit.customer.buildings?.map(b => (
                    <div key={b.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-gray-700 uppercase text-xs tracking-wider">{b.name}</h3>
                            <div className="flex gap-2">
                                {!b.activated && <span className="text-[10px] text-red-500 font-bold">INACTIF</span>}
                                {!visit.closed && b.activated && <button onClick={()=>setShowNewFlockForBuilding(b['@id'])} className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-bold hover:bg-indigo-200">+ Bande</button>}
                            </div>
                        </div>
                        <div className="p-4">
                            {showNewFlockForBuilding === b['@id'] && <NewFlockForm buildingIri={b['@id']} onSuccess={()=>{setShowNewFlockForBuilding(null);fetchVisit()}} onCancel={()=>setShowNewFlockForBuilding(null)} />}
                            {b.flocks && b.flocks.length > 0 ? b.flocks.map(f => (
                                <FlockItem 
                                    key={f.id} 
                                    flock={f} 
                                    building={b} 
                                    visit={visit} 
                                    visitObservations={visit.observations} 
                                    visitIri={visit['@id']}
                                    isVisitClosed={visit.closed} 
                                    onRefresh={fetchVisit} 
                                />
                            )) : !showNewFlockForBuilding && <p className="text-center text-sm text-gray-400 italic">Aucune bande active.</p>}
                        </div>
                    </div>
                ))}

                {!visit.closed && (
                    <div className="flex flex-col items-center justify-center pt-8 pb-4 gap-3 border-t border-gray-200 mt-8">
                        <button onClick={handleCloseVisit} className={`px-8 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all transform hover:scale-105 ${hasAtLeastOneObservation() ? 'bg-gray-900 text-white hover:bg-black' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>🏁 Terminer la Visite</button>
                        {!hasAtLeastOneObservation() && <p className="text-xs text-red-500 font-bold bg-red-50 px-3 py-1 rounded-full animate-pulse border border-red-100">⚠️ Saisissez une observation pour débloquer la clôture</p>}
                    </div>
                )}
             </div>
        </div>
    );
}