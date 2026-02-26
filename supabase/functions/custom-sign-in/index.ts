import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SignInRequest {
  email: string;
  password: string;
}

// Hash password using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

interface AdminUser {
  id: string;
  email?: string | null;
}

async function getUserByEmail(
  supabaseUrl: string,
  serviceRoleKey: string,
  email: string,
): Promise<{ user: AdminUser | null; error: string | null }> {
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
    method: "GET",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = typeof payload?.msg === "string"
      ? payload.msg
      : `User lookup failed with status ${response.status}`;
    return { user: null, error: message };
  }

  const user = Array.isArray((payload as any)?.users)
    ? ((payload as any).users[0] ?? null)
    : ((payload as any)?.user ?? null);

  return { user, error: null };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password }: SignInRequest = await req.json();
    console.log("Custom sign-in attempt for:", email);

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing required env vars", {
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasServiceRoleKey: Boolean(serviceRoleKey),
      });

      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { user, error: userLookupError } = await getUserByEmail(supabaseUrl, serviceRoleKey, email);

    if (userLookupError) {
      console.error("Error fetching user by email:", userLookupError);
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!user) {
      console.log("User not found:", email);
      return new Response(
        JSON.stringify({ error: "No account found with this email. Please sign up first." }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: customPassword, error: passwordError } = await supabaseAdmin
      .from("user_passwords")
      .select("password_hash")
      .eq("user_id", user.id)
      .single();

    if (passwordError && passwordError.code !== "PGRST116") {
      console.error("Error fetching custom password:", passwordError);
    }

    if (customPassword) {
      console.log("Verifying custom password for user:", user.id);
      const inputHash = await hashPassword(password);
      
      if (inputHash !== customPassword.password_hash) {
        console.log("Custom password verification failed");
        return new Response(
          JSON.stringify({ error: "Invalid email or password" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("Custom password verified, generating magic link");
      
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: user.email!,
      });

      if (linkError || !linkData) {
        console.error("Error generating magic link:", linkError);
        return new Response(
          JSON.stringify({ error: "Authentication failed" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const tokenHash = linkData.properties.hashed_token;

      return new Response(
        JSON.stringify({
          success: true,
          token_hash: tokenHash,
          type: "magiclink",
          email: user.email,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // No custom password - try normal Supabase auth
    console.log("No custom password found, trying Supabase auth");
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.log("Supabase auth failed:", authError.message);
      return new Response(
        JSON.stringify({ error: "Invalid email or password" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        session: authData.session,
        user: authData.user
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("Custom sign-in error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
