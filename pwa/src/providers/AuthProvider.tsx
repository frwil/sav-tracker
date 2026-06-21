"use client";

import { createContext, useContext } from "react";
import { useAuth } from "@/hooks/useAuth";

interface UserPayload {
    id: number;
    username: string;
    roles: string[];
    exp: number;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    activated?: boolean;
}

interface AuthContextValue {
    user: UserPayload | null;
    loading: boolean;
    isSalesRep: boolean;
    isTech: boolean;
    isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue>({
    user: null,
    loading: true,
    isSalesRep: false,
    isTech: false,
    isAdmin: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();

    const roles = user?.roles || [];
    const isSalesRep = roles.includes("ROLE_SALES_REP");
    const isTech = roles.includes("ROLE_TECHNICIAN");
    const isAdmin = roles.includes("ROLE_ADMIN") || roles.includes("ROLE_SUPER_ADMIN");

    return (
        <AuthContext.Provider value={{ user, loading, isSalesRep, isTech, isAdmin }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuthContext() {
    return useContext(AuthContext);
}
