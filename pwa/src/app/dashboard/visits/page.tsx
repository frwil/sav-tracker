'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Visit {
    id: number;
    visitedAt: string;
    technician: { fullname: string };
    customer: { name: string; zone: string };
    gpsCoordinates?: string;
    closed: boolean;
    activated: boolean;
}

export default function VisitsListPage() {
    const [visits, setVisits] = useState<Visit[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('sav_token');
        if (!token) { router.push('/'); return; }

        fetch('http://localhost/api/visits', {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        })
        .then(async (res) => {
            if (res.status === 401) {
                localStorage.removeItem('sav_token');
                router.push('/');
                return;
            }
            const data = await res.json();
            setVisits(data);
            setLoading(false);
        })
        .catch((err) => {
            console.error(err);
            setLoading(false);
        });
    }, [router]);

    if (loading) return <div className="p-10 text-center text-gray-500">Chargement des visites...</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans">
            <div className="bg-white shadow px-6 py-4 sticky top-0 z-20 border-b border-gray-200">
                <div className="flex justify-between items-center max-w-5xl mx-auto">
                    <div>
                        <Link href="/dashboard" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition">← Menu Principal</Link>
                        <h1 className="text-2xl font-extrabold text-gray-800 mt-1">Visites Techniques</h1>
                    </div>
                    <Link href="/dashboard/visits/new" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 transition shadow-sm text-sm">
                        + Nouvelle Visite
                    </Link>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 mt-8">
                {visits.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
                        <p className="text-gray-400 mb-4 text-lg">Aucune visite enregistrée.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {visits.map((visit) => (
                            <Link key={visit.id} href={`/dashboard/${visit.id}`} className="group block bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-indigo-200 transition-all duration-200">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h2 className="font-bold text-lg text-gray-800 group-hover:text-indigo-700 transition-colors">
                                                {visit.customer.name}
                                            </h2>
                                            {visit.closed ? (
                                                <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-gray-200">Clôturée</span>
                                            ) : (
                                                <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-green-200 animate-pulse">En cours</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500">{new Date(visit.visitedAt).toLocaleDateString()} • {visit.customer.zone}</p>
                                        <p className="text-xs text-gray-400 mt-1">Tech: {visit.technician.fullname}</p>
                                    </div>
                                    <div className="text-2xl text-gray-300 group-hover:text-indigo-500 transition-colors">→</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}