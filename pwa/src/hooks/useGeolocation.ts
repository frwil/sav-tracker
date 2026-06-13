'use client';

import { useState, useCallback } from 'react';

interface GeoState {
    coordinates: string | null; // "lat, lng" ou null
    isLoading: boolean;
    error: string | null;
    lastAttempt: 'high-accuracy' | 'low-accuracy' | null;
}

interface GeoOptions {
    /** Délai max en ms avant timeout (défaut: 10000) */
    timeout?: number;
    /** Âge max du cache GPS en ms (défaut: 0 = toujours frais) */
    maximumAge?: number;
    /** Callback appelé quand les coordonnées sont obtenues */
    onSuccess?: (coords: string) => void;
    /** Callback appelé en cas d'échec complet */
    onError?: (error: string) => void;
}

/**
 * Hook de géolocalisation offline-first.
 *
 * Stratégie :
 * 1. Tente d'abord avec enableHighAccuracy=true (GPS matériel — fonctionne SANS internet sur mobile)
 * 2. Si échec, retente avec enableHighAccuracy=false (WiFi / cell-tower, plus rapide mais moins précis)
 * 3. Si toujours échec, retourne l'erreur — l'utilisateur peut relancer manuellement
 *
 * La géolocalisation navigateur (navigator.geolocation) utilise le GPS du téléphone,
 * qui ne nécessite PAS de connexion internet. C'est donc la méthode offline par excellence.
 */
export function useGeolocation(options: GeoOptions = {}) {
    const { timeout = 10000, maximumAge = 0, onSuccess, onError } = options;

    const [state, setState] = useState<GeoState>({
        coordinates: null,
        isLoading: false,
        error: null,
        lastAttempt: null,
    });

    const handleError = useCallback((err: GeolocationPositionError, isHighAccuracy: boolean): string => {
        let msg: string;
        switch (err.code) {
            case err.PERMISSION_DENIED:
                msg = 'Autorisation GPS refusée. Veuillez activer la localisation dans les paramètres.';
                break;
            case err.POSITION_UNAVAILABLE:
                if (isHighAccuracy) {
                    // On va retenter en basse précision, pas de message maintenant
                    msg = 'high-accuracy-failed';
                } else {
                    msg = 'Position indisponible. Vérifiez que le GPS est activé.';
                }
                break;
            case err.TIMEOUT:
                if (isHighAccuracy) {
                    msg = 'high-accuracy-failed';
                } else {
                    msg = 'Délai dépassé. Réessayez dans une zone mieux couverte.';
                }
                break;
            default:
                msg = 'Erreur de géolocalisation inconnue.';
        }
        return msg;
    }, []);

    const attemptGeolocation = useCallback((highAccuracy: boolean): Promise<{ coords: string; usedHighAccuracy: boolean }> => {
        return new Promise((resolve, reject) => {
            if (!('geolocation' in navigator)) {
                reject(new Error('La géolocalisation n\'est pas supportée par ce navigateur.'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const coords = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
                    resolve({ coords, usedHighAccuracy: highAccuracy });
                },
                (err) => {
                    reject(err);
                },
                {
                    enableHighAccuracy: highAccuracy,
                    timeout: highAccuracy ? timeout : timeout / 2, // timeout plus court en fallback
                    maximumAge,
                }
            );
        });
    }, [timeout, maximumAge]);

    const locate = useCallback(async () => {
        setState(prev => ({ ...prev, isLoading: true, error: null, coordinates: null }));

        // ─── ÉTAPE 1 : Tentative haute précision (GPS matériel, offline) ───
        try {
            const result = await attemptGeolocation(true);
            setState({
                coordinates: result.coords,
                isLoading: false,
                error: null,
                lastAttempt: 'high-accuracy',
            });
            onSuccess?.(result.coords);
            return result.coords;
        } catch (err) {
            const errorMsg = handleError(err as GeolocationPositionError, true);

            // Si l'erreur est "POSITION_UNAVAILABLE" ou "TIMEOUT" en haute précision,
            // on tente le fallback basse précision (WiFi / cell-tower)
            if (errorMsg === 'high-accuracy-failed') {
                console.log('📍 GPS haute précision échoué → tentative basse précision (WiFi/cellulaire)...');

                // ─── ÉTAPE 2 : Fallback basse précision ───
                try {
                    const result = await attemptGeolocation(false);
                    setState({
                        coordinates: result.coords,
                        isLoading: false,
                        error: null,
                        lastAttempt: 'low-accuracy',
                    });
                    console.log('📍 Position obtenue en basse précision (WiFi/cellulaire)');
                    onSuccess?.(result.coords);
                    return result.coords;
                } catch (fallbackErr) {
                    const fallbackMsg = handleError(fallbackErr as GeolocationPositionError, false);
                    setState({
                        coordinates: null,
                        isLoading: false,
                        error: fallbackMsg,
                        lastAttempt: 'low-accuracy',
                    });
                    onError?.(fallbackMsg);
                    return null;
                }
            }

            // ─── Échec définitif (permission refusée, etc.) ───
            setState({
                coordinates: null,
                isLoading: false,
                error: errorMsg,
                lastAttempt: 'high-accuracy',
            });
            onError?.(errorMsg);
            return null;
        }
    }, [attemptGeolocation, handleError, onSuccess, onError]);

    return {
        ...state,
        locate,
    } as const;
}
