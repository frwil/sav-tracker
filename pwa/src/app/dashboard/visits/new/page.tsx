'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Select from 'react-select';
import Link from 'next/link';
import { useCustomers, CustomerOption } from '@/hooks/useCustomers';
import { useSync } from '@/providers/SyncProvider';

// Types
interface Checkpoint {
    id: number;
    text: string;
    status: 'resolved' | 'partial' | 'unresolved';
}

interface LastVisitInfo {
    date: string;
    tech: string;
    problems: string[];
    recommendations: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function NewVisitPage() {
    const router = useRouter();
    const { addToQueue } = useSync();
    const { options: customerOptions, loading: customersLoading, error: customersError } = useCustomers();

    const [step, setStep] = useState<1 | 2 | 3>(1);
    
    // Étape 1
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
    const [activeVisit, setActiveVisit] = useState<{ id: number, date: string, tech?: string } | null>(null);
    const [checkingStatus, setCheckingStatus] = useState(false);

    // Étape 2
    const [lastVisit, setLastVisit] = useState<LastVisitInfo | null>(null);
    const [checklist, setChecklist] = useState<Checkpoint[]>([]);

    // Étape 3
    const [objective, setObjective] = useState('');
    const [gpsCoordinates, setGpsCoordinates] = useState('');
    const [isGeolocating, setIsGeolocating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // --- 1. DÉTECTION AUTOMATIQUE (Dès la sélection) ---
    useEffect(() => {
        const checkExistingVisit = async () => {
            // Reset si on désélectionne
            if (!selectedCustomer) {
                setActiveVisit(null);
                return;
            }

            setCheckingStatus(true);
            const token = localStorage.getItem('sav_token');

            // Offline : On ne peut pas vérifier, on laisse passer (le serveur bloquera au pire)
            if (!navigator.onLine) {
                setCheckingStatus(false);
                return;
            }

            try {
                // On cherche une visite NON CLÔTURÉE (closed=false) et ACTIVE (activated=true)
                const res = await fetch(`${API_URL}/visits?customer=${selectedCustomer.value}&closed=false&activated=true`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/ld+json' }
                });

                if (res.ok) {
                    const data = await res.json();
                    const visits = data['hydra:member'] || data['member'] || [];
                    
                    if (visits.length > 0) {
                        // 🚨 ALERTE : Une visite existe déjà !
                        const v = visits[0];
                        setActiveVisit({ 
                            id: v.id, 
                            date: v.visitedAt, // ou createdAt selon votre API
                            tech: v.technician?.fullname || v.technician?.username 
                        });
                    } else {
                        setActiveVisit(null);
                    }
                }
            } catch (e) {
                console.error("Erreur vérification visite", e);
            } finally {
                setCheckingStatus(false);
            }
        };

        checkExistingVisit();
    }, [selectedCustomer]); // Se déclenche à chaque changement de client

    // --- 2. PASSAGE ETAPE SUIVANTE (Bouton) ---
    const handleNextStep = async () => {
        if (!selectedCustomer) return;
        
        // Si une visite est active, on empêche de continuer (sécurité doublée)
        if (activeVisit) return;

        const token = localStorage.getItem('sav_token');

        // Mode Offline : on saute directement à l'étape 3 (pas d'historique)
        if (!navigator.onLine) {
            setLastVisit(null); 
            setStep(3); 
            return;
        }

        try {
            // Récupérer la dernière visite TERMINÉE pour l'étape 2 (Revue)
            const lastRes = await fetch(`${API_URL}/visits?customer=${selectedCustomer.value}&order[createdAt]=desc&itemsPerPage=1`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/ld+json' }
            });

            if (lastRes.ok) {
                const lastData = await lastRes.json();
                const lastVisits = lastData['hydra:member'] || lastData['member'] || [];
                
                if (lastVisits.length > 0) {
                    const lv = lastVisits[0];
                    setLastVisit({
                        date: new Date(lv.createdAt || lv.visitedAt).toLocaleDateString('fr-FR'),
                        tech: lv.technician?.fullname || lv.technician?.username || 'Inconnu',
                        problems: lv.problems, // À adapter si vous stockez les problèmes dans la visite
                        recommendations: lv.recommendations || "Aucune recommandation enregistrée."
                    });
                    
                    setChecklist([
                        { id: 1, text: "Vérifier les points précédents", status: 'unresolved' }
                    ]);
                    
                    setStep(2);
                } else {
                    setStep(3); // Pas d'historique, direct formulaire
                }
            } else {
                setStep(3);
            }
        } catch (err) {
            console.error("Erreur historique", err);
            setStep(3);
        }
    };

