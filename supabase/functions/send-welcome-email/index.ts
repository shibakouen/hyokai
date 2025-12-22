import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Welcome email template with Hyokai branding
const getWelcomeEmailHtml = (email: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#fff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.05)">
        <!-- Header -->
        <tr><td style="padding:40px 32px 24px;text-align:center;background:linear-gradient(135deg,#0ea5e9 0%,#0284c7 100%);border-radius:12px 12px 0 0">
          <div style="font-size:32px;font-weight:700;color:#fff;margin-bottom:4px">Welcome to Hyokai</div>
          <div style="font-size:14px;color:rgba(255,255,255,0.85);letter-spacing:0.5px">AI-Powered Prompt Transformation</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px">
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#1e293b">You're all set!</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#475569">
            Thanks for joining Hyokai. You now have access to the most powerful prompt transformation tool on the web.
          </p>

          <div style="background:#f1f5f9;border-radius:8px;padding:20px;margin-bottom:24px">
            <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#1e293b">Here's what you can do:</p>
            <ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.8;color:#475569">
              <li>Transform vague ideas into precise AI prompts</li>
              <li>Compare outputs across multiple AI models</li>
              <li>Save and reuse your favorite prompts</li>
              <li>Connect your GitHub repos for context-aware transformations</li>
            </ul>
          </div>

          <div style="text-align:center;margin-bottom:24px">
            <a href="https://app.hyokai.ai" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#fff;text-decoration:none;font-weight:600;font-size:15px;border-radius:8px">
              Start Transforming
            </a>
          </div>

          <p style="margin:0;font-size:14px;line-height:1.6;color:#64748b;text-align:center">
            Questions? Just reply to this email — we're here to help.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 32px;border-top:1px solid #e2e8f0;text-align:center">
          <p style="margin:0 0 8px;font-size:13px;color:#94a3b8">
            You're receiving this because you signed up for Hyokai.
          </p>
          <p style="margin:0;font-size:12px;color:#cbd5e1">
            <a href="https://hyokai.ai" style="color:#0ea5e9;text-decoration:none">hyokai.ai</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { user_id, email } = body;

    if (!email) {
      throw new Error("Email is required");
    }

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    // Check if we've already sent a welcome email to this user
    // This prevents duplicate emails on trigger re-fires
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && user_id) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Check user metadata for welcome_email_sent flag
      const { data: user } = await supabase.auth.admin.getUserById(user_id);

      if (user?.user?.user_metadata?.welcome_email_sent) {
        console.log("Welcome email already sent to:", email);
        return new Response(
          JSON.stringify({ success: true, message: "Already sent", skipped: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      // Mark welcome email as sent in user metadata
      await supabase.auth.admin.updateUserById(user_id, {
        user_metadata: { welcome_email_sent: true, welcome_email_sent_at: new Date().toISOString() }
      });
    }

    // Send welcome email via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Hyokai <team@hyokai.ai>",
        to: [email],
        subject: "Welcome to Hyokai - Let's transform your prompts",
        html: getWelcomeEmailHtml(email),
        reply_to: "team@hyokai.ai",
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", data);
      throw new Error(data.message || "Failed to send email");
    }

    console.log("Welcome email sent successfully to:", email, "ID:", data.id);

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error in send-welcome-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
