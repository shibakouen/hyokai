import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Stripe price IDs for each plan
const STRIPE_PRICE_IDS: Record<string, { monthly: string; annual: string }> = {
  // Free tier ($0 - no payment method required)
  free: {
    monthly: 'price_1ShB7xCs88k2DV32u5SZTKze',
    annual: 'price_1ShB7xCs88k2DV32u5SZTKze',
  },
  // Standard tiers (homepage)
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
  // Pro tiers (/pro page)
  pro_tier: {
    monthly: 'price_1Sh19MCs88k2DV32GixXalxE',
    annual: 'price_1Sh19MCs88k2DV32V7tRZ1rc',
  },
  pro_plus: {
    monthly: 'price_1Sh19MCs88k2DV32KhAzBhvQ',
    annual: 'price_1Sh19PCs88k2DV32lG1bKgko',
  },
  pro_team: {
    monthly: 'price_1Sh19RCs88k2DV32f195233o',
    annual: 'price_1Sh19UCs88k2DV32THLkiYS8',
  },
  pro_max: {
    monthly: 'price_1Sh19XCs88k2DV32a86vru35',
    annual: 'price_1Sh19ZCs88k2DV326KASstSP',
  },
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { planId, interval, email, successUrl, cancelUrl, locale } = body;

    // Validate plan and interval
    if (!planId || !STRIPE_PRICE_IDS[planId]) {
      return new Response(
        JSON.stringify({ error: "Invalid plan" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const billingInterval = interval === 'annual' ? 'annual' : 'monthly';
    const priceId = STRIPE_PRICE_IDS[planId][billingInterval];

    // Create Stripe client
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Missing STRIPE_SECRET_KEY");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const siteUrl = Deno.env.get("SITE_URL") || "https://app.hyokai.ai";

    // Check if this is an authenticated request or guest checkout
    const authHeader = req.headers.get("Authorization");
    let customerId: string | undefined;
    let customerEmail: string | undefined;

    if (authHeader) {
      // Authenticated user - get or create Stripe customer
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      customerEmail = user.email;

      // Check if user already has a Stripe customer ID
      const { data: subscription } = await supabase
        .from("user_subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (subscription?.stripe_customer_id) {
        customerId = subscription.stripe_customer_id;
      } else {
        // Check if customer exists in Stripe by email
        const existingCustomers = await stripe.customers.list({
          email: user.email!,
          limit: 1,
        });

        if (existingCustomers.data.length > 0) {
          customerId = existingCustomers.data[0].id;
        } else {
          // Create new customer
          const newCustomer = await stripe.customers.create({
            email: user.email!,
            metadata: {
              supabase_user_id: user.id,
            },
          });
          customerId = newCustomer.id;
        }
      }
    } else if (email) {
      // Guest checkout with provided email - use it as customer_email
      customerEmail = email;

      // Check if customer exists in Stripe
      const existingCustomers = await stripe.customers.list({
        email: email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
      }
      // If no customer exists, Stripe Checkout will create one
    }
    // No email? That's fine - Stripe Checkout will collect it

    // Check if this is the free plan
    const isFreePlan = planId === 'free';

    // Determine success URL based on whether user is authenticated
    // Authenticated users: go to settings (they're already logged in)
    // Guest users: go to checkout-success page (tell them to check email)
    let checkoutSuccessUrl = successUrl;
    if (!checkoutSuccessUrl) {
      if (authHeader) {
        // Authenticated user - go to settings
        checkoutSuccessUrl = `${siteUrl}/settings?checkout=success`;
      } else {
        // Guest checkout - go to check-your-email page
        // Include email if we have it so we can display it
        checkoutSuccessUrl = customerEmail
          ? `${siteUrl}/checkout-success?email=${encodeURIComponent(customerEmail)}`
          : `${siteUrl}/checkout-success`;
      }
    }

    // Create Checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: checkoutSuccessUrl,
      cancel_url: cancelUrl || `${siteUrl}/pricing`,
      allow_promotion_codes: !isFreePlan, // No promo codes for free plan
      // Localization: 'ja' for Japanese, 'en' for English, 'auto' for browser detection
      locale: locale || 'auto',
    };

    if (isFreePlan) {
      // Free plan: Skip payment method collection (Stripe auto-skips for $0)
      // No trial needed - it's free forever
      sessionParams.payment_method_collection = 'if_required';
    } else {
      // Paid plans: 3-day trial
      sessionParams.subscription_data = {
        trial_period_days: 3,
      };
    }

    if (customerId) {
      sessionParams.customer = customerId;
    } else if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Checkout error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
