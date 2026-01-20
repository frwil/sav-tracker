'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Select from 'react-select';
// Import du hook personnalisé
import { useCustomers, CustomerOption } from '@/hooks/useCustomers';

export default function NewVisitPage() {
  const router = useRouter();
  
  // 1. Utilisation du Hook pour charger les clients
  // On renomme loading et error pour éviter les conflits avec le formulaire
  const { 
    options: customerOptions, 
    loading: customersLoading, 
    error: customersError 
  } = useCustomers();

  // 2. États du formulaire uniquement
  const [selectedCustomerOption, setSelectedCustomerOption] = useState<CustomerOption | null>(null);
  const [visitedAt, setVisitedAt] = useState('');
  const [gpsCoordinates, setGpsCoordinates] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(''); // Erreur spécifique à l'envoi

  // 3. Initialisation de la date (seule logique restante dans useEffect)
  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setVisitedAt(now.toISOString().slice(0, 16));
  }, []);

  // 4. Géolocalisation
  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }
    setGpsCoordinates('Localisation en cours...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = `${position.coords.latitude}, ${position.coords.longitude}`;
        setGpsCoordinates(coords);
      },
      (error) => {
        setGpsCoordinates('');
        alert("Erreur de géolocalisation : " + error.message);
      },
      { enableHighAccuracy: true }
    );
  };

  // 5. Soumission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(''); // Reset de l'erreur précédente

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
          customer: selectedCustomerOption.value, // On envoie l'IRI fourni par le hook
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
      setSubmitError(err.message);
      setIsSubmitting(false);
    }
  };

  // Affichage pendant le chargement initial des clients (géré par le hook)
  if (customersLoading) return <div className="p-8 text-center">Chargement des clients...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-lg rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">Nouvelle Visite</h2>

        {/* Affichage des erreurs de chargement CLIENTS */}
        {customersError && (
          <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">
            Erreur de chargement : {customersError}
          </div>
        )}

        {/* Affichage des erreurs de SOUMISSION */}
        {submitError && (
          <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sélection Client */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
            <Select
              instanceId="customer-select"
              options={customerOptions} // Vient directement du Hook
              value={selectedCustomerOption}
              onChange={(option) => setSelectedCustomerOption(option)}
              placeholder="Rechercher un client..."
              isSearchable={true}
              noOptionsMessage={() => "Aucun client trouvé"}
              className="text-sm"
              styles={{
                control: (base) => ({
                  ...base,
                  borderColor: '#D1D5DB',
                  padding: '2px',
                  borderRadius: '0.375rem',
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

          {/* Coordonnées GPS */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Position GPS</label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                readOnly
                placeholder="Cliquez sur 'Me localiser'"
                className="block w-full rounded-md border border-gray-300 bg-gray-100 p-3 text-gray-500 shadow-sm cursor-not-allowed sm:text-sm"
                value={gpsCoordinates}
              />
              <button
                type="button"
                onClick={handleGeolocate}
                className="whitespace-nowrap rounded-md bg-green-100 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-200"
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
              disabled={isSubmitting || !!customersError} // Désactivé si envoi ou erreur chargement
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