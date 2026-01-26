'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ============================================================================
// 1. TYPES & INTERFACES
// ============================================================================

interface ProphylaxisTask {
    id: number;
    targetDay: number;
    name: string;
    type: string;
}

interface Speculation { '@id': string; id: number; name: string; }
interface Standard {
    '@id': string;
    name: string;
    curveData?: { day: number; weight: number; feed_daily?: number }[];
}
interface Observation {
    id: number;
    visitedAt?: string;
    observedAt?: string;
    data: any;
    concerns?: string;
    observation?: string;
    recommendations?: string;
    problems?: string;
    visit: string | { '@id': string };
    flock: string | { '@id': string };
}
interface Flock {
    '@id': string;
    id: number;
    name: string;
    speculation: Speculation;
    standard?: Standard;
    startDate: string;
    subjectCount: number;
    feedStrategy?: 'INDUSTRIAL' | 'SELF_MIX' | 'THIRD_PARTY';
    feedFormula?: string;
    closed: boolean;
    activated: boolean;
    observations: Observation[];
}
interface Building {
    '@id': string;
    id: number;
    name: string;
    activated: boolean;
    surface?: number;
    flocks: Flock[];
}
interface Visit {
    '@id': string;
    id: number;
    visitedAt: string;
    customer: {
        '@id': string;
        id: number;
        name: string;
        zone: string;
        buildings: Building[];
    };
    technician: { fullname: string };
    closed: boolean;
    observations: Observation[];
}

// ============================================================================
// 2. HELPERS (Dates, Benchmark, Couleurs Alertes)
// ============================================================================

const calculateAgeInDays = (startDateStr: string, observationDateStr: string): number => {
    if (!startDateStr) return 0;
    const start = new Date(startDateStr);
    const obs = new Date(observationDateStr);
    const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const utcObs = Date.UTC(obs.getFullYear(), obs.getMonth(), obs.getDate());
    const diffDays = Math.floor((utcObs - utcStart) / (1000 * 60 * 60 * 24));
    return diffDays < 0 ? 0 : diffDays;
};

const calculateBenchmark = (ageInput: any, weightInput: any, curve: any[]) => {
    const age = parseInt(ageInput);
    const currentWeight = parseFloat(weightInput);
    if (!curve || curve.length === 0 || isNaN(age) || isNaN(currentWeight)) return null;

    const sorted = [...curve].sort((a, b) => a.day - b.day);
    const target = sorted.reduce((prev, curr) => (curr.day <= age ? curr : prev), sorted[0]);
    if (!target) return null;

    const weightGap = currentWeight - target.weight;
    const ratio = currentWeight / target.weight;
    
    let weightStatus: 'success' | 'warning' | 'danger' = 'danger';
    if (ratio >= 0.95) weightStatus = 'success';
    else if (ratio >= 0.85) weightStatus = 'warning';

    return { targetDay: target.day, targetWeight: target.weight, weightGap, weightStatus };
};

// Helper pour donner une couleur ET un conseil immédiat au champ
const getFieldFeedback = (field: string, val: string) => {
    if (!val) return { style: 'border-gray-300', message: null };

    // 1. LITIÈRE
    if (field === 'litiere') {
        if (val.includes('Détrempée') || val.includes('Collante') || val.includes('Croûteuse')) 
            return { style: 'border-red-500 bg-red-50 text-red-900 font-bold', message: '🚨 Risque Coccidiose : Retirez les plaques et ventilez fort.' };
        if (val.includes('Humide')) 
            return { style: 'border-orange-500 bg-orange-50 text-orange-900 font-bold', message: '⚠️ Fermentation : Brassez la litière.' };
        if (val.includes('Sèche') || val.includes('Friable')) 
            return { style: 'border-green-500 bg-green-50 text-green-900 font-bold', message: null }; // Pas de message si OK
    }

    // 2. pH EAU
    if (field === 'phValue') {
        if (val.includes('Danger') || val.includes('Trop') || val.includes('< 6') || val.includes('> 8')) 
            return { style: 'border-red-500 bg-red-50 text-red-900 font-bold', message: '🚨 Action requise : Corrigez le pH immédiatement.' };
        if (val.includes('Acceptable')) 
            return { style: 'border-orange-500 bg-orange-50 text-orange-900 font-bold', message: '⚠️ Surveillez l\'efficacité des vaccins.' };
        if (val.includes('Optimal') || val.includes('Bon')) 
            return { style: 'border-green-500 bg-green-50 text-green-900 font-bold', message: null };
    }

    // 3. UNIFORMITÉ
    if (field === 'uniformite') {
        if (val.includes('Mauvais') || val.includes('< 60')) 
            return { style: 'border-red-500 bg-red-50 text-red-900 font-bold', message: '🚨 Compétition : Triez les sujets ou ajoutez des mangeoires.' };
        if (val.includes('Moyen')) 
            return { style: 'border-orange-500 bg-orange-50 text-orange-900 font-bold', message: '⚠️ Hétérogène : Vérifiez l\'accès à l\'aliment.' };
    }

    // 4. CV
    if (field === 'cv') {
        if (val.includes('Mauvais')) return { style: 'border-red-500 bg-red-50', message: '🚨 Troupeau très hétérogène.' };
    }

    return { style: 'border-gray-300', message: null };
};

const BenchmarkCard = ({ benchmark }: { benchmark: any }) => {
    if (!benchmark) return null;
    const colors = {
        success: { bg: 'bg-green-100', text: 'text-green-800', icon: '✅' },
        warning: { bg: 'bg-orange-100', text: 'text-orange-800', icon: '⚠️' },
        danger: { bg: 'bg-red-100', text: 'text-red-800', icon: '🚨' }
    };
    const s = colors[benchmark.weightStatus as keyof typeof colors];
    const sign = benchmark.weightGap > 0 ? '+' : '';
    return (
        <div className={`mt-2 p-2 rounded border ${s.bg} border-transparent text-xs flex justify-between items-center`}>
            <span className={`font-bold ${s.text}`}>{s.icon} Obj: {benchmark.targetWeight}g</span>
            <span className={`font-black ${s.text}`}>{sign}{benchmark.weightGap.toFixed(0)}g</span>
        </div>
    );
};

const getWaterOptions = (speculationName: string) => {
    const isFish = speculationName.toLowerCase().includes('pisciculture') || speculationName.toLowerCase().includes('poisson');
    if (isFish) {
        return ["6.5 - 7.5 (Optimal)", "6.0 - 6.5 (Acceptable)", "7.5 - 8.5 (Acceptable)", "< 6.0 (Acide - Danger)", "> 8.5 (Basique - Danger)"];
    }
    return ["6.0 - 6.8 (Optimal)", "6.8 - 7.5 (Acceptable)", "< 6.0 (Trop Acide)", "> 7.5 (Trop Alcalin)"];
};

