import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SignUpRequest {
  email: string;
  password: string;
  fullName: string;
  phone: string;
}

// Hash password using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Generate a random strong password for Supabase
function generateRandomPassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < 32; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

interface AdminUser {
  id: string;
  email?: string | null;
}

async function findUserByEmail(
  supabaseAdmin: ReturnType<typeof createClient>,
  email: string,
): Promise<{ user: AdminUser | null; error: string | null }> {
  const targetEmail = email.toLowerCase();
  const perPage = 200;
  const maxLookupPages = 500;
  let page = 1;

  for (let scannedPages = 0; scannedPages < maxLookupPages; scannedPages += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });

    if (error) {
      return { user: null, error: error.message };
    }

    const users = data?.users ?? [];
    const foundUser = users.find((candidate) => candidate.email?.toLowerCase() === targetEmail) ?? null;

    if (foundUser) {
      return { user: foundUser, error: null };
    }

    const nextPage = data?.nextPage;
    if (!nextPage || nextPage === page || users.length === 0) {
      break;
    }

    page = nextPage;
  }

  return { user: null, error: null };
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

    const { user: existingUser, error: lookupError } = await findUserByEmail(supabaseAdmin, email);

    if (lookupError) {
      console.error("Error looking up user by email:", lookupError);
      return new Response(
        JSON.stringify({ error: "Failed to validate account. Please try again." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: "An account with this email already exists" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const randomPassword = generateRandomPassword();

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: randomPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone: phone,
      },
    });

    if (createError || !newUser.user) {
      const createErrorMessage = createError?.message?.toLowerCase() ?? "";
      const isExistingAccountError =
        createErrorMessage.includes("already") ||
        createErrorMessage.includes("exists") ||
        createErrorMessage.includes("registered");

      console.error("Error creating user:", createError);
      return new Response(
        JSON.stringify({ error: isExistingAccountError ? "An account with this email already exists" : (createError?.message || "Failed to create account") }),
        { status: isExistingAccountError ? 400 : 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("User created:", newUser.user.id);

    const passwordHash = await hashPassword(password);

    const { error: passwordError } = await supabaseAdmin
      .from("user_passwords")
      .insert({
        user_id: newUser.user.id,
        password_hash: passwordHash,
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
      email: email,
    });

    if (linkError || !linkData) {
      console.error("Error generating magic link:", linkError);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Account created successfully. Please sign in.",
          requiresSignIn: true
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const tokenHash = linkData.properties.hashed_token;

    return new Response(
      JSON.stringify({
        success: true,
        token_hash: tokenHash,
        type: "magiclink",
        email,
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
