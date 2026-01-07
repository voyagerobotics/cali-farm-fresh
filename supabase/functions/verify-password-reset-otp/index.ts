import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyOTPRequest {
  email: string;
  otp: string;
  newPassword: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, otp, newPassword }: VerifyOTPRequest = await req.json();

    if (!email || !otp || !newPassword) {
      return new Response(
        JSON.stringify({ error: "Email, OTP and new password are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (newPassword.length < 4) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 4 characters" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Verifying OTP for email:", email);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get OTP record
    const { data: otpRecord, error: fetchError } = await supabase
      .from("password_reset_otps")
      .select("*")
      .eq("email", email.toLowerCase())
      .single();

    if (fetchError || !otpRecord) {
      console.log("OTP record not found");
      return new Response(
        JSON.stringify({ error: "Invalid or expired OTP. Please request a new one." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if already verified
    if (otpRecord.verified) {
      return new Response(
        JSON.stringify({ error: "This OTP has already been used. Please request a new one." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check expiry
    if (new Date(otpRecord.expires_at) < new Date()) {
      console.log("OTP expired");
      return new Response(
        JSON.stringify({ error: "OTP has expired. Please request a new one." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check failed attempts
    if (otpRecord.failed_attempts >= 5) {
      console.log("Too many failed attempts");
      return new Response(
        JSON.stringify({ error: "Too many failed attempts. Please request a new OTP." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify OTP
    if (otpRecord.otp_code !== otp) {
      // Increment failed attempts
      await supabase
        .from("password_reset_otps")
        .update({ failed_attempts: otpRecord.failed_attempts + 1 })
        .eq("email", email.toLowerCase());

      console.log("Invalid OTP code");
      return new Response(
        JSON.stringify({ error: "Invalid OTP code. Please try again." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get user first (before marking OTP as verified)
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error("Error fetching users:", userError);
      return new Response(
        JSON.stringify({ error: "Failed to update password" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const user = userData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Update password using admin API FIRST
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      // Check for weak password error (common passwords found in data breaches)
      if (updateError.message?.includes("weak") || updateError.code === "weak_password" || updateError.message?.includes("pwned")) {
        return new Response(
          JSON.stringify({ error: "This password is too common. Please try a unique password like 'Farm2025' or add some numbers." }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Failed to update password. Please try again." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Only mark OTP as verified AFTER password update succeeds
    await supabase
      .from("password_reset_otps")
      .update({ verified: true })
      .eq("email", email.toLowerCase());

    // Delete the OTP record
    await supabase
      .from("password_reset_otps")
      .delete()
      .eq("email", email.toLowerCase());

    console.log("Password updated successfully for:", email);

    return new Response(
      JSON.stringify({ success: true, message: "Password updated successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in verify-password-reset-otp:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
