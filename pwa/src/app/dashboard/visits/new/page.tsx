'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Select from 'react-select';
import Link from 'next/link';
import { useCustomers, CustomerOption } from '@/hooks/useCustomers';

// ... (Types inchangés)
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api';

export default function NewVisitPage() {
    // ... (Hooks et States inchangés)
    const router = useRouter();
    const { options: customerOptions, loading: customersLoading, error: customersError } = useCustomers();

    const [step, setStep] = useState<1 | 2 | 3>(1);
    
    // Étape 1
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
    const [activeVisit, setActiveVisit] = useState<{ id: number, date: string } | null>(null);
    const [checkingStatus, setCheckingStatus] = useState(false);

    // Étape 2
    const [lastVisit, setLastVisit] = useState<LastVisitInfo | null>(null);
    const [checklist, setChecklist] = useState<Checkpoint[]>([]);
    const [loadingAudit, setLoadingAudit] = useState(false);

    // Étape 3
    const [visitedAt, setVisitedAt] = useState('');
    const [gpsCoordinates, setGpsCoordinates] = useState('');
    const [isGeolocating, setIsGeolocating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    useEffect(() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        setVisitedAt(now.toISOString().slice(0, 16));
    }, []);

    // --- LOGIQUE ÉTAPE 1 : SÉLECTION & VÉRIFICATION ---
    useEffect(() => {
        if (!selectedCustomer) {
            setActiveVisit(null);
            setLastVisit(null);
            return;
        }

        const checkCustomerStatus = async () => {
            setCheckingStatus(true);
            const token = localStorage.getItem('sav_token');
            const customerId = selectedCustomer.value.split('/').pop();

            try {
                const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' };

                // 1. Vérifier si visite EN COURS (Correction ici 👇)
                // On utilise 'closed=false' qui est la propriété métier fiable
                const activeRes = await fetch(`${API_URL}/visits?customer=${customerId}&closed=false`, { headers });
                const activeData = await activeRes.json();
                
                // API Platform retourne 'hydra:member' ou un tableau direct selon la config
                const activeList = activeData['hydra:member'] || activeData || [];

                if (activeList.length > 0) {
                    setActiveVisit({ id: activeList[0].id, date: activeList[0].visitedAt });
                    setCheckingStatus(false);
                    return; // Stop, on bloque
                } else {
                    setActiveVisit(null); // On s'assure de nettoyer si aucune visite active
                }

                // 2. Charger la DERNIÈRE VISITE clôturée pour l'audit
                setLoadingAudit(true);
                // Pour l'historique, on cherche explicitement celle qui est 'closed=true'
                const historyRes = await fetch(`${API_URL}/visits?customer=${customerId}&closed=true&order[visitedAt]=desc&itemsPerPage=1`, { headers });
                const historyData = await historyRes.json();
                const historyList = historyData['hydra:member'] || historyData || [];

                if (historyList.length > 0) {
                    const lastV = historyList[0];
                    const obsRes = await fetch(`${API_URL}/observations?visit=${lastV.id}`, { headers });
                    const obsData = await obsRes.json();
                    const obsList = obsData['hydra:member'] || obsData || [];

                    let problemsList: string[] = [];
                    let recs = "";

                    obsList.forEach((obs: any) => {
                        if (obs.problems) {
                            const lines = obs.problems.split(/\r?\n|-/).map((s: string) => s.trim()).filter((s: string) => s.length > 0);
                            problemsList = [...problemsList, ...lines];
                        }
                        if (obs.recommendations) recs += obs.recommendations + "\n";
                    });

                    if (problemsList.length > 0) {
                        setLastVisit({
                            date: lastV.visitedAt,
                            tech: lastV.technician?.fullname || 'Inconnu',
                            problems: problemsList,
                            recommendations: recs
                        });
                        setChecklist(problemsList.map((txt, idx) => ({ id: idx, text: txt, status: 'unresolved' })));
                    } else {
                        setLastVisit(null);
                    }
                } else {
                    setLastVisit(null);
                }

            } catch (e) {
                console.error(e);
            } finally {
                setCheckingStatus(false);
                setLoadingAudit(false);
            }
        };

        checkCustomerStatus();
    }, [selectedCustomer]);

    // ... (Reste des fonctions handleNextStep, updateChecklist, handleGeolocate, handleSubmit, render...)
    const handleNextStep = () => {
        if (lastVisit && checklist.length > 0) {
            setStep(2);
        } else {
            setStep(3);
        }
    };

    const updateChecklist = (id: number, status: 'resolved' | 'partial' | 'unresolved') => {
        setChecklist(prev => prev.map(item => item.id === id ? { ...item, status } : item));
    };

    const handleGeolocate = () => {
        if (!navigator.geolocation) return alert("Non supporté");
        setIsGeolocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setGpsCoordinates(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
                setIsGeolocating(false);
            },
            (err) => {
                alert("Erreur localisation.");
                setIsGeolocating(false);
            },
            { enableHighAccuracy: true, timeout: 5000 }
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const token = localStorage.getItem('sav_token');

        try {
            const visitRes = await fetch(`${API_URL}/visits`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    customer: selectedCustomer?.value,
                    visitedAt: new Date(visitedAt).toISOString(),
                    gpsCoordinates: gpsCoordinates || null,
                })
            });

            if (!visitRes.ok) throw new Error('Erreur création visite');
            const newVisit = await visitRes.json();

            if (lastVisit && checklist.length > 0) {
                const summaryLines = checklist.map(c => {
                    const icon = c.status === 'resolved' ? '✅' : c.status === 'partial' ? '⚠️' : '❌';
                    const state = c.status === 'resolved' ? 'Résolu' : c.status === 'partial' ? 'Partiel' : 'Non résolu';
                    return `${icon} [${state}] ${c.text}`;
                });
                
                const followUpText = `SUIVI VISITE DU ${new Date(lastVisit.date).toLocaleDateString()} :\n${summaryLines.join('\n')}`;

                await fetch(`${API_URL}/observations`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        visit: newVisit['@id'],
                        observation: "Point sur les actions correctives précédentes.",
                        generalComment: followUpText,
                        problems: checklist.some(c => c.status !== 'resolved') ? "Persistance de problèmes précédents (voir détail)" : null
                    })
                });
            }

            router.push(`/dashboard/${newVisit.id}`);

        } catch (err) {
            setSubmitError("Impossible de créer la visite.");
            setIsSubmitting(false);
        }
    };

    const CustomerHeader = () => (
        <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-lg flex justify-between items-center shadow-sm">
            <div>
                <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider block mb-1">Client sélectionné</span>
                <p className="text-xl font-extrabold text-indigo-900">{selectedCustomer?.label}</p>
            </div>
            <div className="text-3xl opacity-20">👤</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans">
            {/* HEADER */}
            <div className="bg-white shadow px-6 py-6 mb-6">
                <h1 className="text-xl font-extrabold text-gray-800 mb-4">Nouvelle Visite</h1>
                <div className="flex items-center">
                    <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
                    <div className={`w-8 h-8 flex items-center justify-center rounded-full text-white text-sm font-bold z-10 -ml-2 ${step >= 1 ? 'bg-indigo-600' : 'bg-gray-300'}`}>1</div>
                    <div className={`flex-1 h-2 rounded-full -ml-2 ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
                    <div className={`w-8 h-8 flex items-center justify-center rounded-full text-white text-sm font-bold z-10 -ml-2 ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-300'}`}>2</div>
                    <div className={`flex-1 h-2 rounded-full -ml-2 ${step >= 3 ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
                    <div className={`w-8 h-8 flex items-center justify-center rounded-full text-white text-sm font-bold z-10 -ml-2 ${step >= 3 ? 'bg-indigo-600' : 'bg-gray-300'}`}>3</div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2 font-medium">
                    <span>Client</span>
                    <span className="text-center">Suivi & Audit</span>
                    <span className="text-right">Démarrage</span>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4">
                
                {/* STEP 1 */}
                {step === 1 && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-fade-in">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Sélectionnez le client</label>
                        <Select
                            options={customerOptions}
                            onChange={setSelectedCustomer}
                            placeholder="Rechercher..."
                            isLoading={customersLoading}
                            className="text-sm mb-4"
                        />

                        {checkingStatus && <p className="text-indigo-600 text-sm animate-pulse">Vérification du dossier...</p>}

                        {activeVisit && (
                            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-4 text-orange-800">
                                <span className="text-2xl">🚧</span>
                                <div>
                                    <p className="font-bold">Visite déjà en cours !</p>
                                    <Link href={`/dashboard/${activeVisit.id}`} className="text-sm underline hover:text-orange-900">
                                        Reprendre la visite du {new Date(activeVisit.date).toLocaleDateString()}
                                    </Link>
                                </div>
                            </div>
                        )}

                        {!activeVisit && selectedCustomer && !checkingStatus && (
                            <div className="mt-6 flex justify-end">
                                <button onClick={handleNextStep} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition">
                                    {lastVisit ? "Suivant : Voir checklist" : "Suivant : Démarrer"}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 2 */}
                {step === 2 && lastVisit && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-fade-in">
                        <CustomerHeader />
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                            <span className="text-3xl">📋</span>
                            <div>
                                <h2 className="text-lg font-bold text-gray-800">Revue de la dernière visite</h2>
                                <p className="text-sm text-gray-500">Par {lastVisit.tech} le {new Date(lastVisit.date).toLocaleDateString()}</p>
                            </div>
                        </div>

                        <div className="space-y-4 mb-8">
                            <p className="text-sm font-medium text-gray-700 uppercase">Points critiques à vérifier :</p>
                            {checklist.map((item) => (
                                <div key={item.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <p className="text-sm text-gray-800 font-medium flex-1">{item.text}</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => updateChecklist(item.id, 'resolved')} className={`px-3 py-1 rounded text-xs font-bold border transition ${item.status === 'resolved' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-white text-gray-400'}`}>✅ Résolu</button>
                                        <button onClick={() => updateChecklist(item.id, 'partial')} className={`px-3 py-1 rounded text-xs font-bold border transition ${item.status === 'partial' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-white text-gray-400'}`}>⚠️ Partiel</button>
                                        <button onClick={() => updateChecklist(item.id, 'unresolved')} className={`px-3 py-1 rounded text-xs font-bold border transition ${item.status === 'unresolved' ? 'bg-red-100 text-red-800 border-red-300' : 'bg-white text-gray-400'}`}>❌ Non</button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {lastVisit.recommendations && (
                            <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 mb-6">
                                <span className="font-bold">Rappel Recommandations :</span>
                                <p className="mt-1 whitespace-pre-line">{lastVisit.recommendations}</p>
                            </div>
                        )}

                        <div className="flex justify-between mt-6">
                            <button onClick={() => setStep(1)} className="text-gray-500 hover:text-gray-700 font-medium text-sm">Retour</button>
                            <button onClick={() => setStep(3)} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition flex items-center gap-2">Valider & Continuer →</button>
                        </div>
                    </div>
                )}

                {/* STEP 3 */}
                {step === 3 && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-fade-in">
                        <CustomerHeader />
                        <h2 className="text-lg font-bold text-gray-800 mb-6">Initialisation de la visite</h2>
                        {submitError && <div className="p-3 bg-red-100 text-red-700 rounded mb-4 text-sm font-bold">{submitError}</div>}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Date et Heure</label>
                                <input type="datetime-local" required className="block w-full rounded-md border border-gray-300 shadow-sm p-2" value={visitedAt} onChange={(e) => setVisitedAt(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Position GPS</label>
                                <div className="flex gap-2">
                                    <input type="text" readOnly className="block w-full rounded-md border border-gray-300 bg-gray-100 p-2 text-gray-500 text-sm" value={gpsCoordinates} placeholder="Non localisé" />
                                    <button type="button" onClick={handleGeolocate} disabled={isGeolocating} className="bg-green-100 text-green-700 px-4 py-2 rounded-md text-sm font-bold hover:bg-green-200 whitespace-nowrap">{isGeolocating ? '...' : '📍 Localiser'}</button>
                                </div>
                            </div>
                            <div className="flex justify-between pt-4 border-t">
                                <button type="button" onClick={() => setStep(lastVisit ? 2 : 1)} className="text-gray-500 font-medium text-sm">Retour</button>
                                <button type="submit" disabled={isSubmitting} className="bg-indigo-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200">{isSubmitting ? 'Création...' : '🚀 DÉMARRER LA VISITE'}</button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}