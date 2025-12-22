import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SEND_EMAIL_HOOK_SECRET = Deno.env.get("SEND_EMAIL_HOOK_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature",
};

// Email templates with Hyokai branding
const templates = {
  signup: {
    subject: "Confirm your Hyokai account",
    getHtml: (confirmUrl: string, token: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.05)">
        <tr><td style="padding:40px 32px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:#0ea5e9;margin-bottom:8px">Hyokai</div>
          <div style="font-size:13px;color:#64748b;letter-spacing:0.5px">PROMPT TRANSFORMATION</div>
        </td></tr>
        <tr><td style="padding:0 32px 32px">
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#1e293b">Confirm your email</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569">Thanks for signing up! Click the button below to verify your email address and activate your account.</p>
          <a href="${confirmUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#fff;text-decoration:none;font-weight:600;font-size:15px;border-radius:8px">Confirm Email</a>
          <p style="margin:24px 0 0;font-size:13px;color:#94a3b8">Or use this code: <strong style="color:#0ea5e9">${token}</strong></p>
        </td></tr>
        <tr><td style="padding:24px 32px;border-top:1px solid #e2e8f0;text-align:center">
          <p style="margin:0;font-size:12px;color:#94a3b8">If you didn't create an account, you can ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  },
  recovery: {
    subject: "Reset your Hyokai password",
    getHtml: (confirmUrl: string, token: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.05)">
        <tr><td style="padding:40px 32px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:#0ea5e9;margin-bottom:8px">Hyokai</div>
          <div style="font-size:13px;color:#64748b;letter-spacing:0.5px">PROMPT TRANSFORMATION</div>
        </td></tr>
        <tr><td style="padding:0 32px 32px">
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#1e293b">Reset your password</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569">We received a request to reset your password. Click the button below to choose a new one.</p>
          <a href="${confirmUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#fff;text-decoration:none;font-weight:600;font-size:15px;border-radius:8px">Reset Password</a>
          <p style="margin:24px 0 0;font-size:13px;color:#94a3b8">Or use this code: <strong style="color:#0ea5e9">${token}</strong></p>
        </td></tr>
        <tr><td style="padding:24px 32px;border-top:1px solid #e2e8f0;text-align:center">
          <p style="margin:0;font-size:12px;color:#94a3b8">If you didn't request this, you can safely ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  },
  magiclink: {
    subject: "Your Hyokai login link",
    getHtml: (confirmUrl: string, token: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.05)">
        <tr><td style="padding:40px 32px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:#0ea5e9;margin-bottom:8px">Hyokai</div>
          <div style="font-size:13px;color:#64748b;letter-spacing:0.5px">PROMPT TRANSFORMATION</div>
        </td></tr>
        <tr><td style="padding:0 32px 32px">
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#1e293b">Your magic link</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569">Click the button below to securely log in to your Hyokai account. This link expires in 1 hour.</p>
          <a href="${confirmUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#fff;text-decoration:none;font-weight:600;font-size:15px;border-radius:8px">Log In to Hyokai</a>
          <p style="margin:24px 0 0;font-size:13px;color:#94a3b8">Or use this code: <strong style="color:#0ea5e9">${token}</strong></p>
        </td></tr>
        <tr><td style="padding:24px 32px;border-top:1px solid #e2e8f0;text-align:center">
          <p style="margin:0;font-size:12px;color:#94a3b8">If you didn't request this link, you can ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  },
  email_change: {
    subject: "Confirm your new email address",
    getHtml: (confirmUrl: string, token: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.05)">
        <tr><td style="padding:40px 32px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:#0ea5e9;margin-bottom:8px">Hyokai</div>
          <div style="font-size:13px;color:#64748b;letter-spacing:0.5px">PROMPT TRANSFORMATION</div>
        </td></tr>
        <tr><td style="padding:0 32px 32px">
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#1e293b">Confirm email change</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569">You requested to change your email address. Click below to confirm this change.</p>
          <a href="${confirmUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#fff;text-decoration:none;font-weight:600;font-size:15px;border-radius:8px">Confirm New Email</a>
          <p style="margin:24px 0 0;font-size:13px;color:#94a3b8">Or use this code: <strong style="color:#0ea5e9">${token}</strong></p>
        </td></tr>
        <tr><td style="padding:24px 32px;border-top:1px solid #e2e8f0;text-align:center">
          <p style="margin:0;font-size:12px;color:#94a3b8">If you didn't request this change, please secure your account immediately.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  },
  invite: {
    subject: "You're invited to join Hyokai",
    getHtml: (confirmUrl: string, token: string, email: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.05)">
        <tr><td style="padding:40px 32px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:#0ea5e9;margin-bottom:8px">Hyokai</div>
          <div style="font-size:13px;color:#64748b;letter-spacing:0.5px">PROMPT TRANSFORMATION</div>
        </td></tr>
        <tr><td style="padding:0 32px 32px">
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#1e293b">You're invited!</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569">You've been invited to join Hyokai. Click the button below to create your account and start transforming your prompts.</p>
          <a href="${confirmUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#fff;text-decoration:none;font-weight:600;font-size:15px;border-radius:8px">Accept Invitation</a>
          <p style="margin:24px 0 0;font-size:13px;color:#94a3b8">Or use this code: <strong style="color:#0ea5e9">${token}</strong></p>
        </td></tr>
        <tr><td style="padding:24px 32px;border-top:1px solid #e2e8f0;text-align:center">
          <p style="margin:0;font-size:12px;color:#94a3b8">This invitation was sent to ${email}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  },
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    // Get raw payload for signature verification
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);

    // Verify webhook signature
    if (!SEND_EMAIL_HOOK_SECRET) {
      throw new Error("SEND_EMAIL_HOOK_SECRET is not configured");
    }

    // Remove the "v1,whsec_" prefix if present
    const base64Secret = SEND_EMAIL_HOOK_SECRET.replace("v1,whsec_", "");
    const wh = new Webhook(base64Secret);

    let verifiedPayload;
    try {
      verifiedPayload = wh.verify(payload, headers);
    } catch (verifyError) {
      console.error("Webhook verification failed:", verifyError);
      return new Response(
        JSON.stringify({
          error: {
            http_code: 401,
            message: "Invalid webhook signature",
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Extract data from the verified auth hook payload
    const { user, email_data } = verifiedPayload as {
      user: { email: string };
      email_data: {
        token: string;
        token_hash: string;
        redirect_to: string;
        email_action_type: string;
        site_url: string;
      };
    };

    const {
      token,
      token_hash,
      redirect_to,
      email_action_type,
      site_url
    } = email_data;

    const userEmail = user?.email;

    if (!userEmail) {
      throw new Error("No email address provided");
    }

    // Build confirmation URL
    const confirmUrl = `${site_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to || site_url}`;

    // Get the appropriate template
    let template;
    switch (email_action_type) {
      case "signup":
      case "email":
        template = templates.signup;
        break;
      case "recovery":
        template = templates.recovery;
        break;
      case "magiclink":
        template = templates.magiclink;
        break;
      case "email_change":
        template = templates.email_change;
        break;
      case "invite":
        template = templates.invite;
        break;
      default:
        template = templates.signup;
    }

    // Send email via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Hyokai <team@hyokai.ai>",
        to: [userEmail],
        subject: template.subject,
        html: template.getHtml(confirmUrl, token, userEmail),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", data);
      throw new Error(data.message || "Failed to send email");
    }

    console.log("Email sent successfully:", data.id);

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in send-auth-email:", error);
    return new Response(
      JSON.stringify({
        error: {
          http_code: 500,
          message: error.message,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
