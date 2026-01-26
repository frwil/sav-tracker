// hooks/useCustomers.ts
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Customer {
  '@id': string;
  name: string;
  zone: string;
}

export interface CustomerOption {
  value: string;
  label: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api';

export function useCustomers() {
  const [options, setOptions] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('sav_token');
    
    // Redirection si pas de token (optionnel selon le contexte)
    if (!token) {
      // Tu peux commenter cette ligne si tu veux gérer la redirection dans le composant parent
      // router.push('/'); 
      setLoading(false);
      return;
    }

    const fetchCustomers = async () => {
      try {
        const res = await fetch(`${API_URL}/customers`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/ld+json',
          },
        });

        if (res.status === 401) {
          localStorage.removeItem('sav_token');
          router.push('/');
          return;
        }

        if (!res.ok) throw new Error('Erreur réseau lors du chargement des clients');

        const data = await res.json();
        const rawCustomers = data['hydra:member'] || data['member'] || [];

        // Transformation pour React-Select
        const formattedOptions = rawCustomers.map((c: Customer) => ({
          value: c['@id'], // L'IRI (ex: /api/customers/12)
          label: `${c.name} (${c.zone})`
        }));

        setOptions(formattedOptions);
      } catch (err: any) {
        setError(err.message || 'Impossible de charger les clients');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [router]);

  return { options, loading, error };
}