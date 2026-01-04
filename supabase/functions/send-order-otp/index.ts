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

// Rate limit: 60 seconds between OTP requests
const RATE_LIMIT_SECONDS = 60;

const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // AUTHENTICATION CHECK: Verify JWT token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("Missing Authorization header");
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Create Supabase client with user's token to verify authentication
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    
    if (authError || !user) {
      console.log("Invalid authentication:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { email, userId }: OTPRequest = await req.json();

    // Verify the userId matches the authenticated user
    if (userId !== user.id) {
      console.log(`User ID mismatch: requested ${userId}, authenticated ${user.id}`);
      return new Response(
        JSON.stringify({ error: "Unauthorized - user ID mismatch" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Input validation
    if (!email || !userId) {
      return new Response(
        JSON.stringify({ error: "Email and userId are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 255) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
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

    // Create Supabase client with service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SERVER-SIDE RATE LIMITING: Check for recent OTP requests
    const rateLimitTime = new Date(Date.now() - RATE_LIMIT_SECONDS * 1000).toISOString();
    const { data: recentOTPs, error: rateError } = await supabase
      .from("order_otp_verifications")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", rateLimitTime);

    if (rateError) {
      console.error("Error checking rate limit:", rateError);
    }

    if (recentOTPs && recentOTPs.length > 0) {
      console.log(`Rate limit hit for user ${userId}`);
      return new Response(
        JSON.stringify({ 
          error: "Please wait 60 seconds before requesting a new code",
          rateLimited: true 
        }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Delete any existing OTPs for this user (cleanup old ones)
    await supabase
      .from("order_otp_verifications")
      .delete()
      .eq("user_id", userId);

    // Generate 6-digit OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Store OTP in database
    const { error: insertError } = await supabase
      .from("order_otp_verifications")
      .insert({
        user_id: userId,
        email: email,
        otp_code: otpCode,
        expires_at: expiresAt.toISOString(),
        verified: false,
        failed_attempts: 0,
      });

    if (insertError) {
      console.error("Error inserting OTP:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to generate OTP" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send OTP via email
    console.log(`Attempting to send OTP email to: ${email}`);
    
    const emailResponse = await resend.emails.send({
      from: "California Farms <onboarding@resend.dev>", // Note: onboarding@resend.dev only sends to account owner's email. Verify your own domain at resend.com/domains for production use.
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
    // Log full error details server-side for debugging
    console.error("Error in send-order-otp function:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    // Return generic message to client to prevent information leakage
    return new Response(
      JSON.stringify({ error: "An error occurred while sending the verification code. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);