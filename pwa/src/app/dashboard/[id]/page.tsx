'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// --- 1. TYPES ---

interface Speculation {
  name: string;
}

interface Flock {
  '@id': string;
  id: number;
  name: string;
  speculation: Speculation;
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

// --- 2. MOTEUR D'ANALYSE EXPERT & MULTI-SPÉCULATION ---

type AnalysisLevel = 'success' | 'warning' | 'danger' | 'info';

interface Interpretation {
    level: AnalysisLevel;
    message: string;
    action?: string;
    value?: string;
}

/**
 * Moteur de règles métier qui s'adapte à la spéculation (Chair, Pondeuse, Poisson...)
 */
const analyzeData = (
    data: any, 
    speculationName: string, 
    buildingSurface?: number, 
    flockSubjectCount?: number
): Record<string, Interpretation | null> => {
    
    const results: Record<string, Interpretation | null> = {};
    const spec = speculationName.toLowerCase();
    const isFish = spec.includes('poisson') || spec.includes('pisciculture');
    const isLayer = spec.includes('pondeuse');
    const isBroiler = spec.includes('chair') || spec.includes('poulet');

    // --- A. ANALYSE DENSITÉ / BIOMASSE ---
    const effectifDepart = data.effectifDepart || flockSubjectCount || 0;
    
    if (buildingSurface && buildingSurface > 0 && data.poidsMoyen && effectifDepart > 0) {
        const effectifActuel = effectifDepart - (data.mortalite || 0);
        // Poids en kg
        const poidsTotalKg = (data.poidsMoyen / 1000) * effectifActuel; 
        const densite = poidsTotalKg / buildingSurface;
        const densiteStr = `${densite.toFixed(1)} kg/m²`;

        // Règles spécifiques par spéculation
        if (isBroiler) {
            if (densite > 38) {
                results.densite = { level: 'danger', message: `Saturation Critique (${densiteStr})`, action: 'Desserage immédiat impératif.' };
            } else if (densite > 32) {
                results.densite = { level: 'warning', message: `Densité Élevée (${densiteStr})`, action: 'Maximiser la ventilation. Surveiller litière.' };
            } else {
                results.densite = { level: 'success', message: `Densité Optimale (${densiteStr})` };
            }
        } else if (isLayer) {
            // Pondeuses au sol souvent max 9 poules/m2 ~ 18-20kg/m2
            if (densite > 25) {
                results.densite = { level: 'danger', message: `Surpopulation Pondeuses (${densiteStr})`, action: 'Risque de picage et baisse de ponte.' };
            } else {
                results.densite = { level: 'success', message: `Densité OK (${densiteStr})` };
            }
        } else if (isFish) {
            // Pour le poisson on parle en kg/m3, supposons 1m de profondeur pour l'estimation surface
            if (densite > 50) { 
                results.densite = { level: 'warning', message: `Biomasse élevée (${densiteStr})`, action: 'Vérifier oxygène dissous en permanence.' };
            }
        }
    }

    // --- B. QUALITÉ EAU (pH) ---
    if (data.phValue || data.phCorrect === 'no') {
        const ph = data.phValue ? parseFloat(data.phValue) : (data.phCorrect === 'yes' ? 7.0 : 0);
        
        if (isFish) {
            // Poissons : pH cible 6.5 - 8.5
            if (ph < 6.5) results.ph = { level: 'danger', message: `Eau trop acide (${ph})`, action: 'Ajouter chaux ou bicarbonate.' };
            else if (ph > 9.0) results.ph = { level: 'danger', message: `Eau trop basique (${ph})`, action: 'Risque toxicité ammoniac. Renouveler eau.' };
            else results.ph = { level: 'success', message: `pH Conforme (${ph})` };
        } else {
            // Volailles : pH cible 5.5 - 7.0 (Acidification bénéfique)
            if (ph < 5.0) results.ph = { level: 'danger', message: `Eau corrosive (${ph})`, action: 'Arrêter acidification. Risque refus de boire.' };
            else if (ph > 7.5) results.ph = { level: 'warning', message: `Eau basique (${ph})`, action: 'Efficacité chlore réduite. Acidifier.' };
            else if (data.phCorrect === 'yes' || (ph >= 5.5 && ph <= 7.0)) results.ph = { level: 'success', message: 'pH Optimal' };
        }
    }

    // --- C. QUALITÉ EAU (ORP/Redox) ---
    if (data.orpValue) {
        const orp = parseInt(data.orpValue);
        if (orp < 250) {
            results.orp = { level: 'danger', message: `DANGER BIO (${orp} mV)`, action: 'Microbes actifs. Choc chlore immédiat.' };
        } else if (orp >= 650) {
            results.orp = { level: 'success', message: `Désinfection Top (${orp} mV)` };
        } else {
            results.orp = { level: 'warning', message: `Désinfection moyenne (${orp} mV)`, action: 'Viser > 650mV pour l\'eau de boisson.' };
        }
    }

    // --- D. LITIÈRE (Volailles uniquement) ---
    if (!isFish && data.litiere) {
        if (['Croûteuse / Humide', 'Collante / Détrempée'].includes(data.litiere)) {
            results.litiere = { level: 'danger', message: 'Litière dégradée', action: 'Risque Pododermatites/Coccidiose. Retirer plaques humides.' };
        } else if (data.litiere === 'Poussiéreuse (Trop sec)') {
            results.litiere = { level: 'warning', message: 'Trop sec / Poussière', action: 'Risque respiratoire. Réduire ventilation min.' };
        } else {
            results.litiere = { level: 'success', message: 'Litière conforme' };
        }
    }

    // --- E. HOMOGÉNÉITÉ ---
    if (data.uniformite) {
        if (data.uniformite.includes('< 70%')) {
            results.uniformite = { level: 'danger', message: 'Hétérogénéité critique', action: 'Compétition forte. Trier les sujets.' };
        } else if (data.uniformite.includes('> 90%')) {
            results.uniformite = { level: 'success', message: 'Lot uniforme' };
        } else {
            results.uniformite = { level: 'warning', message: 'Uniformité moyenne', action: 'Vérifier accès mangeoires.' };
        }
    }

    // --- F. BIOSÉCURITÉ ---
    if (data.biosecurite === 'nok') {
        results.biosecurite = { level: 'danger', message: 'Non-Conformité Sanitaire', action: 'Voir commentaire. Risque contamination.' };
    } else {
        results.biosecurite = { level: 'success', message: 'Mesures respectées' };
    }

    return results;
};

// Composant visuel pour les alertes dans la vue détail
const AnalysisAlert = ({ analysis }: { analysis?: Interpretation | null }) => {
    if (!analysis) return null;
    
    // Codes couleurs et icônes
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
                {analysis.action && (
                    <p className="text-xs mt-1 font-semibold underline decoration-dotted opacity-90">
                        👉 {analysis.action}
                    </p>
                )}
            </div>
        </div>
    );
};

