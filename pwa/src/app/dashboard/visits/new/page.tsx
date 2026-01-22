'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Select from 'react-select';
import Link from 'next/link';
import { useCustomers, CustomerOption } from '@/hooks/useCustomers';

export default function NewVisitPage() {
  const router = useRouter();
  
  const { 
    options: customerOptions, 
    loading: customersLoading, 
    error: customersError 
  } = useCustomers();

  const [selectedCustomerOption, setSelectedCustomerOption] = useState<CustomerOption | null>(null);
  const [visitedAt, setVisitedAt] = useState('');
  const [gpsCoordinates, setGpsCoordinates] = useState('');
  
  // États de chargement et d'erreur
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  
  // NOUVEAU : États pour la géolocalisation
  const [isGeolocating, setIsGeolocating] = useState(false);

  // NOUVEAU : États pour la vérification de visite en cours
  const [checkingVisit, setCheckingVisit] = useState(false);
  const [activeVisit, setActiveVisit] = useState<{ id: number, date: string } | null>(null);

  // Initialisation date
  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setVisitedAt(now.toISOString().slice(0, 16));
  }, []);

  // 1. SURVEILLANCE DU CLIENT SÉLECTIONNÉ (Vérification visite en cours)
  useEffect(() => {
    if (!selectedCustomerOption) {
      setActiveVisit(null);
      return;
    }

    const checkExistingVisit = async () => {
      setCheckingVisit(true);
      setActiveVisit(null);
      const token = localStorage.getItem('sav_token');
      const customerId = selectedCustomerOption.value.split('/').pop(); // Extraction ID depuis IRI

      try {
        // On cherche une visite pour ce client qui n'a pas de date de fin (endDate = null)
        // Note: Adaptez le filtre "exists[endDate]=false" selon votre configuration API Platform
        const res = await fetch(`http://localhost/api/visits?customer=${customerId}&exists[endDate]=false`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/ld+json' }
        });
        
        if (res.ok) {
          const data = await res.json();
          const visits = data['hydra:member'] || data['member'] || [];
          
          // S'il y a au moins une visite active
          if (visits.length > 0) {
            setActiveVisit({ 
              id: visits[0].id, 
              date: visits[0].visitedAt 
            });
          }
        }
      } catch (e) {
        console.error("Erreur vérification visite", e);
      } finally {
        setCheckingVisit(false);
      }
    };

    checkExistingVisit();
  }, [selectedCustomerOption]);


  // 2. GÉOLOCALISATION AMÉLIORÉE
  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      alert("Géolocalisation non supportée par votre navigateur.");
      return;
    }

    setIsGeolocating(true); // Spinner ON

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // Arrondir pour plus de propreté (ex: 5 décimales)
        setGpsCoordinates(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        setIsGeolocating(false); // Spinner OFF
      },
      (error) => {
        console.error("Erreur géolocalisation :", error);
        let msg = "Impossible de récupérer votre position.";
        if (error.code === 1) msg = "Vous avez refusé la géolocalisation.";
        else if (error.code === 2) msg = "Position indisponible (Vérifiez votre GPS).";
        else if (error.code === 3) msg = "Délai d'attente dépassé.";
        
        alert(msg);
        setIsGeolocating(false);
      },
      { 
        enableHighAccuracy: true, // Force le GPS
        timeout: 15000,          // Attend 15s max
        maximumAge: 0            // Ne pas utiliser de position en cache
      }
    );
  };

  // 3. SOUMISSION ET REDIRECTION
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerOption) {
      setSubmitError("Veuillez sélectionner un client");
      return;
    }

    // Bloquer si visite active détectée
    if (activeVisit) return;

    setIsSubmitting(true);
    setSubmitError('');

    const token = localStorage.getItem('sav_token');
    
    try {
      const res = await fetch('http://localhost/api/visits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customer: selectedCustomerOption.value,
          visitedAt: new Date(visitedAt).toISOString(),
          gpsCoordinates: gpsCoordinates || null,
        })
      });

      if (!res.ok) {
        throw new Error('Erreur lors de la création');
      }

      const newVisit = await res.json();
      
      // REDIRECTION DIRECTE vers la visite créée
      router.push(`/dashboard/visits/${newVisit.id}`);

    } catch (err) {
      setSubmitError("Impossible de créer la visite. Vérifiez votre connexion.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      <div className="bg-white shadow px-6 py-4 mb-6">
        <h1 className="text-2xl font-extrabold text-gray-800">Nouvelle Visite</h1>
      </div>

      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          
          {submitError && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm font-bold">
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Sélection Client */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Client</label>
              <Select
                instanceId="customer-select"
                options={customerOptions}
                value={selectedCustomerOption}
                onChange={setSelectedCustomerOption}
                isLoading={customersLoading}
                placeholder={customersError ? "Erreur de chargement" : "Rechercher un client..."}
                className="text-sm"
                isDisabled={isSubmitting}
              />
            </div>

            {/* ALERTE VISITE EXISTANTE */}
            {checkingVisit && <div className="text-xs text-gray-500 animate-pulse">Vérification des visites en cours...</div>}
            
            {activeVisit && (
               <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4">
                 <div className="flex items-center gap-3">
                   <span className="text-2xl">🚧</span>
                   <div>
                     <h4 className="font-bold text-orange-800">Une visite est déjà en cours !</h4>
                     <p className="text-sm text-orange-700">
                       Démarrée le {new Date(activeVisit.date).toLocaleDateString()} à {new Date(activeVisit.date).toLocaleTimeString()}
                     </p>
                   </div>
                 </div>
                 <Link 
                   href={`/dashboard/visits/${activeVisit.id}`}
                   className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-orange-700 whitespace-nowrap"
                 >
                   Reprendre la visite →
                 </Link>
               </div>
            )}

            {/* Date de visite */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Date et Heure</label>
              <input
                type="datetime-local"
                required
                disabled={isSubmitting || !!activeVisit}
                className="block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                value={visitedAt}
                onChange={(e) => setVisitedAt(e.target.value)}
              />
            </div>

            {/* Géolocalisation */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Position GPS</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  placeholder="Latitude, Longitude"
                  className="block w-full rounded-md border border-gray-300 bg-gray-100 p-2 text-gray-500 shadow-sm cursor-not-allowed sm:text-sm"
                  value={gpsCoordinates}
                />
                <button
                  type="button"
                  onClick={handleGeolocate}
                  disabled={isGeolocating || !!activeVisit}
                  className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    isGeolocating 
                      ? 'bg-gray-200 text-gray-500 cursor-wait' 
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {isGeolocating ? '📍 Localisation...' : '📍 Me localiser'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Cliquez pour capturer votre position actuelle.</p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Annuler
              </button>
              
              <button
                type="submit"
                disabled={isSubmitting || customersLoading || !!activeVisit}
                className={`inline-flex justify-center rounded-md px-6 py-2 text-sm font-bold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  (isSubmitting || !!activeVisit)
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {isSubmitting ? 'Création...' : 'Démarrer la visite'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}