'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// --- 1. TYPES ---

interface Speculation {
  name: string;
}

interface Standard {
  '@id': string;
  name: string;
  feedType?: string;
}

interface Flock {
  '@id': string;
  id: number;
  name: string;
  speculation: Speculation;
  standard?: Standard;
  startDate: string;
  observations: Observation[];
  subjectCount?: number;
}

interface Building {
  '@id': string;
  id: number;
  name: string;
  activated: boolean;
  surface?: number;
  flocks: Flock[];
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
}

interface Visit {
  '@id': string;
  id: number;
  visitedAt: string;
  customer: {
    '@id': string;
    name: string;
    zone: string;
    phoneNumber?: string;
    buildings: Building[];
  };
  technician: { fullname: string };
  closed: boolean;
  activated: boolean;
  isEditable: boolean;
}

// --- 2. MOTEUR D'ANALYSE EXPERT ---
// (Le moteur d'analyse reste inchangé, je le conserve pour la complétude)
type AnalysisLevel = 'success' | 'warning' | 'danger' | 'info';
interface Interpretation { level: AnalysisLevel; message: string; action?: string; value?: string; }

const analyzeData = (data: any, speculationName: string, buildingSurface?: number, flockSubjectCount?: number): Record<string, Interpretation | null> => {
    const results: Record<string, Interpretation | null> = {};
    const spec = speculationName.toLowerCase();
    const isFish = spec.includes('poisson') || spec.includes('silure') || spec.includes('pisciculture');
    const isLayer = spec.includes('pondeuse');
    const isBroiler = spec.includes('chair') || spec.includes('poulet');

    const effectifDepart = data.effectifDepart || flockSubjectCount || 0;
    if (buildingSurface && buildingSurface > 0 && data.poidsMoyen && effectifDepart > 0) {
        const effectifActuel = effectifDepart - (data.mortalite || 0);
        const poidsTotalKg = (data.poidsMoyen / 1000) * effectifActuel; 
        const densite = poidsTotalKg / buildingSurface;
        const densiteStr = `${densite.toFixed(1)} ${isFish ? 'kg/m³' : 'kg/m²'}`;

        if (isBroiler) {
            if (densite > 38) results.densite = { level: 'danger', message: `Saturation Critique (${densiteStr})`, action: 'Desserage immédiat impératif.' };
            else if (densite > 32) results.densite = { level: 'warning', message: `Densité Élevée (${densiteStr})`, action: 'Maximiser la ventilation.' };
            else results.densite = { level: 'success', message: `Densité Optimale (${densiteStr})` };
        } else if (isLayer) {
            if (densite > 25) results.densite = { level: 'danger', message: `Surpopulation Pondeuses (${densiteStr})`, action: 'Risque de picage.' };
            else results.densite = { level: 'success', message: `Densité OK (${densiteStr})` };
        } else if (isFish) {
            if (densite > 80) results.densite = { level: 'warning', message: `Biomasse élevée (${densiteStr})`, action: 'Oxygène critique. Renouveler l\'eau.' };
            else results.densite = { level: 'success', message: `Biomasse OK (${densiteStr})` };
        }
    }

    if (data.phValue || data.phCorrect === 'no') {
        const ph = data.phValue ? parseFloat(data.phValue) : (data.phCorrect === 'yes' ? 7.0 : 0);
        if (isFish) {
            if (ph < 6.5) results.ph = { level: 'danger', message: `Eau trop acide (${ph})`, action: 'Chaux/Bicarbonate.' };
            else if (ph > 9.0) results.ph = { level: 'danger', message: `Eau trop basique (${ph})`, action: 'Risque toxicité ammoniac.' };
            else results.ph = { level: 'success', message: `pH Conforme (${ph})` };
        } else {
            if (ph < 5.0) results.ph = { level: 'danger', message: `Eau corrosive (${ph})`, action: 'Arrêter acidification.' };
            else if (ph > 7.5) results.ph = { level: 'warning', message: `Eau basique (${ph})`, action: 'Acidifier.' };
            else if (data.phCorrect === 'yes' || (ph >= 5.5 && ph <= 7.0)) results.ph = { level: 'success', message: 'pH Optimal' };
        }
    }

    if (data.orpValue) {
        const orp = parseInt(data.orpValue);
        if (orp < 250) results.orp = { level: 'danger', message: `DANGER BIO (${orp} mV)`, action: 'Choc chlore immédiat.' };
        else if (orp >= 650) results.orp = { level: 'success', message: `Désinfection Top (${orp} mV)` };
        else results.orp = { level: 'warning', message: `Désinfection moyenne (${orp} mV)`, action: 'Viser > 650mV.' };
    }

    if (!isFish && data.litiere) {
        if (['Croûteuse / Humide', 'Collante / Détrempée'].includes(data.litiere)) results.litiere = { level: 'danger', message: 'Litière dégradée', action: 'Retirer plaques humides.' };
        else if (data.litiere === 'Poussiéreuse (Trop sec)') results.litiere = { level: 'warning', message: 'Trop sec / Poussière', action: 'Réduire ventilation min.' };
        else results.litiere = { level: 'success', message: 'Litière conforme' };
    }

    if (data.uniformite && data.uniformite.includes('< 70%')) results.uniformite = { level: 'danger', message: 'Hétérogénéité critique', action: 'Trier les sujets.' };

    if (data.biosecurite === 'nok') results.biosecurite = { level: 'danger', message: 'Non-Conformité Sanitaire', action: 'Voir commentaire.' };
    else results.biosecurite = { level: 'success', message: 'Mesures respectées' };

    if (data.inventory) {
        const inv = data.inventory;
        if (inv.mode === 'mix') {
            if (isFish) {
                const total = (inv.fishmeal || 0) + (inv.soja || 0) + (inv.mais_son || 0);
                if (total > 0) {
                    const fishRatio = ((inv.fishmeal || 0) / total) * 100;
                    if (fishRatio < 10) results.stock = { level: 'danger', message: `Manque Protéine Animale (${fishRatio.toFixed(0)}%)`, action: 'Risque Cannibalisme élevé. Corriger formule.' };
                    else results.stock = { level: 'success', message: 'Équilibre formule OK' };
                }
            } else {
                const mais = inv.mais || 0;
                const conc = inv.concentre || 0;
                const total = mais + conc + (inv.soja || 0);
                if (total > 0) {
                    const concRatio = (conc / total) * 100;
                    if (conc > 0 && mais === 0) results.stock = { level: 'warning', message: 'Concentré sans Maïs', action: 'Vérifier approvisionnement énergie.' };
                    else if (concRatio < 25) results.stock = { level: 'danger', message: `Formule Diluée (${concRatio.toFixed(0)}% conc.)`, action: 'Carence en vue. Respecter 35-40%.' };
                    else if (concRatio > 50) results.stock = { level: 'warning', message: `Formule Trop Riche (${concRatio.toFixed(0)}% conc.)`, action: 'Gaspillage d\'argent. Ajouter du maïs.' };
                    else results.stock = { level: 'success', message: 'Proportions de stock cohérentes' };
                }
            }
        }
    }

    return results;
};

