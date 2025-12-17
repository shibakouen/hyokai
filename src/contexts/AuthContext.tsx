import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom event for first login (triggers migration)
export const AUTH_FIRST_LOGIN_EVENT = 'hyokai-auth-first-login';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [needsMigration, setNeedsMigration] = useState(false);

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

    // Guaranteed fallback - ensure loading completes within 20 seconds no matter what
    const fallbackTimeout = setTimeout(() => {
      if (mounted && !loadingComplete) {
        console.warn('Auth fallback timeout triggered - forcing loading complete');
        setIsLoading(false);
        loadingComplete = true;
      }
    }, 20000);

    const initAuth = async () => {
      try {
        // Add timeout to prevent infinite loading - max 15 seconds (generous for slow networks)
        const AUTH_TIMEOUT_MS = 15000;

        const getSessionWithTimeout = async () => {
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Auth initialization timed out')), AUTH_TIMEOUT_MS);
          });

          const sessionPromise = supabase.auth.getSession();
          return Promise.race([sessionPromise, timeoutPromise]);
        };

        const { data: { session: initialSession } } = await getSessionWithTimeout();

        if (mounted && !loadingComplete) {
          // Only update session state if we have a valid session
          // If null, don't clear state - onAuthStateChange will handle it
          // This prevents race conditions where getSession returns null temporarily
          if (initialSession?.user) {
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
              // Continue without profile - don't block loading
            }
          }
          // Note: If initialSession is null, we still complete loading
          // The onAuthStateChange listener may provide the session later
          // or INITIAL_SESSION event will confirm no session exists

          setIsLoading(false);
          loadingComplete = true;
        }
      } catch (error) {
        console.error('Error initializing auth:', error);

        // On timeout, DON'T clear the session - it may still be valid
        // The onAuthStateChange listener will pick up the real state
        // A timeout just means the network was slow, not that the session is corrupted
        if (error instanceof Error && error.message.includes('timed out')) {
          console.warn('Auth initialization timed out - session may still be valid, letting onAuthStateChange handle it');
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

  // Sign out
  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }, []);

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
