import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Price ID to Plan ID mapping (reverse lookup)
const PRICE_TO_PLAN: Record<string, { planId: string; interval: 'month' | 'year' }> = {
  // Starter
  'price_1SgZHyCs88k2DV32g2UFt1Vr': { planId: 'starter', interval: 'month' },
  'price_1SgZHzCs88k2DV32suTd3OoL': { planId: 'starter', interval: 'year' },
  // Pro
  'price_1SgZHzCs88k2DV32K1H4Q5CB': { planId: 'pro', interval: 'month' },
  'price_1SgZHzCs88k2DV32TPog3GYb': { planId: 'pro', interval: 'year' },
  // Business
  'price_1SgZI0Cs88k2DV32Wsx1etw7': { planId: 'business', interval: 'month' },
  'price_1SgZI0Cs88k2DV32oekBtFHN': { planId: 'business', interval: 'year' },
  // Max
  'price_1SgZI0Cs88k2DV32AhdBxJSJ': { planId: 'max', interval: 'month' },
  'price_1SgZI1Cs88k2DV32YfEG9JBB': { planId: 'max', interval: 'year' },
};

// Plan limits
const PLAN_LIMITS: Record<string, number> = {
  'starter': 150,
  'pro': 500,
  'business': 1500,
  'max': 5000,
};

// Update user_usage_limits to grant/revoke unlimited access for subscribers
async function updateUserUsageLimits(
  userId: string,
  isUnlimited: boolean,
  supabase: ReturnType<typeof createClient>
) {
  console.log(`Updating user_usage_limits for ${userId}: is_unlimited=${isUnlimited}`);

  // Check if user has existing usage limits record
  const { data: existingLimits } = await supabase
    .from("user_usage_limits")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingLimits) {
    // Update existing record
    const { error } = await supabase
      .from("user_usage_limits")
      .update({
        is_unlimited: isUnlimited,
        // For paid subscribers, set generous limits as fallback
        daily_token_limit: isUnlimited ? 1000000 : 10000,
        monthly_token_limit: isUnlimited ? 10000000 : 50000,
        max_tokens_per_request: isUnlimited ? 50000 : 2000,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to update user_usage_limits:", error);
      // Don't throw - this is not critical for subscription flow
    } else {
      console.log("Updated user_usage_limits successfully");
    }
  } else {
    // Create new record for subscriber
    const { error } = await supabase
      .from("user_usage_limits")
      .insert({
        user_id: userId,
        is_unlimited: isUnlimited,
        daily_token_limit: isUnlimited ? 1000000 : 10000,
        monthly_token_limit: isUnlimited ? 10000000 : 50000,
        max_tokens_per_request: isUnlimited ? 50000 : 2000,
        daily_tokens_used: 0,
        monthly_tokens_used: 0,
      });

    if (error) {
      console.error("Failed to create user_usage_limits:", error);
      // Don't throw - this is not critical for subscription flow
    } else {
      console.log("Created user_usage_limits successfully");
    }
  }
}

// Create Supabase admin client
function createAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase configuration");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

// Create Stripe client
function createStripeClient(): Stripe {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  return new Stripe(stripeKey, {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
  });
}

