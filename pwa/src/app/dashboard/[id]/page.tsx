'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// --- TYPES ---
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

// --- 1. COMPOSANT : VUE DÉTAILS (Lecture Seule) ---
const ObservationDetailsView = ({ 
    obs, 
    flockName, 
    onClose 
}: { 
    obs: Observation, 
    flockName: string, 
    onClose: () => void 
}) => {
    const d = obs.data || {};

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-blue-100 mt-4 relative animate-fade-in">
            <button 
                onClick={onClose} 
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-xl"
                title="Fermer"
            >
                ✕
            </button>
            
            <h3 className="font-bold text-lg text-blue-900 mb-6 border-b pb-2">
                📄 Détails complets - {flockName}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Colonne 1 : Données Zootechniques */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-indigo-700 uppercase text-xs tracking-wider border-b border-indigo-100 pb-1">Zootechnie</h4>
                    <ul className="text-sm space-y-2 text-gray-700">
                        <li className="flex justify-between"><span>Âge :</span> <span className="font-medium">{d.age ? `${d.age} jours` : '-'}</span></li>
                        <li className="flex justify-between"><span>Effectif départ :</span> <span className="font-medium">{d.effectifDepart || '-'}</span></li>
                        <li className="flex justify-between"><span>Mortalité (Cumul) :</span> <span className="font-medium text-red-600">{d.mortalite || 0}</span></li>
                        <li className="flex justify-between"><span>Poids Moyen :</span> <span className="font-medium">{d.poidsMoyen ? `${d.poidsMoyen} g` : '-'}</span></li>
                        <li className="flex justify-between"><span>Conso/tête :</span> <span className="font-medium">{d.consoTete ? `${d.consoTete} g` : '-'}</span></li>
                        <li className="flex justify-between"><span>Homogénéité :</span> <span className="font-medium">{d.homogeneite || '-'}</span></li>
                    </ul>
                </div>

                {/* Colonne 2 : Environnement & Sanitaire */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-indigo-700 uppercase text-xs tracking-wider border-b border-indigo-100 pb-1">Environnement</h4>
                    <ul className="text-sm space-y-2 text-gray-700">
                        <li className="flex justify-between"><span>Mangeoires :</span> <span className="font-medium">{d.mangeoires || 0}</span></li>
                        <li className="flex justify-between"><span>Abreuvoirs :</span> <span className="font-medium">{d.abreuvoirs || 0}</span></li>
                        <li className="flex justify-between"><span>Aliment :</span> <span className="font-medium">{d.aliment || '-'}</span></li>
                        <li className="flex justify-between"><span>Qualité Eau :</span> <span className="font-medium">{d.eau || '-'}</span></li>
                        <li className="flex justify-between"><span>Litière :</span> <span className="font-medium">{d.litiere || '-'}</span></li>
                    </ul>
                    
                    <div className="pt-2">
                        <span className="font-semibold text-indigo-700 uppercase text-xs tracking-wider">Biosécurité :</span>
                        <div className={`mt-1 p-2 rounded text-sm ${d.biosecurite === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                            <strong>{d.biosecurite === 'ok' ? 'Conforme' : 'Non Conforme'}</strong>
                            {d.biosecuriteComment && (
                                <p className="mt-1 italic text-xs border-t border-gray-200 pt-1">"{d.biosecuriteComment}"</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Observations textuelles */}
            <div className="mt-8 space-y-4 bg-gray-50 p-4 rounded-lg">
                {obs.concerns && (
                    <div><span className="font-bold text-gray-800 block mb-1">Préoccupations Client :</span> <p className="text-sm text-gray-600 bg-white p-2 rounded border">{obs.concerns}</p></div>
                )}
                {obs.observation && (
                    <div><span className="font-bold text-gray-800 block mb-1">Observations Techniques :</span> <p className="text-sm text-gray-600 bg-white p-2 rounded border">{obs.observation}</p></div>
                )}
                {obs.problems && (
                    <div><span className="font-bold text-red-700 block mb-1">Problèmes Identifiés :</span> <p className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">{obs.problems}</p></div>
                )}
                {obs.recommendations && (
                    <div><span className="font-bold text-green-800 block mb-1">Recommandations :</span> <p className="text-sm text-green-700 bg-green-50 p-2 rounded border border-green-100">{obs.recommendations}</p></div>
                )}
            </div>
        </div>
    );
};

// --- 2. COMPOSANT : FORMULAIRE (Ajout / Modif) ---
const ObservationForm = ({
  visitIri,
  flock,
  initialData,
  onSuccess,
  onCancel
}: {
  visitIri: string,
  flock: Flock,
  initialData?: Observation | null,
  onSuccess: () => void,
  onCancel: () => void
}) => {
  const [loading, setLoading] = useState(false);

  // Initialisation des champs textes
  const [common, setCommon] = useState({
    concerns: initialData?.concerns || '',
    observation: initialData?.observation || '',
    recommendations: initialData?.recommendations || '',
    problems: initialData?.problems || '',
  });

  // Gestion spécifique de l'Aliment :
  // Si la valeur stockée est "Belgocam" ou "SPC", on l'affecte au Select.
  // Sinon, c'est "Autres" et on met la valeur dans le champ précision.
  const storedAliment = initialData?.data?.aliment || '';
  const isKnownAliment = ['Belgocam', 'SPC'].includes(storedAliment);
  
  const [alimentSource, setAlimentSource] = useState(isKnownAliment ? storedAliment : (storedAliment ? 'Autres' : ''));
  const [alimentPrecision, setAlimentPrecision] = useState(isKnownAliment ? '' : storedAliment);

  // Autres données JSON
  const [data, setData] = useState<any>({
      biosecurite: 'ok',
      ...initialData?.data
  });
  
  const updateData = (key: string, value: any) => {
    setData((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem('sav_token');
    
    const captureDate = initialData?.observedAt || new Date().toISOString();

    // Construction de la valeur finale pour l'aliment
    let finalAliment = alimentSource;
    if (alimentSource === 'Autres') {
        finalAliment = alimentPrecision;
    }

    const finalJsonData = {
        ...data,
        aliment: finalAliment
    };

    const url = initialData 
        ? `http://localhost/api/observations/${initialData.id}`
        : 'http://localhost/api/observations';
    
    const method = initialData ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          visit: visitIri,
          flock: flock['@id'],
          observedAt: captureDate,
          ...common,
          data: finalJsonData
        }),
      });

      if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || 'Erreur sauvegarde');
      }
      onSuccess();
    } catch (err: any) {
      alert("Erreur: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-5 rounded-lg shadow-lg border-l-4 border-indigo-500 mt-4 relative animate-slide-down">
      <div className="absolute top-2 right-2">
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 font-bold px-2 py-1">FERMER ✕</button>
      </div>
      <h3 className="font-bold text-lg text-indigo-900 border-b pb-3">
          {initialData ? '✏️ Modifier Observation' : '➕ Nouvelle Observation'} - <span className="text-gray-600 font-normal">{flock.speculation.name}</span>
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* 1. AGE */}
          <div>
              <label className="block text-sm font-bold text-gray-700">Âge (Jours) <span className="text-red-500">*</span></label>
              <input 
                  type="number" required min="0"
                  className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                  value={data.age || ''}
                  onChange={e => updateData('age', parseInt(e.target.value))}
              />
          </div>

          {/* 2. POIDS MOYEN */}
          <div>
              <label className="block text-sm font-bold text-gray-700">Poids Moyen (g) <span className="text-red-500">*</span></label>
              <input 
                  type="number" required step="0.01" min="0"
                  className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                  value={data.poidsMoyen || ''}
                  onChange={e => updateData('poidsMoyen', parseFloat(e.target.value))}
              />
          </div>

          {/* 3. CONSO / TÊTE */}
          <div>
              <label className="block text-sm font-bold text-gray-700">Conso / Tête (g) <span className="text-red-500">*</span></label>
              <input 
                  type="number" required step="0.01" min="0"
                  className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                  value={data.consoTete || ''}
                  onChange={e => updateData('consoTete', parseFloat(e.target.value))}
              />
          </div>

          {/* 4. TYPE ALIMENT (LOGIQUE AUTRES) */}
          <div className="bg-gray-50 p-2 rounded border border-gray-200">
              <label className="block text-sm font-bold text-gray-700">Type Aliment <span className="text-red-500">*</span></label>
              <select 
                  required
                  className="w-full border border-gray-300 p-2 rounded bg-white mb-2"
                  value={alimentSource}
                  onChange={e => setAlimentSource(e.target.value)}
              >
                  <option value="">-- Sélectionner --</option>
                  <option value="Belgocam">Belgocam</option>
                  <option value="SPC">SPC</option>
                  <option value="Autres">Autres</option>
              </select>
              
              {alimentSource === 'Autres' && (
                  <div className="animate-fade-in">
                      <label className="block text-xs font-bold text-indigo-700 mb-1">Précisez la marque ou la société : <span className="text-red-500">*</span></label>
                      <input 
                          type="text" 
                          required 
                          placeholder="Ex: Soja, Mais..."
                          className="w-full border border-indigo-300 p-2 rounded bg-white text-sm"
                          value={alimentPrecision}
                          onChange={e => setAlimentPrecision(e.target.value)}
                      />
                  </div>
              )}
          </div>

          {/* 5. MANGEOIRES */}
          <div>
              <label className="block text-sm font-bold text-gray-700">Mangeoires (Qté) <span className="text-red-500">*</span></label>
              <input 
                  type="number" required min="0"
                  className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                  value={data.mangeoires || ''}
                  onChange={e => updateData('mangeoires', parseInt(e.target.value))}
              />
          </div>

          {/* 6. ABREUVOIRS */}
          <div>
              <label className="block text-sm font-bold text-gray-700">Abreuvoirs (Qté) <span className="text-red-500">*</span></label>
              <input 
                  type="number" required min="0"
                  className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                  value={data.abreuvoirs || ''}
                  onChange={e => updateData('abreuvoirs', parseInt(e.target.value))}
              />
          </div>
      </div>

      {/* 7. BIOSÉCURITÉ */}
      <div className="bg-gray-50 p-4 rounded border border-gray-200">
          <label className="block text-sm font-bold text-gray-700 mb-2">Biosécurité <span className="text-red-500">*</span></label>
          
          <div className="flex gap-6 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                      type="radio" 
                      name="biosecurite" 
                      value="ok" 
                      required
                      className="w-4 h-4 text-green-600"
                      checked={data.biosecurite === 'ok'}
                      onChange={() => updateData('biosecurite', 'ok')}
                  />
                  <span className="text-gray-800">Conforme</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                      type="radio" 
                      name="biosecurite" 
                      value="nok" 
                      required
                      className="w-4 h-4 text-red-600"
                      checked={data.biosecurite === 'nok'}
                      onChange={() => updateData('biosecurite', 'nok')}
                  />
                  <span className="text-gray-800">Non Conforme</span>
              </label>
          </div>
          
          <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Commentaires Biosécurité (Optionnel si conforme, Recommandé sinon)</label>
              <textarea 
                  className="w-full border border-gray-300 p-2 rounded text-sm"
                  placeholder="Observations sur l'hygiène, le sas, le pédiluve..."
                  rows={2}
                  value={data.biosecuriteComment || ''}
                  onChange={e => updateData('biosecuriteComment', e.target.value)}
              />
          </div>
      </div>

      <hr className="border-gray-200" />

      {/* Champs Textuels */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Préoccupations du Client</label>
          <textarea className="w-full border border-gray-300 rounded p-2" rows={2} 
            value={common.concerns} 
            onChange={e => setCommon({ ...common, concerns: e.target.value })} 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Observations Générales</label>
          <textarea className="w-full border border-gray-300 rounded p-2" rows={2} 
            value={common.observation} 
            onChange={e => setCommon({ ...common, observation: e.target.value })} 
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4 bg-yellow-50 p-3 rounded">
            <div>
                <label className="text-xs text-gray-600">Effectif Départ</label>
                <input type="number" className="w-full border p-1 rounded text-sm" 
                    value={data.effectifDepart || ''} 
                    onChange={e => updateData('effectifDepart', parseInt(e.target.value))} 
                />
            </div>
            <div>
                <label className="text-xs text-gray-600">Mortalité (Nb)</label>
                <input type="number" className="w-full border p-1 rounded text-sm" 
                    value={data.mortalite || ''} 
                    onChange={e => updateData('mortalite', parseInt(e.target.value))} 
                />
            </div>
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-4">
          <button type="button" onClick={onCancel} className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">
              Annuler
          </button>
          <button type="submit" disabled={loading} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-md transition-colors disabled:opacity-50">
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
      </div>
    </form>
  );
};

