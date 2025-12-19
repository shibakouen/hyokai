/**
 * Hook for managing custom instructions
 * - CRUD operations for saved instructions
 * - localStorage fallback for anonymous users
 * - Database sync for authenticated users
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { withRetry, AuthError } from '@/lib/dbRetry';
import { toast } from 'sonner';

// Storage keys
const INSTRUCTIONS_KEY = 'hyokai-custom-instructions';
const INSTRUCTIONS_ENABLED_KEY = 'hyokai-instructions-enabled';
const SAVED_INSTRUCTIONS_KEY = 'hyokai-saved-instructions';
const SELECTED_INSTRUCTIONS_KEY = 'hyokai-selected-instructions';

export interface SavedInstruction {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UseInstructionsReturn {
  // Toggle state
  isEnabled: boolean;
  setIsEnabled: (enabled: boolean) => void;

  // Ad-hoc instructions (textarea)
  customInstructions: string;
  setCustomInstructions: (text: string) => void;

  // Saved instructions library
  savedInstructions: SavedInstruction[];
  isLoading: boolean;
  createInstruction: (name: string, content: string, isDefault?: boolean) => Promise<SavedInstruction | null>;
  updateInstruction: (id: string, updates: Partial<Pick<SavedInstruction, 'name' | 'content' | 'isDefault'>>) => Promise<boolean>;
  deleteInstruction: (id: string) => Promise<boolean>;
  refreshInstructions: () => Promise<void>;

  // Selection state
  selectedInstructionIds: string[];
  toggleInstructionSelection: (id: string) => void;
  setSelectedInstructionIds: (ids: string[]) => void;

  // Combined output helper
  getAppendText: () => string;
  getAppliedInstructions: () => { id: string; name: string; content: string }[];
}

// Generate unique ID for localStorage instructions
function generateId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function useInstructions(): UseInstructionsReturn {
  const { isAuthenticated, user } = useAuth();

  // Toggle state - persisted to localStorage
  const [isEnabled, setIsEnabledState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(INSTRUCTIONS_ENABLED_KEY) === 'true';
    }
    return false;
  });

  // Ad-hoc instructions - persisted to localStorage
  const [customInstructions, setCustomInstructionsState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(INSTRUCTIONS_KEY) || '';
    }
    return '';
  });

  // Saved instructions library
  const [savedInstructions, setSavedInstructions] = useState<SavedInstruction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Selected instructions for appending
  const [selectedInstructionIds, setSelectedInstructionIdsState] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(SELECTED_INSTRUCTIONS_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  // Track if we've loaded from database
  const hasLoadedRef = useRef(false);

  // Persist toggle state
  const setIsEnabled = useCallback((enabled: boolean) => {
    setIsEnabledState(enabled);
    localStorage.setItem(INSTRUCTIONS_ENABLED_KEY, enabled ? 'true' : 'false');
  }, []);

  // Persist custom instructions
  const setCustomInstructions = useCallback((text: string) => {
    setCustomInstructionsState(text);
    localStorage.setItem(INSTRUCTIONS_KEY, text);
  }, []);

  // Persist selected instruction IDs
  const setSelectedInstructionIds = useCallback((ids: string[]) => {
    setSelectedInstructionIdsState(ids);
    localStorage.setItem(SELECTED_INSTRUCTIONS_KEY, JSON.stringify(ids));
  }, []);

  // Toggle selection
  const toggleInstructionSelection = useCallback((id: string) => {
    setSelectedInstructionIds(
      selectedInstructionIds.includes(id)
        ? selectedInstructionIds.filter(i => i !== id)
        : [...selectedInstructionIds, id]
    );
  }, [selectedInstructionIds, setSelectedInstructionIds]);

  // Load saved instructions from localStorage
  const loadFromLocalStorage = useCallback((): SavedInstruction[] => {
    try {
      const stored = localStorage.getItem(SAVED_INSTRUCTIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  // Save instructions to localStorage
  const saveToLocalStorage = useCallback((instructions: SavedInstruction[]) => {
    localStorage.setItem(SAVED_INSTRUCTIONS_KEY, JSON.stringify(instructions));
  }, []);

  // Load saved instructions from database
  const loadFromDatabase = useCallback(async (): Promise<SavedInstruction[]> => {
    if (!user) return [];

    try {
      const data = await withRetry(
        async () => {
          const { data, error } = await supabase
            .from('user_instructions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (error) {
            throw new Error(error.message);
          }
          return data;
        },
        { maxRetries: 2 }
      );

      return (data || []).map(row => ({
        id: row.id,
        name: row.name,
        content: row.content,
        isDefault: row.is_default,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (e) {
      console.error('Error loading instructions:', e);
      // Don't show toast on load failure - just return empty
      return [];
    }
  }, [user]);

  // Refresh instructions from storage
  const refreshInstructions = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isAuthenticated && user) {
        const dbInstructions = await loadFromDatabase();
        const localInstructions = loadFromLocalStorage();

        // Merge: DB instructions take priority, but include local-only instructions
        // This handles the case where DB save failed and we fell back to localStorage
        const dbIds = new Set(dbInstructions.map(i => i.id));
        const localOnlyInstructions = localInstructions.filter(i => !dbIds.has(i.id));
        const mergedInstructions = [...dbInstructions, ...localOnlyInstructions];

        setSavedInstructions(mergedInstructions);

        // Auto-select default instructions if nothing selected yet
        if (selectedInstructionIds.length === 0) {
          const defaultIds = mergedInstructions
            .filter(i => i.isDefault)
            .map(i => i.id);
          if (defaultIds.length > 0) {
            setSelectedInstructionIds(defaultIds);
          }
        }
      } else {
        const localInstructions = loadFromLocalStorage();
        setSavedInstructions(localInstructions);

        // Auto-select defaults
        if (selectedInstructionIds.length === 0) {
          const defaultIds = localInstructions
            .filter(i => i.isDefault)
            .map(i => i.id);
          if (defaultIds.length > 0) {
            setSelectedInstructionIds(defaultIds);
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, loadFromDatabase, loadFromLocalStorage, selectedInstructionIds.length, setSelectedInstructionIds]);

  // Create new instruction
  const createInstruction = useCallback(async (
    name: string,
    content: string,
    isDefault = false
  ): Promise<SavedInstruction | null> => {
    const now = new Date().toISOString();

    if (isAuthenticated && user) {
      try {
        // Quick session check with 3s timeout to fail fast if auth is broken
        const sessionCheck = await Promise.race([
          supabase.auth.getSession(),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('Session check timed out')), 3000)
          ),
        ]);

        if (!sessionCheck || !('data' in sessionCheck) || !sessionCheck.data.session) {
          throw new Error('No valid session');
        }

        const data = await withRetry(
          async () => {
            const { data, error } = await supabase
              .from('user_instructions')
              .insert({
                user_id: user.id,
                name,
                content,
                is_default: isDefault,
              })
              .select()
              .single();

            if (error) {
              throw new Error(error.message);
            }
            return data;
          },
          { maxRetries: 1, timeoutMs: 5000 }
        );

        const newInstruction: SavedInstruction = {
          id: data.id,
          name: data.name,
          content: data.content,
          isDefault: data.is_default,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };

        setSavedInstructions(prev => [newInstruction, ...prev]);
        return newInstruction;
      } catch (e) {
        console.error('Error creating instruction:', e);
        // Fall back to localStorage on DB failure
        console.log('[Instructions] Falling back to localStorage');
        const fallbackInstruction: SavedInstruction = {
          id: generateId(),
          name,
          content,
          isDefault,
          createdAt: now,
          updatedAt: now,
        };
        const updated = [fallbackInstruction, ...savedInstructions];
        if (isDefault) {
          updated.forEach(i => {
            if (i.id !== fallbackInstruction.id) i.isDefault = false;
          });
        }
        setSavedInstructions(updated);
        saveToLocalStorage(updated);
        toast.info('Saved locally. Will sync when connection is restored.');
        return fallbackInstruction;
      }
    }

    // localStorage for anonymous users
    const newInstruction: SavedInstruction = {
      id: generateId(),
      name,
      content,
      isDefault,
      createdAt: now,
      updatedAt: now,
    };

    const updated = [newInstruction, ...savedInstructions];

    // If this is default, clear other defaults
    if (isDefault) {
      updated.forEach(i => {
        if (i.id !== newInstruction.id) i.isDefault = false;
      });
    }

    setSavedInstructions(updated);
    saveToLocalStorage(updated);
    return newInstruction;
  }, [isAuthenticated, user, savedInstructions, saveToLocalStorage]);

  // Update instruction
  const updateInstruction = useCallback(async (
    id: string,
    updates: Partial<Pick<SavedInstruction, 'name' | 'content' | 'isDefault'>>
  ): Promise<boolean> => {
    if (isAuthenticated && user) {
      try {
        const dbUpdates: Record<string, unknown> = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.content !== undefined) dbUpdates.content = updates.content;
        if (updates.isDefault !== undefined) dbUpdates.is_default = updates.isDefault;

        await withRetry(
          async () => {
            const { error } = await supabase
              .from('user_instructions')
              .update(dbUpdates)
              .eq('id', id)
              .eq('user_id', user.id);

            if (error) {
              throw new Error(error.message);
            }
          },
          { maxRetries: 2 }
        );

        setSavedInstructions(prev =>
          prev.map(i => i.id === id ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i)
        );
        return true;
      } catch (e) {
        console.error('Error updating instruction:', e);
        if (e instanceof AuthError) {
          toast.error('Session expired. Please sign in again.');
        } else {
          toast.error('Failed to update instruction. Please try again.');
        }
        return false;
      }
    } else {
      // localStorage
      const updated = savedInstructions.map(i => {
        if (i.id === id) {
          return { ...i, ...updates, updatedAt: new Date().toISOString() };
        }
        // If setting this as default, clear other defaults
        if (updates.isDefault === true && i.id !== id) {
          return { ...i, isDefault: false };
        }
        return i;
      });

      setSavedInstructions(updated);
      saveToLocalStorage(updated);
      return true;
    }
  }, [isAuthenticated, user, savedInstructions, saveToLocalStorage]);

  // Delete instruction
  const deleteInstruction = useCallback(async (id: string): Promise<boolean> => {
    if (isAuthenticated && user) {
      try {
        await withRetry(
          async () => {
            const { error } = await supabase
              .from('user_instructions')
              .delete()
              .eq('id', id)
              .eq('user_id', user.id);

            if (error) {
              throw new Error(error.message);
            }
          },
          { maxRetries: 2 }
        );

        setSavedInstructions(prev => prev.filter(i => i.id !== id));
        // Remove from selection
        setSelectedInstructionIds(selectedInstructionIds.filter(i => i !== id));
        return true;
      } catch (e) {
        console.error('Error deleting instruction:', e);
        if (e instanceof AuthError) {
          toast.error('Session expired. Please sign in again.');
        } else {
          toast.error('Failed to delete instruction. Please try again.');
        }
        return false;
      }
    } else {
      // localStorage
      const updated = savedInstructions.filter(i => i.id !== id);
      setSavedInstructions(updated);
      saveToLocalStorage(updated);
      // Remove from selection
      setSelectedInstructionIds(selectedInstructionIds.filter(i => i !== id));
      return true;
    }
  }, [isAuthenticated, user, savedInstructions, saveToLocalStorage, selectedInstructionIds, setSelectedInstructionIds]);

  // Get combined text to append
  const getAppendText = useCallback((): string => {
    if (!isEnabled) return '';

    const parts: string[] = [];

    // Add selected saved instructions
    const selectedInstructions = savedInstructions.filter(i =>
      selectedInstructionIds.includes(i.id)
    );
    for (const instruction of selectedInstructions) {
      parts.push(instruction.content);
    }

    // Add ad-hoc instructions
    if (customInstructions.trim()) {
      parts.push(customInstructions.trim());
    }

    if (parts.length === 0) return '';

    return '\n\n--- Custom Instructions ---\n\n' + parts.join('\n\n---\n\n');
  }, [isEnabled, savedInstructions, selectedInstructionIds, customInstructions]);

  // Get applied instructions for history
  const getAppliedInstructions = useCallback((): { id: string; name: string; content: string }[] => {
    if (!isEnabled) return [];

    const applied: { id: string; name: string; content: string }[] = [];

    // Add selected saved instructions
    const selectedInstructions = savedInstructions.filter(i =>
      selectedInstructionIds.includes(i.id)
    );
    for (const instruction of selectedInstructions) {
      applied.push({
        id: instruction.id,
        name: instruction.name,
        content: instruction.content,
      });
    }

    // Add ad-hoc instructions as a special entry
    if (customInstructions.trim()) {
      applied.push({
        id: 'adhoc',
        name: 'Ad-hoc Instructions',
        content: customInstructions.trim(),
      });
    }

    return applied;
  }, [isEnabled, savedInstructions, selectedInstructionIds, customInstructions]);

  // Load on mount and auth change
  useEffect(() => {
    if (!hasLoadedRef.current || (isAuthenticated && user)) {
      hasLoadedRef.current = true;
      refreshInstructions();
    }
  }, [isAuthenticated, user, refreshInstructions]);

  // Reset loaded flag on logout
  useEffect(() => {
    if (!isAuthenticated) {
      hasLoadedRef.current = false;
    }
  }, [isAuthenticated]);

  return {
    isEnabled,
    setIsEnabled,
    customInstructions,
    setCustomInstructions,
    savedInstructions,
    isLoading,
    createInstruction,
    updateInstruction,
    deleteInstruction,
    refreshInstructions,
    selectedInstructionIds,
    toggleInstructionSelection,
    setSelectedInstructionIds,
    getAppendText,
    getAppliedInstructions,
  };
}
