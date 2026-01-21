'use client';

import { useAuth } from '@/hooks/useAuth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-indigo-600 font-bold animate-pulse">Vérification des accès...</div>
            </div>
        );
    }

    return <>{children}</>;
}