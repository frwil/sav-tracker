'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Select from 'react-select'; // <--- Import du composant style "Tom Select"

interface Customer {
  '@id': string;
  id: number;
  name: string;
  zone: string;
}

// Interface pour les options du Select
interface CustomerOption {
  value: string;
  label: string;
}

export default function NewVisitPage() {
  const router = useRouter();
  // On stocke les options formatées pour react-select
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // États du formulaire
  const [selectedCustomerOption, setSelectedCustomerOption] = useState<CustomerOption | null>(null);
  const [visitedAt, setVisitedAt] = useState('');
  const [gpsCoordinates, setGpsCoordinates] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Chargement de la liste des clients
  useEffect(() => {
    const token = localStorage.getItem('sav_token');
    if (!token) {
      router.push('/');
      return;
    }

    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setVisitedAt(now.toISOString().slice(0, 16));

    fetch('http://localhost/api/customers', { // HTTP local
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/ld+json', // Spécifique API Platform
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Erreur réseau');
        return res.json();
      })
      .then((data) => {
        const rawCustomers = data['hydra:member'] || data['member'] || [];
        // Transformation des données pour react-select (value/label)
        const options = rawCustomers.map((c: Customer) => ({
          value: c['@id'],
          label: `${c.name} (${c.zone})`
        }));
        setCustomerOptions(options);
        setLoading(false);
      })
      .catch((err) => {
        setError("Impossible de charger les clients");
        setLoading(false);
      });
  }, [router]);

  // 2. Géolocalisation
  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }
    
    // Feedback visuel pendant la recherche
    setGpsCoordinates('Localisation en cours...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = `${position.coords.latitude}, ${position.coords.longitude}`;
        setGpsCoordinates(coords);
      },
      (error) => {
        setGpsCoordinates(''); // On vide si erreur
        alert("Erreur de géolocalisation : " + error.message);
      },
      { enableHighAccuracy: true } // Demande la meilleure précision possible
    );
  };

  // 3. Soumission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerOption) {
      alert("Veuillez sélectionner un client");
      return;
    }

    setIsSubmitting(true);
    const token = localStorage.getItem('sav_token');

    try {
      const res = await fetch('http://localhost/api/visits', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer: selectedCustomerOption.value, // On envoie l'IRI
          visitedAt: new Date(visitedAt).toISOString(),
          gpsCoordinates: gpsCoordinates,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Erreur lors de la création');
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Chargement des données...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-lg rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">Nouvelle Visite</h2>
        
        {error && (
          <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sélection Client avec React-Select (Cherchable) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
            <Select
              instanceId="customer-select" // ID unique pour l'accessibilité
              options={customerOptions}
              value={selectedCustomerOption}
              onChange={(option) => setSelectedCustomerOption(option)}
              placeholder="Rechercher un client..."
              isSearchable={true} // Active la recherche texte
              noOptionsMessage={() => "Aucun client trouvé"}
              className="text-sm"
              styles={{
                control: (base) => ({
                  ...base,
                  borderColor: '#D1D5DB', // border-gray-300
                  padding: '2px',
                  borderRadius: '0.375rem', // rounded-md
                })
              }}
            />
          </div>

          {/* Date de visite */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Date et Heure</label>
            <input
              type="datetime-local"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 p-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={visitedAt}
              onChange={(e) => setVisitedAt(e.target.value)}
            />
          </div>

          {/* Coordonnées GPS (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Position GPS</label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                readOnly // <--- CHAMP VERROUILLÉ
                placeholder="Cliquez sur 'Me localiser'"
                className="block w-full rounded-md border border-gray-300 bg-gray-100 p-3 text-gray-500 shadow-sm cursor-not-allowed sm:text-sm" // Style grisé
                value={gpsCoordinates}
                // Pas de onChange car read-only
              />
              <button
                type="button"
                onClick={handleGeolocate}
                className="whitespace-nowrap rounded-md bg-green-100 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-200"
              >
                📍 Me localiser
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              La position est détectée automatiquement.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}