// --- 3. COMPOSANT : CRÉATION DE BANDE ---
const NewFlockForm = ({ 
    customerIri, 
    buildingIri, 
    onSuccess, 
    onCancel 
}: { 
    customerIri: string, 
    buildingIri: string, 
    onSuccess: () => void, 
    onCancel: () => void 
}) => {
    const [speculations, setSpeculations] = useState<any[]>([]);
    const [selectedSpec, setSelectedSpec] = useState('');
    const [installDate, setInstallDate] = useState(new Date().toISOString().slice(0, 10));
    const [subjectCount, setSubjectCount] = useState<string>(''); 
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('sav_token');
        fetch('http://localhost/api/speculations', {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/ld+json' }
        })
        .then(res => res.json())
        .then(data => {
            const specs = data['hydra:member'] || data['member'] || [];
            setSpeculations(specs);
            if (specs.length > 0) setSelectedSpec(specs[0]['@id']);
        })
        .catch(err => console.error(err));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const token = localStorage.getItem('sav_token');

        try {
            const res = await fetch('http://localhost/api/flocks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    customer: customerIri,
                    building: buildingIri,
                    speculation: selectedSpec,
                    startDate: new Date(installDate).toISOString(),
                    subjectCount: subjectCount ? parseInt(subjectCount) : 0
                })
            });
            if (!res.ok) throw new Error("Erreur création bande");
            onSuccess();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-green-50 p-4 rounded-lg border border-green-200 mt-4 animate-fade-in">
            <h4 className="font-bold text-green-800 mb-3">🌱 Nouvelle bande</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                    <label className="block text-sm text-gray-700">Spéculation</label>
                    <select className="w-full border rounded p-2 bg-white" value={selectedSpec} onChange={e => setSelectedSpec(e.target.value)}>
                        {speculations.map(s => <option key={s['@id']} value={s['@id']}>{s.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm text-gray-700">Date install.</label>
                    <input type="date" required className="w-full border rounded p-2" value={installDate} onChange={e => setInstallDate(e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm text-gray-700">Effectif</label>
                    <input type="number" required min="1" className="w-full border rounded p-2" value={subjectCount} onChange={e => setSubjectCount(e.target.value)} />
                </div>
            </div>
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded">Annuler</button>
                <button type="submit" disabled={loading} className="px-4 py-2 text-sm text-white bg-green-600 rounded hover:bg-green-700 font-bold">Valider</button>
            </div>
        </form>
    );
};

// --- PAGE PRINCIPALE ---
export default function VisitDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [unwrappedParams, setUnwrappedParams] = useState<{ id: string } | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  
  // MODIFICATION 1 : Gestion des IDs de bâtiments ouverts (Tableau d'IDs pour indépendance)
  const [expandedBuildingIds, setExpandedBuildingIds] = useState<number[]>([]);
  
  const [creatingFlockForBuilding, setCreatingFlockForBuilding] = useState<string | null>(null);
  const [editingFlock, setEditingFlock] = useState<Flock | null>(null);
  const [editingObservationData, setEditingObservationData] = useState<Observation | null>(null);
  const [viewingObservationId, setViewingObservationId] = useState<number | null>(null);

  useEffect(() => {
    params.then(res => setUnwrappedParams(res));
  }, [params]);

  useEffect(() => {
    if (unwrappedParams) fetchVisit(unwrappedParams.id);
  }, [unwrappedParams]);

  const fetchVisit = (id: string) => {
    const token = localStorage.getItem('sav_token');
    if (!token) { router.push('/'); return; }

    fetch(`http://localhost/api/visits/${id}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/ld+json' }
    })
    .then(res => {
        if (!res.ok) throw new Error('Visite introuvable');
        return res.json();
    })
    .then(data => {
        setVisit(data);
        setLoading(false);
    })
    .catch(err => {
        console.error(err);
        router.push('/dashboard');
    });
  };

  const handleCloseVisit = async () => {
    if (!visit || !confirm("Clôturer définitivement cette visite ?")) return;
    const token = localStorage.getItem('sav_token');
    try {
        await fetch(`http://localhost/api/visits/${visit.id}/close`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchVisit(visit.id.toString());
    } catch (error) {
        alert("Erreur lors de la clôture");
    }
  };

  const getExistingObservation = (flock: Flock) => {
    if (!flock.observations || !visit) return null;
    return flock.observations.find(obs => {
        if (typeof obs.visit === 'object' && obs.visit?.['@id'] === visit['@id']) return true;
        if (typeof obs.visit === 'string' && obs.visit === visit['@id']) return true;
        return false;
    });
  };

  // Nouvelle fonction pour basculer l'état d'un bâtiment
  const toggleBuilding = (id: number) => {
      setExpandedBuildingIds(prev => 
          prev.includes(id) 
              ? prev.filter(bid => bid !== id) // Fermer
              : [...prev, id] // Ouvrir (sans fermer les autres)
      );
  };

  if (loading || !visit) return <div className="p-10 text-center text-gray-500">Chargement de la visite...</div>;

  return (
    <div className="min-h-screen bg-gray-100 pb-20 font-sans">
      <div className="bg-white shadow px-6 py-4 flex justify-between items-center sticky top-0 z-20">
        <div>
          <Link href="/dashboard" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition">← Retour</Link>
          <h1 className="text-2xl font-extrabold text-gray-800 mt-1">{visit.customer.name}</h1>
          <p className="text-sm text-gray-500">{new Date(visit.visitedAt).toLocaleDateString()} • {visit.customer.zone}</p>
        </div>
        <div className="flex gap-3 items-center">
            <span className={`px-4 py-1.5 rounded-full text-sm font-bold border ${visit.closed ? 'bg-gray-100 text-gray-600 border-gray-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                {visit.closed ? '🔒 CLÔTURÉE' : '🟢 EN COURS'}
            </span>
            {!visit.closed && (
                <button onClick={handleCloseVisit} className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-100 text-sm font-bold transition">Clôturer</button>
            )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-8 space-y-6">
        {visit.customer.buildings.map((building) => {
            const currentFlock = building.flocks.length > 0 ? building.flocks[building.flocks.length -1] : null;
            const existingObs = currentFlock ? getExistingObservation(currentFlock) : null;
            
            // MODIFICATION 1 : Vérification via le tableau
            const isExpanded = expandedBuildingIds.includes(building.id);

            return (
                <div key={building['@id']} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div 
                        className={`p-5 flex justify-between items-center cursor-pointer transition-colors ${isExpanded ? 'bg-indigo-50 border-b border-indigo-100' : 'hover:bg-gray-50'}`}
                        onClick={() => toggleBuilding(building.id)}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🏠</span>
                            <div>
                                <h2 className="font-bold text-lg text-gray-800">{building.name}</h2>
                                {currentFlock ? (
                                    <p className="text-xs text-indigo-600 font-medium bg-indigo-100 px-2 py-0.5 rounded-full inline-block mt-1">Lot : {currentFlock.name}</p>
                                ) : (
                                    <p className="text-xs text-gray-400 mt-1">Vide</p>
                                )}
                            </div>
                        </div>
                        <span className="text-gray-400 font-bold text-xl">{isExpanded ? '−' : '+'}</span>
                    </div>

                    {isExpanded && (
                        <div className="p-5 bg-white">
                            {!currentFlock ? (
                                <div className="text-center py-6">
                                    <p className="text-gray-500 italic mb-4">Aucune bande installée.</p>
                                    {!creatingFlockForBuilding ? (
                                        !visit.closed && (
                                            <button 
                                                onClick={() => setCreatingFlockForBuilding(building['@id'])}
                                                className="bg-green-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-green-700 transition shadow-sm"
                                            >
                                                + Installer une nouvelle bande
                                            </button>
                                        )
                                    ) : (
                                        creatingFlockForBuilding === building['@id'] && (
                                            <NewFlockForm 
                                                customerIri={visit.customer['@id']}
                                                buildingIri={building['@id']}
                                                onSuccess={() => { setCreatingFlockForBuilding(null); fetchVisit(visit.id.toString()); }}
                                                onCancel={() => setCreatingFlockForBuilding(null)}
                                            />
                                        )
                                    )}
                                </div>
                            ) : (
                                <div>
                                    {editingFlock?.id === currentFlock.id ? (
                                        <ObservationForm 
                                            visitIri={visit['@id']}
                                            flock={currentFlock}
                                            initialData={editingObservationData}
                                            onSuccess={() => { setEditingFlock(null); setEditingObservationData(null); fetchVisit(visit.id.toString()); }}
                                            onCancel={() => { setEditingFlock(null); setEditingObservationData(null); }}
                                        />
                                    ) : viewingObservationId === existingObs?.id && existingObs ? (
                                        <ObservationDetailsView 
                                            obs={existingObs}
                                            flockName={currentFlock.name}
                                            onClose={() => setViewingObservationId(null)}
                                        />
                                    ) : (
                                        <div className="mt-2">
                                            {existingObs ? (
                                                <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <h5 className="font-bold text-blue-800 flex items-center gap-2">
                                                            <span>📋 Résumé de l'observation</span>
                                                            <span className="text-xs font-normal text-blue-600 bg-white px-2 py-0.5 rounded-full border border-blue-100">
                                                                Saisie le {existingObs.observedAt ? new Date(existingObs.observedAt).toLocaleDateString() : 'N/A'}
                                                            </span>
                                                        </h5>
                                                    </div>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                                                        <div className="bg-white p-2 rounded border border-blue-100"><span className="text-gray-500 block text-xs">Mortalité</span><span className="font-bold text-gray-800">{existingObs.data?.mortalite || 0}</span></div>
                                                        <div className="bg-white p-2 rounded border border-blue-100"><span className="text-gray-500 block text-xs">Poids</span><span className="font-bold text-gray-800">{existingObs.data?.poidsMoyen || '-'} g</span></div>
                                                        <div className="bg-white p-2 rounded border border-blue-100"><span className="text-gray-500 block text-xs">Conso/tête</span><span className="font-bold text-gray-800">{existingObs.data?.consoTete || '-'} g</span></div>
                                                        <div className={`p-2 rounded border ${existingObs.data?.biosecurite === 'ok' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}><span className="block text-xs opacity-70">Biosécurité</span><span className={`font-bold ${existingObs.data?.biosecurite === 'ok' ? 'text-green-700' : 'text-red-700'}`}>{existingObs.data?.biosecurite === 'ok' ? 'OK' : 'NOK'}</span></div>
                                                    </div>
                                                    <div className="flex gap-3 pt-3 border-t border-blue-200">
                                                        {!visit.closed && (
                                                            <button onClick={() => { setEditingObservationData(existingObs); setEditingFlock(currentFlock); }} className="flex-1 flex justify-center items-center gap-2 bg-white text-blue-700 border border-blue-300 py-2 rounded-lg font-bold hover:bg-blue-50 transition">✏️ Modifier</button>
                                                        )}
                                                        <button onClick={() => setViewingObservationId(existingObs.id)} className="flex-1 flex justify-center items-center gap-2 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition shadow-sm">📄 Détails</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                !visit.closed ? (
                                                    <button onClick={() => { setEditingObservationData(null); setEditingFlock(currentFlock); }} className="w-full py-6 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-500 hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 transition group"><span className="text-3xl mb-1 group-hover:scale-110 transition-transform">➕</span><span className="font-bold">Ajouter une observation</span></button>
                                                ) : <p className="text-center text-gray-400 italic py-4">Aucune observation n'a été saisie pour cette visite clôturée.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );
        })}
      </div>
    </div>
  );
}