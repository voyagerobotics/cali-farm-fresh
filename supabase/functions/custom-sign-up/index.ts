import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SignUpRequest {
  email: string;
  password: string;
  fullName: string;
  phone: string;
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function generateRandomPassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < 32; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, fullName, phone }: SignUpRequest = await req.json();
    console.log("Custom sign-up attempt for:", email);

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const targetEmail = email.toLowerCase();

    // Quick check: does this email already have a custom password?
    const { data: existingPw } = await supabaseAdmin
      .from("user_passwords")
      .select("id")
      .eq("email", targetEmail)
      .maybeSingle();

    if (existingPw) {
      return new Response(
        JSON.stringify({ error: "An account with this email already exists" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Also check auth.users via a small listUsers call
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 50 });
    const existingUser = (usersData?.users ?? []).find(u => u.email?.toLowerCase() === targetEmail);

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: "An account with this email already exists" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const randomPassword = generateRandomPassword();

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: targetEmail,
      password: randomPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone: phone,
      },
    });

    if (createError || !newUser.user) {
      const msg = createError?.message?.toLowerCase() ?? "";
      const isExisting = msg.includes("already") || msg.includes("exists") || msg.includes("registered");
      return new Response(
        JSON.stringify({ error: isExisting ? "An account with this email already exists" : (createError?.message || "Failed to create account") }),
        { status: isExisting ? 400 : 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("User created:", newUser.user.id);

    const passwordHash = await hashPassword(password);

    const { error: passwordError } = await supabaseAdmin
      .from("user_passwords")
      .insert({
        user_id: newUser.user.id,
        password_hash: passwordHash,
        email: targetEmail,
      });

    if (passwordError) {
      console.error("Error storing password:", passwordError);
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: "Failed to create account" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Custom password stored for user:", newUser.user.id);

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: targetEmail,
    });

    if (linkError || !linkData) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Account created successfully. Please sign in.",
          requiresSignIn: true
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        token_hash: linkData.properties.hashed_token,
        type: "magiclink",
        email: targetEmail,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("Custom sign-up error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
