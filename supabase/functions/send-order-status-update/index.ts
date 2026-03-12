import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

interface OrderStatusUpdateRequest {
  orderId: string;
  orderNumber: string;
  customerName: string;
  newStatus: string;
  deliveryAddress: string;
  userId?: string;
}

const statusMessages: Record<string, { title: string; emoji: string; message: string; color: string }> = {
  pending: { title: "Order Pending – Payment Required", emoji: "⏳", message: "Your order is currently pending as the payment has not been completed yet. Please complete your payment to enjoy our delicious, zero-chemical fresh produce delivered to your doorstep!", color: "#d97706" },
  confirmed: { title: "Order Confirmed!", emoji: "✅", message: "Great news! Your order has been confirmed and we're preparing it with care.", color: "#2563eb" },
  preparing: { title: "Order Being Prepared", emoji: "👨‍🍳", message: "Your order is now being prepared. We're carefully packing fresh produce for you.", color: "#7c3aed" },
  out_for_delivery: { title: "Out for Delivery!", emoji: "🚚", message: "Exciting! Your order is on its way. Our delivery partner will reach you soon.", color: "#059669" },
  delivered: { title: "Order Delivered!", emoji: "🎉", message: "Your order has been delivered successfully. Enjoy your fresh produce!", color: "#16a34a" },
  cancelled: { title: "Order Cancelled", emoji: "❌", message: "Your order has been cancelled. If you have any questions, please contact us.", color: "#dc2626" }
};

