'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// --- COMPOSANTS UI ---

const MenuCard = ({ title, icon, href, color, description }: { title: string, icon: string, href: string, color: string, description: string }) => (
    <Link href={href} className="group relative overflow-hidden bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-300">
        <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110 opacity-50`}></div>
        <div className="relative z-10">
            <div className={`w-12 h-12 bg-${color}-100 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
                {icon}
            </div>
            <h3 className="font-bold text-lg text-gray-800 mb-1 group-hover:text-indigo-700 transition-colors">{title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
        </div>
    </Link>
);

const StatCard = ({ label, value, trend, trendUp }: { label: string, value: string, trend?: string, trendUp?: boolean }) => (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
        <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
        <div className="flex items-end justify-between">
            <h4 className="text-2xl font-bold text-gray-900">{value}</h4>
            {trend && (
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${trendUp ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {trend}
                </span>
            )}
        </div>
    </div>
);

// --- LOGIQUE PRINCIPALE ---

export default function DashboardHome() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'menu' | 'stats'>('menu');
    const [userRoles, setUserRoles] = useState<string[]>([]);
    const [username, setUsername] = useState<string>('');

    useEffect(() => {
        const token = localStorage.getItem('sav_token');
        if (!token) {
            router.push('/');
            return;
        }

        try {
            // Décodage basique du JWT pour récupérer les rôles
            const payload = JSON.parse(atob(token.split('.')[1]));
            setUserRoles(payload.roles || []);
            setUsername(payload.username || 'Utilisateur');
        } catch (e) {
            console.error("Erreur lecture token", e);
        }
    }, [router]);

    const isAdmin = userRoles.includes('ROLE_ADMIN');
    const isTechnician = userRoles.includes('ROLE_TECHNICIAN');
    // On suppose que ROLE_OPERATOR existe
    const isOperator = userRoles.includes('ROLE_OPERATOR') || isAdmin; 

    // --- VUE STATISTIQUES ---
    const StatsView = () => {
        if (isTechnician && !isAdmin) {
            // VUE TECHNICIEN (Données personnelles)
            return (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="Visites ce mois" value="12" trend="+2" trendUp={true} />
                        <StatCard label="Mes Clients" value="45" />
                        <StatCard label="Alertes Actives" value="3" trend="Urgent" trendUp={false} />
                        <StatCard label="Taux Clôture" value="95%" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl border border-gray-200">
                            <h4 className="font-bold text-gray-800 mb-4">clients à surveiller ⚠️</h4>
                            <ul className="space-y-3 text-sm">
                                <li className="flex justify-between items-center p-2 bg-red-50 rounded border border-red-100 text-red-800">
                                    <span>Ferme M. Kamga</span>
                                    <span className="font-bold">Mortalité ↑</span>
                                </li>
                                <li className="flex justify-between items-center p-2 bg-orange-50 rounded border border-orange-100 text-orange-800">
                                    <span>GIC Espoir</span>
                                    <span className="font-bold">Stock Bas</span>
                                </li>
                            </ul>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-200">
                            <h4 className="font-bold text-gray-800 mb-4">Répartition par Spéculation</h4>
                            {/*  */}
                            <div className="flex items-center justify-center h-32 bg-gray-50 rounded text-gray-400 italic">
                                Graphique de mes spéculations
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // VUE ADMIN / OPERATEUR (Données Globales)
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Total Visites (Mois)" value="142" trend="+15%" trendUp={true} />
                    <StatCard label="Nouveaux Clients" value="8" />
                    <StatCard label="Conso. Globale" value="45T" trend="-2%" trendUp={false} />
                    <StatCard label="Performance Tech." value="4.8/5" />
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200">
                    <h4 className="font-bold text-gray-800 mb-4">Analyse Consommation / Spéculation</h4>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-1"><span>Poulet de Chair (Cobb 500)</span><span className="font-bold">24 Tonnes</span></div>
                            <div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-indigo-600 h-2 rounded-full" style={{ width: '60%' }}></div></div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1"><span>Pondeuse</span><span className="font-bold">12 Tonnes</span></div>
                            <div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-indigo-400 h-2 rounded-full" style={{ width: '30%' }}></div></div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1"><span>Pisciculture</span><span className="font-bold">4 Tonnes</span></div>
                            <div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-blue-400 h-2 rounded-full" style={{ width: '10%' }}></div></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // --- VUE MENU ---
    const MenuView = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {/* ACCÈS VISITES (Pour tous) */}
            <MenuCard 
                title="Visites Techniques" 
                icon="🚜" 
                href="/dashboard/visits" 
                color="indigo" 
                description="Consulter, créer et clôturer les rapports de visite." 
            />
            
            {/* ACCÈS CLIENTS (Operator + Admin) */}
            {(isOperator || isAdmin) && (
                <MenuCard 
                    title="Clients" 
                    icon="👥" 
                    href="/dashboard/customers" // À créer plus tard
                    color="blue" 
                    description="Gérer le portefeuille client et les coordonnées." 
                />
            )}

            {/* ACCÈS BANDES (Technicien + Admin) */}
            <MenuCard 
                title="Bandes & Lots" 
                icon="🐣" 
                href="/dashboard/flocks" // À créer plus tard
                color="green" 
                description="Suivi des lots en cours, cycles de production." 
            />

            {/* ACCÈS BÂTIMENTS */}
            <MenuCard 
                title="Bâtiments" 
                icon="🏠" 
                href="/dashboard/buildings" // À créer plus tard
                color="orange" 
                description="Configuration des infrastructures et capacités." 
            />

            {/* ADMIN ONLY */}
            {isAdmin && (
                <>
                    <MenuCard 
                        title="Standards & Souches" 
                        icon="🧬" 
                        href="/dashboard/standards" 
                        color="purple" 
                        description="Configurer les abaques de croissance et référentiels." 
                    />
                    <MenuCard 
                        title="Utilisateurs" 
                        icon="🔐" 
                        href="/dashboard/users" 
                        color="gray" 
                        description="Gestion des accès, rôles et techniciens." 
                    />
                </>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans">
            {/* HEADER */}
            <div className="bg-indigo-900 text-white px-6 pt-8 pb-16 rounded-b-[3rem] shadow-lg mb-8">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <div>
                        <p className="text-indigo-200 text-sm font-medium mb-1">Bienvenue,</p>
                        <h1 className="text-3xl font-extrabold tracking-tight">{username}</h1>
                        <div className="flex gap-2 mt-2">
                            {isAdmin && <span className="bg-indigo-700 text-xs px-2 py-1 rounded border border-indigo-500">Administrateur</span>}
                            {isTechnician && <span className="bg-indigo-700 text-xs px-2 py-1 rounded border border-indigo-500">Technicien</span>}
                        </div>
                    </div>
                    <div className="text-4xl opacity-20">📊</div>
                </div>
            </div>

            {/* CONTENU PRINCIPAL */}
            <div className="max-w-5xl mx-auto px-4 -mt-12 relative z-10">
                {/* ONGLETS */}
                <div className="flex bg-white p-1.5 rounded-xl shadow-md border border-gray-100 mb-8 w-fit mx-auto md:mx-0">
                    <button 
                        onClick={() => setActiveTab('menu')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${activeTab === 'menu' ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        Applications
                    </button>
                    <button 
                        onClick={() => setActiveTab('stats')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${activeTab === 'stats' ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        Analyses & Stats
                    </button>
                </div>

                {/* AFFICHAGE CONDITIONNEL */}
                {activeTab === 'menu' ? <MenuView /> : <StatsView />}
            </div>
        </div>
    );
}