import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyRequest {
  userId: string;
  otpCode: string;
}

// Brute force protection: max 5 failed attempts per 10 minutes
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 10;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, otpCode }: VerifyRequest = await req.json();

    // Input validation
    if (!userId || !otpCode) {
      return new Response(
        JSON.stringify({ error: "userId and otpCode are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate userId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return new Response(
        JSON.stringify({ error: "Invalid userId format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate OTP format (6 digits)
    const otpRegex = /^\d{6}$/;
    if (!otpRegex.test(otpCode)) {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid OTP format" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // BRUTE FORCE PROTECTION: Check failed attempts
    const lockoutTime = new Date(Date.now() - LOCKOUT_MINUTES * 60 * 1000).toISOString();
    const { data: failedAttempts, error: attemptsError } = await supabase
      .from("order_otp_verifications")
      .select("id, failed_attempts")
      .eq("user_id", userId)
      .eq("verified", false)
      .maybeSingle();

    if (attemptsError) {
      console.error("Error checking failed attempts:", attemptsError);
    }

    // Check if user is locked out due to too many failed attempts
    if (failedAttempts && (failedAttempts.failed_attempts || 0) >= MAX_FAILED_ATTEMPTS) {
      console.log(`User ${userId} locked out due to too many failed OTP attempts`);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "Too many failed attempts. Please request a new code.",
          locked: true
        }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get the OTP record
    const { data: otpRecord, error: fetchError } = await supabase
      .from("order_otp_verifications")
      .select("*")
      .eq("user_id", userId)
      .eq("otp_code", otpCode)
      .eq("verified", false)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching OTP:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to verify OTP" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!otpRecord) {
      // Increment failed attempts counter
      if (failedAttempts) {
        await supabase
          .from("order_otp_verifications")
          .update({ failed_attempts: (failedAttempts.failed_attempts || 0) + 1 })
          .eq("id", failedAttempts.id);
        
        const remainingAttempts = MAX_FAILED_ATTEMPTS - (failedAttempts.failed_attempts || 0) - 1;
        console.log(`Failed OTP attempt for user ${userId}. ${remainingAttempts} attempts remaining.`);
      }

      return new Response(
        JSON.stringify({ valid: false, error: "Invalid OTP code" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if OTP has expired
    const expiresAt = new Date(otpRecord.expires_at);
    if (expiresAt < new Date()) {
      // Delete expired OTP
      await supabase
        .from("order_otp_verifications")
        .delete()
        .eq("id", otpRecord.id);

      return new Response(
        JSON.stringify({ valid: false, error: "OTP has expired. Please request a new one." }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Mark OTP as verified (success - reset failed attempts)
    await supabase
      .from("order_otp_verifications")
      .update({ verified: true, failed_attempts: 0 })
      .eq("id", otpRecord.id);

    console.log(`OTP verified successfully for user ${userId}`);

    return new Response(
      JSON.stringify({ valid: true, message: "OTP verified successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    // Log full error details server-side for debugging
    console.error("Error in verify-order-otp function:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    // Return generic message to client to prevent information leakage
    return new Response(
      JSON.stringify({ error: "An error occurred while verifying the code. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
