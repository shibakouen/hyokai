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
  // Track if user was ever authenticated in this session (to distinguish logout from initial load)
  wasEverAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  // Custom instructions keys
  'hyokai-custom-instructions',
  'hyokai-instructions-enabled',
  'hyokai-saved-instructions',
  'hyokai-selected-instructions',
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
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

  // Refresh profile
  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const profile = await fetchProfile(user.id);
    setUserProfile(profile);
  }, [user, fetchProfile]);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;
    let loadingComplete = false;

    // Guaranteed fallback - ensure loading completes within 45 seconds no matter what
    const fallbackTimeout = setTimeout(() => {
      if (mounted && !loadingComplete) {
        console.warn('[Auth] Fallback timeout triggered - forcing loading complete');
        setIsLoading(false);
        loadingComplete = true;
      }
    }, 45000);

    const initAuth = async () => {
      console.log('[Auth] initAuth started');
      const startTime = Date.now();

      try {
        // Check if any Supabase auth tokens exist in localStorage
        const hasStoredSession = Object.keys(localStorage).some(
          key => key.startsWith('sb-') && key.includes('-auth-')
        );

        console.log('[Auth] hasStoredSession:', hasStoredSession);

        if (!hasStoredSession) {
          console.log('[Auth] No stored session - showing guest state immediately');
          setIsLoading(false);
          loadingComplete = true;
          return;
        }

        // Start session fetch - DON'T wait for it with a timeout race
        // The onAuthStateChange listener will handle state updates
        console.log('[Auth] Calling getSession()...');

        try {
          const { data: { session: initialSession }, error } = await supabase.auth.getSession();
          const elapsed = Date.now() - startTime;
          console.log(`[Auth] getSession() completed in ${elapsed}ms`);

          if (error) {
            console.error('[Auth] getSession error:', error);
          } else if (initialSession?.user) {
            console.log('[Auth] Session found for user:', initialSession.user.id);
            wasEverAuthenticatedRef.current = true;
            setSession(initialSession);
            setUser(initialSession.user);

            // Profile fetch in background (non-blocking to prevent deadlock)
            fetchProfile(initialSession.user.id)
              .then(profile => {
                if (mounted) {
                  setUserProfile(profile);
                }
              })
              .catch(profileError => {
                console.error('[Auth] Error fetching profile:', profileError);
              });
          } else {
            console.log('[Auth] No session found');
          }
        } catch (sessionError) {
          console.error('[Auth] getSession() threw:', sessionError);
        }

        if (mounted && !loadingComplete) {
          console.log('[Auth] Setting loading complete');
          setIsLoading(false);
          loadingComplete = true;
        }
      } catch (error) {
        console.error('[Auth] Error in initAuth:', error);
        if (mounted && !loadingComplete) {
          setIsLoading(false);
          loadingComplete = true;
        }
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log(`[Auth] onAuthStateChange: event=${event}, hasSession=${!!newSession?.user}`);
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

        // CRITICAL: Set loading complete IMMEDIATELY - don't wait for profile fetch
        // This prevents deadlock where profile fetch waits for auth which waits for profile
        console.log('[Auth] Session established, setting loading complete');
        setIsLoading(false);
        loadingComplete = true;

        // Fetch profile in background (non-blocking)
        fetchProfile(newSession.user.id)
          .then(profile => {
            if (mounted) {
              setUserProfile(profile);
            }
          })
          .catch(profileError => {
            console.error('[Auth] Error fetching profile:', profileError);
          });
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
  }, [fetchProfile]);

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
