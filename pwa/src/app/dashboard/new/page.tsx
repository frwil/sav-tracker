'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Customer {
  '@id': string; // L'identifiant unique API (ex: "/api/customers/1")
  id: number;
  name: string;
  zone: string;
}

export default function NewVisitPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // États du formulaire
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [visitedAt, setVisitedAt] = useState('');
  const [gpsCoordinates, setGpsCoordinates] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Chargement de la liste des clients au démarrage
  useEffect(() => {
    const token = localStorage.getItem('sav_token');
    if (!token) {
      router.push('/');
      return;
    }

    // Initialiser la date à "maintenant" (format compatible datetime-local)
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setVisitedAt(now.toISOString().slice(0, 16));

    fetch('http://localhost/api/customers', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setCustomers(data['hydra:member'] || data);
        setLoading(false);
      })
      .catch((err) => {
        setError("Impossible de charger les clients");
        setLoading(false);
      });
  }, [router]);

  // 2. Fonction de Géolocalisation
  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = `${position.coords.latitude}, ${position.coords.longitude}`;
        setGpsCoordinates(coords);
      },
      (error) => {
        alert("Erreur de géolocalisation : " + error.message);
      }
    );
  };

  // 3. Soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          customer: selectedCustomer, // On envoie l'IRI (ex: /api/customers/1)
          visitedAt: new Date(visitedAt).toISOString(),
          gpsCoordinates: gpsCoordinates,
          // Pas besoin d'envoyer 'technician', le backend le gère !
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Erreur lors de la création');
      }

      // Succès : retour au dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Chargement des clients...</div>;

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
          {/* Sélection Client */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Client</label>
            <select
              required
              className="mt-1 block w-full rounded-md border border-gray-300 p-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
            >
              <option value="">-- Choisir un client --</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer['@id']}>
                  {customer.name} ({customer.zone})
                </option>
              ))}
            </select>
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

          {/* Coordonnées GPS */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Position GPS</label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                placeholder="Lat, Long"
                className="block w-full rounded-md border border-gray-300 p-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={gpsCoordinates}
                onChange={(e) => setGpsCoordinates(e.target.value)}
              />
              <button
                type="button"
                onClick={handleGeolocate}
                className="rounded-md bg-green-100 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-200"
              >
                📍 Me localiser
              </button>
            </div>
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
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer la visite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}