import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OTPRequest {
  email: string;
  userId: string;
}

const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, userId }: OTPRequest = await req.json();

    if (!email || !userId) {
      return new Response(
        JSON.stringify({ error: "Email and userId are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate 6-digit OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Delete any existing OTPs for this user
    await supabase
      .from("order_otp_verifications")
      .delete()
      .eq("user_id", userId);

    // Store OTP in database
    const { error: insertError } = await supabase
      .from("order_otp_verifications")
      .insert({
        user_id: userId,
        email: email,
        otp_code: otpCode,
        expires_at: expiresAt.toISOString(),
        verified: false,
      });

    if (insertError) {
      console.error("Error inserting OTP:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to generate OTP" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send OTP via email
    const emailResponse = await resend.emails.send({
      from: "California Farms <onboarding@resend.dev>",
      to: [email],
      subject: "Your Order Verification Code - California Farms India",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f7f4; margin: 0; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #2d5a3d, #1e4030); padding: 30px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { padding: 30px; text-align: center; }
            .otp-box { background: linear-gradient(135deg, #f0f9f4, #e8f5ed); padding: 25px; border-radius: 12px; margin: 20px 0; border: 2px dashed #2d5a3d; }
            .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #2d5a3d; }
            .info { color: #666; font-size: 14px; margin-top: 20px; }
            .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #888; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🌿 California Farms India</h1>
            </div>
            <div class="content">
              <h2>Verify Your Order</h2>
              <p>Use this code to confirm your order:</p>
              <div class="otp-box">
                <div class="otp-code">${otpCode}</div>
              </div>
              <p class="info">This code will expire in <strong>10 minutes</strong>.</p>
              <p class="info">If you didn't request this code, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>Fresh from our farms to your table</p>
              <p>© ${new Date().getFullYear()} California Farms India. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "OTP sent successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-order-otp function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
