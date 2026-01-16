'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Select from 'react-select';

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
  observations: Observation[]; // Historique pour le résumé
}

interface Building {
  '@id': string;
  id: number;
  name: string;
  activated: boolean;
  flocks: Flock[]; // Contient toutes les bandes, on filtrera pour trouver l'active
}

interface Observation {
  id: number;
  visitedAt?: string; // Date de la visite liée
  data: any; // Données JSON spécifiques
  concerns?: string;
  observation?: string;
  recommendations?: string;
  problems?: string;
}

interface Visit {
  '@id': string
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

// --- COMPOSANT : RESUME DERNIERE VISITE ---
const LastVisitSummary = ({ observations }: { observations: Observation[] }) => {
  if (!observations || observations.length === 0) return null;
  // On prend la dernière (supposant que l'API les renvoie ou qu'on trie)
  const lastObs = observations[observations.length - 1];

  return (
    <div className="mb-6 rounded-md bg-blue-50 p-4 border border-blue-100 text-sm">
      <h4 className="font-bold text-blue-800 mb-2">📄 Résumé dernière visite</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
        <div>
          <span className="font-semibold">Préoccupations:</span> {lastObs.concerns || '-'}
        </div>
        <div>
          <span className="font-semibold">Difficultés:</span> {lastObs.problems || '-'}
        </div>
        <div>
          <span className="font-semibold">Recommandations:</span> {lastObs.recommendations || '-'}
        </div>
        {/* On peut afficher des données techniques clés ici aussi */}
        {lastObs.data?.poidsMoyen && (
          <div><span className="font-semibold">Dernier Poids:</span> {lastObs.data.poidsMoyen}</div>
        )}
      </div>
    </div>
  );
};

// --- COMPOSANT : FORMULAIRE DYNAMIQUE ---
const ObservationForm = ({
  visitIri,
  disabled,
  flock,
  onSuccess
}: {
  visitIri: string,
  disabled: boolean,
  flock: Flock,
  onSuccess: () => void
}) => {
  const specName = flock.speculation.name;
  const [loading, setLoading] = useState(false);

  // Champs communs
  const [common, setCommon] = useState({
    concerns: '', observation: '', recommendations: '', problems: '', generalComment: ''
  });

  // Données JSON dynamiques
  const [data, setData] = useState<any>({});

  // Gestion spécifique pour "Aliment Autres"
  const [alimentType, setAlimentType] = useState('');


  // Met à jour le JSON `data`
  const updateData = (key: string, value: any) => {
    setData((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem('sav_token');
    const captureDate = new Date().toISOString();
    

    // Nettoyage données Aliment
    const finalData = { ...data };
    if (alimentType !== 'Autres') {
      finalData.aliment = alimentType; // Si c'est Belgocam ou SPC
    }

    const bodyPayload = {
          visit: visitIri,
          flock: flock['@id'],
          observedAt: captureDate, // <--- AJOUT DU CHAMP
          ...common,
          data: finalData
    };
    // Si c'est "Autres", on s'attend à ce que finalData.aliment contienne le texte saisi manuellement

    try {
      const res = await fetch('http://localhost/api/observations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          visit: visitIri,
          flock: flock['@id'],
          observedAt: captureDate,
          ...common,
          data: finalData
        }),
      });

      if (!res.ok) throw new Error('Erreur sauvegarde');
      onSuccess();
    } catch (err) {
      alert("Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  // --- RENDERERS DE CHAMPS SPECIFIQUES ---

  const renderAlimentSection = () => (
    <div className="col-span-1 md:col-span-2 bg-gray-50 p-3 rounded">
      <label className="block text-sm font-medium mb-2">Type d'aliment consommé</label>
      <div className="flex gap-4 mb-2">
        {['Belgocam', 'SPC', 'Autres'].map((opt) => (
          <label key={opt} className="inline-flex items-center">
            <input
              type="radio"
              name="alimentType"
              value={opt}
              checked={alimentType === opt}
              onChange={(e) => {
                setAlimentType(e.target.value);
                if (e.target.value !== 'Autres') updateData('aliment', e.target.value);
                else updateData('aliment', ''); // Reset pour saisie manuelle
              }}
              className="mr-2"
            />
            {opt}
          </label>
        ))}
      </div>
      {alimentType === 'Autres' && (
        <input
          type="text"
          placeholder="Préciser la marque ou le fabricant..."
          className="w-full border p-2 rounded text-sm"
          required
          onChange={(e) => updateData('aliment', e.target.value)}
        />
      )}
    </div>
  );

  const renderBiosecurite = () => (
    <div className="col-span-1 md:col-span-2">
      <label className="block text-sm font-medium">Biosécurité</label>
      <div className="flex gap-2">
        <select
          className="border p-2 rounded w-1/3"
          onChange={(e) => updateData('biosecuriteStatut', e.target.value)}
        >
          <option value="">-- Etat --</option>
          <option value="Satisfaisant">Satisfaisant</option>
          <option value="Acceptable">Acceptable</option>
          <option value="Non satisfaisant">Non satisfaisant</option>
        </select>
        <input
          type="text"
          placeholder="Commentaire biosécurité..."
          className="border p-2 rounded w-2/3"
          onChange={(e) => updateData('biosecuriteCommentaire', e.target.value)}
        />
      </div>
    </div>
  );

  // --- CONTENU DU FORMULAIRE SELON SPECULATION ---
  const renderSpeculationFields = () => {
    // 🐟 POISSONS
    if (specName === 'Poissons') {
      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm">Age (semaines)</label>
              <input type="number" className="w-full border p-2 rounded" onChange={e => updateData('age', e.target.value)} />
            </div>
            <div>
              <label className="text-sm">Poids moyen (g)</label>
              <input type="number" step="0.1" className="w-full border p-2 rounded" onChange={e => updateData('poidsMoyen', e.target.value)} />
            </div>
            <div>
              <label className="text-sm">Type</label>
              <select className="w-full border p-2 rounded" onChange={e => updateData('type', e.target.value)}>
                <option>Etang</option>
                <option>Hors sol</option>
              </select>
            </div>
            <div>
              <label className="text-sm">Objectif</label>
              <select className="w-full border p-2 rounded" onChange={e => updateData('objectif', e.target.value)}>
                <option>Grossissement</option>
                <option>Reproduction</option>
              </select>
            </div>
            <div>
              <label className="text-sm">Conso/tête (g)</label>
              <input type="number" step="0.1" className="w-full border p-2 rounded" onChange={e => updateData('consoTete', e.target.value)} />
            </div>
            <div>
              <label className="text-sm">Densité/m²</label>
              <input type="number" className="w-full border p-2 rounded" onChange={e => updateData('densite', e.target.value)} />
            </div>
          </div>
          {renderAlimentSection()}
        </>
      );
    }

    // 🐔 POULET DE CHAIR & 🥚 PONDEUSES
    if (specName === 'Poulet de chair' || specName === 'Pondeuses') {
      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm">Age (semaines)</label>
              <input type="number" className="w-full border p-2 rounded" onChange={e => updateData('age', e.target.value)} />
            </div>
            <div>
              <label className="text-sm">Poids moyen (g)</label>
              <input type="number" className="w-full border p-2 rounded" onChange={e => updateData('poidsMoyen', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-bold text-red-600">Mortalité (nb)</label>
              <input type="number" className="w-full border p-2 rounded border-red-200 bg-red-50" onChange={e => updateData('mortalite', e.target.value)} />
            </div>
            <div>
              <label className="text-sm">Conso/tête (g)</label>
              <input type="number" className="w-full border p-2 rounded" onChange={e => updateData('consoTete', e.target.value)} />
            </div>

            {/* Spécifique Pondeuses */}
            {specName === 'Pondeuses' && (
              <div className="col-span-2">
                <label className="text-sm font-semibold">Date entrée en ponte</label>
                <input type="date" className="w-full border p-2 rounded" onChange={e => updateData('dateEntreePonte', e.target.value)} />
              </div>
            )}

            <div>
              <label className="text-sm">Mangeoires (Qté)</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                className="w-full border p-2 rounded"
                onChange={e => updateData('mangeoires', e.target.value ? parseInt(e.target.value) : 0)}
              />
            </div>
            <div>
              <label className="text-sm">Abreuvoirs (Qté)</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                className="w-full border p-2 rounded"
                onChange={e => updateData('abreuvoirs', e.target.value ? parseInt(e.target.value) : 0)}
              />
            </div>
          </div>
          {renderAlimentSection()}
          {renderBiosecurite()}
        </>
      );
    }

    // 🐷 PORC
    if (specName === 'Porc') {
      return (
        <>
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded">
              <label className="text-sm font-semibold">Objectif de production</label>
              <Select
                isMulti
                options={[
                  { value: 'Mixte', label: 'Mixte' },
                  { value: 'Engraissement', label: 'Engraissement' },
                  { value: 'Reproduction', label: 'Reproduction' },
                  { value: 'Vente', label: 'Vente' },
                ]}
                onChange={(vals) => updateData('objectifs', vals.map(v => v.value))}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 border p-2 rounded">
              <h4 className="col-span-full font-bold text-sm text-gray-700">Effectifs</h4>
              <input type="number" placeholder="Pt (nb)" className="border p-1 text-sm" onChange={e => updateData('eff_pt', e.target.value)} />
              <input type="number" placeholder="Ps (nb)" className="border p-1 text-sm" onChange={e => updateData('eff_ps', e.target.value)} />
              <input type="number" placeholder="F (nb)" className="border p-1 text-sm" onChange={e => updateData('eff_f', e.target.value)} />
              <input type="number" placeholder="M (nb)" className="border p-1 text-sm" onChange={e => updateData('eff_m', e.target.value)} />
              <input type="number" placeholder="Engrais. (nb)" className="border p-1 text-sm" onChange={e => updateData('eff_eng', e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm">Poids Moy. Pt (kg)</label>
                <input type="number" step="0.1" className="w-full border p-2" onChange={e => updateData('poids_pt', e.target.value)} />
              </div>
              <div>
                <label className="text-sm">Poids Moy. Ps (kg)</label>
                <input type="number" step="0.1" className="w-full border p-2" onChange={e => updateData('poids_ps', e.target.value)} />
              </div>
              <div>
                <label className="text-sm">Conso/tête (kg)</label>
                <input type="number" step="0.1" className="w-full border p-2" onChange={e => updateData('consoTete', e.target.value)} />
              </div>
              <div>
                <label className="text-sm">Dispo. Eau</label>
                <select className="w-full border p-2" onChange={e => updateData('eau', e.target.value)}>
                  <option>Oui</option>
                  <option>Non</option>
                </select>
              </div>
            </div>
          </div>
          {renderAlimentSection()}
          {renderBiosecurite()}
        </>
      );
    }

    return <p className="text-red-500">Spéculation inconnue: {specName}</p>;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-4 rounded-lg shadow-sm border border-indigo-100">
      <h3 className="font-bold text-lg text-indigo-900 border-b pb-2">Nouvelle Observation ({specName})</h3>

      {/* 1. Résumé Visite Précédente */}
      <LastVisitSummary observations={flock.observations} />

      {/* 2. Champs Spécifiques Dynamiques */}
      <div className="space-y-4">
        {renderSpeculationFields()}
      </div>

      <hr className="my-4 border-gray-200" />

      {/* 3. Champs Textuels Communs */}
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium">Préoccupations Client</label>
          <textarea className="w-full border rounded p-2" rows={2} onChange={e => setCommon({ ...common, concerns: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium">Observations Visite</label>
          <textarea className="w-full border rounded p-2" rows={2} onChange={e => setCommon({ ...common, observation: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium">Difficultés Rencontrées</label>
          <textarea className="w-full border rounded p-2" rows={2} onChange={e => setCommon({ ...common, problems: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium">Recommandations</label>
          <textarea className="w-full border rounded p-2" rows={2} onChange={e => setCommon({ ...common, recommendations: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium">Commentaire Général</label>
          <textarea className="w-full border rounded p-2" rows={2} onChange={e => setCommon({ ...common, generalComment: e.target.value })} />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-3 rounded-md font-bold hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? 'Enregistrement...' : 'Enregistrer Observation'}
      </button>
    </form>
  );
};


// --- PAGE PRINCIPALE ---
export default function VisitDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const visitId = resolvedParams.id;

  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);

  // Gestion d'état pour ouvrir/fermer les formulaires par bâtiment
  const [expandedBuildingId, setExpandedBuildingId] = useState<number | null>(null);

  const [creatingFlockForBuilding, setCreatingFlockForBuilding] = useState<string | null>(null); // Stocke l'IRI du bâtiment en cours de création


  const fetchVisit = async () => {
    const token = localStorage.getItem('sav_token');
    try {
      // On demande le format ld+json pour avoir les IRI (@id)
      const res = await fetch(`http://localhost/api/visits/${visitId}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/ld+json' },
      });
      if (!res.ok) throw new Error('Erreur chargement');
      const data = await res.json();
      setVisit(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fonction de clôture
  const handleCloseVisit = async () => {
    if (!confirm("Attention : Une fois clôturée, vous ne pourrez plus modifier cette visite. Continuer ?")) return;

    const token = localStorage.getItem('sav_token');
    try {
      const res = await fetch(`http://localhost/api/visits/${visitId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/merge-patch+json', // Format spécifique PATCH API Platform
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ closed: true })
      });

      if (!res.ok) throw new Error('Erreur lors de la clôture');
      fetchVisit(); // Recharger pour voir l'état fermé
    } catch (err) {
      alert("Erreur technique : " + err);
    }
  };

  useEffect(() => { fetchVisit(); }, [visitId]);


  if (loading) return <div className="p-8 text-center">Chargement...</div>;
  if (!visit) return <div className="p-8 text-center text-red-500">Visite introuvable</div>;
  // Calculer si on peut éditer (pour désactiver les formulaires enfants)
  const isEditable = visit.activated && !visit.closed;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white p-6 shadow-sm mb-6">
        <div>
          <Link href="/dashboard" className="text-indigo-600 mb-2 inline-block">← Retour</Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Visite #{visit.id}</h1>
              <p className="text-lg text-gray-700 font-medium mt-1">
                Client : {visit.customer.name} <span className="text-gray-500">({visit.customer.zone})</span>
              </p>
              <p className="text-sm text-gray-500">{new Date(visit.visitedAt).toLocaleString()}</p>
            </div>
            {visit.customer.phoneNumber && (
              <a href={`tel:${visit.customer.phoneNumber}`} className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full font-bold hover:bg-green-200">
                📞 {visit.customer.phoneNumber}
              </a>
            )}
          </div>
          <div className="mt-2">
            {!visit.activated ? (
              <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm font-bold">🔒 Archivée (48h dépassées)</span>
            ) : visit.closed ? (
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded text-sm font-bold">✅ Visite Clôturée</span>
            ) : (
              <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded text-sm font-bold">⚡ En cours</span>
            )}
          </div>
        </div>

        {/* BOUTON CLÔTURER */}
        {isEditable && (
          <button
            onClick={handleCloseVisit}
            className="bg-red-600 text-white px-4 py-2 rounded shadow hover:bg-red-700 font-bold text-sm"
          >
            Clôturer la visite
          </button>
        )}
      </div>

      {/* Liste des Bâtiments */}
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <h2 className="text-xl font-bold text-gray-800">Bâtiments & Production</h2>

        {visit.customer.buildings.length === 0 ? (
          <p className="text-gray-500 italic">Aucun bâtiment configuré pour ce client.</p>
        ) : (
          visit.customer.buildings.map((building) => {
            // Trouver la bande active (hack simple : la dernière créée qui n'est pas fermée, ou via backend)
            // Note: Ici on suppose que le backend ne renvoie que la bande active ou qu'on prend la dernière.
            // Idéalement, une propriété "activeFlock" sur Building serait mieux.
            const activeFlock = building.flocks && building.flocks.length > 0 ? building.flocks[building.flocks.length - 1] : null;

            return (
              <div key={building['@id']} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
                {/* Header Bâtiment (Inchangé) */}
                <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                  <h3 className="font-bold text-lg">{building.name}</h3>
                  {activeFlock ? (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold">
                      {activeFlock.name} - {activeFlock.speculation.name}
                    </span>
                  ) : (
                    <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">Vide</span>
                  )}
                </div>

                <div className="p-4">
                  {!activeFlock ? (
                    /* CAS 1 : Bâtiment Vide -> Afficher Bouton OU Formulaire de Création */
                    <div>
                      {creatingFlockForBuilding === building['@id'] ? (
                        <NewFlockForm
                          customerIri={visit.customer['@id']}
                          buildingIri={building['@id']}
                          onCancel={() => setCreatingFlockForBuilding(null)}
                          onSuccess={() => {
                            setCreatingFlockForBuilding(null);
                            fetchVisit(); // Rafraîchir pour voir la nouvelle bande
                          }}
                        />
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-gray-500 mb-2">Aucune bande en cours.</p>
                          {isEditable && (
                            <button
                              onClick={() => setCreatingFlockForBuilding(building['@id'])}
                              className="text-indigo-600 font-medium hover:underline bg-indigo-50 px-4 py-2 rounded"
                            >
                              + Mettre en place une bande
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* CAS 2 : Bâtiment Occupé -> (Code inchangé pour l'ObservationForm) */
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <p className="text-sm text-gray-600">
                          Bande lancée le {new Date(activeFlock.startDate).toLocaleDateString()}
                        </p>
                        <button
                          onClick={() => setExpandedBuildingId(expandedBuildingId === building.id ? null : building.id)}
                          className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700"
                        >
                          {expandedBuildingId === building.id ? 'Fermer' : 'Saisir Données Visite'}
                        </button>
                      </div>
                      {/* ... ObservationForm ... */}
                      {expandedBuildingId === building.id && (
                        <ObservationForm
                          visitIri={`/api/visits/${visitId}`}
                          flock={activeFlock}
                          disabled={!isEditable}
                          onSuccess={() => {
                            alert("Observation enregistrée !");
                            setExpandedBuildingId(null);
                            fetchVisit();
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// --- COMPOSANT : NOUVELLE BANDE ---
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
  const [installDate, setInstallDate] = useState(new Date().toISOString().slice(0, 10)); // Aujourd'hui par défaut
  const [subjectCount, setSubjectCount] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // 1. Charger les spéculations au montage
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
      .catch(err => console.error("Erreur chargement spéculations", err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem('sav_token');

    try {
      const res = await fetch('http://localhost/api/flocks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customer: customerIri,
          building: buildingIri,
          speculation: selectedSpec,
          startDate: new Date(installDate).toISOString(), // Sert de date de début
          subjectCount: subjectCount ? parseInt(subjectCount) : 0,
          // Le nom est généré automatiquement par le Backend (FlockNamingListener)
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Erreur lors de la création");
      }
      onSuccess();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-green-50 p-4 rounded-lg border border-green-200 mt-4">
      <h4 className="font-bold text-green-800 mb-3">🌱 Mettre en place une nouvelle bande</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Spéculation</label>
          <select
            className="w-full border rounded p-2 bg-white"
            value={selectedSpec}
            onChange={(e) => setSelectedSpec(e.target.value)}
          >
            {speculations.map(s => (
              <option key={s['@id']} value={s['@id']}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date d'installation</label>
          <input
            type="date"
            required
            className="w-full border rounded p-2"
            value={installDate}
            onChange={(e) => setInstallDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Effectif (Nombre)</label>
          <input
            type="number"
            required
            min="1"
            placeholder="ex: 1000"
            className="w-full border rounded p-2"
            value={subjectCount}
            onChange={(e) => setSubjectCount(e.target.value)}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded font-bold shadow-sm"
        >
          {loading ? 'Création...' : 'Valider la mise en place'}
        </button>
      </div>
    </form>
  );
};