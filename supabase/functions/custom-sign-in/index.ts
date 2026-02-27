import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SignInRequest {
  email: string;
  password: string;
}

type UserRole = "admin" | "customer";

const resolveUserRole = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
): Promise<UserRole> => {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error resolving user role:", error);
    return "customer";
  }

  return data?.role === "admin" ? "admin" : "customer";
};

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
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

    const targetEmail = email.toLowerCase();

    // O(1) lookup: check if user has a custom password via email column
    const { data: customPassword, error: cpError } = await supabaseAdmin
      .from("user_passwords")
      .select("user_id, password_hash, email")
      .eq("email", targetEmail)
      .maybeSingle();

    if (cpError && cpError.code !== "PGRST116") {
      console.error("Error checking custom password:", cpError);
    }

    // If custom password found via email, verify it directly (fast path)
    if (customPassword) {
      console.log("Found custom password for user via email lookup:", customPassword.user_id);
      const inputHash = await hashPassword(password);

      if (inputHash !== customPassword.password_hash) {
        return new Response(
          JSON.stringify({ error: "Invalid email or password" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Generate magic link for verified custom password user
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: targetEmail,
      });

      if (linkError || !linkData) {
        console.error("Error generating magic link:", linkError);
        return new Response(
          JSON.stringify({ error: "Authentication failed" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const role = await resolveUserRole(supabaseAdmin, customPassword.user_id);

      return new Response(
        JSON.stringify({
          success: true,
          token_hash: linkData.properties.hashed_token,
          type: "magiclink",
          email: targetEmail,
          role,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // No custom password found by email — check if there's a legacy entry without email column
    // by doing a single-page user lookup (limited fallback for old records)
    const { data: legacyCheck } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 50 });
    const legacyUser = (legacyCheck?.users ?? []).find(u => u.email?.toLowerCase() === targetEmail);

    if (legacyUser) {
      const { data: legacyPw } = await supabaseAdmin
        .from("user_passwords")
        .select("password_hash")
        .eq("user_id", legacyUser.id)
        .is("email", null)
        .maybeSingle();

      if (legacyPw) {
        console.log("Found legacy custom password (no email column), migrating...");
        const inputHash = await hashPassword(password);

        if (inputHash !== legacyPw.password_hash) {
          return new Response(
            JSON.stringify({ error: "Invalid email or password" }),
            { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // Backfill email for this user so future logins are O(1)
        await supabaseAdmin
          .from("user_passwords")
          .update({ email: targetEmail })
          .eq("user_id", legacyUser.id);

        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: targetEmail,
        });

        if (linkError || !linkData) {
          return new Response(
            JSON.stringify({ error: "Authentication failed" }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const role = await resolveUserRole(supabaseAdmin, legacyUser.id);

        return new Response(
          JSON.stringify({
            success: true,
            token_hash: linkData.properties.hashed_token,
            type: "magiclink",
            email: targetEmail,
            role,
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // No custom password at all — try standard Supabase auth (instant)
    console.log("No custom password found, trying standard auth");
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: targetEmail,
      password,
    });

    if (authError) {
      console.log("Standard auth failed:", authError.message);
      return new Response(
        JSON.stringify({ error: "Invalid email or password" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const role = await resolveUserRole(supabaseAdmin, authData.user.id);

    return new Response(
      JSON.stringify({
        success: true,
        session: authData.session,
        user: authData.user,
        role,
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
