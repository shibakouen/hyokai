import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type Mode = 'coding' | 'prompting';

interface ModeContextType {
    mode: Mode;
    setMode: (mode: Mode) => void;
    isBeginnerMode: boolean;
    setIsBeginnerMode: (value: boolean) => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

const MODE_KEY = 'hyokai-mode';
const BEGINNER_MODE_KEY = 'hyokai-beginner-mode';

export function ModeProvider({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, user } = useAuth();

    // Initialize from localStorage (will be overwritten by database if authenticated)
    const [mode, setModeState] = useState<Mode>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(MODE_KEY);
            return (saved === 'prompting' ? 'prompting' : 'coding');
        }
        return 'coding';
    });

    const [isBeginnerMode, setIsBeginnerModeState] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(BEGINNER_MODE_KEY);
            return saved === 'true';
        }
        return true;
    });

    // Track if we've loaded from database
    const [hasLoadedFromDb, setHasLoadedFromDb] = useState(false);

    // Load preferences from database when authenticated
    useEffect(() => {
        if (!isAuthenticated || !user || hasLoadedFromDb) return;

        const loadFromDatabase = async () => {
            // Add timeout to prevent infinite loading
            const DB_TIMEOUT_MS = 30000;
            const timeoutId = setTimeout(() => {
                console.warn('ModeContext database load timed out');
                setHasLoadedFromDb(true);
            }, DB_TIMEOUT_MS);

            try {
                // Use maybeSingle() to avoid errors when no row exists
                const { data, error } = await supabase
                    .from('user_preferences')
                    .select('mode, beginner_mode')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (!error && data) {
                    if (data.mode) {
                        setModeState(data.mode as Mode);
                    }
                    if (data.beginner_mode !== null) {
                        setIsBeginnerModeState(data.beginner_mode);
                    }
                }
                clearTimeout(timeoutId);
                setHasLoadedFromDb(true);
            } catch (e) {
                console.error('Failed to load preferences:', e);
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

    // Save mode
    const setMode = useCallback((newMode: Mode) => {
        setModeState(newMode);

        // Save to localStorage (always, for guests and as fallback)
        localStorage.setItem(MODE_KEY, newMode);

        // Save to database if authenticated
        if (isAuthenticated && user) {
            supabase
                .from('user_preferences')
                .upsert({ user_id: user.id, mode: newMode })
                .then(({ error }) => {
                    if (error) console.error('Failed to save mode:', error);
                });
        }
    }, [isAuthenticated, user]);

    // Save beginner mode
    const setIsBeginnerMode = useCallback((value: boolean) => {
        setIsBeginnerModeState(value);

        // Save to localStorage
        localStorage.setItem(BEGINNER_MODE_KEY, value.toString());

        // Save to database if authenticated
        if (isAuthenticated && user) {
            supabase
                .from('user_preferences')
                .upsert({ user_id: user.id, beginner_mode: value })
                .then(({ error }) => {
                    if (error) console.error('Failed to save beginner mode:', error);
                });
        }
    }, [isAuthenticated, user]);

    return (
        <ModeContext.Provider value={{ mode, setMode, isBeginnerMode, setIsBeginnerMode }}>
            {children}
        </ModeContext.Provider>
    );
}

export function useMode() {
    const context = useContext(ModeContext);
    if (context === undefined) {
        throw new Error('useMode must be used within a ModeProvider');
    }
    return context;
}
