import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SignInRequest {
  email: string;
  password: string;
}

serve(async (req) => {
  // Handle CORS preflight
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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get user by email
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    if (userError) {
      console.error("Error listing users:", userError);
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const user = userData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) {
      console.log("User not found:", email);
      return new Response(
        JSON.stringify({ error: "Invalid email or password" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user has a custom password stored
    const { data: customPassword, error: passwordError } = await supabaseAdmin
      .from("user_passwords")
      .select("password_hash")
      .eq("user_id", user.id)
      .single();

    if (passwordError && passwordError.code !== "PGRST116") {
      console.error("Error fetching custom password:", passwordError);
    }

    if (customPassword) {
      // Verify against custom password hash
      console.log("Verifying custom password for user:", user.id);
      const isValid = await bcrypt.compare(password, customPassword.password_hash);
      
      if (!isValid) {
        console.log("Custom password verification failed");
        return new Response(
          JSON.stringify({ error: "Invalid email or password" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("Custom password verified, generating magic link");
      
      // Generate a magic link for the user to sign in
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

      // Extract the token from the link
      const url = new URL(linkData.properties.action_link);
      const token = url.searchParams.get("token");
      const type = url.searchParams.get("type");

      return new Response(
        JSON.stringify({ 
          success: true, 
          token,
          type,
          email: user.email
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