// --- 3. COMPOSANT : VUE DÉTAILS (Lecture Seule) ---

const ObservationDetailsView = ({ 
    obs, 
    flock, 
    buildingSurface,
    onClose 
}: { 
    obs: Observation, 
    flock: Flock, 
    buildingSurface?: number,
    onClose: () => void 
}) => {
    const d = obs.data || {};
    // On lance l'analyse avec le contexte complet
    const analysis = analyzeData(d, flock.speculation.name, buildingSurface, flock.subjectCount);

    return (
        <div className="bg-white p-6 rounded-lg shadow-xl border border-indigo-100 mt-4 relative animate-slide-up">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 font-bold p-2 bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center transition">✕</button>
            
            <div className="mb-6 border-b pb-4">
                <h3 className="font-bold text-xl text-indigo-900">
                    📄 Rapport d'analyse technique
                </h3>
                <p className="text-sm text-gray-500">
                    Lot : <span className="font-medium text-gray-800">{flock.name}</span> • 
                    Spéculation : <span className="font-medium text-gray-800">{flock.speculation.name}</span>
                </p>
            </div>

            {/* ALERTE GÉNÉRALE DENSITÉ (Si critique) */}
            {analysis.densite && analysis.densite.level !== 'success' && (
                <div className="mb-8">
                    <AnalysisAlert analysis={analysis.densite} />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* BLOC GAUCHE : PERFORMANCES */}
                <div className="space-y-8">
                    {/* ZOOTECHNIE */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h4 className="font-bold text-indigo-800 uppercase text-xs tracking-wider mb-3 flex items-center gap-2">
                            <span>📊</span> Performances Zootechniques
                        </h4>
                        <ul className="space-y-3 text-sm text-gray-700">
                            <li className="flex justify-between border-b border-dashed pb-1"><span>Âge</span> <span className="font-bold">{d.age ? `${d.age} jours` : '-'}</span></li>
                            <li className="flex justify-between border-b border-dashed pb-1"><span>Effectif Départ</span> <span className="font-bold">{d.effectifDepart || '-'}</span></li>
                            <li className="flex justify-between border-b border-dashed pb-1">
                                <span>Mortalité (Cumul)</span> 
                                <span className={`font-bold ${d.mortalite > 0 ? 'text-red-600' : ''}`}>{d.mortalite || 0}</span>
                            </li>
                            <li className="flex justify-between border-b border-dashed pb-1"><span>Poids Moyen</span> <span className="font-bold">{d.poidsMoyen ? `${d.poidsMoyen} g` : '-'}</span></li>
                            <li className="flex justify-between"><span>Conso / Tête</span> <span className="font-bold">{d.consoTete ? `${d.consoTete} g` : '-'}</span></li>
                        </ul>
                    </div>

                    {/* HOMOGÉNÉITÉ */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h4 className="font-bold text-indigo-800 uppercase text-xs tracking-wider mb-3 flex items-center gap-2">
                            <span>⚖️</span> Homogénéité
                        </h4>
                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between text-sm text-gray-700 mb-1">
                                    <span>Uniformité</span>
                                    <span className="font-bold">{d.uniformite || 'Non mesuré'}</span>
                                </div>
                                {/* INTERPRÉTATION HOMOGÉNÉITÉ ICI */}
                                <AnalysisAlert analysis={analysis.uniformite} />
                            </div>
                            <div className="flex justify-between text-sm text-gray-700 border-t pt-2">
                                <span>Coeff. Variation (CV)</span>
                                <span className="font-bold">{d.cv || '-'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BLOC DROIT : ENVIRONNEMENT */}
                <div className="space-y-8">
                    {/* AMBIANCE & LITIÈRE */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h4 className="font-bold text-indigo-800 uppercase text-xs tracking-wider mb-3 flex items-center gap-2">
                            <span>🏠</span> Environnement
                        </h4>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm text-gray-700 mb-1">
                                    <span>État Litière</span>
                                    <span className="font-bold">{d.litiere || 'Non renseigné'}</span>
                                </div>
                                {/* INTERPRÉTATION LITIÈRE ICI */}
                                <AnalysisAlert analysis={analysis.litiere} />
                            </div>
                            
                            <div className="flex justify-between text-sm text-gray-700 border-t pt-2">
                                <span>Aliment distribué</span>
                                <span className="font-bold">{d.aliment || '-'}</span>
                            </div>
                        </div>
                    </div>

                    {/* QUALITÉ EAU */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-bold text-blue-900 uppercase text-xs tracking-wider mb-3 flex items-center gap-2">
                            <span>💧</span> Qualité de l'eau
                        </h4>
                        <div className="space-y-4">
                            {/* pH Analysis */}
                            <div>
                                <div className="flex justify-between text-sm text-blue-900 mb-1">
                                    <span>pH</span>
                                    <span className="font-bold">{d.phValue || (d.phCorrect === 'yes' ? 'Standard' : '?')}</span>
                                </div>
                                <AnalysisAlert analysis={analysis.ph} />
                            </div>

                            {/* ORP Analysis */}
                            <div>
                                <div className="flex justify-between text-sm text-blue-900 mb-1">
                                    <span>Potentiel Redox (ORP)</span>
                                    <span className="font-bold">{d.orpValue ? `${d.orpValue} mV` : '-'}</span>
                                </div>
                                <AnalysisAlert analysis={analysis.orp} />
                            </div>

                            <div className="flex justify-between text-sm text-blue-900 border-t border-blue-200 pt-2">
                                <span>Consommation en hausse ?</span>
                                <span className="font-bold">{d.waterConsumptionIncrease === 'yes' ? 'Oui 📈' : 'Non ➡️'}</span>
                            </div>
                        </div>
                    </div>

                    {/* BIOSÉCURITÉ */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h4 className="font-bold text-indigo-800 uppercase text-xs tracking-wider mb-2 flex items-center gap-2">
                            <span>🛡️</span> Biosécurité
                        </h4>
                        <AnalysisAlert analysis={analysis.biosecurite} />
                        {d.biosecuriteComment && (
                            <p className="text-sm text-gray-600 italic bg-white p-2 rounded border mt-2">
                                Note : "{d.biosecuriteComment}"
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* RECOMMANDATIONS ET TEXTES */}
            <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="font-bold text-gray-800 mb-4">Observations & Recommandations</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {obs.concerns && (
                        <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                            <span className="block text-xs font-bold text-yellow-800 uppercase mb-1">Préoccupations Client</span>
                            <p className="text-sm text-gray-800">{obs.concerns}</p>
                        </div>
                    )}
                    {obs.problems && (
                        <div className="bg-red-50 p-3 rounded border border-red-200">
                            <span className="block text-xs font-bold text-red-800 uppercase mb-1">Problèmes Identifiés</span>
                            <p className="text-sm text-gray-800">{obs.problems}</p>
                        </div>
                    )}
                </div>

                {obs.observation && (
                    <div className="mt-4">
                        <span className="block text-xs font-bold text-gray-500 uppercase mb-1">Observations Techniques</span>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded border">{obs.observation}</p>
                    </div>
                )}

                {obs.recommendations && (
                    <div className="mt-4 bg-green-100 p-4 rounded-lg border border-green-300">
                        <span className="font-bold text-green-900 flex items-center gap-2 mb-2">
                            <span>✅</span> RECOMMANDATIONS GÉNÉRALES
                        </span>
                        <p className="text-sm text-green-900 whitespace-pre-wrap font-medium">{obs.recommendations}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- 4. FORMULAIRE (Inchangé mais inclus pour cohérence) ---
const ObservationForm = ({ visitIri, flock, initialData, onSuccess, onCancel }: any) => {
  const [loading, setLoading] = useState(false);
  const isEditMode = !!initialData?.id; 
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
  const [data, setData] = useState<any>({
      biosecurite: 'ok',
      phCorrect: 'yes',
      waterConsumptionIncrease: 'no',
      effectifDepart: initialData?.data?.effectifDepart || flock.subjectCount || 0,
      ...initialData?.data
  });
  const updateData = (key: string, value: any) => setData((prev: any) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem('sav_token');
    const captureDate = initialData?.observedAt || new Date().toISOString();
    let finalAliment = alimentSource;
    if (alimentSource === 'Autres') finalAliment = alimentPrecision;
    const finalJsonData = { ...data, aliment: finalAliment };
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
          <div className="bg-gray-50 p-2 rounded border col-span-1 md:col-span-2"><label className="block text-sm font-bold text-gray-700">Type Aliment *</label><div className="flex gap-2"><select required className="w-1/3 border p-2 rounded bg-white" value={alimentSource} onChange={e => setAlimentSource(e.target.value)}><option value="">-- Choix --</option><option value="Belgocam">Belgocam</option><option value="SPC">SPC</option><option value="Autres">Autres</option></select>{alimentSource === 'Autres' && (<input type="text" required placeholder="Précisez" className="w-2/3 border p-2 rounded bg-white" value={alimentPrecision} onChange={e => setAlimentPrecision(e.target.value)} />)}</div></div>
      </div>

      <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide border-b mb-3">2. Homogénéité</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6 bg-gray-50 p-3 rounded">
          <div><label className="block text-sm font-bold text-gray-700">Uniformité *</label><select required className="w-full border p-2 rounded bg-white" value={data.uniformite || ''} onChange={e => updateData('uniformite', e.target.value)}><option value="">-- Sélectionner --</option><option value="> 90% (Excellent)"> &gt; 90% (Excellent)</option><option value="80% - 90% (Bon)">80% - 90% (Bon)</option><option value="70% - 80% (Moyen)">70% - 80% (Moyen)</option><option value="< 70% (Mauvais)"> &lt; 70% (Mauvais)</option></select></div>
          <div><label className="block text-sm font-bold text-gray-700">CV (Facultatif)</label><select className="w-full border p-2 rounded bg-white" value={data.cv || ''} onChange={e => updateData('cv', e.target.value)}><option value="">-- Sélectionner --</option><option value="< 8 (Excellent)"> &lt; 8 (Excellent)</option><option value="8 - 10 (Bon)">8 - 10 (Bon)</option><option value="10 - 12 (Moyen)">10 - 12 (Moyen)</option><option value="> 12 (Mauvais)"> &gt; 12 (Mauvais)</option></select></div>
      </div>

      <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide border-b mb-3">3. Environnement & Eau</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          <div><label className="block text-sm font-bold text-gray-700">Mangeoires *</label><input type="number" required min="0" className="w-full border p-2 rounded" value={data.mangeoires || ''} onChange={e => updateData('mangeoires', parseInt(e.target.value))} /></div>
          <div><label className="block text-sm font-bold text-gray-700">Abreuvoirs *</label><input type="number" required min="0" className="w-full border p-2 rounded" value={data.abreuvoirs || ''} onChange={e => updateData('abreuvoirs', parseInt(e.target.value))} /></div>
          
          <div className="col-span-1 md:col-span-2"><label className="block text-sm font-bold text-gray-700">État Litière *</label><select required className="w-full border p-2 rounded bg-white" value={data.litiere || ''} onChange={e => updateData('litiere', e.target.value)}><option value="">-- État --</option><option value="Friable (Idéal)">Friable (Idéal)</option><option value="Poussiéreuse (Trop sec)">Poussiéreuse (Trop sec)</option><option value="Légèrement croûteuse">Légèrement croûteuse</option><option value="Croûteuse / Humide">Croûteuse / Humide</option><option value="Collante / Détrempée">Collante / Détrempée</option></select></div>

          <div className="col-span-1 md:col-span-2 bg-blue-50 p-3 rounded border border-blue-100">
              <label className="block text-sm font-bold text-blue-900 mb-2">Qualité de l'eau</label>
              <div className="mb-3 flex flex-wrap items-center gap-4"><span className="text-sm text-gray-700 font-medium">pH entre 6.0 et 7.0 ? *</span><div className="flex gap-4"><label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="phCorrect" value="yes" required checked={data.phCorrect === 'yes'} onChange={() => updateData('phCorrect', 'yes')} /> Oui</label><label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="phCorrect" value="no" required checked={data.phCorrect === 'no'} onChange={() => updateData('phCorrect', 'no')} /> Non</label></div>{data.phCorrect === 'no' && (<input type="number" step="0.1" required placeholder="Valeur pH ?" className="border border-red-300 p-1 rounded text-sm w-32" value={data.phValue || ''} onChange={e => updateData('phValue', parseFloat(e.target.value))} />)}</div>
              <div className="mb-3 flex flex-wrap items-center gap-4"><span className="text-sm text-gray-700 font-medium">ORP (mV) :</span><input type="number" placeholder="ex: 300" className="border border-gray-300 p-1 rounded text-sm w-32" value={data.orpValue || ''} onChange={e => updateData('orpValue', parseInt(e.target.value))} /></div>
              <div className="flex flex-wrap items-center gap-4"><span className="text-sm text-gray-700 font-medium">Conso. Eau en hausse ? *</span><div className="flex gap-4"><label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="waterConsumptionIncrease" value="yes" required checked={data.waterConsumptionIncrease === 'yes'} onChange={() => updateData('waterConsumptionIncrease', 'yes')} /> Oui</label><label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="waterConsumptionIncrease" value="no" required checked={data.waterConsumptionIncrease === 'no'} onChange={() => updateData('waterConsumptionIncrease', 'no')} /> Non</label></div></div>
          </div>
      </div>

      <div className="bg-gray-50 p-4 rounded border border-gray-200"><label className="block text-sm font-bold text-gray-700 mb-2">Biosécurité *</label><div className="flex gap-6 mb-3"><label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="biosecurite" value="ok" required checked={data.biosecurite === 'ok'} onChange={() => updateData('biosecurite', 'ok')} className="w-4 h-4 text-green-600"/><span className="text-gray-800">Conforme</span></label><label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="biosecurite" value="nok" required checked={data.biosecurite === 'nok'} onChange={() => updateData('biosecurite', 'nok')} className="w-4 h-4 text-red-600"/><span className="text-gray-800">Non Conforme</span></label></div><div><label className="block text-xs font-medium text-gray-500 mb-1">Commentaires Biosécurité</label><textarea className="w-full border p-2 rounded text-sm" placeholder="Observations..." rows={2} value={data.biosecuriteComment || ''} onChange={e => updateData('biosecuriteComment', e.target.value)} /></div></div>

      <hr className="border-gray-200" />
      <div className="space-y-4">
        <div><label className="block text-sm font-medium text-gray-700">Préoccupations Client</label><textarea className="w-full border rounded p-2" rows={2} value={common.concerns} onChange={e => setCommon({ ...common, concerns: e.target.value })} /></div>
        <div><label className="block text-sm font-medium text-gray-700">Observations</label><textarea className="w-full border rounded p-2" rows={2} value={common.observation} onChange={e => setCommon({ ...common, observation: e.target.value })} /></div>
        <div><label className="block text-sm font-bold text-green-800">Recommandations</label><textarea className="w-full border border-green-300 bg-green-50 rounded p-2" rows={3} value={common.recommendations} onChange={e => setCommon({ ...common, recommendations: e.target.value })} /></div>
        <div><div><label className="text-xs text-gray-600">Effectif Départ</label><input type="number" className="w-full border p-1 rounded text-sm" value={data.effectifDepart || ''} onChange={e => updateData('effectifDepart', parseInt(e.target.value))} /></div></div>
      </div>

      <div className="flex gap-3 justify-end pt-4"><button type="button" onClick={onCancel} className="px-5 py-2.5 text-gray-700 bg-white border rounded hover:bg-gray-50">Annuler</button><button type="submit" disabled={loading} className="px-6 py-2.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 shadow">{loading ? 'Enregistrement...' : (isEditMode ? 'Modifier' : 'Enregistrer')}</button></div>
    </form>
  );
};

// --- 5. COMPOSANT : CRÉATION DE BANDE ---
const NewFlockForm = ({ customerIri, buildingIri, onSuccess, onCancel }: any) => {
    const [speculations, setSpeculations] = useState<any[]>([]);
    const [selectedSpec, setSelectedSpec] = useState('');
    const [installDate, setInstallDate] = useState(new Date().toISOString().slice(0, 10));
    const [subjectCount, setSubjectCount] = useState<string>(''); 
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('sav_token');
        fetch('http://localhost/api/speculations', { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/ld+json' } })
        .then(res => res.json()).then(data => {
            const specs = data['hydra:member'] || data['member'] || [];
            setSpeculations(specs);
            if (specs.length > 0) setSelectedSpec(specs[0]['@id']);
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('sav_token');
            const res = await fetch('http://localhost/api/flocks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ customer: customerIri, building: buildingIri, speculation: selectedSpec, startDate: new Date(installDate).toISOString(), subjectCount: subjectCount ? parseInt(subjectCount) : 0 })
            });
            if (!res.ok) throw new Error("Erreur");
            onSuccess();
        } catch (error) { alert("Erreur création"); } finally { setLoading(false); }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-green-50 p-4 rounded-lg border border-green-200 mt-4">
            <h4 className="font-bold text-green-800 mb-3">🌱 Nouvelle bande</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div><label className="block text-sm text-gray-700">Spéculation</label><select className="w-full border rounded p-2 bg-white" value={selectedSpec} onChange={e => setSelectedSpec(e.target.value)}>{speculations.map(s => <option key={s['@id']} value={s['@id']}>{s.name}</option>)}</select></div>
                <div><label className="block text-sm text-gray-700">Date install.</label><input type="date" required className="w-full border rounded p-2" value={installDate} onChange={e => setInstallDate(e.target.value)} /></div>
                <div><label className="block text-sm text-gray-700">Effectif</label><input type="number" required min="1" className="w-full border rounded p-2" value={subjectCount} onChange={e => setSubjectCount(e.target.value)} /></div>
            </div>
            <div className="flex justify-end gap-2"><button type="button" onClick={onCancel} className="px-3 py-2 text-sm text-gray-600">Annuler</button><button type="submit" disabled={loading} className="px-4 py-2 text-sm text-white bg-green-600 rounded">Valider</button></div>
        </form>
    );
};

// --- 6. COMPOSANT : ITEM BÂTIMENT (ISOLÉ) ---
const BuildingItem = ({ building, visit, onRefresh }: { building: Building, visit: Visit, onRefresh: () => void }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [viewMode, setViewMode] = useState<'summary' | 'form' | 'details' | 'create_flock'>('summary');
    const currentFlock = building.flocks.length > 0 ? building.flocks[building.flocks.length -1] : null;
    const existingObs = currentFlock?.observations?.find(obs => (typeof obs.visit === 'object' && obs.visit?.['@id'] === visit['@id']) || (typeof obs.visit === 'string' && obs.visit === visit['@id']));

    useEffect(() => { setViewMode('summary'); }, [isExpanded, currentFlock?.id]);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className={`p-5 flex justify-between items-center cursor-pointer transition-colors ${isExpanded ? 'bg-indigo-50 border-b border-indigo-100' : 'hover:bg-gray-50'}`} onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center gap-3"><span className="text-2xl">🏠</span><div><h2 className="font-bold text-lg text-gray-800">{building.name}</h2>{currentFlock ? (<p className="text-xs text-indigo-600 font-medium bg-indigo-100 px-2 py-0.5 rounded-full inline-block mt-1">Lot : {currentFlock.name}</p>) : (<p className="text-xs text-gray-400 mt-1">Vide</p>)}</div></div>
                <span className="text-gray-400 font-bold text-xl">{isExpanded ? '−' : '+'}</span>
            </div>
            {isExpanded && (
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
                                            <div className="flex justify-between items-start mb-3"><h5 className="font-bold text-blue-800 flex items-center gap-2"><span>📋 Résumé de l'observation</span><span className="text-xs font-normal text-blue-600 bg-white px-2 py-0.5 rounded-full border border-blue-100">Saisie le {existingObs.observedAt ? new Date(existingObs.observedAt).toLocaleDateString() : 'N/A'}</span></h5></div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                                                <div className="bg-white p-2 rounded border border-blue-100"><span className="text-gray-500 block text-xs">Mortalité</span><span className="font-bold text-gray-800">{existingObs.data?.mortalite || 0}</span></div>
                                                <div className="bg-white p-2 rounded border border-blue-100"><span className="text-gray-500 block text-xs">Poids</span><span className="font-bold text-gray-800">{existingObs.data?.poidsMoyen || '-'} g</span></div>
                                                <div className="bg-white p-2 rounded border border-blue-100"><span className="text-gray-500 block text-xs">Conso/tête</span><span className="font-bold text-gray-800">{existingObs.data?.consoTete || '-'} g</span></div>
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

  useEffect(() => { params.then(res => setUnwrappedParams(res)); }, [params]);
  useEffect(() => { if (unwrappedParams) fetchVisit(unwrappedParams.id); }, [unwrappedParams]);

  const fetchVisit = (id: string) => {
    const token = localStorage.getItem('sav_token');
    if (!token) { router.push('/'); return; }
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
        {visit.customer.buildings.map((building) => (<BuildingItem key={building['@id']} building={building} visit={visit} onRefresh={() => fetchVisit(visit.id.toString())} />))}
      </div>
    </div>
  );
}