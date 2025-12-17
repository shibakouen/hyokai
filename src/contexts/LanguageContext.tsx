import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, Language, TranslationKey } from '@/lib/translations';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'hyokai-language';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, user } = useAuth();

    const [language, setLanguageState] = useState<Language>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(STORAGE_KEY);
            return (saved === 'jp' ? 'jp' : 'en');
        }
        return 'en';
    });

    const [hasLoadedFromDb, setHasLoadedFromDb] = useState(false);

    // Load from database when authenticated
    useEffect(() => {
        if (!isAuthenticated || !user || hasLoadedFromDb) return;

        const loadFromDatabase = async () => {
            // Add timeout to prevent infinite loading
            const DB_TIMEOUT_MS = 5000;
            const timeoutId = setTimeout(() => {
                console.warn('LanguageContext database load timed out');
                setHasLoadedFromDb(true);
            }, DB_TIMEOUT_MS);

            try {
                // Use maybeSingle() to avoid errors when no row exists
                const { data, error } = await supabase
                    .from('user_preferences')
                    .select('language')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (!error && data?.language) {
                    setLanguageState(data.language as Language);
                }
                clearTimeout(timeoutId);
                setHasLoadedFromDb(true);
            } catch (e) {
                console.error('Failed to load language:', e);
                clearTimeout(timeoutId);
                setHasLoadedFromDb(true);
            }
        };

        loadFromDatabase();
    }, [isAuthenticated, user, hasLoadedFromDb]);

    // Reset loaded flag when user changes
    useEffect(() => {
        if (!isAuthenticated) {
            setHasLoadedFromDb(false);
        }
    }, [isAuthenticated]);

    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang);

        // Save to localStorage
        localStorage.setItem(STORAGE_KEY, lang);

        // Save to database if authenticated
        if (isAuthenticated && user) {
            supabase
                .from('user_preferences')
                .upsert({ user_id: user.id, language: lang })
                .then(({ error }) => {
                    if (error) console.error('Failed to save language:', error);
                });
        }
    }, [isAuthenticated, user]);

    const t = useCallback((key: TranslationKey): string => {
        return translations[language][key] || key;
    }, [language]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
