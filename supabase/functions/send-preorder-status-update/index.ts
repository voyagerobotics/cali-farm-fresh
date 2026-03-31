import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const whatsappToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(text: string | number | undefined | null): string {
  if (text === null || text === undefined) return '';
  if (typeof text === 'number') return text.toString();
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const ADMIN_EMAILS = ["shradhatakalkhede15@gmail.com", "californiafarmsindia@gmail.com"];

const CONTACT_SECTION = `
  <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-top: 20px; text-align: center;">
    <p style="margin: 0 0 8px; color: #166534; font-weight: 600;">Have questions or need help? 💬</p>
    <p style="margin: 0; color: #15803d; font-size: 14px;">Reach out to us anytime at:</p>
    <p style="margin: 8px 0 0;">
      <a href="mailto:californiafarmsindia@gmail.com" style="color: #2d5a3d; font-weight: 600; text-decoration: none;">californiafarmsindia@gmail.com</a>
    </p>
    <p style="margin: 8px 0 0; color: #15803d; font-size: 13px;">📞 +91 8149712801 | +91 7559421334</p>
  </div>
`;

interface PreOrderStatusUpdateRequest {
  preOrderId: string;
  newStatus: string;
}

const statusConfig: Record<string, { title: string; emoji: string; message: string; color: string }> = {
  confirmed: {
    title: "Pre-Order Confirmed!",
    emoji: "✅",
    message: "Great news! Your pre-order has been confirmed. We're preparing your fresh, chemical-free produce with love and care.",
    color: "#2563eb",
  },
  preparing: {
    title: "Pre-Order Being Prepared",
    emoji: "👨‍🍳",
    message: "Your pre-order is now being prepared! We're carefully selecting and packing your fresh, chemical-free produce.",
    color: "#7c3aed",
  },
  out_for_delivery: {
    title: "Pre-Order Out for Delivery!",
    emoji: "🚚",
    message: "Exciting! Your pre-order is on its way to you. Our delivery partner will reach you soon with your fresh produce!",
    color: "#059669",
  },
  delivered: {
    title: "Pre-Order Delivered!",
    emoji: "🎉",
    message: "Your pre-order has been delivered successfully! Enjoy your fresh, chemical-free produce straight from our farm to your table.",
    color: "#16a34a",
  },
  cancelled: {
    title: "Pre-Order Cancelled",
    emoji: "❌",
    message: "We're sorry to let you know that your pre-order has been cancelled. If you believe this was a mistake or have any concerns, please don't hesitate to reach out to us.",
    color: "#dc2626",
  },
  fulfilled: {
    title: "Pre-Order Fulfilled!",
    emoji: "🎉",
    message: "Your pre-order has been fulfilled and delivered! We hope you enjoy your fresh, chemical-free produce straight from our farm to your table.",
    color: "#16a34a",
  },
  pending: {
    title: "Pre-Order Update",
    emoji: "⏳",
    message: "Your pre-order status has been updated to pending. We'll keep you informed as things progress.",
    color: "#d97706",
  },
};

// WhatsApp template mapping for pre-order statuses
const whatsappTemplateMap: Record<string, string> = {
  confirmed: "order_confirmed",
  out_for_delivery: "order_out_for_delivery",
  delivered: "order_delivered",
  fulfilled: "order_delivered",
};

async function sendWhatsAppTemplate(phone: string, templateName: string, params: string[]) {
  if (!whatsappToken || !phoneNumberId) {
    console.log("WhatsApp credentials not configured, skipping WhatsApp notification");
    return;
  }

  // Format phone: ensure it starts with country code, no + sign
  let formattedPhone = phone.replace(/[\s\-\(\)]/g, "");
  if (formattedPhone.startsWith("+")) formattedPhone = formattedPhone.substring(1);
  if (!formattedPhone.startsWith("91") && formattedPhone.length === 10) {
    formattedPhone = "91" + formattedPhone;
  }

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${whatsappToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "template",
        template: {
          name: templateName,
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: params.map((p) => ({ type: "text", text: p })),
            },
          ],
        },
      }),
    });
    const data = await res.json();
    console.log(`WhatsApp template '${templateName}' sent to ${formattedPhone}:`, JSON.stringify(data));
    return data;
  } catch (err) {
    console.error(`WhatsApp template send failed for ${formattedPhone}:`, err);
  }
}

