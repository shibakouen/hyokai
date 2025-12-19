import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

// ============================================================================
// TYPES
// ============================================================================

export interface UsageLimits {
  dailyLimit: number;
  monthlyLimit: number;
  maxPerRequest: number;
  isUnlimited: boolean;
}

export interface UsageStats {
  dailyUsed: number;
  monthlyUsed: number;
  dailyRemaining: number;
  monthlyRemaining: number;
  totalRequests: number;
}

interface UsageContextType {
  // Current limits
  limits: UsageLimits;
  // Current usage stats
  stats: UsageStats;
  // Loading state
  isLoading: boolean;
  // Refresh usage data
  refreshUsage: () => Promise<void>;
  // Update remaining from API response
  updateRemaining: (dailyRemaining: number, monthlyRemaining: number, isUnlimited: boolean) => void;
  // Check if user can make a request (estimate)
  canMakeRequest: (estimatedTokens: number) => boolean;
  // Generate session ID for anonymous tracking
  getSessionId: () => string;
}

const UsageContext = createContext<UsageContextType | undefined>(undefined);

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_LIMITS: UsageLimits = {
  dailyLimit: 100000,      // 100K tokens/day (generous for development)
  monthlyLimit: 1000000,   // 1M tokens/month
  maxPerRequest: 8000,     // 8K per request (for large prompts)
  isUnlimited: false,
};

const DEFAULT_STATS: UsageStats = {
  dailyUsed: 0,
  monthlyUsed: 0,
  dailyRemaining: 100000,
  monthlyRemaining: 1000000,
  totalRequests: 0,
};

// ============================================================================
// SESSION ID MANAGEMENT
// ============================================================================

const SESSION_ID_KEY = 'hyokai-session-id';

function generateSessionId(): string {
  // Generate a unique session ID
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `anon_${timestamp}_${randomPart}`;
}

function getOrCreateSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

// ============================================================================
// PROVIDER
// ============================================================================

export function UsageProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [limits, setLimits] = useState<UsageLimits>(DEFAULT_LIMITS);
  const [stats, setStats] = useState<UsageStats>(DEFAULT_STATS);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch usage limits for authenticated user
  const fetchLimits = useCallback(async (userId: string): Promise<UsageLimits> => {
    try {
      const { data, error } = await supabase
        .from('user_usage_limits')
        .select('daily_token_limit, monthly_token_limit, max_tokens_per_request, is_unlimited')
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data) {
        return DEFAULT_LIMITS;
      }

      return {
        dailyLimit: data.daily_token_limit || DEFAULT_LIMITS.dailyLimit,
        monthlyLimit: data.monthly_token_limit || DEFAULT_LIMITS.monthlyLimit,
        maxPerRequest: data.max_tokens_per_request || DEFAULT_LIMITS.maxPerRequest,
        isUnlimited: data.is_unlimited || false,
      };
    } catch {
      return DEFAULT_LIMITS;
    }
  }, []);

  // Fetch usage stats for authenticated user
  // Note: Takes limits as parameter to avoid dependency on limits state (prevents infinite loop)
  const fetchStats = useCallback(async (userId: string, currentLimits: UsageLimits): Promise<UsageStats> => {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Get daily usage
      const { data: dailyData } = await supabase
        .from('api_usage')
        .select('input_tokens, output_tokens')
        .eq('user_id', userId)
        .gte('created_at', todayStart);

      const dailyUsed = dailyData?.reduce((sum, row) =>
        sum + (row.input_tokens || 0) + (row.output_tokens || 0), 0) || 0;

      // Get monthly usage
      const { data: monthlyData } = await supabase
        .from('api_usage')
        .select('input_tokens, output_tokens')
        .eq('user_id', userId)
        .gte('created_at', monthStart);

      const monthlyUsed = monthlyData?.reduce((sum, row) =>
        sum + (row.input_tokens || 0) + (row.output_tokens || 0), 0) || 0;

      const totalRequests = monthlyData?.length || 0;

      return {
        dailyUsed,
        monthlyUsed,
        dailyRemaining: currentLimits.isUnlimited ? -1 : Math.max(0, currentLimits.dailyLimit - dailyUsed),
        monthlyRemaining: currentLimits.isUnlimited ? -1 : Math.max(0, currentLimits.monthlyLimit - monthlyUsed),
        totalRequests,
      };
    } catch {
      return DEFAULT_STATS;
    }
  }, []);

  // Refresh all usage data
  const refreshUsage = useCallback(async () => {
    if (!user?.id) {
      setLimits(DEFAULT_LIMITS);
      setStats(DEFAULT_STATS);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const newLimits = await fetchLimits(user.id);
      setLimits(newLimits);

      // Pass limits as parameter to avoid dependency loop
      const newStats = await fetchStats(user.id, newLimits);
      setStats(newStats);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, fetchLimits, fetchStats]);

  // Update remaining from API response (more accurate than fetching)
  // Uses refs to avoid dependency on limits state (prevents callback recreation)
  const limitsRef = React.useRef(limits);
  limitsRef.current = limits;

  const updateRemaining = useCallback((
    dailyRemaining: number,
    monthlyRemaining: number,
    isUnlimited: boolean
  ) => {
    if (isUnlimited) {
      setLimits(prev => ({ ...prev, isUnlimited: true }));
      setStats(prev => ({ ...prev, dailyRemaining: -1, monthlyRemaining: -1 }));
      return;
    }

    const currentLimits = limitsRef.current;
    setStats(prev => ({
      ...prev,
      dailyRemaining: dailyRemaining >= 0 ? dailyRemaining : prev.dailyRemaining,
      monthlyRemaining: monthlyRemaining >= 0 ? monthlyRemaining : prev.monthlyRemaining,
      dailyUsed: currentLimits.dailyLimit - dailyRemaining,
      monthlyUsed: currentLimits.monthlyLimit - monthlyRemaining,
    }));
  }, []);

  // Quick check if user can make request
  const canMakeRequest = useCallback((estimatedTokens: number): boolean => {
    if (limits.isUnlimited) return true;
    if (estimatedTokens > limits.maxPerRequest) return false;
    if (stats.dailyRemaining >= 0 && estimatedTokens > stats.dailyRemaining) return false;
    if (stats.monthlyRemaining >= 0 && estimatedTokens > stats.monthlyRemaining) return false;
    return true;
  }, [limits, stats]);

  // Get session ID for anonymous tracking
  const getSessionId = useCallback(() => {
    return getOrCreateSessionId();
  }, []);

  // Fetch usage on auth change
  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated && user?.id) {
        refreshUsage();
      } else {
        // Reset to defaults for anonymous users
        setLimits(DEFAULT_LIMITS);
        setStats({
          ...DEFAULT_STATS,
          dailyRemaining: DEFAULT_LIMITS.dailyLimit,
          monthlyRemaining: DEFAULT_LIMITS.monthlyLimit,
        });
        setIsLoading(false);
      }
    }
  }, [isAuthenticated, user?.id, authLoading, refreshUsage]);

  const value = {
    limits,
    stats,
    isLoading,
    refreshUsage,
    updateRemaining,
    canMakeRequest,
    getSessionId,
  };

  return (
    <UsageContext.Provider value={value}>
      {children}
    </UsageContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useUsage() {
  const context = useContext(UsageContext);
  if (!context) {
    throw new Error('useUsage must be used within a UsageProvider');
  }
  return context;
}
