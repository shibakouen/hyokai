import React, { createContext, useContext, useState, useEffect } from 'react';

export type Mode = 'coding' | 'prompting';

interface ModeContextType {
    mode: Mode;
    setMode: (mode: Mode) => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export function ModeProvider({ children }: { children: React.ReactNode }) {
    const [mode, setMode] = useState<Mode>(() => {
        const saved = localStorage.getItem('hyokai-mode');
        return (saved === 'prompting' ? 'prompting' : 'coding');
    });

    useEffect(() => {
        localStorage.setItem('hyokai-mode', mode);
    }, [mode]);

    return (
        <ModeContext.Provider value={{ mode, setMode }}>
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