async function logEmail(supabase: any, data: {
  recipient_email: string;
  recipient_name?: string;
  subject: string;
  email_type: string;
  status: string;
  resend_id?: string;
  error_message?: string;
  related_preorder_id?: string;
  metadata?: any;
}) {
  try {
    await supabase.from("email_logs").insert({
      recipient_email: data.recipient_email,
      recipient_name: data.recipient_name || null,
      subject: data.subject,
      email_type: data.email_type,
      status: data.status,
      resend_id: data.resend_id || null,
      error_message: data.error_message || null,
      related_preorder_id: data.related_preorder_id || null,
      metadata: data.metadata || null,
    });
  } catch (e) {
    console.error("Failed to log email:", e);
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { preOrderId, newStatus }: PreOrderStatusUpdateRequest = await req.json();

    if (!preOrderId || !newStatus) {
      return new Response(JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Fetch pre-order details
    const { data: preOrder, error: poError } = await supabaseAdmin
      .from("pre_orders")
      .select("*")
      .eq("id", preOrderId)
      .maybeSingle();

    if (poError || !preOrder) {
      return new Response(JSON.stringify({ error: "Pre-order not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Get customer email from auth
    let customerEmail: string | null = null;
    if (preOrder.user_id) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(preOrder.user_id);
      if (userData?.user?.email) {
        customerEmail = userData.user.email;
      }
    }
    if (!customerEmail) {
      customerEmail = preOrder.customer_email;
    }

    // ─── Send WhatsApp Template Message ───
    const waTemplateName = whatsappTemplateMap[newStatus];
    if (waTemplateName && preOrder.customer_phone) {
      const preOrderNumber = `PRE-${preOrder.id.substring(0, 8).toUpperCase()}`;
      const totalAmount = preOrder.payment_amount ? `₹${preOrder.payment_amount}` : "N/A";
      
      let templateParams: string[] = [];
      
      if (waTemplateName === "order_confirmed") {
        // order_confirmed template: {{1}} = order number, {{2}} = total amount, {{3}} = delivery time
        templateParams = [preOrderNumber, totalAmount, "As per schedule"];
      } else if (waTemplateName === "order_out_for_delivery") {
        // order_out_for_delivery template: {{1}} = order number, {{2}} = delivery time
        templateParams = [preOrderNumber, "Shortly"];
      } else if (waTemplateName === "order_delivered") {
        // order_delivered template: {{1}} = order number
        templateParams = [preOrderNumber];
      }

      await sendWhatsAppTemplate(preOrder.customer_phone, waTemplateName, templateParams);
    }

    if (!customerEmail) {
      return new Response(JSON.stringify({ success: true, message: "WhatsApp sent, no customer email found for email notification" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const info = statusConfig[newStatus];
    if (!info) {
      return new Response(JSON.stringify({ success: true, message: "No email for this status" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const statusDate = new Date().toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
    const preOrderNumber = `PRE-${preOrder.id.substring(0, 8).toUpperCase()}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f7f4; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, ${info.color}, ${info.color}dd); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px; }
          .content { padding: 30px; }
          .info-box { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .info-box p { margin: 8px 0; }
          .info-box strong { color: #2d5a3d; }
          .progress-container { margin: 30px 0; }
          .progress-bar { display: flex; justify-content: space-between; position: relative; }
          .progress-bar::before { content: ''; position: absolute; top: 15px; left: 0; right: 0; height: 3px; background: #e0e0e0; z-index: 0; }
          .progress-step { display: flex; flex-direction: column; align-items: center; z-index: 1; }
          .progress-dot { width: 32px; height: 32px; border-radius: 50%; background: #e0e0e0; display: flex; align-items: center; justify-content: center; font-size: 14px; margin-bottom: 8px; }
          .progress-dot.active { background: ${info.color}; color: white; }
          .progress-dot.completed { background: #16a34a; color: white; }
          .progress-label { font-size: 11px; color: #666; text-align: center; max-width: 60px; }
          .footer { background: #333; color: white; padding: 20px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div style="font-size: 50px; margin-bottom: 10px;">${info.emoji}</div>
            <h1>${info.title}</h1>
            <p>Pre-Order #${escapeHtml(preOrderNumber)}</p>
          </div>
          <div class="content">
            <p>Dear <strong>${escapeHtml(preOrder.customer_name)}</strong>,</p>
            <div style="background: linear-gradient(135deg, ${newStatus === 'cancelled' ? '#fef2f2' : '#f0fdf4'}, ${newStatus === 'cancelled' ? '#fff1f2' : '#ecfdf5'}); padding: 20px; border-radius: 12px; border-left: 4px solid ${info.color}; margin: 20px 0;">
              <p style="margin: 0; font-size: 16px; color: ${newStatus === 'cancelled' ? '#991b1b' : '#166534'}; line-height: 1.6;">${info.message}</p>
            </div>
            ${['confirmed', 'preparing', 'out_for_delivery', 'delivered', 'fulfilled'].includes(newStatus) && newStatus !== 'cancelled' ? `
            <div class="progress-container">
              <div class="progress-bar">
                <div class="progress-step"><div class="progress-dot ${['confirmed', 'preparing', 'out_for_delivery', 'delivered', 'fulfilled'].includes(newStatus) ? 'completed' : ''}">✓</div><span class="progress-label">Confirmed</span></div>
                <div class="progress-step"><div class="progress-dot ${['preparing', 'out_for_delivery', 'delivered', 'fulfilled'].includes(newStatus) ? 'completed' : ''}">📦</div><span class="progress-label">Preparing</span></div>
                <div class="progress-step"><div class="progress-dot ${['out_for_delivery', 'delivered', 'fulfilled'].includes(newStatus) ? 'completed' : ''}">🚚</div><span class="progress-label">Out for Delivery</span></div>
                <div class="progress-step"><div class="progress-dot ${['delivered', 'fulfilled'].includes(newStatus) ? 'completed' : ''}">🎉</div><span class="progress-label">Delivered</span></div>
              </div>
            </div>
            ` : ''}
            ${newStatus === 'out_for_delivery' && preOrder.delivery_address ? `
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 20px;">
              <h4 style="margin: 0 0 10px; color: #92400e;">📍 Delivering To</h4>
              <p style="margin: 0; color: #555;">${escapeHtml(preOrder.delivery_address)}</p>
            </div>
            ` : ''}
            ${newStatus === 'delivered' || newStatus === 'fulfilled' ? `
            <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
              <div style="font-size: 40px; margin-bottom: 10px;">🌿</div>
              <p style="margin: 0; color: #166534; font-weight: 600;">Fresh from our farm to your table!</p>
              <p style="margin: 8px 0 0; color: #15803d; font-size: 14px;">100% chemical-free, grown with love and patience. Thank you for choosing California Farms! 💚</p>
            </div>
            ` : ''}
            ${newStatus === 'cancelled' ? `
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
              <div style="font-size: 40px; margin-bottom: 10px;">🙁</div>
              <p style="margin: 0; color: #991b1b; font-weight: 600;">We're sorry to see this order go</p>
              <p style="margin: 8px 0 0; color: #b91c1c; font-size: 14px;">If you'd like to place a new order or have any questions, we're always here for you.</p>
            </div>
            ` : ''}
            <div class="info-box">
              <p><strong>Product:</strong> ${escapeHtml(preOrder.product_name)}</p>
              <p><strong>Quantity:</strong> ${escapeHtml(preOrder.quantity)}</p>
              ${preOrder.delivery_address ? `<p><strong>Delivery Address:</strong> ${escapeHtml(preOrder.delivery_address)}</p>` : ''}
              ${preOrder.payment_amount ? `<p><strong>Amount:</strong> ₹${escapeHtml(preOrder.payment_amount)}</p>` : ''}
              ${preOrder.notes ? `<p><strong>Notes:</strong> ${escapeHtml(preOrder.notes)}</p>` : ''}
              <p><strong>Status Updated:</strong> ${statusDate}</p>
            </div>
            ${CONTACT_SECTION}
          </div>
          <div class="footer">
            <p>Thank you for choosing California Farms India!</p>
            <p>📧 californiafarmsindia@gmail.com | 📞 +91 8149712801</p>
            <p>© ${new Date().getFullYear()} California Farms India. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const subject = `${info.emoji} ${info.title} - ${escapeHtml(preOrder.product_name)} | California Farms`;

    // Send to customer
    let emailResponse;
    try {
      emailResponse = await resend.emails.send({
        from: "California Farms <orders@zomical.com>",
        to: [customerEmail],
        subject,
        html: emailHtml,
      });
      await logEmail(supabaseAdmin, {
        recipient_email: customerEmail,
        recipient_name: preOrder.customer_name,
        subject,
        email_type: "preorder_status_update",
        status: emailResponse.error ? "failed" : "sent",
        resend_id: emailResponse.data?.id,
        error_message: emailResponse.error ? JSON.stringify(emailResponse.error) : undefined,
        related_preorder_id: preOrderId,
        metadata: { productName: preOrder.product_name, newStatus },
      });
    } catch (err: any) {
      await logEmail(supabaseAdmin, {
        recipient_email: customerEmail,
        recipient_name: preOrder.customer_name,
        subject,
        email_type: "preorder_status_update",
        status: "failed",
        error_message: err.message,
        related_preorder_id: preOrderId,
        metadata: { productName: preOrder.product_name, newStatus },
      });
    }

    // Send to admins
    try {
      await resend.emails.send({
        from: "California Farms <orders@zomical.com>",
        to: ADMIN_EMAILS,
        subject: `${info.emoji} Pre-Order ${newStatus}: ${escapeHtml(preOrder.product_name)} - ${escapeHtml(preOrder.customer_name)}`,
        html: emailHtml,
      });
    } catch (adminErr) {
      console.error("Admin email failed:", adminErr);
    }

    return new Response(JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: any) {
    console.error("Error:", error.message);
    return new Response(JSON.stringify({ error: "An error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

serve(handler);
