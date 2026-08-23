import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SALES_EMAILS = [
  "shradhatakalkhede15@gmail.com",
  "californiafarmsindia@gmail.com",
];

const FARMERS_PHONE_DISPLAY = "+91 755 942 1334";

function esc(text: string | number | undefined | null): string {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface EnquiryBody {
  enquiryId?: string;
  fullName: string;
  phone: string;
  email?: string;
  location?: string;
  interest?: string;
  message?: string;
}

async function logEmail(supabase: any, data: Record<string, any>) {
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

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body: EnquiryBody = await req.json();
    const { enquiryId, fullName, phone, email, location, interest, message } = body;

    if (!fullName || !phone) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const refId = `FRM-${(enquiryId || "").slice(0, 8).toUpperCase() || "—"}`;
    const submittedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    const detailRows = `
      <tr><td style="padding:8px 12px;color:#666">Reference ID</td><td style="padding:8px 12px;font-family:monospace;font-weight:700;color:#2d5a3d">${esc(refId)}</td></tr>
      <tr><td style="padding:8px 12px;color:#666">Name</td><td style="padding:8px 12px;font-weight:600">${esc(fullName)}</td></tr>
      <tr><td style="padding:8px 12px;color:#666">Phone</td><td style="padding:8px 12px"><a href="tel:${esc(phone)}">${esc(phone)}</a></td></tr>
      ${email ? `<tr><td style="padding:8px 12px;color:#666">Email</td><td style="padding:8px 12px"><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>` : ""}
      ${location ? `<tr><td style="padding:8px 12px;color:#666">Farm Location</td><td style="padding:8px 12px">${esc(location)}</td></tr>` : ""}
      <tr><td style="padding:8px 12px;color:#666">Area of Interest</td><td style="padding:8px 12px"><strong>${interest ? esc(interest) : "Not specified"}</strong></td></tr>
      <tr><td style="padding:8px 12px;color:#666;vertical-align:top">Requirement</td><td style="padding:8px 12px;white-space:pre-wrap">${message ? esc(message) : '<span style="color:#999">—</span>'}</td></tr>
      <tr><td style="padding:8px 12px;color:#666">Submitted</td><td style="padding:8px 12px">${esc(submittedAt)} IST</td></tr>
    `;

    const shell = (title: string, intro: string, footerNote: string) => `
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="margin:0;padding:24px;background:#f5f7f4;font-family:Segoe UI,Tahoma,Geneva,Verdana,sans-serif">
        <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
          <div style="background:linear-gradient(135deg,#2d5a3d,#1e4030);padding:28px;color:#fff;text-align:center">
            <h1 style="margin:0;font-size:22px">🌿 California Farms India</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px">Farmers Solutions</p>
          </div>
          <div style="padding:28px">
            <h2 style="color:#2d5a3d;margin-top:0">${title}</h2>
            <p style="color:#444;line-height:1.55">${intro}</p>
            <table style="width:100%;border-collapse:collapse;margin-top:16px;background:#f9faf8;border-radius:8px;overflow:hidden">
              ${detailRows}
            </table>
            <p style="margin-top:24px;color:#555;font-size:14px;line-height:1.55">${footerNote}</p>
          </div>
          <div style="background:#2d5a3d;color:#fff;padding:18px;text-align:center;font-size:12px">
            California Farms India · Ramgiri, Nagpur, Maharashtra<br/>
            <a href="mailto:californiafarmsindia@gmail.com" style="color:#9fe2b5">californiafarmsindia@gmail.com</a> · Farmers Support ${FARMERS_PHONE_DISPLAY}
          </div>
        </div>
      </body></html>
    `;

    // 1) Sales team notification
    const salesSubject = `🌾 New Farmer Enquiry – ${fullName}${interest ? ` (${interest})` : ""}`;
    const salesHtml = shell(
      "New Farmer Enquiry Received",
      "A farmer has submitted an enquiry from the Farmers Solutions page. Please follow up within 24 hours.",
      `Call <a href="tel:${esc(phone)}">${esc(phone)}</a>${email ? ` or email <a href="mailto:${esc(email)}">${esc(email)}</a>` : ""} to discuss the requirement.`,
    );

    try {
      const res = await resend.emails.send({
        from: "California Farms India <orders@zomical.com>",
        to: SALES_EMAILS,
        subject: salesSubject,
        html: salesHtml,
        replyTo: email || undefined,
      });
      await logEmail(supabaseAdmin, {
        recipient_email: SALES_EMAILS.join(", "),
        subject: salesSubject,
        email_type: "farmer_enquiry_admin",
        status: res.error ? "failed" : "sent",
        resend_id: (res as any)?.data?.id,
        error_message: res.error ? String(res.error) : undefined,
        metadata: { enquiryId, interest, phone },
      });
    } catch (e: any) {
      console.error("Sales email failed:", e);
      await logEmail(supabaseAdmin, {
        recipient_email: SALES_EMAILS.join(", "),
        subject: salesSubject,
        email_type: "farmer_enquiry_admin",
        status: "failed",
        error_message: e?.message || String(e),
      });
    }

    // 2) Farmer acknowledgement
    if (email) {
      const custSubject = "We received your farm enquiry – California Farms India";
      const custHtml = shell(
        `Thanks, ${esc(fullName)}! 🌱`,
        `We've received your enquiry${interest ? ` about <strong>${esc(interest)}</strong>` : ""}. Our farm solutions team will contact you within <strong>24 hours</strong>.`,
        `For anything urgent, call our farmers support line ${FARMERS_PHONE_DISPLAY}.`,
      );
      try {
        const res = await resend.emails.send({
          from: "California Farms India <orders@zomical.com>",
          to: [email],
          subject: custSubject,
          html: custHtml,
        });
        await logEmail(supabaseAdmin, {
          recipient_email: email,
          recipient_name: fullName,
          subject: custSubject,
          email_type: "farmer_enquiry_customer",
          status: res.error ? "failed" : "sent",
          resend_id: (res as any)?.data?.id,
          error_message: res.error ? String(res.error) : undefined,
          metadata: { enquiryId, interest },
        });
      } catch (e: any) {
        console.error("Farmer email failed:", e);
        await logEmail(supabaseAdmin, {
          recipient_email: email,
          subject: custSubject,
          email_type: "farmer_enquiry_customer",
          status: "failed",
          error_message: e?.message || String(e),
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e: any) {
    console.error("send-farmer-enquiry error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