const AnalysisAlert = ({ analysis }: { analysis?: Interpretation | null }) => {
    if (!analysis) return null;
    const styles = {
        success: { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-800', icon: '✅' },
        warning: { bg: 'bg-orange-50', border: 'border-orange-500', text: 'text-orange-900', icon: '⚠️' },
        danger: { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-900', icon: '🚨' },
        info: { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-800', icon: 'ℹ️' }
    };
    const s = styles[analysis.level];
    return (
        <div className={`mt-2 p-3 rounded-md border-l-4 ${s.bg} ${s.border} ${s.text} shadow-sm flex items-start gap-3 animate-fade-in`}>
            <span className="text-lg select-none">{s.icon}</span>
            <div>
                <p className="text-sm font-bold">{analysis.message}</p>
                {analysis.action && <p className="text-xs mt-1 font-semibold underline decoration-dotted opacity-90">👉 {analysis.action}</p>}
            </div>
        </div>
    );
};

// --- 3. COMPOSANTS VUES (ObservationDetailsView) ---
const ObservationDetailsView = ({ obs, flock, buildingSurface, onClose }: { obs: Observation, flock: Flock, buildingSurface?: number, onClose: () => void }) => {
    const d = obs.data || {};
    const inv = d.inventory || {};
    const analysis = analyzeData(d, flock.speculation.name, buildingSurface, flock.subjectCount);
    const spec = flock.speculation.name.toLowerCase();
    const isFish = spec.includes('poisson') || spec.includes('silure');

    return (
        <div className="bg-white p-6 rounded-lg shadow-xl border border-indigo-100 mt-4 relative animate-slide-up">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 font-bold p-2 bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center transition">✕</button>
            <div className="mb-6 border-b pb-4">
                <h3 className="font-bold text-xl text-indigo-900">📄 Rapport Technique & Audit</h3>
                <p className="text-sm text-gray-500">Lot : <span className="font-medium text-gray-800">{flock.name}</span> • Standard : <span className="font-medium text-gray-800">{flock.standard?.name || 'Aucun'}</span></p>
            </div>
            {analysis.densite && analysis.densite.level !== 'success' && (<div className="mb-8"><AnalysisAlert analysis={analysis.densite} /></div>)}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-8">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h4 className="font-bold text-indigo-800 uppercase text-xs tracking-wider mb-3 flex items-center gap-2"><span>📊</span> Performances</h4>
                        <ul className="space-y-3 text-sm text-gray-700">
                            <li className="flex justify-between border-b border-dashed pb-1"><span>Âge</span> <span className="font-bold">{d.age ? `${d.age} jours` : '-'}</span></li>
                            <li className="flex justify-between border-b border-dashed pb-1"><span>Mortalité (Cumul)</span> <span className={`font-bold ${d.mortalite > 0 ? 'text-red-600' : ''}`}>{d.mortalite || 0}</span></li>
                            <li className="flex justify-between border-b border-dashed pb-1"><span>Poids Moyen</span> <span className="font-bold">{d.poidsMoyen ? `${d.poidsMoyen} g` : '-'}</span></li>
                            <li className="flex justify-between border-b border-dashed pb-1"><span>Conso / Tête</span> <span className="font-bold">{d.consoTete ? `${d.consoTete} g` : '-'}</span></li>
                        </ul>
                    </div>
                    {d.inventory && (
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                            <h4 className="font-bold text-yellow-900 uppercase text-xs tracking-wider mb-3 flex items-center gap-2"><span>📦</span> Audit Stocks (kg)</h4>
                            <div className="space-y-2 text-sm bg-white p-3 rounded border border-yellow-100 mb-3">
                                {inv.mode === 'complete' ? (
                                    <div className="flex justify-between"><span>Aliment Complet</span><span className="font-bold text-lg">{inv.complete || 0} kg</span></div>
                                ) : (
                                    <>
                                        {isFish ? (
                                            <>
                                                <div className="flex justify-between"><span>Farine Poisson</span><span className="font-bold">{inv.fishmeal || 0} kg</span></div>
                                                <div className="flex justify-between"><span>Tourteau Soja</span><span className="font-bold">{inv.soja || 0} kg</span></div>
                                                <div className="flex justify-between"><span>Maïs / Son</span><span className="font-bold">{inv.mais_son || 0} kg</span></div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex justify-between"><span>Maïs</span><span className="font-bold">{inv.mais || 0} kg</span></div>
                                                <div className="flex justify-between"><span>Soja</span><span className="font-bold">{inv.soja || 0} kg</span></div>
                                                <div className="flex justify-between"><span>Concentré</span><span className="font-bold">{inv.concentre || 0} kg</span></div>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                            <AnalysisAlert analysis={analysis.stock} />
                        </div>
                    )}
                </div>
                <div className="space-y-8">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-bold text-blue-900 uppercase text-xs tracking-wider mb-3 flex items-center gap-2"><span>💧</span> Eau & Environnement</h4>
                        <div className="space-y-4">
                            <div className="flex justify-between text-sm text-blue-900 mb-1"><span>pH</span><span className="font-bold">{d.phValue || (d.phCorrect === 'yes' ? 'Standard' : '?')}</span></div>
                            <AnalysisAlert analysis={analysis.ph} />
                            <div className="flex justify-between text-sm text-blue-900 mb-1"><span>ORP</span><span className="font-bold">{d.orpValue ? `${d.orpValue} mV` : '-'}</span></div>
                            <AnalysisAlert analysis={analysis.orp} />
                            {!isFish && (
                                <>
                                    <div className="flex justify-between text-sm text-gray-700 mt-2 pt-2 border-t border-blue-200"><span>Litière</span><span className="font-medium">{d.litiere || '-'}</span></div>
                                    <AnalysisAlert analysis={analysis.litiere} />
                                </>
                            )}
                        </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h4 className="font-bold text-indigo-800 uppercase text-xs tracking-wider mb-2 flex items-center gap-2"><span>🛡️</span> Biosécurité</h4>
                        <AnalysisAlert analysis={analysis.biosecurite} />
                        {d.biosecuriteComment && <p className="text-sm text-gray-600 italic bg-white p-2 rounded border mt-2">Note : "{d.biosecuriteComment}"</p>}
                    </div>
                </div>
            </div>
            <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="font-bold text-gray-800 mb-4">Recommandations</h4>
                {obs.recommendations && (
                    <div className="bg-green-100 p-4 rounded-lg border border-green-300">
                        <p className="text-sm text-green-900 whitespace-pre-wrap font-medium">{obs.recommendations}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- 4. FORMULAIRE OBSERVATION ---
const ObservationForm = ({ visitIri, flock, initialData, onSuccess, onCancel }: any) => {
  const [loading, setLoading] = useState(false);
  const isEditMode = !!initialData?.id; 
  const specName = flock.speculation.name.toLowerCase();
  const isFish = specName.includes('poisson') || specName.includes('silure') || specName.includes('pisciculture');

  const [common, setCommon] = useState({
    concerns: initialData?.concerns || '',
    observation: initialData?.observation || '',
    recommendations: initialData?.recommendations || '',
    problems: initialData?.problems || '',
  });

  const storedAliment = initialData?.data?.aliment || '';
  const isKnownAliment = ['Belgocam', 'SPC'].includes(storedAliment);
  const [alimentSource, setAlimentSource] = useState(isKnownAliment ? storedAliment : (storedAliment ? 'Autres' : ''));
  const [alimentPrecision, setAlimentPrecision] = useState(isKnownAliment ? '' : storedAliment);

  const [showInventory, setShowInventory] = useState(!!initialData?.data?.inventory);
  const [inventoryMode, setInventoryMode] = useState<'complete' | 'mix'>(initialData?.data?.inventory?.mode || 'complete');
  const [inventory, setInventory] = useState(initialData?.data?.inventory || { 
      complete: 0, 
      mais: 0, soja: 0, concentre: 0, 
      fishmeal: 0, mais_son: 0 
  });

  const [data, setData] = useState<any>({
      biosecurite: 'ok',
      phCorrect: 'yes',
      waterConsumptionIncrease: 'no',
      effectifDepart: initialData?.data?.effectifDepart || flock.subjectCount || 0,
      ...initialData?.data
  });
  
  const updateData = (key: string, value: any) => setData((prev: any) => ({ ...prev, [key]: value }));
  const updateInventory = (key: string, value: any) => setInventory((prev: any) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem('sav_token');
    const captureDate = initialData?.observedAt || new Date().toISOString();
    
    let finalAliment = alimentSource;
    if (alimentSource === 'Autres') finalAliment = alimentPrecision;

    const finalJsonData = { 
        ...data, 
        aliment: finalAliment,
        inventory: showInventory ? { ...inventory, mode: inventoryMode } : null 
    };

    const url = isEditMode ? `http://localhost/api/observations/${initialData!.id}` : 'http://localhost/api/observations';
    const method = isEditMode ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': isEditMode ? 'application/merge-patch+json' : 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ visit: visitIri, flock: flock['@id'], observedAt: captureDate, ...common, data: finalJsonData }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Erreur'); }
      onSuccess();
    } catch (err: any) { alert("Erreur: " + err.message); } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-5 rounded-lg shadow-lg border-l-4 border-indigo-500 mt-4 relative animate-slide-down">
      <div className="absolute top-2 right-2"><button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 font-bold px-2 py-1">✕</button></div>
      <h3 className="font-bold text-lg text-indigo-900 border-b pb-3">{isEditMode ? '✏️ Modifier Observation' : '➕ Nouvelle Observation'}</h3>

      <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide border-b mb-3">1. Performances</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          <div><label className="block text-sm font-bold text-gray-700">Âge (Jours) *</label><input type="number" required min="0" className="w-full border p-2 rounded" value={data.age || ''} onChange={e => updateData('age', parseInt(e.target.value))} /></div>
          <div><label className="block text-sm font-bold text-gray-700">Mortalité (Sujets) *</label><input type="number" required min="0" className="w-full border p-2 rounded bg-yellow-50" value={data.mortalite || ''} onChange={e => updateData('mortalite', parseInt(e.target.value))} /></div>
          <div><label className="block text-sm font-bold text-gray-700">Poids Moyen (g) *</label><input type="number" required step="0.01" min="0" className="w-full border p-2 rounded" value={data.poidsMoyen || ''} onChange={e => updateData('poidsMoyen', parseFloat(e.target.value))} /></div>
          <div><label className="block text-sm font-bold text-gray-700">Conso / Tête (g) *</label><input type="number" required step="0.01" min="0" className="w-full border p-2 rounded" value={data.consoTete || ''} onChange={e => updateData('consoTete', parseFloat(e.target.value))} /></div>
      </div>

      <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide border-b mb-3">2. Homogénéité du Lot</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6 bg-gray-50 p-3 rounded">
          <div><label className="block text-sm font-bold text-gray-700">Uniformité *</label><select required className="w-full border p-2 rounded bg-white" value={data.uniformite || ''} onChange={e => updateData('uniformite', e.target.value)}><option value="">-- Sélectionner --</option><option value="> 90% (Excellent)"> &gt; 90%</option><option value="80% - 90% (Bon)">80% - 90%</option><option value="70% - 80% (Moyen)">70% - 80%</option><option value="< 70% (Mauvais)"> &lt; 70%</option></select></div>
          <div><label className="block text-sm font-bold text-gray-700">CV (Facultatif)</label><select className="w-full border p-2 rounded bg-white" value={data.cv || ''} onChange={e => updateData('cv', e.target.value)}><option value="">-- Sélectionner --</option><option value="< 8 (Excellent)"> &lt; 8 (Excellent)</option><option value="8 - 10 (Bon)">8 - 10 (Bon)</option><option value="10 - 12 (Moyen)">10 - 12 (Moyen)</option><option value="> 12 (Mauvais)"> &gt; 12 (Mauvais)</option></select></div>
      </div>

      <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide border-b mb-3">3. Environnement & Eau</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6 mb-6">
          <div className="bg-gray-50 p-2 rounded border col-span-2"><label className="block text-sm font-bold text-gray-700">Type Aliment *</label><div className="flex gap-2"><select required className="w-1/3 border p-2 rounded bg-white" value={alimentSource} onChange={e => setAlimentSource(e.target.value)}><option value="">-- Choix --</option><option value="Belgocam">Belgocam</option><option value="SPC">SPC</option><option value="Autres">Autres</option></select>{alimentSource === 'Autres' && (<input type="text" required placeholder="Précisez" className="w-2/3 border p-2 rounded bg-white" value={alimentPrecision} onChange={e => setAlimentPrecision(e.target.value)} />)}</div></div>
          {!isFish && (
            <div><label className="block text-sm font-bold text-gray-700">État Litière *</label><select required className="w-full border p-2 rounded bg-white" value={data.litiere || ''} onChange={e => updateData('litiere', e.target.value)}><option value="">-- État --</option><option value="Friable (Idéal)">Friable</option><option value="Poussiéreuse (Trop sec)">Poussiéreuse</option><option value="Légèrement croûteuse">Lég. croûteuse</option><option value="Collante / Détrempée">Détrempée</option></select></div>
          )}
          <div className="col-span-2 bg-blue-50 p-3 rounded border border-blue-100"><label className="block text-sm font-bold text-blue-900 mb-2">Qualité de l'eau</label><div className="flex gap-4 mb-2"><label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="phCorrect" value="yes" required checked={data.phCorrect === 'yes'} onChange={() => updateData('phCorrect', 'yes')} /> pH OK (6-8)</label><label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="phCorrect" value="no" required checked={data.phCorrect === 'no'} onChange={() => updateData('phCorrect', 'no')} /> pH Incorrect</label>{data.phCorrect === 'no' && (<input type="number" step="0.1" placeholder="Valeur ?" className="border border-red-300 p-1 rounded text-sm w-20" value={data.phValue || ''} onChange={e => updateData('phValue', parseFloat(e.target.value))} />)}</div><div className="flex gap-4"><label className="text-sm">ORP (mV):</label><input type="number" placeholder="ex: 300" className="border border-gray-300 p-1 rounded text-sm w-20" value={data.orpValue || ''} onChange={e => updateData('orpValue', parseInt(e.target.value))} /></div></div>
      </div>

      <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 mb-6">
          <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-bold text-orange-900 uppercase tracking-wide">4. Gestion des Stocks</h4>
              <button type="button" onClick={() => setShowInventory(!showInventory)} className="text-xs bg-white border border-orange-300 text-orange-800 px-3 py-1 rounded hover:bg-orange-100">
                  {showInventory ? 'Masquer' : 'Faire l\'inventaire'}
              </button>
          </div>

          {showInventory && (
              <div className="animate-fade-in">
                  <div className="flex gap-4 mb-4 text-sm">
                      <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={inventoryMode === 'complete'} onChange={() => setInventoryMode('complete')} /> Aliment Complet (Sacs/Vrac)</label>
                      <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={inventoryMode === 'mix'} onChange={() => setInventoryMode('mix')} /> Ingrédients (Mélange)</label>
                  </div>

                  {inventoryMode === 'complete' ? (
                      <div>
                          <label className="block text-sm font-bold text-gray-700">Stock Aliment Total (kg)</label>
                          <input type="number" className="w-full border p-2 rounded bg-white" placeholder="Total sacs + entamés" value={inventory.complete || ''} onChange={e => updateInventory('complete', parseFloat(e.target.value))} />
                          <p className="text-xs text-gray-500 mt-1">Saisir la masse totale en kg (ex: 1250 kg).</p>
                      </div>
                  ) : (
                      <div className="grid grid-cols-3 gap-3">
                          {isFish ? (
                              <>
                                <div><label className="block text-xs font-bold text-gray-600">Farine Poisson (kg)</label><input type="number" className="w-full border p-2 rounded bg-white" value={inventory.fishmeal || ''} onChange={e => updateInventory('fishmeal', parseFloat(e.target.value))} /></div>
                                <div><label className="block text-xs font-bold text-gray-600">Soja (kg)</label><input type="number" className="w-full border p-2 rounded bg-white" value={inventory.soja || ''} onChange={e => updateInventory('soja', parseFloat(e.target.value))} /></div>
                                <div><label className="block text-xs font-bold text-gray-600">Maïs / Son (kg)</label><input type="number" className="w-full border p-2 rounded bg-white" value={inventory.mais_son || ''} onChange={e => updateInventory('mais_son', parseFloat(e.target.value))} /></div>
                              </>
                          ) : (
                              <>
                                <div><label className="block text-xs font-bold text-gray-600">Maïs (kg)</label><input type="number" className="w-full border p-2 rounded bg-white" value={inventory.mais || ''} onChange={e => updateInventory('mais', parseFloat(e.target.value))} /></div>
                                <div><label className="block text-xs font-bold text-gray-600">Soja (kg)</label><input type="number" className="w-full border p-2 rounded bg-white" value={inventory.soja || ''} onChange={e => updateInventory('soja', parseFloat(e.target.value))} /></div>
                                <div><label className="block text-xs font-bold text-gray-600">Concentré (kg)</label><input type="number" className="w-full border p-2 rounded bg-white" value={inventory.concentre || ''} onChange={e => updateInventory('concentre', parseFloat(e.target.value))} /></div>
                              </>
                          )}
                      </div>
                  )}
                  <p className="text-xs text-orange-700 mt-2 italic">* Saisir la masse réelle pesée ou estimée en magasin.</p>
              </div>
          )}
      </div>

      <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide border-b mb-3">5. Biosécurité</h4>
      <div className="bg-gray-50 p-4 rounded border border-gray-200 mb-6"><label className="block text-sm font-bold text-gray-700 mb-2">Conformité *</label><div className="flex gap-6 mb-3"><label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="biosecurite" value="ok" required checked={data.biosecurite === 'ok'} onChange={() => updateData('biosecurite', 'ok')} className="w-4 h-4 text-green-600"/><span className="text-gray-800">Conforme</span></label><label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="biosecurite" value="nok" required checked={data.biosecurite === 'nok'} onChange={() => updateData('biosecurite', 'nok')} className="w-4 h-4 text-red-600"/><span className="text-gray-800">Non Conforme</span></label></div><div><label className="block text-xs font-medium text-gray-500 mb-1">Commentaires Biosécurité</label><textarea className="w-full border p-2 rounded text-sm" placeholder="Observations..." rows={2} value={data.biosecuriteComment || ''} onChange={e => updateData('biosecuriteComment', e.target.value)} /></div></div>

      <hr className="border-gray-200" />
      
      <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide border-b mb-3 mt-6">6. Textes & Conclusions</h4>
      <div className="space-y-4">
        <div><label className="block text-sm font-medium text-gray-700">Préoccupations Client</label><textarea className="w-full border rounded p-2" rows={2} value={common.concerns} onChange={e => setCommon({ ...common, concerns: e.target.value })} /></div>
        <div><label className="block text-sm font-medium text-gray-700">Observations</label><textarea className="w-full border rounded p-2" rows={2} value={common.observation} onChange={e => setCommon({ ...common, observation: e.target.value })} /></div>
        <div><label className="block text-sm font-bold text-green-800">Recommandations</label><textarea className="w-full border border-green-300 bg-green-50 rounded p-2" rows={3} value={common.recommendations} onChange={e => setCommon({ ...common, recommendations: e.target.value })} /></div>
      </div>

      <div className="flex gap-3 justify-end pt-4"><button type="button" onClick={onCancel} className="px-5 py-2.5 text-gray-700 bg-white border rounded hover:bg-gray-50">Annuler</button><button type="submit" disabled={loading} className="px-6 py-2.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 shadow">{loading ? 'Enregistrement...' : (isEditMode ? 'Modifier' : 'Enregistrer')}</button></div>
    </form>
  );
};

// --- 5. CRÉATION DE BANDE ---
const NewFlockForm = ({ customerIri, buildingIri, onSuccess, onCancel }: any) => {
    const [speculations, setSpeculations] = useState<any[]>([]);
    const [standards, setStandards] = useState<any[]>([]); 
    const [selectedSpec, setSelectedSpec] = useState('');
    const [selectedStandard, setSelectedStandard] = useState(''); 
    const [installDate, setInstallDate] = useState(new Date().toISOString().slice(0, 10));
    const [subjectCount, setSubjectCount] = useState<string>(''); 
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('sav_token');
        const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/ld+json' };
        
        fetch('http://localhost/api/speculations', { headers })
        .then(res => res.json()).then(data => {
            const specs = data['hydra:member'] || data['member'] || [];
            setSpeculations(specs);
            if (specs.length > 0) setSelectedSpec(specs[0]['@id']);
        });

        fetch('http://localhost/api/standards', { headers })
        .then(res => res.json())
        .then(data => {
            const stds = data['hydra:member'] || data['member'] || [];
            setStandards(stds);
        })
        .catch(err => console.log('Standards API not yet available'));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('sav_token');
            const body: any = { 
                customer: customerIri, 
                building: buildingIri, 
                speculation: selectedSpec, 
                startDate: new Date(installDate).toISOString(), 
                subjectCount: subjectCount ? parseInt(subjectCount) : 0 
            };
            if (selectedStandard) body.standard = selectedStandard;

            const res = await fetch('http://localhost/api/flocks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(body)
            });
            if (!res.ok) throw new Error("Erreur");
            onSuccess();
        } catch (error) { alert("Erreur création"); } finally { setLoading(false); }
    };

    const filteredStandards = standards.filter(s => !s.speculation || s.speculation === selectedSpec || s.speculation['@id'] === selectedSpec);

    return (
        <form onSubmit={handleSubmit} className="bg-green-50 p-4 rounded-lg border border-green-200 mt-4 animate-fade-in">
            <h4 className="font-bold text-green-800 mb-3">🌱 Nouvelle bande</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-sm text-gray-700">Spéculation</label>
                    <select className="w-full border rounded p-2 bg-white" value={selectedSpec} onChange={e => setSelectedSpec(e.target.value)}>
                        {speculations.map(s => <option key={s['@id']} value={s['@id']}>{s.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm text-gray-700">Standard (Souche) *</label>
                    <select className="w-full border rounded p-2 bg-white" required value={selectedStandard} onChange={e => setSelectedStandard(e.target.value)}>
                        <option value="">-- Choisir le standard --</option>
                        {filteredStandards.map(s => <option key={s['@id']} value={s['@id']}>{s.name}</option>)}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Définit les objectifs de poids et de consommation.</p>
                </div>
                <div><label className="block text-sm text-gray-700">Date install.</label><input type="date" required className="w-full border rounded p-2" value={installDate} onChange={e => setInstallDate(e.target.value)} /></div>
                <div><label className="block text-sm text-gray-700">Effectif</label><input type="number" required min="1" className="w-full border rounded p-2" value={subjectCount} onChange={e => setSubjectCount(e.target.value)} /></div>
            </div>
            <div className="flex justify-end gap-2"><button type="button" onClick={onCancel} className="px-3 py-2 text-sm text-gray-600">Annuler</button><button type="submit" disabled={loading} className="px-4 py-2 text-sm text-white bg-green-600 rounded">Valider</button></div>
        </form>
    );
};

// --- 6. CRÉATION DE BÂTIMENT (NOUVEAU) ---
const NewBuildingForm = ({ customerIri, existingBuildings, onSuccess, onCancel }: { customerIri: string, existingBuildings: Building[], onSuccess: () => void, onCancel: () => void }) => {
    const [surface, setSurface] = useState('');
    const [maxCapacity, setMaxCapacity] = useState('');
    const [loading, setLoading] = useState(false);

    // Algorithme pour générer le nom : "Bâtiment X"
    const generateNextName = () => {
        let maxNum = 0;
        // Regex pour trouver les chiffres dans "Bâtiment 12"
        const regex = /Bâtiment\s+(\d+)/i;
        
        existingBuildings.forEach(b => {
            const match = b.name.match(regex);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) maxNum = num;
            }
        });
        
        // Si aucun bâtiment numéroté, on regarde juste la longueur
        if (maxNum === 0 && existingBuildings.length > 0) {
            return `Bâtiment ${existingBuildings.length + 1}`;
        }
        
        return `Bâtiment ${maxNum + 1}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        const autoName = generateNextName();

        try {
            const token = localStorage.getItem('sav_token');
            const res = await fetch('http://localhost/api/buildings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ 
                    name: autoName, // Généré auto
                    surface: parseFloat(surface), 
                    maxCapacity: maxCapacity ? parseInt(maxCapacity) : null,
                    customer: customerIri, 
                    activated: true 
                })
            });
            if (!res.ok) throw new Error("Erreur");
            onSuccess();
        } catch (error) { alert("Erreur ajout bâtiment"); } finally { setLoading(false); }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-5 rounded-lg border border-indigo-100 mt-4 shadow-lg animate-fade-in relative">
            <button type="button" onClick={onCancel} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">✕</button>
            
            <h4 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                <span>🏗️</span> Nouveau Bâtiment
            </h4>
            
            <div className="bg-indigo-50 px-3 py-2 rounded text-sm text-indigo-700 mb-4 font-medium border border-indigo-100">
                Nom généré : {generateNextName()}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Surface (m²) <span className="text-red-500">*</span></label>
                    <input 
                        type="number" 
                        required 
                        min="1" 
                        step="0.1"
                        placeholder="Ex: 100" 
                        className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                        value={surface} 
                        onChange={e => setSurface(e.target.value)} 
                    />
                    <p className="text-xs text-gray-500 mt-1">Essentiel pour le calcul de densité.</p>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Capacité Max (Sujets)</label>
                    <input 
                        type="number" 
                        min="1" 
                        placeholder="Ex: 1000" 
                        className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                        value={maxCapacity} 
                        onChange={e => setMaxCapacity(e.target.value)} 
                    />
                </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={loading} className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 rounded hover:bg-indigo-700 shadow-sm disabled:opacity-50">
                    {loading ? 'Création...' : 'Créer le Bâtiment'}
                </button>
            </div>
        </form>
    );
};

// --- 7. COMPOSANT : ITEM BÂTIMENT ---
const BuildingItem = ({ building, visit, userRoles, onRefresh }: { building: Building, visit: Visit, userRoles: string[], onRefresh: () => void }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [viewMode, setViewMode] = useState<'summary' | 'form' | 'details' | 'create_flock'>('summary');
    const currentFlock = building.flocks.length > 0 ? building.flocks[building.flocks.length -1] : null;
    const existingObs = currentFlock?.observations?.find(obs => (typeof obs.visit === 'object' && obs.visit?.['@id'] === visit['@id']) || (typeof obs.visit === 'string' && obs.visit === visit['@id']));
    
    // Logique de sécurité pour suppression
    const isAdmin = userRoles.includes('ROLE_ADMIN') || userRoles.includes('ROLE_SUPER_ADMIN');
    // Une bande est "active" si elle n'a pas de date de fin (simplifié) ou si elle est récente. 
    // Ici on suppose que le backend envoie "active" ou on vérifie si la visite est possible.
    const hasActiveFlock = !!currentFlock; 
    
    const handleDelete = async () => {
        if (!confirm("Voulez-vous vraiment supprimer ce bâtiment ? Cette action est irréversible et supprimera l'historique associé.")) return;
        const token = localStorage.getItem('sav_token');
        try {
            await fetch(`http://localhost/api/buildings/${building.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            onRefresh();
        } catch (e) { alert("Erreur suppression"); }
    };

    const handleArchive = async () => {
        const token = localStorage.getItem('sav_token');
        try {
            await fetch(`http://localhost/api/buildings/${building.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/merge-patch+json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ activated: !building.activated })
            });
            onRefresh();
        } catch (e) { alert("Erreur archivage"); }
    };

    useEffect(() => { setViewMode('summary'); }, [isExpanded, currentFlock?.id]);

    if (!building.activated && !isAdmin) return null; // Masquer les bâtiments archivés pour les non-admins

    return (
        <div className={`bg-white rounded-xl shadow-sm border ${building.activated ? 'border-gray-200' : 'border-gray-200 opacity-75 bg-gray-50'} overflow-hidden`}>
            <div className={`p-5 flex justify-between items-center cursor-pointer transition-colors ${isExpanded ? 'bg-indigo-50 border-b border-indigo-100' : 'hover:bg-gray-50'}`} onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{building.activated ? '🏠' : '🗄️'}</span>
                    <div>
                        <h2 className={`font-bold text-lg ${building.activated ? 'text-gray-800' : 'text-gray-500 italic'}`}>
                            {building.name} {building.activated ? '' : '(Archivé)'}
                        </h2>
                        {currentFlock ? (<p className="text-xs text-indigo-600 font-medium bg-indigo-100 px-2 py-0.5 rounded-full inline-block mt-1">Lot : {currentFlock.name}</p>) : (<p className="text-xs text-gray-400 mt-1">Vide</p>)}
                        {building.surface && <span className="text-xs text-gray-400 ml-2">({building.surface} m²)</span>}
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {isExpanded && !visit.closed && (
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            {isAdmin ? (
                                <>
                                    <button onClick={handleArchive} className="text-xs text-gray-500 hover:text-gray-700 underline">{building.activated ? 'Archiver' : 'Activer'}</button>
                                    <button onClick={handleDelete} className="text-xs text-red-500 hover:text-red-700 underline">Supprimer</button>
                                </>
                            ) : (
                                // Technicien : Peut supprimer seulement si vide
                                !hasActiveFlock && (
                                    <button onClick={handleDelete} className="text-xs text-red-400 hover:text-red-600 underline">Supprimer</button>
                                )
                            )}
                        </div>
                    )}
                    <span className="text-gray-400 font-bold text-xl">{isExpanded ? '−' : '+'}</span>
                </div>
            </div>
            {isExpanded && building.activated && (
                <div className="p-5 bg-white">
                    {!currentFlock ? (
                        <div className="text-center py-6"><p className="text-gray-500 italic mb-4">Aucune bande installée.</p>{viewMode === 'create_flock' ? (<NewFlockForm customerIri={visit.customer['@id']} buildingIri={building['@id']} onSuccess={() => { setViewMode('summary'); onRefresh(); }} onCancel={() => setViewMode('summary')} />) : (!visit.closed && (<button onClick={() => setViewMode('create_flock')} className="bg-green-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-green-700 transition shadow-sm">+ Installer une nouvelle bande</button>))}</div>
                    ) : (
                        <div>
                            {viewMode === 'form' && (<ObservationForm visitIri={visit['@id']} flock={currentFlock} initialData={existingObs} onSuccess={() => { setViewMode('summary'); onRefresh(); }} onCancel={() => setViewMode('summary')} />)}
                            {viewMode === 'details' && existingObs && (<ObservationDetailsView obs={existingObs} flock={currentFlock} buildingSurface={building.surface} onClose={() => setViewMode('summary')} />)}
                            {viewMode === 'summary' && (
                                <div className="mt-2">
                                    {existingObs ? (
                                        <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                                            <div className="flex justify-between items-start mb-3"><h5 className="font-bold text-blue-800 flex items-center gap-2"><span>📋 Résumé</span><span className="text-xs font-normal text-blue-600 bg-white px-2 py-0.5 rounded-full border border-blue-100">Saisie le {existingObs.observedAt ? new Date(existingObs.observedAt).toLocaleDateString() : 'N/A'}</span></h5></div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                                                <div className="bg-white p-2 rounded border border-blue-100"><span className="text-gray-500 block text-xs">Mortalité</span><span className="font-bold text-gray-800">{existingObs.data?.mortalite || 0}</span></div>
                                                <div className="bg-white p-2 rounded border border-blue-100"><span className="text-gray-500 block text-xs">Poids</span><span className="font-bold text-gray-800">{existingObs.data?.poidsMoyen || '-'} g</span></div>
                                                <div className={`p-2 rounded border ${existingObs.data?.biosecurite === 'ok' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}><span className="block text-xs opacity-70">Biosécurité</span><span className={`font-bold ${existingObs.data?.biosecurite === 'ok' ? 'text-green-700' : 'text-red-700'}`}>{existingObs.data?.biosecurite === 'ok' ? 'OK' : 'NOK'}</span></div>
                                            </div>
                                            <div className="flex gap-3 pt-3 border-t border-blue-200">
                                                {!visit.closed && (<button onClick={() => setViewMode('form')} className="flex-1 flex justify-center items-center gap-2 bg-white text-blue-700 border border-blue-300 py-2 rounded-lg font-bold hover:bg-blue-50 transition">✏️ Modifier</button>)}
                                                <button onClick={() => setViewMode('details')} className="flex-1 flex justify-center items-center gap-2 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition shadow-sm">📄 Détails</button>
                                            </div>
                                        </div>
                                    ) : (!visit.closed ? (<button onClick={() => setViewMode('form')} className="w-full py-6 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-500 hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 transition group"><span className="text-3xl mb-1 group-hover:scale-110 transition-transform">➕</span><span className="font-bold">Ajouter une observation</span></button>) : <p className="text-center text-gray-400 italic py-4">Aucune observation n'a été saisie pour cette visite clôturée.</p>)}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// --- PAGE PRINCIPALE ---
export default function VisitDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [unwrappedParams, setUnwrappedParams] = useState<{ id: string } | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewBuilding, setShowNewBuilding] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  useEffect(() => { params.then(res => setUnwrappedParams(res)); }, [params]);
  useEffect(() => { if (unwrappedParams) fetchVisit(unwrappedParams.id); }, [unwrappedParams]);

  const fetchVisit = (id: string) => {
    const token = localStorage.getItem('sav_token');
    if (!token) { router.push('/'); return; }
    
    // Décodage du token pour les rôles
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRoles(payload.roles || []);
    } catch (e) { console.error(e); }

    fetch(`http://localhost/api/visits/${id}`, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/ld+json' } })
    .then(res => { if (!res.ok) throw new Error('Visite introuvable'); return res.json(); })
    .then(data => { setVisit(data); setLoading(false); })
    .catch(err => { console.error(err); router.push('/dashboard'); });
  };

  const handleCloseVisit = async () => {
    if (!visit || !confirm("Clôturer définitivement cette visite ?")) return;
    const token = localStorage.getItem('sav_token');
    try { await fetch(`http://localhost/api/visits/${visit.id}/close`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` } }); fetchVisit(visit.id.toString()); } catch (error) { alert("Erreur lors de la clôture"); }
  };

  if (loading || !visit) return <div className="p-10 text-center text-gray-500">Chargement de la visite...</div>;

  return (
    <div className="min-h-screen bg-gray-100 pb-20 font-sans">
      <div className="bg-white shadow px-6 py-4 flex justify-between items-center sticky top-0 z-20">
        <div><Link href="/dashboard" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition">← Retour</Link><h1 className="text-2xl font-extrabold text-gray-800 mt-1">{visit.customer.name}</h1><p className="text-sm text-gray-500">{new Date(visit.visitedAt).toLocaleDateString()} • {visit.customer.zone}</p></div>
        <div className="flex gap-3 items-center"><span className={`px-4 py-1.5 rounded-full text-sm font-bold border ${visit.closed ? 'bg-gray-100 text-gray-600 border-gray-200' : 'bg-green-100 text-green-700 border-green-200'}`}>{visit.closed ? '🔒 CLÔTURÉE' : '🟢 EN COURS'}</span>{!visit.closed && (<button onClick={handleCloseVisit} className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-100 text-sm font-bold transition">Clôturer</button>)}</div>
      </div>
      
      <div className="max-w-5xl mx-auto px-4 mt-8 space-y-6">
        
        {/* BOUTON AJOUTER BÂTIMENT */}
        {!visit.closed && (
            <div className="flex justify-end">
                <button onClick={() => setShowNewBuilding(!showNewBuilding)} className="text-indigo-600 font-bold text-sm bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition">
                    {showNewBuilding ? 'Annuler' : '+ Nouveau Bâtiment'}
                </button>
            </div>
        )}

        {showNewBuilding && (
            <NewBuildingForm 
                customerIri={visit.customer['@id']}
                existingBuildings={visit.customer.buildings ? visit.customer.buildings : []} // On passe la liste pour le calcul du nom
                onSuccess={() => { setShowNewBuilding(false); fetchVisit(visit.id.toString()); }}
                onCancel={() => setShowNewBuilding(false)}
            />
        )}

        {visit.customer.buildings?.map((building) => (
            <BuildingItem 
                key={building['@id']} 
                building={building} 
                visit={visit} 
                userRoles={userRoles}
                onRefresh={() => fetchVisit(visit.id.toString())} 
            />
        ))}
      </div>
    </div>
  );
}