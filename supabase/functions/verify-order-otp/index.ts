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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, otpCode }: VerifyRequest = await req.json();

    if (!userId || !otpCode) {
      return new Response(
        JSON.stringify({ error: "userId and otpCode are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Mark OTP as verified
    await supabase
      .from("order_otp_verifications")
      .update({ verified: true })
      .eq("id", otpRecord.id);

    return new Response(
      JSON.stringify({ valid: true, message: "OTP verified successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in verify-order-otp function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
