import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Subscription plan types
export type PlanId = 'starter' | 'pro' | 'business' | 'max';
export type BillingInterval = 'monthly' | 'annual';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';

// Plan limits and pricing
export const PLAN_LIMITS: Record<PlanId, {
  transformations: number;
  monthlyPrice: number;
  annualPrice: number;
  overageRate: number;
}> = {
  starter: { transformations: 150, monthlyPrice: 999, annualPrice: 9999, overageRate: 10 },
  pro: { transformations: 500, monthlyPrice: 2499, annualPrice: 24999, overageRate: 8 },
  business: { transformations: 1500, monthlyPrice: 4999, annualPrice: 49999, overageRate: 6 },
  max: { transformations: 5000, monthlyPrice: 9999, annualPrice: 99999, overageRate: 4 },
};

// Stripe price IDs (from our created prices)
export const STRIPE_PRICE_IDS: Record<PlanId, { monthly: string; annual: string }> = {
  starter: {
    monthly: 'price_1SgZHyCs88k2DV32g2UFt1Vr',
    annual: 'price_1SgZHzCs88k2DV32suTd3OoL',
  },
  pro: {
    monthly: 'price_1SgZHzCs88k2DV32K1H4Q5CB',
    annual: 'price_1SgZHzCs88k2DV32TPog3GYb',
  },
  business: {
    monthly: 'price_1SgZI0Cs88k2DV32Wsx1etw7',
    annual: 'price_1SgZI0Cs88k2DV32oekBtFHN',
  },
  max: {
    monthly: 'price_1SgZI0Cs88k2DV32AhdBxJSJ',
    annual: 'price_1SgZI1Cs88k2DV32YfEG9JBB',
  },
};

export interface Subscription {
  id: string;
  planId: PlanId;
  planName: string;
  status: SubscriptionStatus;
  transformationsUsed: number;
  transformationsLimit: number;
  transformationsRemaining: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  isTrialing: boolean;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  billingInterval: BillingInterval;
}

interface SubscriptionContextType {
  subscription: Subscription | null;
  isLoading: boolean;
  error: string | null;
  hasSubscription: boolean;
  isTrialing: boolean;
  canTransform: boolean;
  usagePercentage: number;
  refreshSubscription: () => Promise<void>;
  openCheckout: (planId: PlanId, interval: BillingInterval) => Promise<void>;
  openGuestCheckout: (email: string, planId: PlanId, interval: BillingInterval) => Promise<void>;
  openPortal: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user, session, isAuthenticated, isLoading: isAuthLoading, wasEverAuthenticated } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch subscription from database
  const fetchSubscription = useCallback(async () => {
    if (!user || !session) {
      setSubscription(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('user_subscriptions')
        .select('*, subscription_plans(*)')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching subscription:', fetchError);
        setError('Failed to load subscription');
        setSubscription(null);
        return;
      }

      if (!data) {
        setSubscription(null);
        return;
      }

      // Map database record to Subscription type
      const sub: Subscription = {
        id: data.id,
        planId: data.plan_id as PlanId,
        planName: data.subscription_plans?.name || data.plan_id,
        status: data.status as SubscriptionStatus,
        transformationsUsed: data.transformations_used || 0,
        transformationsLimit: data.transformations_limit || 0,
        transformationsRemaining: Math.max(0, (data.transformations_limit || 0) - (data.transformations_used || 0)),
        currentPeriodStart: data.current_period_start,
        currentPeriodEnd: data.current_period_end,
        isTrialing: data.status === 'trialing',
        trialEndsAt: data.trial_ends_at,
        cancelAtPeriodEnd: data.cancel_at_period_end || false,
        billingInterval: data.billing_interval as BillingInterval || 'monthly',
      };

      setSubscription(sub);
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError('Failed to load subscription');
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  }, [user, session]);

  // Refresh subscription data
  const refreshSubscription = useCallback(async () => {
    await fetchSubscription();
  }, [fetchSubscription]);

  // Fetch subscription when user changes
  useEffect(() => {
    if (isAuthenticated && !isAuthLoading) {
      fetchSubscription();
    }
  }, [isAuthenticated, isAuthLoading, fetchSubscription]);

  // Clear subscription on logout
  useEffect(() => {
    if (!isAuthenticated && !isAuthLoading && wasEverAuthenticated) {
      setSubscription(null);
      setError(null);
    }
  }, [isAuthenticated, isAuthLoading, wasEverAuthenticated]);

  // Open Stripe Checkout for a plan
  const openCheckout = useCallback(async (planId: PlanId, interval: BillingInterval) => {
    if (!session) {
      setError('Please sign in to subscribe');
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ planId, interval }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Error opening checkout:', err);
      setError(err instanceof Error ? err.message : 'Failed to open checkout');
    }
  }, [session]);

  // Open Stripe Checkout for guests (no auth required)
  const openGuestCheckout = useCallback(async (email: string, planId: PlanId, interval: BillingInterval) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // No Authorization header - guest checkout
          },
          body: JSON.stringify({
            email,
            plan: planId,
            interval,
            successUrl: `${window.location.origin}/settings?checkout=success`,
            cancelUrl: `${window.location.origin}/pricing`,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Error opening guest checkout:', err);
      setError(err instanceof Error ? err.message : 'Failed to open checkout');
    }
  }, []);

  // Open Stripe Customer Portal
  const openPortal = useCallback(async () => {
    if (!session) {
      setError('Please sign in to manage billing');
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-portal`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open billing portal');
      }

      // Redirect to Stripe Portal
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Error opening portal:', err);
      setError(err instanceof Error ? err.message : 'Failed to open billing portal');
    }
  }, [session]);

  // Computed values
  const hasSubscription = !!subscription && (subscription.status === 'active' || subscription.status === 'trialing');
  const isTrialing = subscription?.isTrialing || false;
  const canTransform = hasSubscription || !isAuthenticated; // Allow anonymous users and subscribers
  const usagePercentage = subscription
    ? Math.min(100, (subscription.transformationsUsed / subscription.transformationsLimit) * 100)
    : 0;

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      isLoading,
      error,
      hasSubscription,
      isTrialing,
      canTransform,
      usagePercentage,
      refreshSubscription,
      openCheckout,
      openGuestCheckout,
      openPortal,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
