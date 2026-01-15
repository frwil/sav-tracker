'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Définition du type pour une Visite (basé sur notre entité API)
interface Visit {
    id: number;
    visitedAt: string;
    technician: {
        fullname: string;
    };
    customer: {
        name: string;
        zone: string;
    };
    gpsCoordinates?: string;
    closed: boolean;
    activated: boolean;
}

export default function DashboardPage() {
    const [visits, setVisits] = useState<Visit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const router = useRouter();

    useEffect(() => {
        // 1. Récupération du token
        const token = localStorage.getItem('sav_token');

        if (!token) {
            router.push('/'); // Redirection si pas connecté
            return;
        }

        // 2. Appel API pour charger les visites
        fetch('http://localhost/api/visits', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
            },
        })
            .then(async (res) => {
                if (res.status === 401) {
                    localStorage.removeItem('sav_token');
                    router.push('/');
                    throw new Error('Session expirée');
                }
                if (!res.ok) throw new Error('Erreur chargement des données');
                return res.json();
            })
            .then((data) => {
                // API Platform retourne les données dans "hydra:member" ou directement un tableau selon config
                // Par défaut c'est souvent "hydra:member"
                setVisits(data['hydra:member'] || data);
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
            });
    }, [router]);

    // Fonction de déconnexion
    const handleLogout = () => {
        localStorage.removeItem('sav_token');
        router.push('/');
    };

    if (loading) return <div className="p-8 text-center">Chargement...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            {/* En-tête simple */}
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800">Mes Visites</h1>
                <button
                    onClick={handleLogout}
                    className="rounded bg-red-100 px-4 py-2 text-sm text-red-600 hover:bg-red-200"
                >
                    Déconnexion
                </button>
            </div>

            {error && <div className="mb-4 text-red-600">{error}</div>}

            {/* Liste des visites */}
            {visits.length === 0 ? (
                <div className="text-gray-500">Aucune visite planifiée.</div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {visits.map((visit) => (
                        <Link key={visit.id} href={`/dashboard/${visit.id}`} className="block group">
                            <div className="rounded-lg bg-white p-6 shadow hover:shadow-md transition-all border-l-4 border-transparent hover:border-indigo-500">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-lg text-gray-800">{visit.customer.name}</span>
                                        {/* BADGES DE STATUT */}
                                        {!visit.activated ? (
                                            <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded font-bold border border-gray-200">
                                                ARCHIVÉE
                                            </span>
                                        ) : visit.closed ? (
                                            <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-bold border border-green-200">
                                                CLÔTURÉE
                                            </span>
                                        ) : (
                                            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-bold border border-yellow-200">
                                                EN COURS
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-sm text-gray-500">{new Date(visit.visitedAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <p className="text-gray-600 text-sm">{visit.customer.zone}</p>
                                    <div className="text-xs text-indigo-600 font-medium group-hover:translate-x-1 transition-transform">
                                        Voir le dossier →
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Bouton flottant pour ajouter (futur) */}
            <Link
                href="/dashboard/new"
                className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-3xl text-white shadow-lg hover:bg-indigo-700"
            >
                +
            </Link>
        </div>
    );
}