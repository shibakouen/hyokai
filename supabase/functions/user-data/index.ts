import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// AES-GCM encryption for PAT
async function encryptPAT(pat: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(pat)
  );

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  // Return as base64
  return btoa(String.fromCharCode(...combined));
}

async function decryptPAT(encryptedData: string, key: CryptoKey): Promise<string> {
  const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));

  // Extract IV and encrypted data
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encrypted
  );

  return new TextDecoder().decode(decrypted);
}

async function getEncryptionKey(): Promise<CryptoKey> {
  const keyString = Deno.env.get("PAT_ENCRYPTION_KEY");
  if (!keyString) {
    throw new Error("PAT_ENCRYPTION_KEY not configured");
  }

  // Use SHA-256 to derive a 256-bit key from the secret
  const encoder = new TextEncoder();
  const keyData = await crypto.subtle.digest("SHA-256", encoder.encode(keyString));

  return crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's JWT
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify JWT and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "savePAT": {
        const { pat, username } = body;
        if (!pat) {
          return new Response(
            JSON.stringify({ error: "PAT is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const key = await getEncryptionKey();
        const encryptedPat = await encryptPAT(pat, key);

        const { error } = await supabase
          .from("github_credentials")
          .upsert({
            user_id: user.id,
            encrypted_pat: encryptedPat,
            pat_username: username || null,
          });

        if (error) {
          console.error("Error saving PAT:", error);
          return new Response(
            JSON.stringify({ error: "Failed to save PAT" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "getPAT": {
        const { data, error } = await supabase
          .from("github_credentials")
          .select("encrypted_pat, pat_username")
          .eq("user_id", user.id)
          .single();

        if (error || !data) {
          return new Response(
            JSON.stringify({ pat: null, username: null }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const key = await getEncryptionKey();
        const pat = await decryptPAT(data.encrypted_pat, key);

        return new Response(
          JSON.stringify({ pat, username: data.pat_username }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "deletePAT": {
        const { error } = await supabase
          .from("github_credentials")
          .delete()
          .eq("user_id", user.id);

        if (error) {
          console.error("Error deleting PAT:", error);
          return new Response(
            JSON.stringify({ error: "Failed to delete PAT" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "migrateData": {
        // Mark user as migrated
        const { error } = await supabase
          .from("user_profiles")
          .update({ migrated_at: new Date().toISOString() })
          .eq("id", user.id);

        if (error) {
          console.error("Error marking migration:", error);
          return new Response(
            JSON.stringify({ error: "Failed to mark migration complete" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
