import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { withRetry } from '@/lib/dbRetry';
import { safeSetItem, safeGetJSON } from '@/lib/storage';

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
    const { isAuthenticated, user } = useAuth();

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

    // Track which user we've loaded from database (null = not loaded, string = loaded for that user)
    const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);

    // Refs to track current state (for cleanup functions that need latest values)
    const stateRef = useRef({
        userContext,
        activeContextId,
        savedContexts,
        loadedForUserId,
        isAuthenticated,
        userId: user?.id ?? null,
    });

    // Keep refs in sync with state, and save on logout BEFORE updating ref
    useEffect(() => {
        const prev = stateRef.current;
        const nowAuth = isAuthenticated;
        const nowUserId = user?.id ?? null;

        // Detect logout: was authenticated, now not authenticated
        // Save BEFORE updating the ref so we have access to old state
        if (prev.isAuthenticated && !nowAuth && prev.userId && prev.loadedForUserId === prev.userId) {
            // Validate context_id exists to avoid foreign key issues
            let contextIdToSave: string | null = null;
            if (prev.activeContextId) {
                const contextExists = prev.savedContexts.some(c => c.id === prev.activeContextId);
                contextIdToSave = contextExists ? prev.activeContextId : null;
            }

            // Save using the PREVIOUS state before updating
            supabase
                .from('user_active_context')
                .upsert({
                    user_id: prev.userId,
                    context_id: contextIdToSave,
                    current_content: prev.userContext,
                })
                .then(({ error }) => {
                    if (error) {
                        console.error('Failed to save context on logout:', error);
                    }
                });
        }

        // Now update the ref with new state
        stateRef.current = {
            userContext,
            activeContextId,
            savedContexts,
            loadedForUserId,
            isAuthenticated,
            userId: nowUserId,
        };
    }, [userContext, activeContextId, savedContexts, loadedForUserId, isAuthenticated, user?.id]);

    // Load from database when authenticated - uses user.id to detect user changes
    useEffect(() => {
        // Skip if not authenticated or no user
        if (!isAuthenticated || !user) return;

        // Skip if already loaded for this user
        if (loadedForUserId === user.id) return;

        const loadFromDatabase = async () => {
            // Add timeout to prevent infinite loading - 10 seconds max
            const DB_TIMEOUT_MS = 10000;
            let completed = false;
            const timeoutId = setTimeout(() => {
                if (!completed) {
                    console.warn('UserContext database load timed out - keeping localStorage data as fallback');
                    // DON'T set loadedForUserId here - allow retry on next effect trigger
                    // Keep existing localStorage state as fallback (don't set empty)
                }
            }, DB_TIMEOUT_MS);

            try {
                // Load saved contexts with retry
                const contextsResult = await withRetry(
                    async () => {
                        const { data, error } = await supabase
                            .from('saved_contexts')
                            .select('*')
                            .eq('user_id', user.id)
                            .order('updated_at', { ascending: false });
                        if (error) throw error;
                        return data;
                    },
                    { maxRetries: 2 }
                ).catch(e => {
                    console.error('Error loading saved contexts after retries:', e);
                    return null;
                });

                if (contextsResult && contextsResult.length > 0) {
                    const loadedContexts: SavedContext[] = contextsResult.map(ctx => ({
                        id: ctx.id,
                        name: ctx.name,
                        content: ctx.content,
                        createdAt: new Date(ctx.created_at).getTime(),
                        updatedAt: new Date(ctx.updated_at).getTime(),
                    }));
                    setSavedContexts(loadedContexts);
                    // Update localStorage as cache
                    safeSetItem(SAVED_CONTEXTS_KEY, JSON.stringify(loadedContexts));
                }
                // If database returns empty or error, keep localStorage data (might be pre-migration or fallback)

                // Load active context state with retry
                const activeResult = await withRetry(
                    async () => {
                        const { data, error } = await supabase
                            .from('user_active_context')
                            .select('*')
                            .eq('user_id', user.id)
                            .maybeSingle();
                        if (error) throw error;
                        return data;
                    },
                    { maxRetries: 2 }
                ).catch(e => {
                    console.error('Error loading active context after retries:', e);
                    return null;
                });

                if (activeResult) {
                    setActiveContextId(activeResult.context_id ?? null);
                    setUserContextState(activeResult.current_content ?? '');
                    // Update localStorage as cache
                    if (activeResult.context_id) {
                        safeSetItem(ACTIVE_CONTEXT_KEY, activeResult.context_id);
                    }
                    safeSetItem(STORAGE_KEY, activeResult.current_content ?? '');
                }
                // If no activeResult, keep localStorage values as fallback

                completed = true;
                clearTimeout(timeoutId);
                setLoadedForUserId(user.id);
            } catch (e) {
                console.error('Failed to load contexts from database:', e);
                completed = true;
                clearTimeout(timeoutId);
                // Don't set loadedForUserId - allow retry on next render
                // Keep localStorage data as fallback
            }
        };

        loadFromDatabase();
    }, [isAuthenticated, user, loadedForUserId]);

    // Reset when user changes or logs out
    useEffect(() => {
        if (!isAuthenticated || !user) {
            setLoadedForUserId(null);
        }
    }, [isAuthenticated, user]);

    // Persist saved contexts to localStorage
    useEffect(() => {
        localStorage.setItem(SAVED_CONTEXTS_KEY, JSON.stringify(savedContexts));
    }, [savedContexts]);

    // Persist active context ID to localStorage
    useEffect(() => {
        if (activeContextId) {
            localStorage.setItem(ACTIVE_CONTEXT_KEY, activeContextId);
        } else {
            localStorage.removeItem(ACTIVE_CONTEXT_KEY);
        }
    }, [activeContextId]);

    // Persist current context to localStorage (legacy support + unsaved edits)
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, userContext);
    }, [userContext]);

    // Sync active context to database when it changes (for authenticated users)
    useEffect(() => {
        // Only sync after we've loaded for this user (prevents overwriting DB with empty state)
        if (!isAuthenticated || !user || loadedForUserId !== user.id) return;

        const syncActiveContext = async () => {
            // Validate context_id exists in savedContexts to avoid foreign key issues
            // If activeContextId doesn't exist in our saved contexts, use null
            let contextIdToSave: string | null = null;
            if (activeContextId) {
                const contextExists = savedContexts.some(c => c.id === activeContextId);
                contextIdToSave = contextExists ? activeContextId : null;
            }

            try {
                await withRetry(
                    async () => {
                        const { error } = await supabase
                            .from('user_active_context')
                            .upsert({
                                user_id: user.id,
                                context_id: contextIdToSave,
                                current_content: userContext,
                            });
                        if (error) throw error;
                    },
                    { maxRetries: 2 }
                );
            } catch (e) {
                console.error('Failed to sync active context to database after retries:', e);
                // Data is still in localStorage as fallback
            }
        };

        // Debounce to avoid too many writes - but also sync immediately on unmount
        const timeout = setTimeout(syncActiveContext, 500);

        return () => {
            clearTimeout(timeout);
            // Sync immediately on cleanup if user is still authenticated
            // This ensures data is saved when navigating away or logging out
            if (isAuthenticated && user && loadedForUserId === user.id) {
                // Fire and forget - don't block cleanup
                syncActiveContext().catch(console.error);
            }
        };
    }, [isAuthenticated, user, loadedForUserId, activeContextId, userContext, savedContexts]);

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
                // If authenticated, delete oldest from database too
                if (isAuthenticated && user && updated[0]) {
                    supabase
                        .from('saved_contexts')
                        .delete()
                        .eq('user_id', user.id)
                        .eq('id', updated[0].id)
                        .then(({ error }) => {
                            if (error) console.error('Failed to delete oldest context:', error);
                        });
                }
                updated.shift();
            }
            return updated;
        });

        setActiveContextId(newContext.id);

        // Save to database if authenticated
        if (isAuthenticated && user) {
            supabase
                .from('saved_contexts')
                .insert({
                    id: newContext.id,
                    user_id: user.id,
                    name: newContext.name,
                    content: newContext.content,
                })
                .then(({ error }) => {
                    if (error) console.error('Failed to save context to database:', error);
                });
        }

        return newContext;
    }, [savedContexts.length, isAuthenticated, user]);

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

        // Update in database if authenticated
        if (isAuthenticated && user) {
            const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
            if (updates.name !== undefined) dbUpdates.name = updates.name;
            if (updates.content !== undefined) dbUpdates.content = updates.content;

            supabase
                .from('saved_contexts')
                .update(dbUpdates)
                .eq('user_id', user.id)
                .eq('id', id)
                .then(({ error }) => {
                    if (error) console.error('Failed to update context in database:', error);
                });
        }
    }, [activeContextId, isAuthenticated, user]);

    // Delete a context
    const deleteContext = useCallback((id: string) => {
        setSavedContexts(prev => prev.filter(ctx => ctx.id !== id));

        // If deleting active context, clear it
        if (id === activeContextId) {
            setActiveContextId(null);
            setUserContextState('');
        }

        // Delete from database if authenticated
        if (isAuthenticated && user) {
            supabase
                .from('saved_contexts')
                .delete()
                .eq('user_id', user.id)
                .eq('id', id)
                .then(({ error }) => {
                    if (error) console.error('Failed to delete context from database:', error);
                });
        }
    }, [activeContextId, isAuthenticated, user]);

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
