import React, { createContext, useContext, useState, useEffect } from 'react';

interface UserContextType {
    userContext: string;
    setUserContext: (context: string) => void;
}

const UserContextContext = createContext<UserContextType | undefined>(undefined);

const STORAGE_KEY = 'hyokai-user-context';
const MAX_LENGTH = 2000;

export function UserContextProvider({ children }: { children: React.ReactNode }) {
    const [userContext, setUserContextState] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem(STORAGE_KEY) || '';
        }
        return '';
    });

    const setUserContext = (context: string) => {
        // Enforce max length
        const trimmed = context.slice(0, MAX_LENGTH);
        setUserContextState(trimmed);
    };

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, userContext);
    }, [userContext]);

    return (
        <UserContextContext.Provider value={{ userContext, setUserContext }}>
            {children}
        </UserContextContext.Provider>
    );
}

export function useUserContext() {
    const context = useContext(UserContextContext);
    if (context === undefined) {
        throw new Error('useUserContext must be used within a UserContextProvider');
    }
    return context;
}

export const USER_CONTEXT_MAX_LENGTH = MAX_LENGTH;
