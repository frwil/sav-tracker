/**
 * Décode le payload d'un token JWT (base64url → base64 → JSON).
 * Retourne le payload parsé ou null en cas d'erreur.
 */
export function decodeJwtPayload<T = Record<string, unknown>>(token: string): T | null {
    try {
        let payload = token.split('.')[1] || "";
        // Conversion base64url → base64 (atob ne gère pas - et _)
        payload = payload.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(payload)) as T;
    } catch {
        return null;
    }
}

/**
 * Extrait les rôles depuis un token JWT stocké dans localStorage.
 * Retourne un tableau vide si le token est absent ou invalide.
 */
export function getUserRolesFromToken(): string[] {
    if (typeof window === 'undefined') return [];
    const token = localStorage.getItem('sav_token');
    if (!token) return [];
    const payload = decodeJwtPayload<{ roles?: string[] }>(token);
    return payload?.roles || [];
}