async function logEmail(supabase: any, data: {
  recipient_email: string;
  recipient_name?: string;
  subject: string;
  email_type: string;
  status: string;
  resend_id?: string;
  error_message?: string;
  related_order_id?: string;
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
      related_order_id: data.related_order_id || null,
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
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { orderId, orderNumber, customerName, newStatus, deliveryAddress, userId }: OrderStatusUpdateRequest = await req.json();

    // Get customer email
    let customerEmail: string | null = null;
    if (userId) {
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (!userError && userData?.user?.email) {
        customerEmail = userData.user.email;
      }
    }

    if (!orderNumber || !newStatus) {
      return new Response(JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    
    if (!customerEmail) {
      return new Response(JSON.stringify({ success: true, message: "No customer email found, skipping notification" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const statusInfo = statusMessages[newStatus];
    if (!statusInfo) {
      return new Response(JSON.stringify({ success: true, message: "No email needed for this status" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f7f4; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, ${statusInfo.color}, ${statusInfo.color}dd); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px; }
          .status-emoji { font-size: 60px; margin-bottom: 10px; }
          .content { padding: 30px; }
          .order-box { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .order-box p { margin: 8px 0; }
          .order-box strong { color: #2d5a3d; }
          .message-box { background: linear-gradient(135deg, #f0f9f4, #e8f5ed); padding: 20px; border-radius: 8px; border-left: 4px solid ${statusInfo.color}; margin: 20px 0; }
          .progress-container { margin: 30px 0; }
          .progress-bar { display: flex; justify-content: space-between; position: relative; }
          .progress-bar::before { content: ''; position: absolute; top: 15px; left: 0; right: 0; height: 3px; background: #e0e0e0; z-index: 0; }
          .progress-step { display: flex; flex-direction: column; align-items: center; z-index: 1; }
          .progress-dot { width: 32px; height: 32px; border-radius: 50%; background: #e0e0e0; display: flex; align-items: center; justify-content: center; font-size: 14px; margin-bottom: 8px; }
          .progress-dot.active { background: ${statusInfo.color}; color: white; }
          .progress-dot.completed { background: #16a34a; color: white; }
          .progress-label { font-size: 11px; color: #666; text-align: center; max-width: 60px; }
          .delivery-info { background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 20px; }
          .footer { background: #333; color: white; padding: 20px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="status-emoji">${statusInfo.emoji}</div>
            <h1>${statusInfo.title}</h1>
            <p>Order #${escapeHtml(orderNumber)}</p>
          </div>
          <div class="content">
            <p>Dear <strong>${escapeHtml(customerName)}</strong>,</p>
            <div class="message-box"><p style="margin: 0; font-size: 16px;">${statusInfo.message}</p></div>
            ${newStatus === 'cancelled' ? `
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
              <div style="font-size: 40px; margin-bottom: 10px;">❌</div>
              <p style="margin: 0; color: #991b1b; font-weight: 600; font-size: 16px;">This order has been cancelled</p>
              <p style="margin: 8px 0 0; color: #b91c1c; font-size: 14px;">If you have any questions or need assistance, please don't hesitate to reach out to us.</p>
            </div>
            ` : newStatus === 'delivered' ? `
            <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
              <div style="font-size: 40px; margin-bottom: 10px;">🎉</div>
              <p style="margin: 0; color: #166534; font-weight: 600; font-size: 16px;">Your order has been delivered!</p>
              <p style="margin: 8px 0 0; color: #15803d; font-size: 14px;">Enjoy your fresh, chemical-free produce. Thank you for choosing California Farms! 🌿</p>
            </div>
            <div class="progress-container">
              <div class="progress-bar">
                <div class="progress-step"><div class="progress-dot completed">✓</div><span class="progress-label">Confirmed</span></div>
                <div class="progress-step"><div class="progress-dot completed">✓</div><span class="progress-label">Preparing</span></div>
                <div class="progress-step"><div class="progress-dot completed">✓</div><span class="progress-label">Out for Delivery</span></div>
                <div class="progress-step"><div class="progress-dot completed">✓</div><span class="progress-label">Delivered</span></div>
              </div>
            </div>
            ` : `
            <div class="progress-container">
              <div class="progress-bar">
                <div class="progress-step"><div class="progress-dot ${['confirmed', 'preparing', 'out_for_delivery', 'delivered'].includes(newStatus) ? 'completed' : ''}">✓</div><span class="progress-label">Confirmed</span></div>
                <div class="progress-step"><div class="progress-dot ${['preparing', 'out_for_delivery', 'delivered'].includes(newStatus) ? 'completed' : ''}">📦</div><span class="progress-label">Preparing</span></div>
                <div class="progress-step"><div class="progress-dot ${['out_for_delivery', 'delivered'].includes(newStatus) ? 'completed' : ''}">🚚</div><span class="progress-label">Out for Delivery</span></div>
                <div class="progress-step"><div class="progress-dot ${newStatus === 'delivered' ? 'completed' : ''}">🎉</div><span class="progress-label">Delivered</span></div>
              </div>
            </div>
            `}
            ${newStatus === 'out_for_delivery' ? `<div class="delivery-info"><h4 style="margin: 0 0 10px; color: #92400e;">📍 Delivering To</h4><p style="margin: 0; color: #555;">${escapeHtml(deliveryAddress)}</p></div>` : ''}
            <div class="order-box">
              <p><strong>Order Number:</strong> ${escapeHtml(orderNumber)}</p>
              <p><strong>Status Updated:</strong> ${new Date().toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}</p>
            </div>
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-top: 20px; text-align: center;">
              <p style="margin: 0 0 8px; color: #166534; font-weight: 600;">Have questions or need help? 💬</p>
              <p style="margin: 0; color: #15803d; font-size: 14px;">Reach out to us anytime at:</p>
              <p style="margin: 8px 0 0;"><a href="mailto:californiafarmsindia@gmail.com" style="color: #2d5a3d; font-weight: 600; text-decoration: none;">californiafarmsindia@gmail.com</a></p>
              <p style="margin: 8px 0 0; color: #15803d; font-size: 13px;">📞 +91 8149712801 | +91 7559421334</p>
            </div>
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

    const subject = `${statusInfo.emoji} ${statusInfo.title} - Order #${orderNumber}`;
    const ADMIN_EMAILS = ["shradhatakalkhede15@gmail.com", "californiafarmsindia@gmail.com"];

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
        recipient_name: customerName,
        subject,
        email_type: "status_update",
        status: emailResponse.error ? "failed" : "sent",
        resend_id: emailResponse.data?.id,
        error_message: emailResponse.error ? JSON.stringify(emailResponse.error) : undefined,
        related_order_id: orderId,
        metadata: { orderNumber, newStatus },
      });
    } catch (emailError: any) {
      await logEmail(supabaseAdmin, {
        recipient_email: customerEmail,
        recipient_name: customerName,
        subject,
        email_type: "status_update",
        status: "failed",
        error_message: emailError.message,
        related_order_id: orderId,
        metadata: { orderNumber, newStatus },
      });
    }

    // Send to admins
    const adminSubject = `${statusInfo.emoji} ${statusInfo.title} - Order #${orderNumber} - ${customerName}`;
    try {
      await resend.emails.send({
        from: "California Farms <orders@zomical.com>",
        to: ADMIN_EMAILS,
        subject: adminSubject,
        html: emailHtml,
      });

      for (const adminEmail of ADMIN_EMAILS) {
        await logEmail(supabaseAdmin, {
          recipient_email: adminEmail,
          subject: adminSubject,
          email_type: "status_update_admin",
          status: "sent",
          related_order_id: orderId,
          metadata: { orderNumber, newStatus, customerName },
        });
      }
    } catch (adminEmailError: any) {
      console.error("Admin status update email failed:", adminEmailError.message);
      for (const adminEmail of ADMIN_EMAILS) {
        await logEmail(supabaseAdmin, {
          recipient_email: adminEmail,
          subject: adminSubject,
          email_type: "status_update_admin",
          status: "failed",
          error_message: adminEmailError.message,
          related_order_id: orderId,
          metadata: { orderNumber, newStatus },
        });
      }
    }

    if (emailResponse?.error) {
      return new Response(JSON.stringify({ success: false, error: "Failed to send email" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    return new Response(JSON.stringify({ success: true, emailId: emailResponse?.data?.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: any) {
    console.error("Error sending status update:", error);
    return new Response(JSON.stringify({ error: "An error occurred while sending the status update" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

serve(handler);
