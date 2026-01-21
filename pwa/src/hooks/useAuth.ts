import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface UserPayload {
    username: string;
    roles: string[];
    id: number;
    exp: number;
}

export function useAuth() {
    const router = useRouter();
    const [user, setUser] = useState<UserPayload | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('sav_token');

            if (!token) {
                router.push('/');
                return;
            }

            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const now = Math.floor(Date.now() / 1000);

                if (payload.exp < now) {
                    throw new Error("Token expiré");
                }

                // Vérification API
                const res = await fetch(`http://localhost/api/users/${payload.id}`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
                });

                // 👇 MODIFICATION ICI : On gère le cas où l'user n'existe plus (404) ou erreur (500)
                if (!res.ok) {
                    throw new Error(`Erreur validation utilisateur (${res.status})`);
                }

                const userData = await res.json();
                
                if (userData.activated === false) {
                    throw new Error("Compte archivé");
                }

                setUser({
                    username: payload.username,
                    roles: payload.roles,
                    id: payload.id,
                    exp: payload.exp
                });
                setLoading(false);

            } catch (e) {
                console.warn("Session invalide ou expirée:", e);
                localStorage.removeItem('sav_token'); // On nettoie le token invalide
                router.push('/'); // Retour à la case départ
            }
        };

        checkAuth();
    }, [router]);

    return { user, loading };
}