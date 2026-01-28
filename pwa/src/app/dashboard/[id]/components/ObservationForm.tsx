'use client';
import { useState, useEffect, useMemo } from 'react';
import { useSync } from '@/providers/SyncProvider'; 
import { API_URL, ProphylaxisTask, calculateAgeInDays, calculateBenchmark, getWaterOptions, getFieldFeedback, getPreviousWeight, getHistoricalObservations, generateExpertInsights, BenchmarkCard } from '../shared';

export const ObservationForm = ({ visitIri, flock, building, visit, initialData, onSuccess, onCancel }: any) => {
    const { addToQueue } = useSync();
    const [loading, setLoading] = useState(false);
    const isEditMode = !!initialData?.id;
    const [vaccines, setVaccines] = useState<ProphylaxisTask[]>([]);
    const [dueVaccines, setDueVaccines] = useState<ProphylaxisTask[]>([]);

    // --- 1. DÉTECTION DU TYPE D'ANIMAL ---
    const specName = flock.speculation?.name?.toLowerCase() || '';
    const isFish = specName.includes('pisciculture') || specName.includes('poisson') || specName.includes('clarias') || specName.includes('tilapia');
    const isPig = specName.includes('porc') || specName.includes('suidé');

    // --- 2. GESTION DE L'HISTORIQUE ---
    const historyList = useMemo(() => getHistoricalObservations(flock, initialData?.id), [flock, initialData]);
    const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        if (historyList.length > 0 && !selectedHistoryId) {
            setSelectedHistoryId(historyList[0].id);
        }
    }, [historyList]);

    const displayedHistory = useMemo(() => historyList.find(h => h.id == selectedHistoryId), [historyList, selectedHistoryId]);

    // --- 3. DONNÉES DE BASE ---
    useEffect(() => {
        const fetchProphy = async () => {
            if (!navigator.onLine) return;
            const token = localStorage.getItem('sav_token');
            const specId = flock.speculation.id; 
            if(!specId) return;
            try {
                const res = await fetch(`${API_URL}/prophylaxis_tasks?speculation.id=${specId}`, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/ld+json' } });
                if(res.ok) {
                    const data = await res.json();
                    setVaccines(data['hydra:member'] || []);
                }
            } catch(e) { console.error("Erreur vaccin", e); }
        };
        fetchProphy();
    }, [flock.speculation]);

    const [showCorrectionModal, setShowCorrectionModal] = useState(false);
    const [correctionReason, setCorrectionReason] = useState('');
    const [previousWeight, setPreviousWeight] = useState(0);
    useEffect(() => { setPreviousWeight(getPreviousWeight(flock, initialData?.id)); }, [flock, initialData]);

    const [feedStrategy, setFeedStrategy] = useState<'INDUSTRIAL' | 'SELF_MIX' | 'THIRD_PARTY'>(flock.feedStrategy || 'INDUSTRIAL');
    const [feedBrand, setFeedBrand] = useState(flock.feedFormula || '');

    const handleStrategyChange = (newStrategy: 'INDUSTRIAL' | 'SELF_MIX' | 'THIRD_PARTY') => {
        setFeedStrategy(newStrategy);
        setFeedBrand(''); 
    };

    const availableFormulas = useMemo(() => {
        if (feedStrategy === 'THIRD_PARTY') return []; 
        if (isFish) {
            if (feedStrategy === 'INDUSTRIAL') return ['BELGO FISH 2mm', 'BELGO FISH 3mm', 'BELGO FISH 4.5mm', 'BELGO FISH 6mm', 'BELGO FISH 8mm', 'Autre Extrudé'];
            return []; 
        }
        if (isPig) {
            if (feedStrategy === 'INDUSTRIAL') return ['Piglet Booster', 'Démarrage Porc', 'Croissance Porc', 'Finition Porc', 'Truie Gestante', 'Truie Allaitante'];
            if (feedStrategy === 'SELF_MIX') return ['BELGOCAM 45%', 'BELGOCAM 5%', 'Autre Concentré'];
        }
        if (feedStrategy === 'INDUSTRIAL') return ['SPC (Standard)', 'Chick Booster', 'Démarrage', 'Croissance', 'Finition', 'Pondeuse Phase 1', 'Pondeuse Phase 2'];
        if (feedStrategy === 'SELF_MIX') return ['BELGOCAM', 'KOUDIJS', 'TROUW', 'Autre Concentré'];
        return [];
    }, [feedStrategy, isFish, isPig]);

    const [inventory, setInventory] = useState(initialData?.data?.inventory || { complete: { current: 0, added: 0 }, mais: { current: 0, added: 0 }, soja: { current: 0, added: 0 }, concentre: { current: 0, added: 0 } });
    const [common, setCommon] = useState({ concerns: initialData?.concerns || '', observation: initialData?.observation || '', recommendations: initialData?.recommendations || '', problems: initialData?.problems || '' });

    const [data, setData] = useState<any>({ 
        age: initialData?.data?.age || 0, mortalite: initialData?.data?.mortalite || 0, poidsMoyen: initialData?.data?.poidsMoyen || 0, consoTete: initialData?.data?.consoTete || 0,
        phValue: initialData?.data?.phValue || '', litiere: initialData?.data?.litiere || '', uniformite: initialData?.data?.uniformite || '', cv: initialData?.data?.cv || '',
        waterConsumptionIncrease: initialData?.data?.waterConsumptionIncrease || 'yes', biosecurite: initialData?.data?.biosecurite || 'ok',
        abreuvoirs: initialData?.data?.abreuvoirs || 0, mangeoires: initialData?.data?.mangeoires || 0, vaccinesDone: initialData?.data?.vaccinesDone || [], ...initialData?.data 
    });

    useEffect(() => {
        if (initialData?.data?.age) return;
        if (flock.startDate) {
            const today = new Date().toISOString();
            const calcAge = calculateAgeInDays(flock.startDate, today);
            if (data.age !== calcAge) {
                setData((p: any) => ({ ...p, age: calcAge }));
                const due = vaccines.filter(v => v.targetDay >= calcAge - 2 && v.targetDay <= calcAge + 2);
                setDueVaccines(due);
            }
        }
    }, [flock.startDate, initialData, vaccines]);

    const updateInventory = (type: string, field: 'current' | 'added', value: number) => setInventory((prev: any) => ({ ...prev, [type]: { ...prev[type], [field]: value } }));
    const updateData = (key: string, value: any) => setData((prev: any) => ({ ...prev, [key]: value }));
    
    // --- 4. CALCULS EN TEMPS RÉEL (Restaurés) ---
    const benchmark = calculateBenchmark(data.age, data.poidsMoyen, data.consoTete, flock.standard?.curveData || []);
    const waterOptions = getWaterOptions(flock.speculation.name);
    
    const phFeedback = getFieldFeedback('phValue', data.phValue);
    const litiereFeedback = getFieldFeedback('litiere', data.litiere);
    const unifFeedback = getFieldFeedback('uniformite', data.uniformite);
    // On ajoute le feedback CV
    const cvFeedback = getFieldFeedback('cv', data.cv);

    // ✅ Génération des Insights "Live"
    const liveInsights = useMemo(() => {
        const surface = building.surface || 1;
        const estimatedDensity = (flock.subjectCount - data.mortalite) / surface; 
        
        // Objet temporaire simulant une observation complète pour la fonction partagée
        const tempObs = {
            data: {
                ...data,
                feedStrategy,
                inventory,
                // On passe les champs critiques explicitement
                mangeoires: data.mangeoires,
                abreuvoirs: data.abreuvoirs,
                waterConsumptionIncrease: data.waterConsumptionIncrease,
                litiere: data.litiere,
                cv: data.cv,
                uniformite: data.uniformite
            }
        };

        return generateExpertInsights(
            tempObs, 
            flock, 
            benchmark, 
            parseFloat(estimatedDensity.toFixed(1)), 
            data.mortalite,
            dueVaccines
        );
    }, [data, flock, benchmark, building.surface, dueVaccines, feedStrategy, inventory]);

    // --- 5. SAUVEGARDE ---
    const saveObservation = async () => {
        const token = localStorage.getItem('sav_token');
        if (!token && navigator.onLine) { alert("⚠️ Session expirée."); return; }
        if (!feedBrand || feedBrand.trim() === '') { alert("⚠️ Précisez le type/marque d'aliment."); return; }

        const finalData = { ...data, feedStrategy, feedBrand, inventory, weightCorrection: correctionReason ? { ticketId: `TKT-${Date.now()}`, reason: correctionReason, previous: previousWeight, declared: data.poidsMoyen } : null };
        const body = { visit: visitIri, flock: flock['@id'], observedAt: initialData?.observedAt || new Date().toISOString(), ...common, data: finalData };
        
        // Sauvegarde Stratégie (Flock)
        if (feedStrategy !== flock.feedStrategy || (feedStrategy === 'THIRD_PARTY' && feedBrand !== flock.feedFormula)) {
            const patchUrl = `/flocks/${flock.id}`;
            const patchBody: any = { feedStrategy, feedFormula: feedBrand };
            if (!navigator.onLine) addToQueue({ url: patchUrl, method: 'PATCH', body: patchBody });
            else await fetch(`${API_URL}${patchUrl}`, { method: 'PATCH', headers: { 'Content-Type': 'application/merge-patch+json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(patchBody) }).catch(console.error);
        }

        // Sauvegarde Observation
        const url = isEditMode ? `/observations/${initialData!.id}` : `/observations`;
        const method = isEditMode ? 'PATCH' : 'POST';

        if (!navigator.onLine) {
            addToQueue({ url, method, body });
            alert("🌐 Hors ligne : Sauvegardé localement.");
            onSuccess();
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(`${API_URL}${url}`, { method, headers: { 'Content-Type': isEditMode ? 'application/merge-patch+json' : 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(body) });
            if (res.ok) onSuccess();
            else {
                const errData = await res.json();
                throw new Error(errData.detail || "Erreur enregistrement.");
            }
        } catch (e: any) { alert(`Erreur: ${e.message}`); } finally { setLoading(false); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (data.poidsMoyen <= 0) { alert("⛔ Poids invalide"); return; }
        if (previousWeight > 0 && data.poidsMoyen < previousWeight) {
            const dropPercentage = ((previousWeight - data.poidsMoyen) / previousWeight) * 100;
            if (dropPercentage > 10) { setShowCorrectionModal(true); return; }
        }
        setLoading(true);
        await saveObservation();
    };

    return (
        <div className="relative">
             {showCorrectionModal && (
                 <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 border-4 border-red-500 rounded-lg shadow-2xl animate-fade-in">
                     <p className="text-red-700 font-black text-xl mb-4">🚨 ANOMALIE POIDS</p>
                     <textarea className="w-full border-2 border-red-300 p-3 rounded mb-4" rows={3} placeholder="Justification..." value={correctionReason} onChange={e => setCorrectionReason(e.target.value)} />
                     <div className="flex gap-3 w-full"><button onClick={() => setShowCorrectionModal(false)} className="flex-1 py-3 bg-gray-200 rounded">Annuler</button><button onClick={() => {if(correctionReason) saveObservation()}} className="flex-1 py-3 bg-red-600 text-white font-bold rounded">VALIDER</button></div>
                 </div>
             )}
            
            {/* HISTORIQUE */}
            {historyList.length > 0 && (
                <div className="mb-4">
                    <button type="button" onClick={() => setShowHistory(!showHistory)} className="w-full flex items-center justify-between px-4 py-2 bg-yellow-100 text-yellow-900 rounded-lg font-bold text-xs border border-yellow-200 hover:bg-yellow-200 transition">
                        <span>📚 Historique ({historyList.length})</span><span>{showHistory ? '▼' : '▶'}</span>
                    </button>
                    {showHistory && (
                        <div className="mt-2 bg-yellow-50 p-3 rounded-lg border border-yellow-200 animate-in slide-in-from-top-2">
                            <select className="w-full text-xs p-2 rounded border border-yellow-300 bg-white mb-3" value={selectedHistoryId || ''} onChange={(e) => setSelectedHistoryId(Number(e.target.value))}>
                                {historyList.map((h: any) => (<option key={h.id} value={h.id}>J{h.data.age} - {new Date(h.observedAt).toLocaleDateString()}</option>))}
                            </select>
                            {displayedHistory && (
                                <div className="text-xs text-gray-700 grid grid-cols-2 gap-2">
                                    <span>⚖️ {displayedHistory.data.poidsMoyen}g</span><span>☠️ {displayedHistory.data.mortalite}</span>
                                    <span className="col-span-2 italic text-gray-500">{displayedHistory.problems ? `⚠️ ${displayedHistory.problems.substring(0, 50)}...` : 'RAS'}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white p-5 rounded-lg shadow-lg border-l-4 border-indigo-500 relative animate-fade-in">
                
                {dueVaccines.length > 0 && (
                    <div className="bg-blue-100 border-l-4 border-blue-600 p-4 mb-4 rounded"><h4 className="font-bold text-blue-900 flex items-center gap-2">💉 VACCINATION (J{data.age})</h4><div className="mt-2 space-y-2">{dueVaccines.map(task => (<div key={task.id} className="flex items-center justify-between bg-white p-2 rounded shadow-sm"><span className="font-bold text-sm text-gray-700">{task.name} ({task.type})</span><label className="flex items-center gap-2 text-sm"><input type="checkbox" className="w-4 h-4" checked={data.vaccinesDone?.includes(task.id)} onChange={e => { const done = data.vaccinesDone || []; if(e.target.checked) updateData('vaccinesDone', [...done, task.id]); else updateData('vaccinesDone', done.filter((id:any) => id !== task.id)); }} /> Fait</label></div>))}</div></div>
                )}
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div><label className="text-[10px] font-bold text-gray-500 uppercase">Âge</label><div className="font-bold text-gray-700">{data.age} Jours</div></div>
                    <div><label className="text-[10px] font-bold text-gray-500 uppercase">Mortalité</label><input type="number" className="w-full border p-1 rounded bg-red-50 font-bold text-red-900" value={data.mortalite} onChange={e => updateData('mortalite', parseInt(e.target.value) || 0)} /></div>
                    <div><label className="text-[10px] font-bold text-gray-500 uppercase">Poids (g)</label><input type="number" step="0.1" className="w-full border p-1 rounded font-bold" value={data.poidsMoyen} onChange={e => updateData('poidsMoyen', parseFloat(e.target.value) || 0)} /><BenchmarkCard benchmark={benchmark} type="weight" /></div>
                     <div><label className="text-[10px] font-bold text-gray-500 uppercase">Conso (g/tête)</label><input type="number" className="w-full border p-1 rounded" value={data.consoTete} onChange={e => updateData('consoTete', parseFloat(e.target.value) || 0)} /><BenchmarkCard benchmark={benchmark} type="feed" /></div>
                </div>

                <h4 className="text-xs font-bold text-indigo-900 uppercase mb-2 border-b">Qualité & Environnement</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div><label className="block text-[10px] font-bold text-gray-500 uppercase">pH Eau</label><select className={`w-full border p-2 rounded text-sm bg-white ${phFeedback.style}`} value={data.phValue} onChange={e => updateData('phValue', e.target.value)}><option value="">-- Qualité --</option>{waterOptions.map((opt, idx) => <option key={idx} value={opt}>{opt}</option>)}</select></div>
                    <div><label className="block text-[10px] font-bold text-gray-500 uppercase">Litière</label><select className={`w-full border p-2 rounded text-sm ${litiereFeedback.style}`} value={data.litiere} onChange={e => updateData('litiere', e.target.value)}><option value="">-- État --</option><option value="Sèche / Friable">✅ Sèche / Friable</option><option value="Légèrement Humide">⚠️ Légèrement Humide</option><option value="Collante / Détrempée">🚨 Collante / Détrempée</option><option value="Croûteuse">🚨 Croûteuse</option></select></div>
                    <div><label className="block text-[10px] font-bold text-gray-500 uppercase">Uniformité</label><select className={`w-full border p-2 rounded text-sm ${unifFeedback.style}`} value={data.uniformite} onChange={e => updateData('uniformite', e.target.value)}><option value="">-- Taux --</option><option value="> 90% (Excellent)">🏆 &gt; 90%</option><option value="80% - 90% (Bon)">✅ 80% - 90%</option><option value="60% - 80% (Moyen)">⚠️ 60% - 80%</option><option value="< 60% (Mauvais)">🚨 &lt; 60%</option></select></div>
                    <div><label className="block text-[10px] font-bold text-gray-500 uppercase">CV (%)</label><select className="w-full border p-2 rounded text-sm" value={data.cv} onChange={e => updateData('cv', e.target.value)}><option value="">-- Taux --</option><option value="< 8 (Excellent)">🏆 &lt; 8</option><option value="8 - 10 (Bon)">✅ 8 - 10</option><option value="10 - 12 (Moyen)">⚠️ 10 - 12</option><option value="> 12 (Mauvais)">🚨 &gt; 12</option></select></div>
                    <div><label className="block text-[10px] font-bold text-gray-500 uppercase">Mangeoires</label><input type="number" className="w-full border p-2 rounded" placeholder="Qté" value={data.mangeoires} onChange={e => updateData('mangeoires', parseFloat(e.target.value))} /></div>
                    <div><label className="block text-[10px] font-bold text-gray-500 uppercase">Abreuvoirs</label><input type="number" className="w-full border p-2 rounded" placeholder="Qté" value={data.abreuvoirs} onChange={e => updateData('abreuvoirs', parseFloat(e.target.value))} /></div>
                    <div className="col-span-2"><label className="block text-[10px] font-bold text-gray-500 uppercase">Tendance Conso Eau</label><div className="flex gap-1"><button type="button" onClick={() => updateData('waterConsumptionIncrease', 'yes')} className={`flex-1 py-2 text-xs rounded border ${data.waterConsumptionIncrease === 'yes' ? 'bg-green-100 border-green-500 text-green-800' : 'bg-gray-50'}`}>↗️ Hausse</button><button type="button" onClick={() => updateData('waterConsumptionIncrease', 'stable')} className={`flex-1 py-2 text-xs rounded border ${data.waterConsumptionIncrease === 'stable' ? 'bg-blue-100 border-blue-500 text-blue-800' : 'bg-gray-50'}`}>➡️ Stable</button><button type="button" onClick={() => updateData('waterConsumptionIncrease', 'no')} className={`flex-1 py-2 text-xs rounded border ${data.waterConsumptionIncrease === 'no' ? 'bg-red-100 border-red-500 text-red-800' : 'bg-gray-50'}`}>↘️ Baisse</button></div></div>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 mb-6">
                    <h4 className="text-xs font-bold text-orange-900 uppercase mb-3">🥣 Alimentation <span className="text-[10px] bg-white border px-2 rounded-full text-gray-500 normal-case">{isFish ? '🐟 Pisciculture' : isPig ? '🐖 Porc' : '🐔 Volaille'}</span></h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Type</label><select className="w-full border p-2 rounded text-sm bg-white" value={feedStrategy} onChange={(e) => handleStrategyChange(e.target.value as any)}><option value="INDUSTRIAL">🏭 Industriel</option>{!isFish && <option value="SELF_MIX">🏗️ Fabriqué</option>}<option value="THIRD_PARTY">🛒 Vrac</option></select></div>
                        <div><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{feedStrategy === 'THIRD_PARTY' ? 'Marque' : 'Formule'}</label>{feedStrategy === 'THIRD_PARTY' ? (<input type="text" className="w-full border p-2 rounded text-sm bg-white" placeholder="Ex: Provenderie..." value={feedBrand} onChange={(e) => setFeedBrand(e.target.value)} />) : (<select className={`w-full border p-2 rounded text-sm bg-white ${!feedBrand ? 'border-red-400' : ''}`} value={feedBrand} onChange={(e) => setFeedBrand(e.target.value)}><option value="">-- Sélectionner --</option>{availableFormulas.map((f, i) => (<option key={i} value={f}>{f}</option>))}</select>)}</div>
                    </div>
                    {(feedStrategy === 'INDUSTRIAL' || feedStrategy === 'THIRD_PARTY') && (<div className="bg-white p-3 rounded border border-orange-100"><div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-green-700">➕ Entrées (kg)</label><input type="number" className="w-full border p-2 rounded bg-gray-50" value={inventory.complete.added} onChange={e => updateInventory('complete', 'added', parseFloat(e.target.value))} /></div><div><label className="text-xs font-bold text-blue-700">🔍 Stock (kg)</label><input type="number" className="w-full border p-2 rounded bg-gray-50" value={inventory.complete.current} onChange={e => updateInventory('complete', 'current', parseFloat(e.target.value))} /></div></div></div>)}
                    {feedStrategy === 'SELF_MIX' && (<div className="bg-white p-3 rounded border border-orange-100"><div className="space-y-2"><div className="grid grid-cols-3 gap-2"><span className="text-xs font-bold text-gray-700">🌽 Maïs</span><input type="number" placeholder="+ Entrée" className="border p-1 rounded text-xs" value={inventory.mais?.added} onChange={e => updateInventory('mais', 'added', parseFloat(e.target.value))} /><input type="number" placeholder="Stock" className="border p-1 rounded text-xs" value={inventory.mais?.current} onChange={e => updateInventory('mais', 'current', parseFloat(e.target.value))} /></div></div></div>)}
                </div>

                {/* ✅ BLOC INSIGHTS TEMPS RÉEL */}
                {liveInsights.length > 0 && (
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200 mb-6 animate-in slide-in-from-bottom-2">
                        <h4 className="text-xs font-bold text-red-800 uppercase mb-2 flex items-center gap-2">⚠️ Analyse Temps Réel</h4>
                        <div className="space-y-2">
                            {liveInsights.map((insight, idx) => (
                                <div key={idx} className={`text-xs flex gap-2 ${insight.type === 'danger' ? 'text-red-700 font-bold' : 'text-orange-700'}`}>
                                    <span>{insight.type === 'danger' ? '🚨' : '🔸'}</span><span>{insight.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="space-y-3 pt-4 border-t"><textarea className="w-full border p-2 rounded text-sm" rows={2} placeholder="Observations..." value={common.observation} onChange={e => setCommon({ ...common, observation: e.target.value })} /><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><textarea className="w-full border bg-green-50 p-2 rounded text-sm" placeholder="✅ Recommandations..." value={common.recommendations} onChange={e => setCommon({ ...common, recommendations: e.target.value })} /><textarea className="w-full border bg-red-50 p-2 rounded text-sm" placeholder="⛔ Problèmes..." value={common.problems} onChange={e => setCommon({ ...common, problems: e.target.value })} /></div></div>
                <div className="flex gap-3 justify-end pt-4"><button type="button" onClick={onCancel} className="px-4 py-2 text-gray-600 font-bold text-sm">Annuler</button><button type="submit" disabled={loading} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded text-sm">{loading ? '...' : 'Enregistrer'}</button></div>
            </form>
        </div>
    );
};