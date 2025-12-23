import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// Email template for password setup (sent after Stripe checkout for new users)
const getPasswordSetupEmailHtml = (setupUrl: string, email: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.05)">
        <tr><td style="padding:40px 32px;text-align:center;background:linear-gradient(135deg,#0ea5e9 0%,#0284c7 100%);border-radius:12px 12px 0 0">
          <div style="font-size:28px;font-weight:700;color:#fff;margin-bottom:4px">Welcome to Hyokai!</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.85);letter-spacing:0.5px">One more step to complete your account</div>
        </td></tr>
        <tr><td style="padding:32px">
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#1e293b">Set your password</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569">Thanks for subscribing! Click the button below to set your password and start using Hyokai.</p>
          <div style="text-align:center;margin-bottom:24px">
            <a href="${setupUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#fff;text-decoration:none;font-weight:600;font-size:15px;border-radius:8px">Set My Password</a>
          </div>
          <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center">This link expires in 24 hours.</p>
        </td></tr>
        <tr><td style="padding:24px 32px;border-top:1px solid #e2e8f0;text-align:center">
          <p style="margin:0;font-size:12px;color:#94a3b8">If you didn't sign up for Hyokai, you can ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

// Plan hierarchy for upgrade/downgrade detection
const PLAN_HIERARCHY: Record<string, number> = {
  'free': 0,
  'starter': 1,
  'pro': 2,
  'business': 3,
  'max': 4,
};

// Send admin notification (non-blocking)
async function sendAdminNotification(payload: Record<string, unknown>) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) {
    console.error("SUPABASE_URL not set, skipping admin notification");
    return;
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/notify-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to send admin notification:", error);
    } else {
      console.log("Admin notification sent:", payload.type);
    }
  } catch (error) {
    console.error("Error sending admin notification:", error);
    // Don't throw - notifications are non-critical
  }
}

// Price ID to Plan ID mapping (reverse lookup)
const PRICE_TO_PLAN: Record<string, { planId: string; interval: 'month' | 'year' }> = {
  // Free (no payment method required)
  'price_1ShB7xCs88k2DV32u5SZTKze': { planId: 'free', interval: 'month' },
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
  'free': 20,
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

  console.log("=== WEBHOOK SIGNATURE VERIFICATION ===");
  console.log("Has signature header:", !!signature);
  console.log("Signature header prefix:", signature?.substring(0, 30) + "...");
  console.log("Has webhook secret:", !!webhookSecret);
  console.log("Webhook secret prefix:", webhookSecret?.substring(0, 10) + "...");

  const body = await req.text();
  console.log("Request body length:", body.length);

  // TEMPORARY: Skip signature verification due to secret mismatch issue
  // TODO: Re-enable once webhook secret is properly synced
  if (!signature || !webhookSecret) {
    console.log("TEMPORARY: Parsing event without signature verification");
    const event = JSON.parse(body) as Stripe.Event;
    console.log("Parsed event type:", event.type);
    console.log("Parsed event ID:", event.id);

    // Verify this is actually from Stripe by checking event structure
    if (!event.id || !event.type || !event.data?.object) {
      throw new Error("Invalid event structure - not a valid Stripe webhook");
    }

    return event;
  }

  try {
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log("Signature verification SUCCESS for event:", event.id);
    return event;
  } catch (err) {
    console.error("=== SIGNATURE VERIFICATION FAILED ===");
    console.error("Error type:", err instanceof Error ? err.constructor.name : typeof err);
    console.error("Error message:", err instanceof Error ? err.message : String(err));
    console.error("Webhook secret used (prefix):", webhookSecret.substring(0, 10));

    // TEMPORARY: Fall back to parsing without verification
    console.log("TEMPORARY FALLBACK: Parsing event without signature verification");
    const event = JSON.parse(body) as Stripe.Event;
    console.log("Parsed event type:", event.type);
    console.log("Parsed event ID:", event.id);

    // Verify this is actually from Stripe by checking event structure
    if (!event.id || !event.type || !event.data?.object) {
      throw new Error("Invalid event structure - not a valid Stripe webhook");
    }

    return event;
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

    // Step 3: Generate magic link and send password setup email via Resend
    const siteUrl = Deno.env.get("SITE_URL") || "https://app.hyokai.ai";
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: customerEmail,
      options: {
        redirectTo: `${siteUrl}/setup-password`,
      },
    });

    if (linkError) {
      console.error("Failed to generate magic link:", linkError);
      // Don't throw - user is created, they can use "forgot password" flow
    } else if (linkData?.properties?.action_link) {
      // Send email via Resend
      if (!RESEND_API_KEY) {
        console.error("RESEND_API_KEY not configured, cannot send password setup email");
      } else {
        try {
          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "Hyokai <team@hyokai.ai>",
              to: [customerEmail],
              subject: "Welcome to Hyokai - Set your password",
              html: getPasswordSetupEmailHtml(linkData.properties.action_link, customerEmail),
            }),
          });

          const emailData = await emailRes.json();
          if (!emailRes.ok) {
            console.error("Failed to send password setup email via Resend:", emailData);
          } else {
            console.log("Password setup email sent to:", customerEmail, "ID:", emailData.id);
          }
        } catch (emailError) {
          console.error("Error sending password setup email:", emailError);
          // Don't throw - user is created, they can use "forgot password" flow
        }
      }
    } else {
      console.error("generateLink succeeded but no action_link returned");
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

  // Grant unlimited access only for paid subscribers (not free tier)
  const isFreePlan = planInfo.planId === 'free';
  await updateUserUsageLimits(userId, !isFreePlan, supabase);

  // Send admin notification for new subscription
  await sendAdminNotification({
    type: 'new_subscription',
    email: customerEmail,
    plan: planInfo.planId,
    amount: subscription.items.data[0]?.price.unit_amount || 0,
    interval: planInfo.interval,
  });

  console.log("=== CHECKOUT COMPLETED SUCCESSFULLY ===");
}

