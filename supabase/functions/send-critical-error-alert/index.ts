import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ErrorAlertRequest {
  error_message: string;
  error_type?: string;
  error_stack?: string;
  page_path?: string;
  user_id?: string;
  session_id?: string;
  additional_context?: Record<string, unknown>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(resendApiKey);
    const errorData: ErrorAlertRequest = await req.json();

    const adminEmail = "niraj.takalkhede@gmail.com"; // Admin email for alerts

    const timestamp = new Date().toLocaleString("en-IN", {
      dateStyle: "full",
      timeStyle: "long",
      timeZone: "Asia/Kolkata",
    });

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #fef2f2; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #dc2626, #991b1b); color: white; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 24px; }
    .alert-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    .detail-row { display: flex; padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
    .detail-label { font-weight: 600; color: #374151; width: 140px; flex-shrink: 0; }
    .detail-value { color: #6b7280; word-break: break-word; }
    .stack-trace { background: #1f2937; color: #9ca3af; padding: 16px; border-radius: 8px; font-family: monospace; font-size: 12px; overflow-x: auto; white-space: pre-wrap; margin-top: 16px; }
    .footer { background: #f9fafb; padding: 16px; text-align: center; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Critical Error Alert</h1>
    </div>
    <div class="content">
      <div class="alert-box">
        <strong style="color: #dc2626;">Error Message:</strong>
        <p style="margin: 8px 0 0 0; color: #7f1d1d;">${errorData.error_message}</p>
      </div>
      
      <div class="detail-row">
        <span class="detail-label">Error Type:</span>
        <span class="detail-value">${errorData.error_type || "Unknown"}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Page:</span>
        <span class="detail-value">${errorData.page_path || "Unknown"}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">User ID:</span>
        <span class="detail-value">${errorData.user_id || "Guest"}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Session ID:</span>
        <span class="detail-value">${errorData.session_id || "Unknown"}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Timestamp:</span>
        <span class="detail-value">${timestamp}</span>
      </div>
      
      ${errorData.additional_context ? `
      <div class="detail-row">
        <span class="detail-label">Context:</span>
        <span class="detail-value"><pre style="margin: 0; font-size: 11px;">${JSON.stringify(errorData.additional_context, null, 2)}</pre></span>
      </div>
      ` : ""}
      
      ${errorData.error_stack ? `
      <div style="margin-top: 16px;">
        <strong style="color: #374151;">Stack Trace:</strong>
        <div class="stack-trace">${errorData.error_stack}</div>
      </div>
      ` : ""}
    </div>
    <div class="footer">
      <p>Cali Farm Fresh - Automated Error Alert System</p>
      <p>Please check your admin dashboard for more details.</p>
    </div>
  </div>
</body>
</html>
    `;

    const { error: emailError } = await resend.emails.send({
      from: "Cali Farm Fresh <alerts@calyxfarm.com>",
      to: [adminEmail],
      subject: `🚨 Critical Error: ${errorData.error_type || "Runtime Error"} on ${errorData.page_path || "Unknown Page"}`,
      html: emailHtml,
    });

    if (emailError) {
      console.error("Failed to send error alert email:", emailError);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Error alert email sent successfully");
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in send-critical-error-alert:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
