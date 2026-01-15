'use client';

import { useEffect, useState, use } from 'react'; // 'use' est nécessaire pour les params Next.js 13+
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Observation {
  id: number;
  type: string;
  description: string;
  isResolved: boolean;
}

interface Visit {
  id: number;
  visitedAt: string;
  customer: { name: string; zone: string };
  technician: { fullname: string };
  gpsCoordinates?: string;
  observations: Observation[];
}

export default function VisitDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  // Gestion des params asynchrones (spécifique Next.js 15)
  const resolvedParams = use(params);
  const visitId = resolvedParams.id;

  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Formulaire d'ajout d'observation
  const [obsType, setObsType] = useState('Sanitaire');
  const [obsDesc, setObsDesc] = useState('');
  const [submittingObs, setSubmittingObs] = useState(false);

  // Charger la visite et ses observations
  const fetchVisit = async () => {
    const token = localStorage.getItem('sav_token');
    try {
      const res = await fetch(`http://localhost/api/visits/${visitId}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      if (!res.ok) throw new Error('Impossible de charger la visite');
      const data = await res.json();
      setVisit(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisit();
  }, [visitId]);

  // Ajouter une observation
  const handleAddObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingObs(true);
    const token = localStorage.getItem('sav_token');

    try {
      const res = await fetch('http://localhost/api/observations', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          visit: `/api/visits/${visitId}`, // Lien IRI vers la visite
          type: obsType,
          description: obsDesc,
          isResolved: false
        }),
      });

      if (!res.ok) throw new Error("Erreur lors de l'ajout");
      
      // Recharger la visite pour voir la nouvelle observation
      setObsDesc('');
      fetchVisit(); 
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingObs(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Chargement...</div>;
  if (!visit) return <div className="p-8 text-center text-red-500">Visite introuvable</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white p-4 shadow-sm">
        <Link href="/dashboard" className="mb-2 inline-block text-sm text-indigo-600">
          ← Retour
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Visite #{visit.id} - {visit.customer.name}</h1>
        <p className="text-sm text-gray-500">
          {new Date(visit.visitedAt).toLocaleString()} • {visit.technician?.fullname}
        </p>
      </div>

      <div className="p-4 space-y-6">
        {/* Liste des Observations */}
        <div>
            <h2 className="mb-3 text-lg font-semibold text-gray-800">Observations</h2>
            {visit.observations.length === 0 ? (
                <p className="italic text-gray-500">Aucune observation notée.</p>
            ) : (
                <div className="space-y-3">
                    {visit.observations.map((obs) => (
                        <div key={obs.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                            <div className="flex justify-between items-start">
                                <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                                    {obs.type}
                                </span>
                            </div>
                            <p className="mt-2 text-gray-700">{obs.description}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Formulaire d'ajout rapide */}
        <div className="rounded-lg bg-indigo-50 p-4 border border-indigo-100">
            <h3 className="mb-3 font-semibold text-indigo-900">Nouvelle Observation</h3>
            <form onSubmit={handleAddObservation} className="space-y-3">
                <select 
                    className="block w-full rounded border-gray-300 p-2 text-sm"
                    value={obsType}
                    onChange={e => setObsType(e.target.value)}
                >
                    <option>Sanitaire</option>
                    <option>Alimentation</option>
                    <option>Bâtiment</option>
                    <option>Satisfaction Client</option>
                </select>
                <textarea 
                    className="block w-full rounded border-gray-300 p-2 text-sm"
                    placeholder="Détails du problème ou commentaire..."
                    rows={2}
                    required
                    value={obsDesc}
                    onChange={e => setObsDesc(e.target.value)}
                />
                <button 
                    type="submit" 
                    disabled={submittingObs}
                    className="w-full rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                    {submittingObs ? 'Ajout...' : 'Ajouter'}
                </button>
            </form>
        </div>
      </div>
    </div>
  );
}