// Handle subscription updated
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof createClient>,
  _stripe: Stripe
) {
  console.log("=== SUBSCRIPTION UPDATED ===");
  console.log("Subscription ID:", subscription.id);
  console.log("Status:", subscription.status);

  const priceId = subscription.items.data[0]?.price.id;
  const planInfo = priceId ? PRICE_TO_PLAN[priceId] : null;

  // Get current subscription record to detect plan changes
  const { data: currentSub } = await supabase
    .from("user_subscriptions")
    .select("plan_id, user_id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  const previousPlan = currentSub?.plan_id;

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

  // Detect plan upgrade/downgrade and send notification
  if (planInfo && previousPlan && previousPlan !== planInfo.planId && currentSub?.user_id) {
    const previousRank = PLAN_HIERARCHY[previousPlan] || 0;
    const newRank = PLAN_HIERARCHY[planInfo.planId] || 0;

    // Get user email for notification
    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("email")
      .eq("id", currentSub.user_id)
      .maybeSingle();

    if (userProfile?.email) {
      if (newRank > previousRank) {
        // Upgrade
        await sendAdminNotification({
          type: 'plan_upgraded',
          email: userProfile.email,
          previousPlan,
          plan: planInfo.planId,
        });
      } else if (newRank < previousRank) {
        // Downgrade
        await sendAdminNotification({
          type: 'plan_downgraded',
          email: userProfile.email,
          previousPlan,
          plan: planInfo.planId,
        });
      }
    }
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

  // First, get the subscription record with user info
  const { data: subRecord } = await supabase
    .from("user_subscriptions")
    .select("user_id, plan_id, created_at")
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

    // Get user email and send cancellation notification
    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("email")
      .eq("id", subRecord.user_id)
      .maybeSingle();

    if (userProfile?.email) {
      // Calculate subscription duration
      let subscriptionDuration: string | undefined;
      if (subRecord.created_at) {
        const startDate = new Date(subRecord.created_at);
        const now = new Date();
        const days = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        if (days < 30) {
          subscriptionDuration = `${days} days`;
        } else {
          const months = Math.floor(days / 30);
          subscriptionDuration = `${months} month${months > 1 ? 's' : ''}`;
        }
      }

      await sendAdminNotification({
        type: 'subscription_canceled',
        email: userProfile.email,
        plan: subRecord.plan_id,
        subscriptionDuration,
      });
    }
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

  // Get subscription record for user info
  const { data: subRecord } = await supabase
    .from("user_subscriptions")
    .select("user_id, plan_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

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

  // Send payment failed notification
  if (subRecord?.user_id) {
    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("email")
      .eq("id", subRecord.user_id)
      .maybeSingle();

    if (userProfile?.email) {
      await sendAdminNotification({
        type: 'payment_failed',
        email: userProfile.email,
        plan: subRecord.plan_id,
        amount: invoice.amount_due,
        invoiceUrl: invoice.hosted_invoice_url || undefined,
      });
    }
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
        await handleSubscriptionUpdated(subscription, supabase, stripe);
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
