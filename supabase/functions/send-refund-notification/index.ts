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

const ADMIN_EMAILS = ["shradhatakalkhede15@gmail.com", "californiafarmsindia@gmail.com"];

interface RefundNotificationRequest {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail?: string;
  userId?: string;
  refundAmount: number;
  totalAmount: number;
  type: "refund_initiated" | "refund_completed";
  paymentMethod?: string;
  paymentId?: string;
}

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

function buildRefundInitiatedHtml(data: RefundNotificationRequest, isAdmin: boolean) {
  const headerBg = isAdmin ? "linear-gradient(135deg, #d97706, #b45309)" : "linear-gradient(135deg, #2563eb, #1d4ed8)";
  const accentColor = isAdmin ? "#d97706" : "#2563eb";
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f7f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: ${headerBg}; padding: 30px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .header p { color: rgba(255,255,255,0.8); margin: 10px 0 0; }
        .content { padding: 30px; }
        .refund-badge { display: inline-block; background: #f59e0b; color: white; padding: 8px 20px; border-radius: 20px; font-weight: bold; margin: 20px 0; }
        .info-box { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${accentColor}; }
        .info-box p { margin: 8px 0; }
        .info-box strong { color: #333; }
        .amount-box { background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #f59e0b; }
        .amount-box .amount { font-size: 32px; font-weight: bold; color: #d97706; }
        .timeline-note { background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb; }
        .footer { background: #333; color: white; padding: 20px; text-align: center; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💰 Refund Being Processed</h1>
          <p>${isAdmin ? 'Admin Notification' : 'California Farms India'}</p>
        </div>
        <div class="content">
          <div style="text-align: center;">
            <div class="refund-badge">⏳ Refund Initiated</div>
          </div>
          ${isAdmin ? `
          <div class="info-box">
            <h4 style="margin: 0 0 10px; color: #92400e;">👤 Customer Details</h4>
            <p><strong>Name:</strong> ${escapeHtml(data.customerName)}</p>
            <p><strong>Email:</strong> ${escapeHtml(data.customerEmail)}</p>
          </div>
          ` : `
          <p>Dear <strong>${escapeHtml(data.customerName)}</strong>,</p>
          `}
          <p>The refund for Order <strong>#${escapeHtml(data.orderNumber)}</strong> has been initiated and is currently being processed.</p>
          
          <div class="amount-box">
            <p style="margin: 0 0 5px; color: #666; font-size: 14px;">Refund Amount</p>
            <div class="amount">₹${escapeHtml(data.refundAmount)}</div>
          </div>
          
          <div class="info-box">
            <p><strong>Order Number:</strong> #${escapeHtml(data.orderNumber)}</p>
            <p><strong>Original Order Amount:</strong> ₹${escapeHtml(data.totalAmount)}</p>
            <p><strong>Refund Amount:</strong> ₹${escapeHtml(data.refundAmount)}</p>
            ${data.paymentMethod ? `<p><strong>Payment Method:</strong> ${escapeHtml(data.paymentMethod === 'online' ? 'Razorpay (Online)' : 'Cash on Delivery')}</p>` : ''}
            ${data.paymentId ? `<p><strong>Transaction ID:</strong> ${escapeHtml(data.paymentId)}</p>` : ''}
            <p><strong>Status:</strong> ⏳ Processing</p>
          </div>

          <div class="timeline-note">
            <p style="margin: 0; font-size: 14px;">
              <strong>📅 Expected Timeline:</strong> Your refund will be processed and credited back to your original payment method within <strong>5-7 working days</strong>.
            </p>
          </div>

          ${!isAdmin ? `
          <p style="color: #666; font-size: 14px;">
            You will receive another email once the refund has been successfully completed.
          </p>
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-top: 20px; text-align: center;">
            <p style="margin: 0 0 8px; color: #166534; font-weight: 600;">Have questions or need help? 💬</p>
            <p style="margin: 0; color: #15803d; font-size: 14px;">Reach out to us anytime at:</p>
            <p style="margin: 8px 0 0;"><a href="mailto:californiafarmsindia@gmail.com" style="color: #2d5a3d; font-weight: 600; text-decoration: none;">californiafarmsindia@gmail.com</a></p>
            <p style="margin: 8px 0 0; color: #15803d; font-size: 13px;">📞 +91 8149712801 | +91 7559421334</p>
          </div>
          ` : `
          <p style="color: #666; font-size: 14px; text-align: center;">
            <strong>Note:</strong> Please process this refund within the standard timeline. Update the payment status to track completion.
          </p>
          `}
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
}

function buildRefundCompletedHtml(data: RefundNotificationRequest, isAdmin: boolean) {
  const headerBg = isAdmin ? "linear-gradient(135deg, #059669, #047857)" : "linear-gradient(135deg, #16a34a, #15803d)";
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f7f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: ${headerBg}; padding: 30px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .header p { color: rgba(255,255,255,0.8); margin: 10px 0 0; }
        .content { padding: 30px; }
        .success-badge { display: inline-block; background: #16a34a; color: white; padding: 8px 20px; border-radius: 20px; font-weight: bold; margin: 20px 0; }
        .info-box { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a; }
        .info-box p { margin: 8px 0; }
        .info-box strong { color: #333; }
        .amount-box { background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #16a34a; }
        .amount-box .amount { font-size: 32px; font-weight: bold; color: #16a34a; }
        .footer { background: #333; color: white; padding: 20px; text-align: center; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Refund Completed Successfully</h1>
          <p>${isAdmin ? 'Admin Notification' : 'California Farms India'}</p>
        </div>
        <div class="content">
          <div style="text-align: center;">
            <div class="success-badge">✓ Refund Successful</div>
          </div>
          ${isAdmin ? `
          <div class="info-box">
            <h4 style="margin: 0 0 10px; color: #166534;">👤 Customer Details</h4>
            <p><strong>Name:</strong> ${escapeHtml(data.customerName)}</p>
            <p><strong>Email:</strong> ${escapeHtml(data.customerEmail)}</p>
          </div>
          ` : `
          <p>Dear <strong>${escapeHtml(data.customerName)}</strong>,</p>
          <p>Great news! Your refund has been successfully processed.</p>
          `}
          
          <div class="amount-box">
            <p style="margin: 0 0 5px; color: #666; font-size: 14px;">Refunded Amount</p>
            <div class="amount">₹${escapeHtml(data.refundAmount)}</div>
            <p style="margin: 5px 0 0; color: #16a34a; font-size: 14px;">Successfully credited</p>
          </div>
          
          <div class="info-box">
            <p><strong>Order Number:</strong> #${escapeHtml(data.orderNumber)}</p>
            <p><strong>Original Order Amount:</strong> ₹${escapeHtml(data.totalAmount)}</p>
            <p><strong>Refund Amount:</strong> ₹${escapeHtml(data.refundAmount)}</p>
            ${data.paymentMethod ? `<p><strong>Payment Method:</strong> ${escapeHtml(data.paymentMethod === 'online' ? 'Razorpay (Online)' : 'Cash on Delivery')}</p>` : ''}
            ${data.paymentId ? `<p><strong>Transaction ID:</strong> ${escapeHtml(data.paymentId)}</p>` : ''}
            <p><strong>Status:</strong> ✅ Refunded</p>
            <p><strong>Completed On:</strong> ${new Date().toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}</p>
          </div>

          ${!isAdmin ? `
          <p style="color: #666; font-size: 14px;">
            The refund of <strong>₹${escapeHtml(data.refundAmount)}</strong> has been credited back to your original payment method. Please allow 1-2 business days for it to reflect in your account.
          </p>
          <p style="color: #666; font-size: 14px;">
            Thank you for your patience. We hope to serve you again soon!
          </p>
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-top: 20px; text-align: center;">
            <p style="margin: 0 0 8px; color: #166534; font-weight: 600;">Have questions or need help? 💬</p>
            <p style="margin: 0; color: #15803d; font-size: 14px;">Reach out to us anytime at:</p>
            <p style="margin: 8px 0 0;"><a href="mailto:californiafarmsindia@gmail.com" style="color: #2d5a3d; font-weight: 600; text-decoration: none;">californiafarmsindia@gmail.com</a></p>
            <p style="margin: 8px 0 0; color: #15803d; font-size: 13px;">📞 +91 8149712801 | +91 7559421334</p>
          </div>
          ` : `
          <p style="color: #666; font-size: 14px; text-align: center;">
            <strong>Refund completed.</strong> The customer has been notified.
          </p>
          `}
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
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const data: RefundNotificationRequest = await req.json();
    let { orderId, orderNumber, customerName, customerEmail, userId, refundAmount, totalAmount, type, paymentMethod, paymentId } = data;

    // Look up customer email from auth if not provided
    if (!customerEmail && userId) {
      try {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (userData?.user?.email) {
          customerEmail = userData.user.email;
        }
      } catch (e) {
        console.error("Failed to look up user email:", e);
      }
    }

    if (!orderNumber || !customerEmail || !refundAmount || !type) {
      return new Response(JSON.stringify({ error: "Missing required fields", detail: !customerEmail ? "Customer email not found" : "Other fields missing" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Ensure customerEmail is set on data for template use
    data.customerEmail = customerEmail;

    const isInitiated = type === "refund_initiated";
    const buildHtml = isInitiated ? buildRefundInitiatedHtml : buildRefundCompletedHtml;
    const emailType = isInitiated ? "refund_initiated" : "refund_completed";
    const subjectEmoji = isInitiated ? "💰" : "✅";
    const subjectText = isInitiated ? "Refund Being Processed" : "Refund Completed Successfully";

    const customerSubject = `${subjectEmoji} ${subjectText} - Order #${orderNumber}`;
    const adminSubject = `${subjectEmoji} ${subjectText} - Order #${orderNumber} - ₹${refundAmount} - ${customerName}`;

    // Send to customer
    let customerResult;
    try {
      customerResult = await resend.emails.send({
        from: "California Farms <orders@zomical.com>",
        to: [customerEmail],
        subject: customerSubject,
        html: buildHtml(data, false),
      });
      await logEmail(supabaseAdmin, {
        recipient_email: customerEmail,
        recipient_name: customerName,
        subject: customerSubject,
        email_type: `${emailType}_customer`,
        status: customerResult.error ? "failed" : "sent",
        resend_id: customerResult.data?.id,
        error_message: customerResult.error ? JSON.stringify(customerResult.error) : undefined,
        related_order_id: orderId,
        metadata: { orderNumber, refundAmount, type },
      });
    } catch (e: any) {
      console.error("Customer refund email failed:", e.message);
      await logEmail(supabaseAdmin, {
        recipient_email: customerEmail, recipient_name: customerName,
        subject: customerSubject, email_type: `${emailType}_customer`,
        status: "failed", error_message: e.message,
        related_order_id: orderId, metadata: { orderNumber, refundAmount, type },
      });
    }

    // Send to admins
    let adminResult;
    try {
      adminResult = await resend.emails.send({
        from: "California Farms <orders@zomical.com>",
        to: ADMIN_EMAILS,
        subject: adminSubject,
        html: buildHtml(data, true),
      });
      for (const adminEmail of ADMIN_EMAILS) {
        await logEmail(supabaseAdmin, {
          recipient_email: adminEmail,
          subject: adminSubject,
          email_type: `${emailType}_admin`,
          status: adminResult.error ? "failed" : "sent",
          resend_id: adminResult.data?.id,
          error_message: adminResult.error ? JSON.stringify(adminResult.error) : undefined,
          related_order_id: orderId,
          metadata: { orderNumber, customerName, refundAmount, type },
        });
      }
    } catch (e: any) {
      console.error("Admin refund email failed:", e.message);
      for (const adminEmail of ADMIN_EMAILS) {
        await logEmail(supabaseAdmin, {
          recipient_email: adminEmail, subject: adminSubject,
          email_type: `${emailType}_admin`, status: "failed",
          error_message: e.message, related_order_id: orderId,
          metadata: { orderNumber, refundAmount, type },
        });
      }
    }

    return new Response(JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: any) {
    console.error("Error sending refund notification:", error);
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

serve(handler);