const getPreviousWeight = (flock: Flock, currentObsId?: number): number => {
    if (!flock.observations || flock.observations.length === 0) return 0;
    const history = flock.observations.filter(o => o.id !== currentObsId && o.data?.poidsMoyen > 0);
    if (history.length === 0) return 0;
    history.sort((a, b) => new Date(b.observedAt || '').getTime() - new Date(a.observedAt || '').getTime());
    return history[0].data.poidsMoyen;
};

const getLastObservation = (flock: Flock, currentObsId?: number): Observation | null => {
    if (!flock.observations || flock.observations.length === 0) return null;
    const history = flock.observations.filter(o => o.id !== currentObsId);
    history.sort((a, b) => new Date(b.observedAt || '').getTime() - new Date(a.observedAt || '').getTime());
    return history.length > 0 ? history[0] : null;
};

// ============================================================================
// 🧠 MOTEUR D'ANALYSE EXPERT (Pour le Rapport & WhatsApp)
// ============================================================================

const generateExpertInsights = (obs: any, flock: any, benchmark: any, density: number, totalMortalite: number, dueVaccines: any[]) => {
    const insights = [];
    const sujetsRestants = flock.subjectCount - totalMortalite; // Calcul précis du stock actuel

    // 1. Prophylaxie
    if (dueVaccines && dueVaccines.length > 0) {
        dueVaccines.forEach((v: any) => insights.push({ type: 'warning', text: `💉 VACCIN À FAIRE : ${v.name} (Prévu J${v.targetDay})` }));
    }

    // 2. Matériel (RATIOS CRITIQUES)
    if (obs.data.abreuvoirs > 0) {
        const ratioAbr = sujetsRestants / obs.data.abreuvoirs;
        // Seuil d'alerte (ex: 70 sujets/abreuvoir standard)
        if (ratioAbr > 70) insights.push({ type: 'danger', text: `Manque d'abreuvoirs (1 pour ${ratioAbr.toFixed(0)} sujets). Risque de compétition et déshydratation.` });
    }
    if (obs.data.mangeoires > 0) {
        const ratioMang = sujetsRestants / obs.data.mangeoires;
        // Seuil d'alerte (ex: 50 sujets/mangeoire standard)
        if (ratioMang > 50) insights.push({ type: 'danger', text: `Manque de mangeoires (1 pour ${ratioMang.toFixed(0)} sujets). Cause probable de l'hétérogénéité.` });
    }

    // 3. Stocks, Environnement, Eau, Croissance (Reste inchangé...)
    const inv = obs.data.inventory;
    if (obs.data.feedStrategy === 'SELF_MIX') {
        if (inv.mais?.current < 50) insights.push({ type: 'warning', text: "Stock Maïs critique (< 50kg)." });
        if (inv.soja?.current < 50) insights.push({ type: 'warning', text: "Stock Soja critique (< 50kg)." });
        if (inv.concentre?.current < 10) insights.push({ type: 'danger', text: "Rupture Concentré imminente !" });
    } else {
        if (inv.complete?.current < 50) insights.push({ type: 'warning', text: "Stock Aliment faible (< 50kg)." });
    }
    
    if (obs.data.litiere && (obs.data.litiere.includes('Détrempée') || obs.data.litiere.includes('Collante'))) {
        insights.push({ type: 'danger', text: `Litière : Risque élevé de Coccidiose.` });
    }
    if (obs.data.waterConsumptionIncrease === 'no') {
        insights.push({ type: 'danger', text: "↘️ Baisse consommation d'eau (Alerte Sanitaire)." });
    }
    if (benchmark && benchmark.weightStatus === 'danger') {
        insights.push({ type: 'danger', text: `Retard Poids Critique (-${Math.abs(benchmark.weightGap)}g).` });
    }

    return insights;
};

// ============================================================================
// 3. COMPOSANTS
// ============================================================================

// ... (NewBuildingForm - Code identique aux précédents, je le garde pour la compilation finale) ...
const NewBuildingForm = ({ customerIri, existingBuildings, onSuccess, onCancel }: any) => {
    /* ... code NewBuildingForm identique ... */
    const [name, setName] = useState(`Bâtiment ${(existingBuildings?.length || 0) + 1}`);
    const [surface, setSurface] = useState('');
    const [loading, setLoading] = useState(false);
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true);
        const token = localStorage.getItem('sav_token');
        try {
            const res = await fetch('http://localhost/api/buildings', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ name, surface: parseFloat(surface), customer: customerIri, activated: true }) });
            if (res.ok) onSuccess();
        } catch (e) { alert("Erreur"); } finally { setLoading(false); }
    };
    return ( <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg border mb-4"><h4 className="font-bold text-sm mb-2">Nouveau Bâtiment</h4><input className="border p-2 rounded mr-2" value={name} onChange={e=>setName(e.target.value)} /><input type="number" className="border p-2 rounded mr-2" placeholder="Surface" value={surface} onChange={e=>setSurface(e.target.value)} /><button type="submit" className="bg-blue-600 text-white px-3 py-2 rounded">Créer</button></form>);
};

// ... (NewFlockForm - Code identique aux précédents) ...
const NewFlockForm = ({ buildingIri, onSuccess, onCancel }: any) => {
    /* ... code NewFlockForm identique (avec le fix JSON-LD) ... */
    const [loading, setLoading] = useState(false);
    const [speculations, setSpeculations] = useState<Speculation[]>([]);
    const [standards, setStandards] = useState<Standard[]>([]);
    const [formData, setFormData] = useState({ name: '', speculation: '', standard: '', startDate: '', subjectCount: '' });

    useEffect(() => {
        const loadRefs = async () => {
            const token = localStorage.getItem('sav_token');
            const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/ld+json' };
            try {
                const [sRes, stdRes] = await Promise.all([fetch('http://localhost/api/speculations', { headers }), fetch('http://localhost/api/standards', { headers })]);
                setSpeculations((await sRes.json())['hydra:member'] || []);
                setStandards((await stdRes.json())['hydra:member'] || []);
            } catch (e) {}
        };
        loadRefs();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true);
        const token = localStorage.getItem('sav_token');
        try {
            await fetch('http://localhost/api/flocks', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ ...formData, subjectCount: parseInt(formData.subjectCount), building: buildingIri, activated: true, closed: false }) });
            onSuccess();
        } catch (e) { alert("Erreur"); } finally { setLoading(false); }
    };
    return (<form onSubmit={handleSubmit} className="bg-indigo-50 p-4 rounded mb-4"><h4 className="font-bold text-sm mb-2">Nouvelle Bande</h4><div className="grid grid-cols-2 gap-2"><input className="border p-2" placeholder="Nom" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} /><input type="number" className="border p-2" placeholder="Effectif" value={formData.subjectCount} onChange={e=>setFormData({...formData, subjectCount: e.target.value})} /><input type="date" className="border p-2" value={formData.startDate} onChange={e=>setFormData({...formData, startDate: e.target.value})} /><select className="border p-2" value={formData.speculation} onChange={e=>setFormData({...formData, speculation: e.target.value})}><option value="">Spéculation</option>{speculations.map(s=><option key={s['@id']} value={s['@id']}>{s.name}</option>)}</select></div><button type="submit" className="bg-indigo-600 text-white px-3 py-2 rounded mt-2">Ajouter</button></form>);
};