// Verify Stripe webhook signature
async function verifyWebhookSignature(
  req: Request,
  stripe: Stripe
): Promise<Stripe.Event> {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature) {
    throw new Error("Missing stripe-signature header");
  }

  if (!webhookSecret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET");
  }

  const body = await req.text();

  try {
    return stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    throw new Error(`Webhook signature verification failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

// Handle checkout.session.completed - create user and subscription
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: ReturnType<typeof createClient>,
  stripe: Stripe
) {
  console.log("=== CHECKOUT COMPLETED ===");
  console.log("Session ID:", session.id);
  console.log("Customer:", session.customer);
  console.log("Customer Email:", session.customer_email || session.customer_details?.email);
  console.log("Subscription:", session.subscription);

  const customerEmail = session.customer_email || session.customer_details?.email;
  const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
  const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

  if (!customerEmail) {
    throw new Error("No customer email in checkout session");
  }

  if (!stripeCustomerId) {
    throw new Error("No customer ID in checkout session");
  }

  if (!stripeSubscriptionId) {
    throw new Error("No subscription ID in checkout session");
  }

  // Get subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const priceId = subscription.items.data[0]?.price.id;
  const planInfo = priceId ? PRICE_TO_PLAN[priceId] : null;

  if (!planInfo) {
    console.error("Unknown price ID:", priceId);
    throw new Error(`Unknown price ID: ${priceId}`);
  }

  console.log("Plan:", planInfo.planId, "Interval:", planInfo.interval);

  // Step 1: Check if user already exists
  let userId: string;
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(u => u.email === customerEmail);

  if (existingUser) {
    console.log("User already exists:", existingUser.id);
    userId = existingUser.id;
  } else {
    // Step 2: Create new Supabase auth user
    console.log("Creating new user for:", customerEmail);

    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: customerEmail,
      email_confirm: true, // Skip email verification - they paid!
      user_metadata: {
        stripe_customer_id: stripeCustomerId,
        signup_source: 'stripe_checkout',
      },
    });

    if (createError) {
      console.error("Failed to create user:", createError);
      throw new Error(`Failed to create user: ${createError.message}`);
    }

    userId = newUser.user.id;
    console.log("Created user:", userId);

    // Step 3: Send password setup email (magic link for password reset)
    const { error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: customerEmail,
      options: {
        redirectTo: `${Deno.env.get("SITE_URL") || "https://app.hyokai.ai"}/settings?setup=password`,
      },
    });

    if (linkError) {
      console.error("Failed to send password setup email:", linkError);
      // Don't throw - user is created, they can use "forgot password" flow
    } else {
      console.log("Password setup email sent to:", customerEmail);
    }

    // Create user_profiles record
    await supabase.from("user_profiles").upsert({
      id: userId,
      email: customerEmail,
    });
  }

  // Step 4: Create or update subscription record
  const subscriptionData = {
    user_id: userId,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
    stripe_price_id: priceId,
    plan_id: planInfo.planId,
    billing_interval: planInfo.interval,
    status: subscription.status === 'trialing' ? 'trialing' : 'active',
    trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
    trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    transformations_used: 0,
    transformations_limit: PLAN_LIMITS[planInfo.planId] || 500,
  };

  // Check if subscription already exists for this user
  const { data: existingSub } = await supabase
    .from("user_subscriptions")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingSub) {
    // Update existing subscription
    const { error: updateError } = await supabase
      .from("user_subscriptions")
      .update(subscriptionData)
      .eq("id", existingSub.id);

    if (updateError) {
      console.error("Failed to update subscription:", updateError);
      throw new Error(`Failed to update subscription: ${updateError.message}`);
    }
    console.log("Updated subscription for user:", userId);
  } else {
    // Create new subscription
    const { error: insertError } = await supabase
      .from("user_subscriptions")
      .insert(subscriptionData);

    if (insertError) {
      console.error("Failed to create subscription:", insertError);
      throw new Error(`Failed to create subscription: ${insertError.message}`);
    }
    console.log("Created subscription for user:", userId);
  }

  // Update Stripe customer metadata with Supabase user ID
  await stripe.customers.update(stripeCustomerId, {
    metadata: { supabase_user_id: userId },
  });

  // Grant unlimited access in user_usage_limits for the subscriber
  await updateUserUsageLimits(userId, true, supabase);

  console.log("=== CHECKOUT COMPLETED SUCCESSFULLY ===");
}

// Handle subscription updated
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof createClient>
) {
  console.log("=== SUBSCRIPTION UPDATED ===");
  console.log("Subscription ID:", subscription.id);
  console.log("Status:", subscription.status);

  const priceId = subscription.items.data[0]?.price.id;
  const planInfo = priceId ? PRICE_TO_PLAN[priceId] : null;

  const updateData: Record<string, unknown> = {
    status: subscription.status,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  // If plan changed, update plan info
  if (planInfo && priceId) {
    updateData.stripe_price_id = priceId;
    updateData.plan_id = planInfo.planId;
    updateData.billing_interval = planInfo.interval;
    updateData.transformations_limit = PLAN_LIMITS[planInfo.planId] || 500;
  }

  const { error } = await supabase
    .from("user_subscriptions")
    .update(updateData)
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("Failed to update subscription:", error);
    throw new Error(`Failed to update subscription: ${error.message}`);
  }

  console.log("=== SUBSCRIPTION UPDATED SUCCESSFULLY ===");
}

// Handle subscription deleted (canceled)
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof createClient>
) {
  console.log("=== SUBSCRIPTION DELETED ===");
  console.log("Subscription ID:", subscription.id);

  // First, get the user_id from the subscription record
  const { data: subRecord } = await supabase
    .from("user_subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  const { error } = await supabase
    .from("user_subscriptions")
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("Failed to mark subscription as canceled:", error);
    throw new Error(`Failed to mark subscription as canceled: ${error.message}`);
  }

  // Revoke unlimited access for the canceled subscriber
  if (subRecord?.user_id) {
    await updateUserUsageLimits(subRecord.user_id, false, supabase);
  }

  console.log("=== SUBSCRIPTION DELETED SUCCESSFULLY ===");
}

// Handle invoice paid - reset usage counter for new billing period
async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  supabase: ReturnType<typeof createClient>
) {
  console.log("=== INVOICE PAID ===");
  console.log("Invoice ID:", invoice.id);
  console.log("Subscription:", invoice.subscription);

  // Only reset for subscription invoices (not one-time payments)
  if (!invoice.subscription) {
    console.log("Not a subscription invoice, skipping");
    return;
  }

  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription.id;

  // Reset usage counter and update period
  const { error } = await supabase
    .from("user_subscriptions")
    .update({
      transformations_used: 0,
      current_period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
      current_period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
      status: 'active', // Invoice paid means subscription is active
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);

  if (error) {
    console.error("Failed to reset usage:", error);
    throw new Error(`Failed to reset usage: ${error.message}`);
  }

  // Also create invoice record
  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  if (sub?.user_id) {
    await supabase.from("invoices").upsert({
      user_id: sub.user_id,
      stripe_invoice_id: invoice.id,
      amount_cents: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status || 'paid',
      invoice_pdf_url: invoice.invoice_pdf,
      hosted_invoice_url: invoice.hosted_invoice_url,
      period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
      period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
      paid_at: new Date().toISOString(),
    }, { onConflict: 'stripe_invoice_id' });
  }

  console.log("=== INVOICE PAID SUCCESSFULLY ===");
}

// Handle invoice payment failed
async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: ReturnType<typeof createClient>
) {
  console.log("=== INVOICE PAYMENT FAILED ===");
  console.log("Invoice ID:", invoice.id);
  console.log("Subscription:", invoice.subscription);

  if (!invoice.subscription) {
    return;
  }

  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription.id;

  const { error } = await supabase
    .from("user_subscriptions")
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);

  if (error) {
    console.error("Failed to mark subscription as past_due:", error);
  }

  console.log("=== INVOICE PAYMENT FAILED HANDLED ===");
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = createStripeClient();
    const supabase = createAdminClient();

    // Verify webhook signature and get event
    const event = await verifyWebhookSignature(req, stripe);

    console.log("=== STRIPE WEBHOOK EVENT ===");
    console.log("Event type:", event.type);
    console.log("Event ID:", event.id);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        // Only handle subscription checkouts
        if (session.mode === 'subscription') {
          await handleCheckoutCompleted(session, supabase, stripe);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription, supabase);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription, supabase);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice, supabase);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice, supabase);
        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
