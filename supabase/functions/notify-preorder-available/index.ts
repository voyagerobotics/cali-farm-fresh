import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(text: string | number | undefined | null): string {
  if (text === null || text === undefined) return '';
  if (typeof text === 'number') return text.toString();
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Auth required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify admin
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Use service role for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check admin
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").single();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { product_name, banner_id } = await req.json();

    // Find all pending pre-orders for this product
    let query = supabase.from("pre_orders").select("*").eq("product_name", product_name).eq("status", "pending");
    if (banner_id) query = query.eq("banner_id", banner_id);
    
    const { data: preOrders, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    if (!preOrders || preOrders.length === 0) {
      return new Response(JSON.stringify({ success: true, notified: 0, message: "No pending pre-orders found" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let emailsSent = 0;
    let notificationsCreated = 0;

    for (const po of preOrders) {
      // Create in-app notification
      await supabase.from("pre_order_notifications").insert({
        user_id: po.user_id,
        pre_order_id: po.id,
        product_name: po.product_name,
        message: `Great news! ${po.product_name} is now in stock. Your reserved quantity of ${po.quantity} is ready for purchase.`,
      });
      notificationsCreated++;

      // Send email if available
      if (po.customer_email) {
        try {
          await resend.emails.send({
            from: "California Farms <orders@zomical.com>",
            to: [po.customer_email],
            subject: `🎉 ${escapeHtml(po.product_name)} is Now Available! - California Farms`,
            html: `
              <!DOCTYPE html>
              <html>
              <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
              <body style="font-family: 'Segoe UI', sans-serif; background: #f8f7f4; margin: 0; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                  <div style="background: linear-gradient(135deg, #16a34a, #15803d); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0;">🌿 California Farms India</h1>
                  </div>
                  <div style="padding: 30px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                      <span style="display: inline-block; background: #22c55e; color: white; padding: 10px 24px; border-radius: 20px; font-weight: bold; font-size: 18px;">
                        ✅ Product Now Available!
                      </span>
                    </div>
                    <p>Dear <strong>${escapeHtml(po.customer_name)}</strong>,</p>
                    <p>Great news! The product you pre-ordered is now in stock and ready for you:</p>
                    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #22c55e; margin: 20px 0;">
                      <h3 style="margin: 0 0 8px; color: #15803d;">${escapeHtml(po.product_name)}</h3>
                      <p style="margin: 4px 0; color: #555;">Reserved Quantity: <strong>${escapeHtml(po.quantity)}</strong></p>
                      <p style="margin: 4px 0; color: #555;">Your products are saved especially for you!</p>
                    </div>
                    <p>Visit our website to complete your purchase now. Your reserved items won't last forever!</p>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="https://cali-farm-fresh.lovable.app/my-pre-orders" style="background: #22c55e; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                        View My Pre-Orders →
                      </a>
                    </div>
                  </div>
                  <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
                    <p>© ${new Date().getFullYear()} California Farms India. All rights reserved.</p>
                  </div>
                </div>
              </body>
              </html>
            `,
          });
          emailsSent++;
        } catch (e) {
          console.error(`Failed to send email to ${po.customer_email}:`, e);
        }
      }

      // Update pre-order status to confirmed
      await supabase.from("pre_orders").update({ status: "confirmed" }).eq("id", po.id);
    }

    return new Response(
      JSON.stringify({ success: true, notified: preOrders.length, emailsSent, notificationsCreated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
};

serve(handler);
