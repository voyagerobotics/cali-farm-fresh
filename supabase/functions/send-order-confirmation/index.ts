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

interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface OrderConfirmationRequest {
  email: string;
  orderNumber: string;
  customerName: string;
  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  total: number;
  deliveryAddress: string;
  deliveryDate: string;
  customerPhone?: string;
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
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
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
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Service role client for logging
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const {
      email,
      orderNumber,
      customerName,
      items,
      subtotal,
      deliveryCharge,
      total,
      deliveryAddress,
      deliveryDate,
      customerPhone,
    }: OrderConfirmationRequest = await req.json();

    if (!email || !orderNumber) {
      return new Response(
        JSON.stringify({ error: "Email and order number are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${escapeHtml(item.product_name)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: center;">${escapeHtml(item.quantity)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">₹${escapeHtml(item.unit_price)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">₹${escapeHtml(item.total_price)}</td>
      </tr>
    `).join("");

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
          .success-badge { display: inline-block; background: #4caf50; color: white; padding: 8px 20px; border-radius: 20px; font-weight: bold; margin: 20px 0; }
          .content { padding: 30px; }
          .order-info { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .order-info p { margin: 8px 0; }
          .order-info strong { color: #2d5a3d; }
          .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .items-table th { background: #2d5a3d; color: white; padding: 12px; text-align: left; }
          .items-table th:last-child, .items-table th:nth-child(2), .items-table th:nth-child(3) { text-align: right; }
          .items-table th:nth-child(2) { text-align: center; }
          .totals { margin-top: 20px; padding-top: 20px; border-top: 2px solid #2d5a3d; }
          .totals-row { display: flex; justify-content: space-between; padding: 8px 0; }
          .totals-row.total { font-size: 20px; font-weight: bold; color: #2d5a3d; border-top: 1px solid #e0e0e0; padding-top: 15px; margin-top: 10px; }
          .delivery-info { background: linear-gradient(135deg, #f0f9f4, #e8f5ed); padding: 20px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #2d5a3d; }
          .footer { background: #333; color: white; padding: 20px; text-align: center; font-size: 12px; }
          .footer a { color: #4caf50; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🌿 California Farms India</h1>
            <p>Fresh from our farms to your table</p>
          </div>
          <div class="content">
            <div style="text-align: center;">
              <div class="success-badge">✓ Order Confirmed!</div>
            </div>
            <p>Dear <strong>${escapeHtml(customerName)}</strong>,</p>
            <p>Thank you for your order! We've received your order and it's being prepared with care.</p>
            <div class="order-info">
              <p><strong>Order Number:</strong> ${escapeHtml(orderNumber)}</p>
              <p><strong>Expected Delivery:</strong> ${escapeHtml(deliveryDate)}</p>
              <p><strong>Delivery Time:</strong> 12:00 PM - 3:00 PM</p>
            </div>
            <h3 style="color: #2d5a3d;">Order Details</h3>
            <table class="items-table">
              <thead>
                <tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>
            <div class="totals">
              <div class="totals-row"><span>Subtotal</span><span>₹${escapeHtml(subtotal)}</span></div>
              <div class="totals-row"><span>Delivery Charge</span><span>${deliveryCharge === 0 ? 'FREE' : `₹${escapeHtml(deliveryCharge)}`}</span></div>
              <div class="totals-row total"><span>Total Amount</span><span>₹${escapeHtml(total)}</span></div>
            </div>
            <div class="delivery-info">
              <h4 style="margin: 0 0 10px; color: #2d5a3d;">📍 Delivery Address</h4>
              <p style="margin: 0; color: #555;">${escapeHtml(deliveryAddress)}</p>
            </div>
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              You'll receive updates about your order status. For any queries, please contact us.
            </p>
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
          .header { background: linear-gradient(135deg, #d97706, #b45309); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .header p { color: rgba(255,255,255,0.8); margin: 10px 0 0; }
          .new-order-badge { display: inline-block; background: #16a34a; color: white; padding: 8px 20px; border-radius: 20px; font-weight: bold; margin: 20px 0; }
          .content { padding: 30px; }
          .customer-info { background: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #d97706; }
          .customer-info p { margin: 8px 0; }
          .customer-info strong { color: #92400e; }
          .order-info { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .order-info p { margin: 8px 0; }
          .order-info strong { color: #2d5a3d; }
          .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .items-table th { background: #d97706; color: white; padding: 12px; text-align: left; }
          .items-table th:last-child, .items-table th:nth-child(2), .items-table th:nth-child(3) { text-align: right; }
          .items-table th:nth-child(2) { text-align: center; }
          .totals { margin-top: 20px; padding-top: 20px; border-top: 2px solid #d97706; }
          .totals-row { display: flex; justify-content: space-between; padding: 8px 0; }
          .totals-row.total { font-size: 20px; font-weight: bold; color: #d97706; border-top: 1px solid #e0e0e0; padding-top: 15px; margin-top: 10px; }
          .delivery-info { background: linear-gradient(135deg, #fef9c3, #fef3c7); padding: 20px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #d97706; }
          .footer { background: #333; color: white; padding: 20px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🛒 New Order Received!</h1>
            <p>California Farms India - Admin Notification</p>
          </div>
          <div class="content">
            <div style="text-align: center;">
              <div class="new-order-badge">📦 New Order: ${escapeHtml(orderNumber)}</div>
            </div>
            <div class="customer-info">
              <h4 style="margin: 0 0 10px; color: #92400e;">👤 Customer Details</h4>
              <p><strong>Name:</strong> ${escapeHtml(customerName)}</p>
              <p><strong>Email:</strong> ${escapeHtml(email)}</p>
              ${customerPhone ? `<p><strong>Phone:</strong> ${escapeHtml(customerPhone)}</p>` : ''}
            </div>
            <div class="order-info">
              <p><strong>Order Number:</strong> ${escapeHtml(orderNumber)}</p>
              <p><strong>Order Date:</strong> ${new Date().toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}</p>
              <p><strong>Delivery Date:</strong> ${escapeHtml(deliveryDate)}</p>
              <p><strong>Delivery Time:</strong> 12:00 PM - 3:00 PM</p>
            </div>
            <h3 style="color: #d97706;">Order Items</h3>
            <table class="items-table">
              <thead>
                <tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>
            <div class="totals">
              <div class="totals-row"><span>Subtotal</span><span>₹${escapeHtml(subtotal)}</span></div>
              <div class="totals-row"><span>Delivery Charge</span><span>${deliveryCharge === 0 ? 'FREE' : `₹${escapeHtml(deliveryCharge)}`}</span></div>
              <div class="totals-row total"><span>Total Amount</span><span>₹${escapeHtml(total)}</span></div>
            </div>
            <div class="delivery-info">
              <h4 style="margin: 0 0 10px; color: #92400e;">📍 Delivery Address</h4>
              <p style="margin: 0; color: #555;">${escapeHtml(deliveryAddress)}</p>
            </div>
            <p style="margin-top: 30px; color: #666; font-size: 14px; text-align: center;">
              <strong>Action Required:</strong> Please prepare this order for delivery.
            </p>
          </div>
          <div class="footer">
            <p>California Farms India - Admin Panel</p>
            <p>© ${new Date().getFullYear()} California Farms India. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const customerSubject = `Order Confirmed! #${escapeHtml(orderNumber)} - California Farms India`;
    const adminSubject = `🛒 New Order #${escapeHtml(orderNumber)} - ₹${escapeHtml(total)} - ${escapeHtml(customerName)}`;

    // Send email to customer
    let customerEmailResponse;
    try {
      customerEmailResponse = await resend.emails.send({
        from: "California Farms <orders@zomical.com>",
        to: [email],
        subject: customerSubject,
        html: customerEmailHtml,
      });

      await logEmail(supabaseAdmin, {
        recipient_email: email,
        recipient_name: customerName,
        subject: customerSubject,
        email_type: "order_confirmation_customer",
        status: customerEmailResponse.error ? "failed" : "sent",
        resend_id: customerEmailResponse.data?.id,
        error_message: customerEmailResponse.error ? JSON.stringify(customerEmailResponse.error) : undefined,
        metadata: { orderNumber },
      });
    } catch (emailError: any) {
      console.error(`[ORDER] Customer email sending failed:`, emailError.message);
      await logEmail(supabaseAdmin, {
        recipient_email: email,
        recipient_name: customerName,
        subject: customerSubject,
        email_type: "order_confirmation_customer",
        status: "failed",
        error_message: emailError.message,
        metadata: { orderNumber },
      });
    }

    // Send email to admins
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
          recipient_email: adminEmail,
          subject: adminSubject,
          email_type: "order_confirmation_admin",
          status: adminEmailResponse.error ? "failed" : "sent",
          resend_id: adminEmailResponse.data?.id,
          error_message: adminEmailResponse.error ? JSON.stringify(adminEmailResponse.error) : undefined,
          metadata: { orderNumber, customerName },
        });
      }
    } catch (emailError: any) {
      console.error(`[ORDER] Admin email sending failed:`, emailError.message);
      for (const adminEmail of ADMIN_EMAILS) {
        await logEmail(supabaseAdmin, {
          recipient_email: adminEmail,
          subject: adminSubject,
          email_type: "order_confirmation_admin",
          status: "failed",
          error_message: emailError.message,
          metadata: { orderNumber },
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Order confirmation sent",
        customerEmailSent: !customerEmailResponse?.error,
        adminEmailSent: !adminEmailResponse?.error
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending order confirmation:", error.message);
    return new Response(
      JSON.stringify({ error: "An error occurred while sending the order confirmation. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
