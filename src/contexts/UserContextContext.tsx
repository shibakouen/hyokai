import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Types for multi-context support
export interface SavedContext {
    id: string;
    name: string;
    content: string;
    createdAt: number;
    updatedAt: number;
}

interface UserContextType {
    // Current active context
    userContext: string;
    setUserContext: (context: string) => void;

    // Multi-context management
    savedContexts: SavedContext[];
    activeContextId: string | null;
    saveContext: (name: string, content: string) => SavedContext;
    updateContext: (id: string, updates: Partial<Pick<SavedContext, 'name' | 'content'>>) => void;
    deleteContext: (id: string) => void;
    switchContext: (id: string | null) => void;

    // Utility
    getContextSize: (content: string) => { chars: number; tokens: number; warning: string | null };
}

const UserContextContext = createContext<UserContextType | undefined>(undefined);

const STORAGE_KEY = 'hyokai-user-context';
const SAVED_CONTEXTS_KEY = 'hyokai-saved-contexts';
const ACTIVE_CONTEXT_KEY = 'hyokai-active-context-id';
const MAX_SAVED_CONTEXTS = 10;

// Rough token estimation (1 token ≈ 4 chars for English)
const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

// Token limits for context (leaving room for system prompt and user prompt)
const SOFT_TOKEN_LIMIT = 8000;  // Warning threshold
const HARD_TOKEN_LIMIT = 16000; // Error threshold

const generateId = () => `ctx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export function UserContextProvider({ children }: { children: React.ReactNode }) {
    // Load saved contexts from localStorage
    const [savedContexts, setSavedContexts] = useState<SavedContext[]>(() => {
        if (typeof window !== 'undefined') {
            try {
                const stored = localStorage.getItem(SAVED_CONTEXTS_KEY);
                return stored ? JSON.parse(stored) : [];
            } catch {
                return [];
            }
        }
        return [];
    });

    // Load active context ID
    const [activeContextId, setActiveContextId] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem(ACTIVE_CONTEXT_KEY) || null;
        }
        return null;
    });

    // Current working context (can be unsaved/edited)
    const [userContext, setUserContextState] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            // If there's an active context, load it
            const activeId = localStorage.getItem(ACTIVE_CONTEXT_KEY);
            if (activeId) {
                try {
                    const contexts = JSON.parse(localStorage.getItem(SAVED_CONTEXTS_KEY) || '[]');
                    const active = contexts.find((c: SavedContext) => c.id === activeId);
                    if (active) return active.content;
                } catch {
                    // Fall through to legacy storage
                }
            }
            // Fallback to legacy single context
            return localStorage.getItem(STORAGE_KEY) || '';
        }
        return '';
    });

    // Persist saved contexts
    useEffect(() => {
        localStorage.setItem(SAVED_CONTEXTS_KEY, JSON.stringify(savedContexts));
    }, [savedContexts]);

    // Persist active context ID
    useEffect(() => {
        if (activeContextId) {
            localStorage.setItem(ACTIVE_CONTEXT_KEY, activeContextId);
        } else {
            localStorage.removeItem(ACTIVE_CONTEXT_KEY);
        }
    }, [activeContextId]);

    // Persist current context (legacy support + unsaved edits)
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, userContext);
    }, [userContext]);

    // Set context without any character limit
    const setUserContext = useCallback((context: string) => {
        setUserContextState(context);
    }, []);

    // Save a new context
    const saveContext = useCallback((name: string, content: string): SavedContext => {
        const newContext: SavedContext = {
            id: generateId(),
            name: name.trim() || `Context ${savedContexts.length + 1}`,
            content,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        setSavedContexts(prev => {
            // Enforce max saved contexts (remove oldest if needed)
            const updated = [...prev, newContext];
            if (updated.length > MAX_SAVED_CONTEXTS) {
                updated.shift();
            }
            return updated;
        });

        setActiveContextId(newContext.id);
        return newContext;
    }, [savedContexts.length]);

    // Update an existing context
    const updateContext = useCallback((id: string, updates: Partial<Pick<SavedContext, 'name' | 'content'>>) => {
        setSavedContexts(prev => prev.map(ctx =>
            ctx.id === id
                ? { ...ctx, ...updates, updatedAt: Date.now() }
                : ctx
        ));

        // If updating the active context's content, also update userContext
        if (updates.content !== undefined && id === activeContextId) {
            setUserContextState(updates.content);
        }
    }, [activeContextId]);

    // Delete a context
    const deleteContext = useCallback((id: string) => {
        setSavedContexts(prev => prev.filter(ctx => ctx.id !== id));

        // If deleting active context, clear it
        if (id === activeContextId) {
            setActiveContextId(null);
            setUserContextState('');
        }
    }, [activeContextId]);

    // Switch to a saved context
    const switchContext = useCallback((id: string | null) => {
        setActiveContextId(id);

        if (id === null) {
            setUserContextState('');
        } else {
            const context = savedContexts.find(c => c.id === id);
            if (context) {
                setUserContextState(context.content);
            }
        }
    }, [savedContexts]);

    // Get context size info with warnings
    const getContextSize = useCallback((content: string) => {
        const chars = content.length;
        const tokens = estimateTokens(content);

        let warning: string | null = null;
        if (tokens > HARD_TOKEN_LIMIT) {
            warning = 'error';
        } else if (tokens > SOFT_TOKEN_LIMIT) {
            warning = 'warning';
        }

        return { chars, tokens, warning };
    }, []);

    return (
        <UserContextContext.Provider value={{
            userContext,
            setUserContext,
            savedContexts,
            activeContextId,
            saveContext,
            updateContext,
            deleteContext,
            switchContext,
            getContextSize,
        }}>
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

// Export constants for UI usage
export const MAX_SAVED_CONTEXTS_COUNT = MAX_SAVED_CONTEXTS;
export const CONTEXT_TOKEN_SOFT_LIMIT = SOFT_TOKEN_LIMIT;
export const CONTEXT_TOKEN_HARD_LIMIT = HARD_TOKEN_LIMIT;
