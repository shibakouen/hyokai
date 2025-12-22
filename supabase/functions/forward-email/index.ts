import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FORWARD_TO_EMAIL = "reimutomonari@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
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
    const payload = await req.json();

    console.log("Received inbound email webhook:", JSON.stringify(payload, null, 2));

    // Resend webhook payload structure for email.received event
    const { type, data } = payload;

    if (type !== "email.received") {
      console.log("Ignoring non-email.received event:", type);
      return new Response(JSON.stringify({ success: true, message: "Event ignored" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Extract email data
    const {
      from: originalFrom,
      to: originalTo,
      subject: originalSubject,
      text: textBody,
      html: htmlBody,
      reply_to: replyTo,
    } = data;

    // Build forwarded email content
    const forwardedSubject = `[Fwd] ${originalSubject || "(no subject)"}`;

    const forwardHeader = `
---------- Forwarded message ----------
From: ${originalFrom || "Unknown"}
To: ${Array.isArray(originalTo) ? originalTo.join(", ") : originalTo}
Subject: ${originalSubject || "(no subject)"}
`;

    const forwardedText = forwardHeader + "\n\n" + (textBody || "(no text content)");

    const forwardedHtml = htmlBody
      ? `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; color: #64748b;">
    <strong>---------- Forwarded message ----------</strong><br>
    <strong>From:</strong> ${originalFrom || "Unknown"}<br>
    <strong>To:</strong> ${Array.isArray(originalTo) ? originalTo.join(", ") : originalTo}<br>
    <strong>Subject:</strong> ${originalSubject || "(no subject)"}
  </div>
  <div>
    ${htmlBody}
  </div>
</body>
</html>`
      : undefined;

    // Forward the email via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Hyokai Inbox <team@hyokai.ai>",
        to: [FORWARD_TO_EMAIL],
        subject: forwardedSubject,
        text: forwardedText,
        html: forwardedHtml,
        reply_to: originalFrom ? [originalFrom] : undefined,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", result);
      throw new Error(result.message || "Failed to forward email");
    }

    console.log("Email forwarded successfully:", result.id);

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in forward-email:", error);
    return new Response(
      JSON.stringify({
        error: {
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
