import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting weekly reminder process...");

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all active subscriptions
    const { data: subscriptions, error: fetchError } = await supabase
      .from("weekly_subscriptions")
      .select("*")
      .eq("is_active", true);

    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${subscriptions?.length || 0} active subscriptions`);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active subscriptions found", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch site settings for order days
    const { data: settings } = await supabase
      .from("site_settings")
      .select("order_days, delivery_time_slot")
      .eq("id", "default")
      .single();

    const orderDays = settings?.order_days || ["tuesday", "saturday"];
    const deliverySlot = settings?.delivery_time_slot || "3:00 PM - 9:00 PM";

    // Send emails to all subscribers using fetch
    const emailPromises = subscriptions.map(async (sub: any) => {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "California Farms India <onboarding@resend.dev>",
            to: [sub.email],
            subject: "🥬 Fresh Produce Available - Place Your Order Today!",
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #166534 0%, #22c55e 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">🌱 California Farms India</h1>
                  <p style="color: rgba(255,255,255,0.9); margin-top: 10px;">Fresh from Farm to Your Doorstep</p>
                </div>
                
                <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h2 style="color: #166534; margin-top: 0;">Weekly Reminder: Fresh Produce Available! 🥬</h2>
                  <p>Hi there! This is your weekly reminder that fresh, organic vegetables are ready for order.</p>
                </div>
                
                <div style="background: #fff; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h3 style="color: #166534; margin-top: 0;">📅 Order Days</h3>
                  <p style="font-size: 18px; font-weight: bold; color: #166534;">
                    ${orderDays.map((d: string) => d.charAt(0).toUpperCase() + d.slice(1)).join(" & ")}
                  </p>
                  <p style="color: #666;">Delivery Time: ${deliverySlot}</p>
                </div>
                
                <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                  <p style="margin: 0; color: #92400e;">
                    <strong>🚚 Free Delivery</strong> on orders above ₹399!
                  </p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://cali-farm-fresh.lovable.app" 
                     style="background: #166534; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                    Order Fresh Vegetables Now →
                  </a>
                </div>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                
                <p style="color: #666; font-size: 12px; text-align: center;">
                  You received this email because you subscribed to weekly reminders.<br>
                  <a href="https://cali-farm-fresh.lovable.app" style="color: #166534;">Unsubscribe</a> | 
                  <a href="https://cali-farm-fresh.lovable.app" style="color: #166534;">Visit Website</a>
                </p>
                
                <p style="color: #999; font-size: 11px; text-align: center; margin-top: 20px;">
                  California Farms India | Nagpur, Maharashtra<br>
                  Phone: +91 81497 12801
                </p>
              </body>
              </html>
            `,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to send email to ${sub.email}:`, errorText);
          return { email: sub.email, success: false, error: errorText };
        }

        const result = await response.json();
        console.log(`Email sent to ${sub.email}:`, result);
        return { email: sub.email, success: true };
      } catch (emailError: any) {
        console.error(`Failed to send email to ${sub.email}:`, emailError);
        return { email: sub.email, success: false, error: emailError.message };
      }
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter((r: any) => r.success).length;
    const failCount = results.filter((r: any) => !r.success).length;

    console.log(`Weekly reminders sent: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        message: "Weekly reminders processed", 
        sent: successCount,
        failed: failCount,
        results 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-weekly-reminder:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
