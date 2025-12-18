import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  migrated_at: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  userProfile: UserProfile | null;
  signUp: (email: string, password: string) => Promise<{ error: Error | null; needsConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resendConfirmation: (email: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  needsMigration: boolean;
  // Track if user was ever authenticated in this session (to distinguish logout from initial load)
  wasEverAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom event for first login (triggers migration)
export const AUTH_FIRST_LOGIN_EVENT = 'hyokai-auth-first-login';

// Keys to clear on logout (all account-level data)
const USER_DATA_KEYS = [
  'hyokai-user-context',
  'hyokai-saved-contexts',
  'hyokai-active-context-id',
  'hyokai-history',
  'hyokai-simple-history',
  'hyokai-github-pat',
  'hyokai-github-repos',
  'hyokai-github-settings',
  'hyokai-mode',
  'hyokai-language',
  'hyokai-beginner-mode',
  'hyokai-selected-model-index',
  'hyokai-compare-model-indices',
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [needsMigration, setNeedsMigration] = useState(false);
  // Track if user was ever authenticated (to distinguish logout from initial load)
  // Using ref instead of state for synchronous updates - prevents race conditions
  const wasEverAuthenticatedRef = useRef(false);

  // Fetch user profile from database
  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      // Use maybeSingle() to avoid PGRST116 errors when no profile exists yet
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data as UserProfile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  }, []);

  // Check if user needs migration (has localStorage data and hasn't migrated)
  const checkMigrationNeeded = useCallback((profile: UserProfile | null): boolean => {
    if (!profile) return false;
    if (profile.migrated_at) return false;

    // Check if there's any localStorage data to migrate
    const keysToCheck = [
      'hyokai-user-context',
      'hyokai-saved-contexts',
      'hyokai-github-pat',
      'hyokai-github-repos',
      'hyokai-history',
      'hyokai-simple-history',
    ];

    return keysToCheck.some(key => localStorage.getItem(key));
  }, []);

  // Refresh profile
  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const profile = await fetchProfile(user.id);
    setUserProfile(profile);
    setNeedsMigration(checkMigrationNeeded(profile));
  }, [user, fetchProfile, checkMigrationNeeded]);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;
    let loadingComplete = false;

    // Guaranteed fallback - ensure loading completes within 10 seconds no matter what
    const fallbackTimeout = setTimeout(() => {
      if (mounted && !loadingComplete) {
        console.warn('Auth fallback timeout triggered - forcing loading complete');
        setIsLoading(false);
        loadingComplete = true;
      }
    }, 10000);

    const initAuth = async () => {
      try {
        // Check if any Supabase auth tokens exist in localStorage
        // If not, we can skip the network check and show guest state immediately
        const hasStoredSession = Object.keys(localStorage).some(
          key => key.startsWith('sb-') && key.includes('-auth-')
        );

        if (!hasStoredSession) {
          // No stored session - immediately show guest state (no spinner)
          console.log('[Auth] No stored session found - showing guest state');
          setIsLoading(false);
          loadingComplete = true;
          return;
        }

        // Add timeout to prevent infinite loading - max 8 seconds
        const AUTH_TIMEOUT_MS = 8000;

        // Start session fetch immediately
        const sessionPromise = supabase.auth.getSession();

        // Handle session result whenever it arrives (even after timeout)
        sessionPromise.then(async ({ data: { session: initialSession }, error }) => {
          if (error) {
            console.error('Error getting session:', error);
            return;
          }

          if (mounted) {
            // If we found a session, update state
            if (initialSession?.user) {
              console.log('Session restored:', initialSession.user.id);
              // Set ref synchronously BEFORE state updates - prevents race conditions
              wasEverAuthenticatedRef.current = true;
              setSession(initialSession);
              setUser(initialSession.user);

              // Profile fetch with its own timeout (5 seconds)
              try {
                const profilePromise = fetchProfile(initialSession.user.id);
                const profileTimeoutPromise = new Promise<null>((resolve) => {
                  setTimeout(() => resolve(null), 5000);
                });
                const profile = await Promise.race([profilePromise, profileTimeoutPromise]);
                if (mounted) {
                  setUserProfile(profile);
                  setNeedsMigration(checkMigrationNeeded(profile));
                }
              } catch (profileError) {
                console.error('Error fetching profile:', profileError);
              }
            }
            
            // Ensure loading is complete
            if (!loadingComplete) {
              setIsLoading(false);
              loadingComplete = true;
            }
          }
        }).catch(err => {
          console.error('Session promise error:', err);
        });

        // Wait for session OR timeout to unblock UI
        const timeoutPromise = new Promise<void>((_, reject) => {
          setTimeout(() => reject(new Error('Auth initialization timed out')), AUTH_TIMEOUT_MS);
        });

        // We only wait for the RACE. If session wins, great. If timeout wins, we catch it.
        // The sessionPromise.then() above handles the data setting in both cases.
        await Promise.race([sessionPromise, timeoutPromise]);

      } catch (error) {
        console.error('Error initializing auth:', error);

        // On timeout, we let the UI render (likely as Guest initially).
        // If the sessionPromise resolves later, it will upgrade the user.
        if (error instanceof Error && error.message.includes('timed out')) {
          console.warn('Auth initialization timed out - allowing app to render while session checks continue');
        }

        if (mounted && !loadingComplete) {
          setIsLoading(false);
          loadingComplete = true;
        }
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      // IMPORTANT: Only clear session on explicit SIGNED_OUT event
      // For other events (INITIAL_SESSION, TOKEN_REFRESHED, etc.),
      // a null session might be temporary during token validation
      if (event === 'SIGNED_OUT') {
        // Clear Supabase auth tokens (backup cleanup)
        try {
          const keysToRemove = Object.keys(localStorage).filter(
            key => key.startsWith('sb-') && key.includes('-auth-')
          );
          keysToRemove.forEach(key => localStorage.removeItem(key));
        } catch (e) {
          console.error('Error clearing Supabase storage in SIGNED_OUT handler:', e);
        }

        // Clear user-specific localStorage data
        USER_DATA_KEYS.forEach(key => {
          try {
            localStorage.removeItem(key);
          } catch (e) {
            console.error(`Failed to remove ${key}:`, e);
          }
        });

        // Reset ref synchronously - allows next login to start fresh
        wasEverAuthenticatedRef.current = false;
        setSession(null);
        setUser(null);
        setUserProfile(null);
        setNeedsMigration(false);
        setIsLoading(false);
        loadingComplete = true;
        return;
      }

      // For all other events, only update state if we have a valid session
      // This prevents premature logout during token refresh or initial session restoration
      if (newSession?.user) {
        // Set ref synchronously BEFORE state updates - prevents race conditions
        wasEverAuthenticatedRef.current = true;
        setSession(newSession);
        setUser(newSession.user);

        try {
          const profile = await fetchProfile(newSession.user.id);
          if (mounted) {
            setUserProfile(profile);

            const migrationNeeded = checkMigrationNeeded(profile);
            setNeedsMigration(migrationNeeded);

            // Dispatch first login event if migration is needed
            if (event === 'SIGNED_IN' && migrationNeeded) {
              window.dispatchEvent(new CustomEvent(AUTH_FIRST_LOGIN_EVENT, {
                detail: { userId: newSession.user.id, profile }
              }));
            }
          }
        } catch (profileError) {
          console.error('Error fetching profile on auth change:', profileError);
        }

        if (mounted) {
          setIsLoading(false);
          loadingComplete = true;
        }
      } else if (event === 'INITIAL_SESSION') {
        // INITIAL_SESSION with null session means no stored session exists
        // This is a valid state (new user or cleared storage), so complete loading
        setIsLoading(false);
        loadingComplete = true;
      }
      // For TOKEN_REFRESHED or other events with null session,
      // don't update state - wait for the next event with valid session
    });

    return () => {
      mounted = false;
      clearTimeout(fallbackTimeout);
      subscription.unsubscribe();
    };
  }, [fetchProfile, checkMigrationNeeded]);

  // Sign up with email/password
  const signUp = useCallback(async (email: string, password: string): Promise<{ error: Error | null; needsConfirmation: boolean }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}`,
        },
      });

      if (error) {
        console.error('Error signing up:', error);
        return { error, needsConfirmation: false };
      }

      // Check if email confirmation is needed
      // If user exists but identities is empty, email confirmation is required
      const needsConfirmation = data.user?.identities?.length === 0 ||
        (data.user && !data.session);

      return { error: null, needsConfirmation };
    } catch (error) {
      console.error('Error signing up:', error);
      return { error: error as Error, needsConfirmation: false };
    }
  }, []);

  // Sign in with email/password
  const signIn = useCallback(async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Error signing in:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Error signing in:', error);
      return { error: error as Error };
    }
  }, []);

  // Resend confirmation email
  const resendConfirmation = useCallback(async (email: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}`,
        },
      });

      if (error) {
        console.error('Error resending confirmation:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Error resending confirmation:', error);
      return { error: error as Error };
    }
  }, []);

  // Clear all user-specific localStorage data
  const clearUserData = useCallback(() => {
    USER_DATA_KEYS.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.error(`Failed to remove ${key}:`, e);
      }
    });
  }, []);

  // Helper to clear Supabase auth storage manually
  const clearSupabaseStorage = useCallback(() => {
    try {
      // Clear all Supabase auth keys from localStorage
      const keysToRemove = Object.keys(localStorage).filter(
        key => key.startsWith('sb-') && key.includes('-auth-')
      );
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (e) {
      console.error('Error clearing Supabase storage:', e);
    }
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    // IMPORTANT: Call supabase.auth.signOut() FIRST with global scope
    // This stops any background token refresh and invalidates the server session
    // Using scope: 'global' ensures sign out works across all tabs/windows
    // Doing this before clearing localStorage prevents race conditions where:
    // 1. We clear localStorage
    // 2. Supabase's token refresh (or another tab) writes new tokens
    // 3. User appears logged back in on refresh
    try {
      // Add timeout to prevent hanging - 5 seconds max
      const signOutPromise = supabase.auth.signOut({ scope: 'global' });
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Sign out timed out')), 5000);
      });
      await Promise.race([signOutPromise, timeoutPromise]);
    } catch (error) {
      console.error('Error signing out from Supabase:', error);
      // Continue with local cleanup even if server call fails or times out
    }

    // Clear Supabase auth tokens (backup - signOut should have done this)
    clearSupabaseStorage();

    // Clear user-specific localStorage data
    clearUserData();

    // Reset the wasEverAuthenticated ref
    wasEverAuthenticatedRef.current = false;

    // Clear React state for UI update
    setSession(null);
    setUser(null);
    setUserProfile(null);
    setNeedsMigration(false);
    setIsLoading(false);
  }, [clearUserData, clearSupabaseStorage]);

  const isAuthenticated = !!user && !!session;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      isAuthenticated,
      userProfile,
      signUp,
      signIn,
      signOut,
      resendConfirmation,
      refreshProfile,
      needsMigration,
      wasEverAuthenticated: wasEverAuthenticatedRef.current,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