// ============================================================================
// 📝 OBSERVATION FORM (Complet: Stocks 3 Stratégies, Prophylaxie, Alertes)
// ============================================================================

const ObservationForm = ({ visitIri, flock, building, visit, initialData, onSuccess, onCancel }: any) => {
    const [loading, setLoading] = useState(false);
    const isEditMode = !!initialData?.id;

    // --- PROPHYLAXIE ---
    const [vaccines, setVaccines] = useState<ProphylaxisTask[]>([]);
    const [dueVaccines, setDueVaccines] = useState<ProphylaxisTask[]>([]);

    useEffect(() => {
        const fetchProphy = async () => {
            const token = localStorage.getItem('sav_token');
            const specId = flock.speculation.id; 
            if(!specId) return;
            try {
                const res = await fetch(`http://localhost/api/prophylaxis_tasks?speculation.id=${specId}`, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/ld+json' } });
                if(res.ok) {
                    const data = await res.json();
                    setVaccines(data['hydra:member'] || []);
                }
            } catch(e) { console.error("Erreur vaccin", e); }
        };
        fetchProphy();
    }, [flock.speculation]);

    // --- TICKET INCIDENT ---
    const [showCorrectionModal, setShowCorrectionModal] = useState(false);
    const [correctionReason, setCorrectionReason] = useState('');
    const [adminSending, setAdminSending] = useState(false);
    const [previousWeight, setPreviousWeight] = useState(0);
    useEffect(() => { setPreviousWeight(getPreviousWeight(flock, initialData?.id)); }, [flock, initialData]);

    // --- STATE FORMULAIRE ---
    const [feedStrategy, setFeedStrategy] = useState<'INDUSTRIAL' | 'SELF_MIX' | 'THIRD_PARTY'>(flock.feedStrategy || 'INDUSTRIAL');
    const [saveStrategy, setSaveStrategy] = useState(!flock.feedStrategy);
    const [isSnapshot, setIsSnapshot] = useState(false);
    const [feedBrand, setFeedBrand] = useState(flock.feedFormula || '');
    
    // Stock (Structure complète pour les 3 cas - INCHANGÉ)
    const [inventory, setInventory] = useState(initialData?.data?.inventory || { 
        complete: { current: 0, added: 0 }, 
        mais: { current: 0, added: 0 }, 
        soja: { current: 0, added: 0 }, 
        concentre: { current: 0, added: 0 } 
    });
    
    const [common, setCommon] = useState({ concerns: initialData?.concerns || '', observation: initialData?.observation || '', recommendations: initialData?.recommendations || '', problems: initialData?.problems || '' });

    // Initialisation DATA
    const [data, setData] = useState<any>({ 
        age: initialData?.data?.age || 0,
        mortalite: initialData?.data?.mortalite || 0,
        poidsMoyen: initialData?.data?.poidsMoyen || 0,
        consoTete: initialData?.data?.consoTete || 0,
        
        phValue: initialData?.data?.phValue || '', 
        litiere: initialData?.data?.litiere || '',
        uniformite: initialData?.data?.uniformite || '',
        cv: initialData?.data?.cv || '',
        waterConsumptionIncrease: initialData?.data?.waterConsumptionIncrease || 'yes',
        biosecurite: initialData?.data?.biosecurite || 'ok',
        abreuvoirs: initialData?.data?.abreuvoirs || 0,
        mangeoires: initialData?.data?.mangeoires || 0,
        vaccinesDone: initialData?.data?.vaccinesDone || [], 
        ...initialData?.data 
    });

    // Calcul Auto Age & Détection Vaccins
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
    const standardCurve = flock.standard?.curveData;
    const benchmark = calculateBenchmark(data.age, data.poidsMoyen, standardCurve || []);
    const waterOptions = getWaterOptions(flock.speculation.name);

    // Feedbacks calculés en temps réel (Style + Message)
    const phFeedback = getFieldFeedback('phValue', data.phValue);
    const litiereFeedback = getFieldFeedback('litiere', data.litiere);
    const unifFeedback = getFieldFeedback('uniformite', data.uniformite);

    const saveObservation = async () => {
        const token = localStorage.getItem('sav_token');
        if (saveStrategy || feedStrategy !== flock.feedStrategy || (feedStrategy === 'THIRD_PARTY' && feedBrand !== flock.feedFormula)) {
            const patchData: any = { feedStrategy };
            if (feedStrategy === 'THIRD_PARTY') patchData.feedFormula = feedBrand;
            await fetch(`http://localhost/api/flocks/${flock.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/merge-patch+json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(patchData) }).catch(console.error);
        }

        const url = isEditMode ? `http://localhost/api/observations/${initialData!.id}` : 'http://localhost/api/observations';
        const method = isEditMode ? 'PATCH' : 'POST';
        
        const finalData = { ...data, isSnapshot, feedStrategy, feedBrand, inventory, weightCorrection: correctionReason ? { ticketId: `TKT-${Date.now()}`, reason: correctionReason, previous: previousWeight, declared: data.poidsMoyen } : null };

        try {
            const res = await fetch(url, { method, headers: { 'Content-Type': isEditMode ? 'application/merge-patch+json' : 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ visit: visitIri, flock: flock['@id'], observedAt: initialData?.observedAt || new Date().toISOString(), ...common, data: finalData }) });
            if (res.ok) onSuccess(); else throw new Error("Erreur enregistrement");
        } catch (e: any) { alert(e.message); } finally { setLoading(false); }
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

    const handleAdminRequest = async () => {
         if (!correctionReason.trim()) { alert("⚠️ Motif obligatoire"); return; }
         setAdminSending(true);
         const token = localStorage.getItem('sav_token');
         try {
             const ticketRes = await fetch('http://localhost/api/tickets', {
                 method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                 body: JSON.stringify({ category: 'WEIGHT_ANOMALY', priority: 'HIGH', status: 'OPEN', description: correctionReason, flock: flock['@id'], visit: visitIri, details: { previous: previousWeight, current: data.poidsMoyen } })
             });
             if (!ticketRes.ok) throw new Error("Erreur Ticket");
             alert("✅ Ticket créé. Validation OK."); setShowCorrectionModal(false); setLoading(true); await saveObservation();
         } catch (e: any) { setAdminSending(false); alert(e.message); }
    };

    return (
        <div className="relative">
             {/* MODAL TICKET CORRIGÉ */}
             {showCorrectionModal && (
                 <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 border-4 border-red-500 rounded-lg shadow-2xl animate-fade-in">
                     <div className="text-4xl mb-2">🚨</div>
                     <p className="text-red-700 font-black text-xl mb-1 uppercase tracking-widest">Alerte Anomalie</p>
                     
                     {/* Texte explicatif clair */}
                     <div className="bg-red-50 border border-red-200 p-3 rounded mb-4 text-center">
                        <p className="text-gray-800 text-sm font-bold">Pourquoi ce ticket ?</p>
                        <p className="text-sm text-gray-600 mt-1">
                            Une chute de poids de <strong>{(previousWeight - data.poidsMoyen).toFixed(0)}g</strong> a été détectée par rapport à la dernière visite ({previousWeight}g).<br/>
                            Cette donnée semble incohérente.
                        </p>
                     </div>

                     <p className="text-xs text-gray-500 mb-2 uppercase font-bold">Justification obligatoire pour validation</p>
                     <textarea className="w-full border-2 border-red-300 p-3 rounded mb-4 focus:border-red-600 outline-none font-medium" rows={3} placeholder="Ex: Pesée à jeun, erreur de saisie précédente, maladie..." value={correctionReason} onChange={e => setCorrectionReason(e.target.value)} />
                     
                     <div className="flex gap-3 w-full">
                        {/* Bouton Annuler */}
                        <button onClick={() => setShowCorrectionModal(false)} className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded hover:bg-gray-300 transition">Annuler</button>
                        {/* Bouton Valider */}
                        <button onClick={handleAdminRequest} disabled={adminSending} className="flex-1 py-3 bg-red-600 text-white font-bold rounded shadow-lg animate-pulse hover:bg-red-700 transition">VALIDER & CONTINUER</button>
                     </div>
                 </div>
             )}

            <form onSubmit={handleSubmit} className="bg-white p-5 rounded-lg shadow-lg border-l-4 border-indigo-500 mt-4 relative animate-fade-in">
                
                {/* 1. ALERTES VACCINS (Prophylaxie) */}
                {dueVaccines.length > 0 && (
                    <div className="bg-blue-100 border-l-4 border-blue-600 p-4 mb-4 rounded">
                        <h4 className="font-bold text-blue-900 flex items-center gap-2">💉 PLANNING VACCINATION (J{data.age})</h4>
                        <div className="mt-2 space-y-2">
                            {dueVaccines.map(task => (
                                <div key={task.id} className="flex items-center justify-between bg-white p-2 rounded shadow-sm">
                                    <span className="font-bold text-sm text-gray-700">{task.name} ({task.type})</span>
                                    <label className="flex items-center gap-2 text-sm">
                                        <input type="checkbox" className="w-4 h-4" 
                                            checked={data.vaccinesDone?.includes(task.id)}
                                            onChange={e => {
                                                const done = data.vaccinesDone || [];
                                                if(e.target.checked) updateData('vaccinesDone', [...done, task.id]);
                                                else updateData('vaccinesDone', done.filter((id:any) => id !== task.id));
                                            }}
                                        />
                                        Fait
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. KPI */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div><label className="text-[10px] font-bold text-gray-500 uppercase">Âge</label><div className="font-bold text-gray-700">{data.age} Jours</div></div>
                    <div><label className="text-[10px] font-bold text-gray-500 uppercase">Mortalité</label><input type="number" className="w-full border p-1 rounded bg-red-50 font-bold text-red-900" value={data.mortalite} onChange={e => updateData('mortalite', parseInt(e.target.value) || 0)} /></div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Poids (g)</label>
                        <input type="number" step="0.1" className="w-full border p-1 rounded font-bold" value={data.poidsMoyen} onChange={e => updateData('poidsMoyen', parseFloat(e.target.value) || 0)} />
                        <BenchmarkCard benchmark={benchmark} />
                    </div>
                     <div><label className="text-[10px] font-bold text-gray-500 uppercase">Conso (g/tête)</label><input type="number" className="w-full border p-1 rounded" value={data.consoTete} onChange={e => updateData('consoTete', parseFloat(e.target.value) || 0)} /></div>
                </div>

                {/* 3. QUALITÉ & ENVIRONNEMENT (Avec Feedback Textuel) */}
                <h4 className="text-xs font-bold text-indigo-900 uppercase mb-2 border-b">Qualité & Environnement</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                    
                    {/* pH Eau */}
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase">pH Eau</label>
                        <select className={`w-full border p-2 rounded text-sm bg-white ${phFeedback.style}`} value={data.phValue} onChange={e => updateData('phValue', e.target.value)}>
                            <option value="">-- Qualité --</option>
                            {waterOptions.map((opt, idx) => <option key={idx} value={opt}>{opt}</option>)}
                        </select>
                        {/* Message d'aide textuel */}
                        {phFeedback.message && <p className={`text-[10px] mt-1 font-bold ${phFeedback.style.includes('red') ? 'text-red-700' : phFeedback.style.includes('orange') ? 'text-orange-700' : 'text-green-700'}`}>{phFeedback.message}</p>}
                    </div>

                    {/* Litière */}
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase">Litière</label>
                        <select className={`w-full border p-2 rounded text-sm ${litiereFeedback.style}`} value={data.litiere} onChange={e => updateData('litiere', e.target.value)}>
                            <option value="">-- État --</option>
                            <option value="Sèche / Friable">✅ Sèche / Friable</option>
                            <option value="Légèrement Humide">⚠️ Légèrement Humide</option>
                            <option value="Collante / Détrempée">🚨 Collante / Détrempée</option>
                            <option value="Croûteuse">🚨 Croûteuse</option>
                        </select>
                        {/* Message d'aide textuel */}
                        {litiereFeedback.message && <p className={`text-[10px] mt-1 font-bold ${litiereFeedback.style.includes('red') ? 'text-red-700' : litiereFeedback.style.includes('orange') ? 'text-orange-700' : 'text-green-700'}`}>{litiereFeedback.message}</p>}
                    </div>

                    {/* Uniformité */}
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase">Uniformité</label>
                        <select className={`w-full border p-2 rounded text-sm ${unifFeedback.style}`} value={data.uniformite} onChange={e => updateData('uniformite', e.target.value)}>
                            <option value="">-- Taux --</option>
                            <option value="> 90% (Excellent)">🏆 &gt; 90%</option>
                            <option value="80% - 90% (Bon)">✅ 80% - 90%</option>
                            <option value="60% - 80% (Moyen)">⚠️ 60% - 80%</option>
                            <option value="< 60% (Mauvais)">🚨 &lt; 60%</option>
                        </select>
                        {/* Message d'aide textuel */}
                        {unifFeedback.message && <p className={`text-[10px] mt-1 font-bold ${unifFeedback.style.includes('red') ? 'text-red-700' : unifFeedback.style.includes('orange') ? 'text-orange-700' : 'text-green-700'}`}>{unifFeedback.message}</p>}
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase">CV (%)</label>
                        <select className="w-full border p-2 rounded text-sm" value={data.cv} onChange={e => updateData('cv', e.target.value)}>
                            <option value="">-- Taux --</option>
                            <option value="< 8 (Excellent)">🏆 &lt; 8</option>
                            <option value="8 - 10 (Bon)">✅ 8 - 10</option>
                            <option value="10 - 12 (Moyen)">⚠️ 10 - 12</option>
                            <option value="> 12 (Mauvais)">🚨 &gt; 12</option>
                        </select>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase">Tendance Conso Eau</label>
                        <div className="flex gap-1">
                            <button type="button" onClick={() => updateData('waterConsumptionIncrease', 'yes')} className={`flex-1 py-2 text-xs rounded border ${data.waterConsumptionIncrease === 'yes' ? 'bg-green-100 border-green-500 text-green-800' : 'bg-gray-50'}`}>↗️ Hausse</button>
                            <button type="button" onClick={() => updateData('waterConsumptionIncrease', 'stable')} className={`flex-1 py-2 text-xs rounded border ${data.waterConsumptionIncrease === 'stable' ? 'bg-blue-100 border-blue-500 text-blue-800' : 'bg-gray-50'}`}>➡️ Stable</button>
                            <button type="button" onClick={() => updateData('waterConsumptionIncrease', 'no')} className={`flex-1 py-2 text-xs rounded border ${data.waterConsumptionIncrease === 'no' ? 'bg-red-100 border-red-500 text-red-800' : 'bg-gray-50'}`}>↘️ Baisse</button>
                        </div>
                        {data.waterConsumptionIncrease === 'no' && <p className="text-[10px] text-red-600 font-bold mt-1">🚨 ALERTE SANITAIRE : Chute consommation.</p>}
                    </div>
                </div>

                {/* 4. STOCK & STRATÉGIES (Les 3 Options sont là) */}
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 mb-6">
                    <h4 className="text-xs font-bold text-orange-900 uppercase mb-2">Stratégie Alimentaire</h4>
                    <div className="flex gap-4 mb-4">
                         <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={feedStrategy === 'INDUSTRIAL'} onChange={() => setFeedStrategy('INDUSTRIAL')} /> <span className="text-xs font-bold">🏭 ALIMENT COMPLET (SPC/PDC)</span></label>
                         <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={feedStrategy === 'THIRD_PARTY'} onChange={() => setFeedStrategy('THIRD_PARTY')} /> <span className="text-xs font-bold">🛒 VRAC (AUTRES)</span></label>
                         <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={feedStrategy === 'SELF_MIX'} onChange={() => setFeedStrategy('SELF_MIX')} /> <span className="text-xs font-bold">🏗️ FABRIQUÉ (BELGOCAM) </span></label>
                    </div>

                    {(feedStrategy === 'INDUSTRIAL' || feedStrategy === 'THIRD_PARTY') && (
                        <div className="space-y-3">
                            {feedStrategy === 'THIRD_PARTY' && (
                                <div><label className="text-[10px] font-bold text-gray-500">Fournisseur</label><input className="w-full border p-1 rounded bg-white" placeholder="Nom du fournisseur..." value={feedBrand} onChange={e=>setFeedBrand(e.target.value)} /></div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold text-green-700">➕ Entrées (kg)</label><input type="number" className="w-full border p-2 rounded bg-white" value={inventory.complete.added} onChange={e => updateInventory('complete', 'added', parseFloat(e.target.value))} /></div>
                                <div><label className="text-xs font-bold text-blue-700">🔍 Stock (kg)</label><input type="number" className={`w-full border p-2 rounded bg-white ${inventory.complete.current < 50 ? 'border-red-500 text-red-600 font-bold' : ''}`} value={inventory.complete.current} onChange={e => updateInventory('complete', 'current', parseFloat(e.target.value))} />
                                {inventory.complete.current < 50 && <span className="text-[10px] text-red-600 font-bold">⚠️ Stock Faible</span>}</div>
                            </div>
                        </div>
                    )}

                    {feedStrategy === 'SELF_MIX' && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-bold text-gray-500 uppercase border-b pb-1">Matières Premières</p>
                            <div className="grid grid-cols-3 gap-2 items-center">
                                <span className="text-xs font-bold">🌽 Maïs</span>
                                <input type="number" placeholder="+ Entrée" className="border p-1 rounded bg-white text-xs" value={inventory.mais?.added} onChange={e => updateInventory('mais', 'added', parseFloat(e.target.value))} />
                                <div>
                                    <input type="number" placeholder="Stock" className={`border p-1 rounded w-full text-xs ${inventory.mais?.current < 100 ? 'border-red-500' : ''}`} value={inventory.mais?.current} onChange={e => updateInventory('mais', 'current', parseFloat(e.target.value))} />
                                    {inventory.mais?.current < 100 && <span className="text-[9px] text-red-500 font-bold block">⚠️ Bas</span>}
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 items-center">
                                <span className="text-xs font-bold">🌱 Soja</span>
                                <input type="number" placeholder="+ Entrée" className="border p-1 rounded bg-white text-xs" value={inventory.soja?.added} onChange={e => updateInventory('soja', 'added', parseFloat(e.target.value))} />
                                <div>
                                    <input type="number" placeholder="Stock" className={`border p-1 rounded w-full text-xs ${inventory.soja?.current < 50 ? 'border-red-500' : ''}`} value={inventory.soja?.current} onChange={e => updateInventory('soja', 'current', parseFloat(e.target.value))} />
                                    {inventory.soja?.current < 50 && <span className="text-[9px] text-red-500 font-bold block">⚠️ Bas</span>}
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 items-center">
                                <span className="text-xs font-bold">🧪 Concentré</span>
                                <input type="number" placeholder="+ Entrée" className="border p-1 rounded bg-white text-xs" value={inventory.concentre?.added} onChange={e => updateInventory('concentre', 'added', parseFloat(e.target.value))} />
                                <div>
                                    <input type="number" placeholder="Stock" className={`border p-1 rounded w-full text-xs ${inventory.concentre?.current < 20 ? 'border-red-500 bg-red-50' : ''}`} value={inventory.concentre?.current} onChange={e => updateInventory('concentre', 'current', parseFloat(e.target.value))} />
                                    {inventory.concentre?.current < 20 && <span className="text-[9px] text-red-600 font-black block">🚨 RUPTURE</span>}
                                </div>
                            </div>
                        </div>
                    )}
                    <label className="flex items-center gap-2 mt-2"><input type="checkbox" checked={isSnapshot} onChange={e => setIsSnapshot(e.target.checked)} /> <span className="text-xs font-bold text-indigo-900">Inventaire / Audit Initial</span></label>
                </div>

                <div className="space-y-3 pt-4 border-t">
                    <textarea className="w-full border p-2 rounded text-sm" rows={2} placeholder="Observations..." value={common.observation} onChange={e => setCommon({ ...common, observation: e.target.value })} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <textarea className="w-full border bg-green-50 p-2 rounded text-sm" placeholder="✅ Recommandations..." value={common.recommendations} onChange={e => setCommon({ ...common, recommendations: e.target.value })} />
                         <textarea className="w-full border bg-red-50 p-2 rounded text-sm" placeholder="⛔ Problèmes..." value={common.problems} onChange={e => setCommon({ ...common, problems: e.target.value })} />
                    </div>
                </div>

                <div className="flex gap-3 justify-end pt-4"><button type="button" onClick={onCancel} className="px-4 py-2 text-gray-600 font-bold text-sm">Annuler</button><button type="submit" disabled={loading} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded text-sm">{loading ? '...' : 'Enregistrer'}</button></div>
            </form>
        </div>
    );
};

// ============================================================================
// 📊 VUE FICHE TECHNIQUE DÉTAILLÉE (Rapport avec Print/SMS/Alertes)
// ============================================================================

const ObservationDetails = ({ obs, flock, building, visit, onEdit, onClose, isModal = false }: any) => {
    // 1. Calculs KPI
    const totalMortalite = flock.observations.reduce((acc: number, curr: any) => acc + (curr.data?.mortalite || 0), 0);
    const sujetsRestants = flock.subjectCount - totalMortalite;
    const pourcentMortalite = ((totalMortalite / flock.subjectCount) * 100).toFixed(1); // Calcul du % cumulé
    const surface = building.surface || 0;
    const density = surface > 0 ? parseFloat((sujetsRestants / surface).toFixed(1)) : 0;
    const benchmark = calculateBenchmark(obs.data.age, obs.data.poidsMoyen, flock.standard?.curveData || []);
    
    // 2. Moteurs d'analyse & Feedback
    const insights = generateExpertInsights(obs, flock, benchmark, density, totalMortalite, []); 

    // Ratios Matériel
    const ratioAbr = obs.data.abreuvoirs > 0 ? (sujetsRestants / obs.data.abreuvoirs).toFixed(0) : '-';
    const ratioMang = obs.data.mangeoires > 0 ? (sujetsRestants / obs.data.mangeoires).toFixed(0) : '-';
    
    // Récupération des messages d'aide (Conseils textuels)
    const litiereStatus = getFieldFeedback('litiere', obs.data.litiere);
    const phStatus = getFieldFeedback('phValue', obs.data.phValue);
    const unifStatus = getFieldFeedback('uniformite', obs.data.uniformite);

    // 3. Actions de Partage
    const shareWhatsApp = () => {
        let text = `*📄 RAPPORT ${visit.customer.name.toUpperCase()} - ${visit.customer.phoneNumber}*\n`;
        text += `🗓️ J${obs.data.age} • ${new Date(obs.observedAt).toLocaleDateString()}\n`;
        text += `👤 Tech: ${visit?.technician?.fullname}\n\n`;
        text += `*🐔 PERFORMANCES*\nStock: ${sujetsRestants} (Morts: ${obs.data.mortalite})\nPoids: ${obs.data.poidsMoyen}g ${benchmark ? `(${benchmark.weightGap > 0 ? '+' : ''}${benchmark.weightGap.toFixed(0)}g)` : ''}\n`;
        text += `*🏠 ENVIRONNEMENT*\nLitière: ${obs.data.litiere || '-'}\nEau: ${obs.data.phValue || '-'} (${obs.data.waterConsumptionIncrease === 'no' ? '↘️ BAISSE' : '✅ Stable'})\n`;
        if (insights.length > 0) { text += `\n*⚠️ ALERTES*\n`; insights.forEach(i => text += `${i.type === 'danger' ? '🚨' : '🔸'} ${i.text}\n`); }
        if (obs.recommendations) text += `\n*💡 CONSEIL:*\n${obs.recommendations}`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    };

    const shareSMS = () => {
        const text = `Rapport ${visit.customer.name} J${obs.data.age}. Stock:${sujetsRestants} Morts:${obs.data.mortalite} Poids:${obs.data.poidsMoyen}g. ${insights.length > 0 ? `⚠️ ${insights.length} Alertes` : '✅ RAS'}. Tech:${visit.technician.fullname}`;
        const phone = visit.customer.phoneNumber || '';
        window.open(`sms:${phone}?&body=${encodeURIComponent(text)}`, '_self');
    };

    const handlePrint = () => window.print();

    // 4. Styles conditionnels
    const containerClass = isModal ? "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" : "bg-white border rounded-xl shadow-lg my-4";

    return (
        <div className={containerClass}>
            {/* CSS pour l'impression propre */}
            <style jsx global>{`
                @media print {
                    body * { visibility: hidden; }
                    #printable-report, #printable-report * { visibility: visible; }
                    #printable-report { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; background: white; color: black; }
                    .no-print { display: none !important; }
                }
            `}</style>

            <div id="printable-report" className={`bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden ${isModal ? 'max-h-[90vh] overflow-y-auto' : ''}`}>
                
                {/* HEADER */}
                <div className="bg-gray-800 text-white p-4 flex justify-between items-center sticky top-0 z-10 print:bg-white print:text-black print:border-b-2">
                    <div>
                        {isModal && <span className="bg-yellow-400 text-black text-[10px] font-bold px-2 py-0.5 rounded uppercase mr-2 align-middle no-print">Historique</span>}
                        <span className="font-bold text-lg align-middle">RAPPORT VISITE - {visit.customer.name}</span> 
                        <span className="text-sm opacity-70 ml-2">| J{obs.data.age}</span>
                    </div>
                    <button onClick={onClose} className="bg-white/20 p-1 rounded-full hover:bg-white/30 transition no-print">✕</button>
                </div>

                <div className="p-5 space-y-6">
                    {/* KPI */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-center">
                            <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Stock Vif</p>
                            <p className="text-2xl font-black text-blue-900">{sujetsRestants}</p>
                        </div>
                        <div className={`p-3 border rounded-lg text-center ${benchmark?.weightStatus === 'danger' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                            <p className="text-[10px] font-bold uppercase opacity-60">Poids Moyen</p>
                            <p className="text-2xl font-black">{obs.data.poidsMoyen}<span className="text-sm font-normal text-gray-500">g</span></p>
                            {benchmark && <p className={`text-[10px] font-bold ${benchmark.weightGap < 0 ? 'text-red-600' : 'text-green-600'}`}>{benchmark.weightGap > 0 ? '+' : ''}{benchmark.weightGap.toFixed(0)}g vs Std</p>}
                        </div>
                        <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-center">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Morts Jour</p>
                            <p className="text-2xl font-black text-gray-800">{obs.data.mortalite}</p>
                            <p className="text-sm font-black text-gray-800">Cumul : {totalMortalite} ({pourcentMortalite}%)</p>
                        </div>
                    </div>

                    {/* TABLEAU QUALITÉ (AVEC ALERTES TEXTUELLES) */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <h5 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">📊 Indicateurs Qualitatifs</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            {/* Litière */}
                            <div className={`p-2 rounded border-l-4 ${litiereStatus.style.replace('border ', '').replace('w-full', '')} bg-white shadow-sm`}>
                                <div className="flex justify-between"><span className="text-xs font-bold text-gray-500 uppercase">Litière</span><strong>{obs.data.litiere || '-'}</strong></div>
                                {litiereStatus.message && <p className="text-[10px] mt-1 italic opacity-80">{litiereStatus.message}</p>}
                            </div>
                            {/* pH */}
                            <div className={`p-2 rounded border-l-4 ${phStatus.style.replace('border ', '').replace('w-full', '')} bg-white shadow-sm`}>
                                <div className="flex justify-between"><span className="text-xs font-bold text-gray-500 uppercase">pH Eau</span><strong>{obs.data.phValue || '-'}</strong></div>
                                {phStatus.message && <p className="text-[10px] mt-1 italic opacity-80">{phStatus.message}</p>}
                            </div>
                            {/* --- BLOC MATÉRIEL RÉINTÉGRÉ --- */}
                            <div className="p-2 rounded border-l-4 border-blue-400 bg-white shadow-sm col-span-1 md:col-span-2">
                                <div className="flex justify-between mb-2 border-b border-gray-100 pb-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Abreuvoirs</span>
                                    <div className="text-right">
                                        <strong>{obs.data.abreuvoirs}</strong> <span className="text-xs text-gray-400">(Ratio: 1/{ratioAbr})</span>
                                        {parseInt(ratioAbr) > 70 && <span className="block text-[9px] text-red-600 font-bold">⚠️ Manque équipement</span>}
                                    </div>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Mangeoires</span>
                                    <div className="text-right">
                                        <strong>{obs.data.mangeoires}</strong> <span className="text-xs text-gray-400">(Ratio: 1/{ratioMang})</span>
                                        {parseInt(ratioMang) > 50 && <span className="block text-[9px] text-red-600 font-bold">⚠️ Manque équipement</span>}
                                    </div>
                                </div>
                            </div>
                            {/* Uniformité */}
                            <div className={`p-2 rounded border-l-4 ${unifStatus.style.replace('border ', '').replace('w-full', '')} bg-white shadow-sm`}>
                                <div className="flex justify-between"><span className="text-xs font-bold text-gray-500 uppercase">Uniformité</span><strong>{obs.data.uniformite || '-'}</strong></div>
                                {unifStatus.message && <p className="text-[10px] mt-1 italic opacity-80">{unifStatus.message}</p>}
                            </div>
                            {/* Conso */}
                            <div className="p-2 rounded border-l-4 border-blue-400 bg-white shadow-sm">
                                <div className="flex justify-between mb-1"><span className="text-xs font-bold text-gray-500 uppercase">Conso Eau</span><strong>{obs.data.waterConsumptionIncrease === 'no' ? '↘️ BAISSE !' : '✅ Stable'}</strong></div>
                                <div className="flex justify-between border-t pt-1 border-gray-100"><span className="text-xs font-bold text-gray-500 uppercase">CV %</span><strong>{obs.data.cv || '-'}</strong></div>
                            </div>
                        </div>
                    </div>

                    {/* ALERTES EXPERT */}
                    {insights.length > 0 && (
                        <div className="space-y-2">
                             <h5 className="text-xs font-bold text-red-400 uppercase">⚠️ Points de vigilance</h5>
                             {insights.map((i:any, idx:number) => (
                                 <div key={idx} className={`p-3 text-sm border-l-4 rounded flex gap-3 ${i.type === 'danger' ? 'border-red-500 bg-red-50 text-red-900' : 'border-orange-500 bg-orange-50 text-orange-900'}`}>
                                     <span className="text-lg">{i.type === 'danger' ? '🚨' : '🔸'}</span>
                                     <span className="font-medium">{i.text}</span>
                                 </div>
                             ))}
                        </div>
                    )}

                    {/* NOTES */}
                    {(obs.observation || obs.recommendations || obs.problems) && (
                        <div className="border-t border-gray-200 pt-4 space-y-3">
                            {obs.problems && <div className="p-3 bg-red-100 text-red-900 rounded text-sm"><strong>⛔ PROBLÈME(S) :</strong> <ul>{obs.problems.split('\n').map((line: string, i: number) => <li key={i}>{line}</li>)}</ul></div>}
                            {obs.recommendations && <div className="p-3 bg-green-100 text-green-900 rounded text-sm"><strong>💡 RECOMMANDATION :</strong> {obs.recommendations}</div>}
                            {obs.observation && <p className="text-sm italic text-gray-600 px-2 border-l-2 border-gray-300">"{obs.observation}"</p>}
                        </div>
                    )}

                    {/* BARRE D'ACTIONS (Invisible à l'impression) */}
                    {!isModal && (
                        <div className="flex gap-2 pt-4 border-t mt-4 no-print overflow-x-auto">
                            <button onClick={shareWhatsApp} className="flex-1 py-3 px-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-bold text-xs flex justify-center items-center gap-1 min-w-[90px]"><span>📱</span> WhatsApp</button>
                            <button onClick={shareSMS} className="flex-1 py-3 px-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-bold text-xs flex justify-center items-center gap-1 min-w-[90px]"><span>💬</span> SMS</button>
                            <button onClick={handlePrint} className="flex-1 py-3 px-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-bold text-xs flex justify-center items-center gap-1 min-w-[90px]"><span>🖨️</span> Imprimer</button>
                            <button onClick={onEdit} className="py-3 px-4 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-bold text-xs flex items-center gap-1"><span>✏️</span></button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
const FlockItem = ({ flock, building, visit, visitObservations, isVisitClosed, onRefresh }: any) => {
    const [mode, setMode] = useState<'LIST' | 'FORM' | 'DETAILS'>('LIST');
    const [selectedObs, setSelectedObs] = useState<any>(null);
    const currentObs = visitObservations?.find((obs: any) => (typeof obs.flock === 'string' ? obs.flock : obs.flock['@id']) === flock['@id']);

    return (
        <div className={`mb-3 border rounded-xl overflow-hidden shadow-sm ${flock.closed ? 'bg-gray-50' : 'bg-white border-indigo-100'}`}>
            <div className="p-3 flex justify-between items-center bg-gray-50/50">
                <div><h4 className="font-bold text-gray-800">{flock.name}</h4><p className="text-xs text-gray-500">{flock.subjectCount} sujets</p></div>
                {!isVisitClosed && !flock.closed && !currentObs && mode === 'LIST' && <button onClick={() => setMode('FORM')} className="text-xs bg-white border border-indigo-200 text-indigo-700 px-3 py-1 rounded-lg font-bold">+ Observer</button>}
            </div>
            <div className="p-3">
                {mode === 'FORM' && <ObservationForm visitIri={visit['@id']} flock={flock} building={building} visit={visit} initialData={selectedObs} onSuccess={() => { setMode('LIST'); onRefresh(); }} onCancel={() => { setMode('LIST'); setSelectedObs(null); }} />}
                {mode === 'DETAILS' && currentObs && <ObservationDetails obs={currentObs} flock={flock} building={building} visit={visit} onEdit={() => { if (!isVisitClosed) { setSelectedObs(currentObs); setMode('FORM'); } }} onClose={() => setMode('LIST')} />}
                {mode === 'LIST' && currentObs && <div onClick={() => setMode('DETAILS')} className="cursor-pointer bg-white border-l-4 border-indigo-500 p-3 rounded shadow-sm text-sm"><p className="font-bold">✅ J{currentObs.data.age} • {currentObs.data.poidsMoyen}g</p></div>}
            </div>
        </div>
    );
};

export default function VisitDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [visit, setVisit] = useState<Visit | null>(null);
    const [loading, setLoading] = useState(true);
    const [showNewBuilding, setShowNewBuilding] = useState(false);
    const [showNewFlockForBuilding, setShowNewFlockForBuilding] = useState<string | null>(null);

    const fetchVisit = async () => {
        const token = localStorage.getItem('sav_token');
        if (!token) { router.push('/'); return; }
        try {
            const res = await fetch(`http://localhost/api/visits/${id}`, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/ld+json' } });
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
        
        const token = localStorage.getItem('sav_token');
        try {
            await fetch(`http://localhost/api/visits/${visit.id}/close`, { 
                method: 'PATCH', 
                headers: { 'Content-Type': 'application/merge-patch+json', 'Authorization': `Bearer ${token}` }, 
                body: JSON.stringify({}) 
            });
            fetchVisit();
        } catch (e) { alert("Erreur lors de la clôture."); }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-indigo-600 animate-pulse">Chargement...</div>;
    if (!visit) return <div className="p-8 text-center">Visite introuvable</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-24 font-sans">
             {/* Header */}
             <div className={`px-6 py-8 pb-12 rounded-b-[3rem] shadow-xl text-white mb-6 ${visit.closed ? 'bg-gray-800' : 'bg-gradient-to-r from-indigo-600 to-purple-600'}`}>
                <div className="max-w-4xl mx-auto flex justify-between items-start">
                    <div>
                        <Link href="/dashboard/visits" className="text-indigo-200 text-xs font-bold uppercase mb-2 block">← Retour</Link>
                        <h1 className="text-3xl font-extrabold">{visit.customer.name}</h1>
                        <p className="text-sm opacity-90">📍 {visit.customer.zone} • 👤 {visit.technician.fullname}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-bold">{new Date(visit.visitedAt).toLocaleDateString()}</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mt-2 ${visit.closed ? 'bg-gray-700' : 'bg-white/20'}`}>{visit.closed ? '🔒 CLÔTURÉE' : '🟢 EN COURS'}</span>
                    </div>
                </div>
             </div>
             
             <div className="max-w-4xl mx-auto px-4 -mt-8 relative z-10 space-y-6">
                {/* Actions Bâtiment */}
                {!visit.closed && <div className="flex justify-end"><button onClick={() => setShowNewBuilding(!showNewBuilding)} className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-bold shadow hover:bg-indigo-50 text-sm transition">{showNewBuilding ? 'Annuler' : '+ Nouveau Bâtiment'}</button></div>}
                
                {showNewBuilding && <NewBuildingForm customerIri={visit.customer['@id']} existingBuildings={visit.customer.buildings || []} onSuccess={()=>{setShowNewBuilding(false);fetchVisit()}} onCancel={()=>setShowNewBuilding(false)} />}
                
                {/* Liste Bâtiments & Bandes */}
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

                {/* BOUTON DE CLÔTURE (RESTAURÉ) */}
                {!visit.closed && (
                    <div className="flex flex-col items-center justify-center pt-8 pb-4 gap-3 border-t border-gray-200 mt-8">
                        <button 
                            onClick={handleCloseVisit} 
                            className={`px-8 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all transform hover:scale-105 ${hasAtLeastOneObservation() ? 'bg-gray-900 text-white hover:bg-black' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                        >
                            🏁 Terminer la Visite
                        </button>
                        {!hasAtLeastOneObservation() && (
                            <p className="text-xs text-red-500 font-bold bg-red-50 px-3 py-1 rounded-full animate-pulse border border-red-100">
                                ⚠️ Saisissez une observation pour débloquer la clôture
                            </p>
                        )}
                    </div>
                )}
             </div>
        </div>
    );
}