    // ... (Reste des fonctions : handleGeolocate, handleSubmit sont inchangées)
    const handleGeolocate = () => {
        setIsGeolocating(true);
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setGpsCoordinates(`${position.coords.latitude}, ${position.coords.longitude}`);
                    setIsGeolocating(false);
                },
                (error) => {
                    alert('Erreur: ' + error.message);
                    setIsGeolocating(false);
                }
            );
        } else {
            alert("Géolocalisation non supportée.");
            setIsGeolocating(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        const payload = {
            customer: selectedCustomer?.value,
            objective: objective,
            gpsCoordinates: gpsCoordinates,
        };

        if (!navigator.onLine) {
            addToQueue({ url: '/visits', method: 'POST', body: payload });
            router.push('/dashboard/visits');
            return;
        }

        try {
            const token = localStorage.getItem('sav_token');
            const res = await fetch(`${API_URL}/visits`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData['hydra:description'] || 'Erreur lors de la création');
            }
            router.push('/dashboard/visits');
        } catch (err: any) {
            console.error(err);
            const confirmOffline = window.confirm("Connexion échouée. Sauvegarder en mode hors-ligne ?");
            if (confirmOffline) {
                addToQueue({ url: '/visits', method: 'POST', body: payload });
                router.push('/dashboard/visits');
            } else {
                setError(err.message || "Erreur");
                setIsSubmitting(false);
            }
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-20">
            <h1 className="text-2xl font-bold text-gray-900">Nouvelle Visite</h1>

            {/* Barre de progression */}
            <div className="flex items-center justify-between mb-8">
                <div className={`h-2 flex-1 rounded ${step >= 1 ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
                <div className={`h-2 flex-1 rounded mx-2 ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
                <div className={`h-2 flex-1 rounded ${step >= 3 ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
            </div>

            {/* ÉTAPE 1 : CHOIX CLIENT */}
            {step === 1 && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Sélectionner le Client</label>
                    
                    <Select
                        className="mb-6"
                        options={customerOptions}
                        isLoading={customersLoading}
                        value={selectedCustomer}
                        onChange={setSelectedCustomer}
                        placeholder="Rechercher un client..."
                        noOptionsMessage={() => "Aucun client trouvé"}
                        isDisabled={checkingStatus}
                    />

                    {/* Feedback visuel immédiat */}
                    {checkingStatus && <p className="text-sm text-gray-500 animate-pulse mb-4">🔍 Vérification du dossier client...</p>}

                    {/* ALERTE BLOQUANTE */}
                    {activeVisit ? (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded animate-in slide-in-from-top-2">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">⛔</span>
                                <div>
                                    <h3 className="font-bold text-red-900 text-sm">IMPOSSIBLE DE CRÉER UNE VISITE</h3>
                                    <p className="text-red-700 text-xs mt-1">
                                        Une visite est déjà ouverte chez ce client depuis le <strong>{new Date(activeVisit.date).toLocaleDateString()}</strong>.
                                        {activeVisit.tech && <span> (Tech: {activeVisit.tech})</span>}
                                    </p>
                                </div>
                            </div>
                            
                            <Link 
                                href={`/dashboard/${activeVisit.id}`}
                                className="mt-4 block w-full text-center py-3 bg-red-600 text-white font-bold rounded shadow hover:bg-red-700 transition"
                            >
                                👉 REPRENDRE LA VISITE #{activeVisit.id}
                            </Link>
                        </div>
                    ) : (
                        // BOUTON SUIVANT (Affiché seulement si pas de visite active)
                        <button
                            onClick={handleNextStep}
                            disabled={!selectedCustomer || checkingStatus}
                            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition mt-4 
                                ${!selectedCustomer || checkingStatus ? 'bg-gray-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02]'}
                            `}
                        >
                            Suivant ➜
                        </button>
                    )}
                </div>
            )}

            {/* ÉTAPE 2 : REVUE (Code inchangé mais connecté) */}
            {step === 2 && lastVisit && (
                <div className="bg-white p-6 rounded-xl shadow-sm space-y-6">
                    <h2 className="text-lg font-semibold">2. Revue de la dernière visite</h2>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-gray-500 uppercase">Le {lastVisit.date}</span>
                            <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">{lastVisit.tech}</span>
                        </div>
                        <p className="text-gray-800 italic">"{lastVisit.recommendations}"</p>
                    </div>
                    {/* ... (Checklist UI identique à avant) ... */}
                    <div className="flex justify-between pt-4">
                        <button onClick={() => setStep(1)} className="text-gray-500 font-medium">Retour</button>
                        <button onClick={() => setStep(3)} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition">
                            Tout est vu, commencer
                        </button>
                    </div>
                </div>
            )}

            {/* ÉTAPE 3 : FORMULAIRE (Code inchangé) */}
            {step === 3 && (
                <div className="bg-white p-6 rounded-xl shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        🚀 Démarrer la visite
                        <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            {selectedCustomer?.label}
                        </span>
                    </h2>
                    {error && (<div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{error}</div>)}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Objectif principal</label>
                            <textarea required className="w-full rounded-md border-gray-300 shadow-sm border p-3" rows={3} value={objective} onChange={(e) => setObjective(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Position GPS</label>
                            <div className="flex gap-2">
                                <input type="text" readOnly className="block w-full rounded-md border border-gray-300 bg-gray-100 p-2 text-sm" value={gpsCoordinates} placeholder="Non localisé" />
                                <button type="button" onClick={handleGeolocate} disabled={isGeolocating} className="bg-green-100 text-green-700 px-4 py-2 rounded-md text-sm font-bold">{isGeolocating ? '...' : '📍 Localiser'}</button>
                            </div>
                        </div>
                        <div className="flex justify-between pt-4 border-t">
                            <button type="button" onClick={() => setStep(lastVisit ? 2 : 1)} className="text-gray-500 font-medium text-sm px-4 py-2">Retour</button>
                            <button type="submit" disabled={isSubmitting} className={`px-8 py-3 rounded-lg font-bold text-white shadow-lg transition ${isSubmitting ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}>{isSubmitting ? 'Enregistrement...' : '🚀 DÉMARRER LA VISITE'}</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}