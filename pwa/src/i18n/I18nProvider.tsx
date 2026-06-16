'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { translations, Locale, TranslationKey } from './translations';

interface I18nContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType>({
    locale: 'fr',
    setLocale: () => {},
    t: (key: any) => key,
});

const LOCALE_STORAGE_KEY = 'sav_locale';

export function I18nProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>('fr');

    // Restaurer la locale depuis le localStorage au montage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
            if (saved === 'fr' || saved === 'en') {
                setLocaleState(saved);
            }
        }
    }, []);

    const setLocale = useCallback((newLocale: Locale) => {
        setLocaleState(newLocale);
        if (typeof window !== 'undefined') {
            localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
        }
    }, []);

    const t = useCallback((key: TranslationKey, params?: Record<string, string | number>): string => {
        const dict = translations[locale];
        let text: string = (dict as any)[key] ?? key;

        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                text = text.replace(`{${k}}`, String(v));
            });
        }

        return text;
    }, [locale]);

    return (
        <I18nContext.Provider value={{ locale, setLocale, t }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useTranslation() {
    return useContext(I18nContext);
}
