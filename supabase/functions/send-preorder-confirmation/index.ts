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

interface PreOrderConfirmationRequest {
  email: string;
  customerName: string;
  customerPhone: string;
  productName: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalAmount: number;
  paymentStatus: string;
  razorpayPaymentId?: string;
  notes?: string;
  deliveryAddress?: string;
  deliveryCharge?: number;
  deliveryDistance?: number;
}

const ADMIN_EMAILS = ["californiafarmsmail@gmail.com", "shradhatakalkhede15@gmail.com", "californiafarmsindia@gmail.com"];

async function logEmail(supabase: any, data: {
  recipient_email: string;
  recipient_name?: string;
  subject: string;
  email_type: string;
  status: string;
  resend_id?: string;
  error_message?: string;
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
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const {
      email, customerName, customerPhone, productName, quantity, unit,
      pricePerUnit, totalAmount, paymentStatus, razorpayPaymentId,
      notes, deliveryAddress, deliveryCharge, deliveryDistance,
    }: PreOrderConfirmationRequest = await req.json();

    if (!email || !productName) {
      return new Response(JSON.stringify({ error: "Email and product name are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const preOrderId = `PRE-${Date.now()}`;
    const isPaid = paymentStatus === "paid";
    const orderDate = new Date().toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' });

    const customerEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f7f4; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #2d5a3d, #1e4030); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .header p { color: rgba(255,255,255,0.8); margin: 10px 0 0; }
          .badge { display: inline-block; background: #d97706; color: white; padding: 8px 20px; border-radius: 20px; font-weight: bold; margin: 20px 0; }
          .content { padding: 30px; }
          .info-box { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .info-box p { margin: 8px 0; }
          .info-box strong { color: #2d5a3d; }
          .invoice-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .invoice-table th { background: #2d5a3d; color: white; padding: 12px; text-align: left; }
          .invoice-table th:last-child, .invoice-table th:nth-child(2), .invoice-table th:nth-child(3) { text-align: right; }
          .invoice-table th:nth-child(2) { text-align: center; }
          .invoice-table td { padding: 12px; border-bottom: 1px solid #e0e0e0; }
          .total-row { display: flex; justify-content: space-between; padding: 12px 0; font-size: 18px; font-weight: bold; color: #2d5a3d; border-top: 2px solid #2d5a3d; margin-top: 10px; }
          .payment-info { background: ${isPaid ? '#f0fdf4' : '#fefce8'}; padding: 20px; border-radius: 8px; margin-top: 20px; border-left: 4px solid ${isPaid ? '#16a34a' : '#d97706'}; }
          .footer { background: #333; color: white; padding: 20px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🌿 California Farms India</h1>
            <p>Pre-Order Confirmation</p>
          </div>
          <div class="content">
            <div style="text-align: center;"><div class="badge">📋 Pre-Order ${isPaid ? 'Confirmed & Paid' : 'Received'}!</div></div>
            <p>Dear <strong>${escapeHtml(customerName)}</strong>,</p>
            <p>Thank you so much for your pre-order! 🌱 We've received it and your fresh goodness is on its way.</p>
            <div style="background: linear-gradient(135deg, #f0fdf4, #ecfdf5); padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #22c55e;">
              <p style="margin: 0 0 10px; font-size: 16px; color: #166534; font-weight: 600;">🍉 Good things take time...</p>
              <p style="margin: 0; color: #15803d; line-height: 1.6;">At California Farms, we grow everything the way nature intended — <strong>completely chemical-free</strong>. No shortcuts, no pesticides, no artificial ripening. Our produce takes its own sweet time to grow, ripen, and reach that perfect burst of flavour.</p>
              <p style="margin: 10px 0 0; color: #15803d; line-height: 1.6;">So when it reaches your doorstep, you'll know it was worth the wait. 🌿</p>
            </div>
            <p>We'll deliver your order as soon as it's ready — and trust us, it's almost there! 🎉</p>
            <div class="info-box">
              <p><strong>Pre-Order ID:</strong> ${escapeHtml(preOrderId)}</p>
              <p><strong>Date:</strong> ${orderDate}</p>
              ${deliveryAddress ? `<p><strong>Delivery Address:</strong> ${escapeHtml(deliveryAddress)}</p>` : ''}
              ${deliveryDistance ? `<p><strong>Distance:</strong> ${escapeHtml(deliveryDistance?.toFixed(1))} km</p>` : ''}
            </div>
            <h3 style="color: #2d5a3d;">📦 Pre-Order Invoice</h3>
            <table class="invoice-table">
              <thead><tr><th>Product</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
              <tbody><tr>
                <td>${escapeHtml(productName)}</td>
                <td style="text-align: center;">${escapeHtml(quantity)} ${escapeHtml(unit)}</td>
                <td style="text-align: right;">₹${escapeHtml(pricePerUnit)}/${escapeHtml(unit)}</td>
                <td style="text-align: right;">₹${escapeHtml(totalAmount)}</td>
              </tr></tbody>
            </table>
            ${(deliveryCharge != null && deliveryCharge > 0) ? `<div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #666;"><span>Delivery Charge</span><span>₹${escapeHtml(deliveryCharge)}</span></div>` : (deliveryAddress ? `<div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #16a34a;"><span>Delivery</span><span>🎉 Free</span></div>` : '')}
            <div class="total-row"><span>Total Amount</span><span>₹${escapeHtml(totalAmount)}</span></div>
            <div class="payment-info">
              <h4 style="margin: 0 0 10px; color: ${isPaid ? '#16a34a' : '#d97706'};">${isPaid ? '✅ Payment Successful' : '⏳ Payment Pending'}</h4>
              ${isPaid ? `<p style="margin: 4px 0; color: #555;">Payment ID: ${escapeHtml(razorpayPaymentId)}</p><p style="margin: 4px 0; color: #555;">Amount Paid: ₹${escapeHtml(totalAmount)}</p>` : `<p style="margin: 4px 0; color: #555;">Payment will be collected when the product is in stock.</p>`}
            </div>
            ${notes ? `<div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-top: 15px;"><p style="margin: 0; color: #666; font-size: 14px;"><strong>Your Notes:</strong> ${escapeHtml(notes)}</p></div>` : ''}
            <p style="margin-top: 30px; color: #666; font-size: 14px;">We're nurturing your order with love and care — just like we nurture our farm. We'll notify you the moment it's ready for delivery! 🌾</p>
            <p style="color: #999; font-size: 13px; font-style: italic;">"Patience is the secret ingredient in every bite of goodness." — Team California Farms 💚</p>
          </div>
          <div class="footer">
            <p>Thank you for choosing California Farms India!</p>
            <p>© ${new Date().getFullYear()} California Farms India. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const adminEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f7f4; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #7c3aed, #5b21b6); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .header p { color: rgba(255,255,255,0.8); margin: 10px 0 0; }
          .badge { display: inline-block; background: #16a34a; color: white; padding: 8px 20px; border-radius: 20px; font-weight: bold; margin: 20px 0; }
          .content { padding: 30px; }
          .customer-info { background: #f3e8ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #7c3aed; }
          .customer-info p { margin: 8px 0; }
          .customer-info strong { color: #5b21b6; }
          .info-box { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .info-box p { margin: 8px 0; }
          .footer { background: #333; color: white; padding: 20px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 New Pre-Order Received!</h1>
            <p>California Farms India - Admin Notification</p>
          </div>
          <div class="content">
            <div style="text-align: center;"><div class="badge">🛒 Pre-Order: ${escapeHtml(productName)}</div></div>
            <div class="customer-info">
              <h4 style="margin: 0 0 10px; color: #5b21b6;">👤 Customer Details</h4>
              <p><strong>Name:</strong> ${escapeHtml(customerName)}</p>
              <p><strong>Email:</strong> ${escapeHtml(email)}</p>
              <p><strong>Phone:</strong> ${escapeHtml(customerPhone)}</p>
            </div>
            <div class="info-box">
              <p><strong>Product:</strong> ${escapeHtml(productName)}</p>
              <p><strong>Quantity:</strong> ${escapeHtml(quantity)} ${escapeHtml(unit)}</p>
              <p><strong>Rate:</strong> ₹${escapeHtml(pricePerUnit)}/${escapeHtml(unit)}</p>
              <p><strong>Total:</strong> ₹${escapeHtml(totalAmount)}</p>
              ${deliveryAddress ? `<p><strong>Delivery Address:</strong> ${escapeHtml(deliveryAddress)}</p>` : ''}
              ${deliveryCharge != null ? `<p><strong>Delivery Charge:</strong> ${deliveryCharge > 0 ? '₹' + escapeHtml(deliveryCharge) : '🎉 Free'}</p>` : ''}
              ${deliveryDistance ? `<p><strong>Distance:</strong> ${escapeHtml(deliveryDistance?.toFixed(1))} km</p>` : ''}
              <p><strong>Payment:</strong> ${isPaid ? `✅ Paid (${escapeHtml(razorpayPaymentId)})` : '⏳ Pending (pay later)'}</p>
              ${notes ? `<p><strong>Notes:</strong> ${escapeHtml(notes)}</p>` : ''}
              <p><strong>Date:</strong> ${orderDate}</p>
            </div>
          </div>
          <div class="footer">
            <p>California Farms India - Admin Panel</p>
            <p>© ${new Date().getFullYear()} California Farms India. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const customerSubject = `Pre-Order Confirmed! ${escapeHtml(productName)} - California Farms India`;
    const adminSubject = `📋 New Pre-Order: ${escapeHtml(productName)} × ${escapeHtml(quantity)} - ${escapeHtml(customerName)}`;

    // Send to customer
    let customerEmailResponse;
    try {
      customerEmailResponse = await resend.emails.send({
        from: "California Farms <orders@zomical.com>",
        to: [email],
        subject: customerSubject,
        html: customerEmailHtml,
      });
      await logEmail(supabaseAdmin, {
        recipient_email: email, recipient_name: customerName, subject: customerSubject,
        email_type: "preorder_confirmation_customer",
        status: customerEmailResponse.error ? "failed" : "sent",
        resend_id: customerEmailResponse.data?.id,
        error_message: customerEmailResponse.error ? JSON.stringify(customerEmailResponse.error) : undefined,
        metadata: { productName, quantity },
      });
    } catch (err: any) {
      await logEmail(supabaseAdmin, {
        recipient_email: email, recipient_name: customerName, subject: customerSubject,
        email_type: "preorder_confirmation_customer", status: "failed", error_message: err.message,
        metadata: { productName, quantity },
      });
    }

    // Send to admins
    let adminEmailResponse;
    try {
      adminEmailResponse = await resend.emails.send({
        from: "California Farms <orders@zomical.com>",
        to: ADMIN_EMAILS,
        subject: adminSubject,
        html: adminEmailHtml,
      });
      for (const adminEmail of ADMIN_EMAILS) {
        await logEmail(supabaseAdmin, {
          recipient_email: adminEmail, subject: adminSubject,
          email_type: "preorder_confirmation_admin",
          status: adminEmailResponse.error ? "failed" : "sent",
          resend_id: adminEmailResponse.data?.id,
          error_message: adminEmailResponse.error ? JSON.stringify(adminEmailResponse.error) : undefined,
          metadata: { productName, customerName, quantity },
        });
      }
    } catch (err: any) {
      for (const adminEmail of ADMIN_EMAILS) {
        await logEmail(supabaseAdmin, {
          recipient_email: adminEmail, subject: adminSubject,
          email_type: "preorder_confirmation_admin", status: "failed", error_message: err.message,
          metadata: { productName, customerName },
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      customerEmailSent: !customerEmailResponse?.error,
      adminEmailSent: !adminEmailResponse?.error,
    }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: any) {
    console.error("[PRE-ORDER] Error:", error.message);
    return new Response(JSON.stringify({ error: "An error occurred while sending the pre-order confirmation." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

serve(handler);
