import React, { createContext, useContext, useState, useEffect } from 'react';

export type Mode = 'coding' | 'prompting';

interface ModeContextType {
    mode: Mode;
    setMode: (mode: Mode) => void;
    isBeginnerMode: boolean;
    setIsBeginnerMode: (value: boolean) => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

const BEGINNER_MODE_KEY = 'hyokai-beginner-mode';

export function ModeProvider({ children }: { children: React.ReactNode }) {
    const [mode, setMode] = useState<Mode>(() => {
        const saved = localStorage.getItem('hyokai-mode');
        return (saved === 'prompting' ? 'prompting' : 'coding');
    });

    const [isBeginnerMode, setIsBeginnerMode] = useState<boolean>(() => {
        const saved = localStorage.getItem(BEGINNER_MODE_KEY);
        return saved === 'true';
    });

    useEffect(() => {
        localStorage.setItem('hyokai-mode', mode);
    }, [mode]);

    useEffect(() => {
        localStorage.setItem(BEGINNER_MODE_KEY, isBeginnerMode.toString());
    }, [isBeginnerMode]);

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
