import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_EMAILS = [
  "shradhatakalkhede15@gmail.com",
  "californiafarmsindia@gmail.com",
];

function esc(text: string | number | undefined | null): string {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface BookingBody {
  bookingId?: string;
  schoolName: string;
  contactPerson: string;
  phone: string;
  email?: string;
  gradeLevel: string;
  gradeLabel: string;
  studentCount: number;
  preferredDate: string;
  notes?: string;
  estimatedCharge: number;
  perStudentCharge: number;
}

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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body: BookingBody = await req.json();
    const {
      schoolName,
      contactPerson,
      phone,
      email,
      gradeLabel,
      studentCount,
      preferredDate,
      notes,
      estimatedCharge,
      perStudentCharge,
    } = body;

    if (!schoolName || !contactPerson || !phone) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const niceDate = new Date(preferredDate).toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const detailRows = `
      <tr><td style="padding:8px 12px;color:#666">School / College</td><td style="padding:8px 12px;font-weight:600">${esc(schoolName)}</td></tr>
      <tr><td style="padding:8px 12px;color:#666">Contact Person</td><td style="padding:8px 12px">${esc(contactPerson)}</td></tr>
      <tr><td style="padding:8px 12px;color:#666">Phone</td><td style="padding:8px 12px">+91 ${esc(phone)}</td></tr>
      ${email ? `<tr><td style="padding:8px 12px;color:#666">Email</td><td style="padding:8px 12px">${esc(email)}</td></tr>` : ""}
      <tr><td style="padding:8px 12px;color:#666">Grade Level</td><td style="padding:8px 12px">${esc(gradeLabel)}</td></tr>
      <tr><td style="padding:8px 12px;color:#666">Students</td><td style="padding:8px 12px">${esc(studentCount)}</td></tr>
      <tr><td style="padding:8px 12px;color:#666">Preferred Date</td><td style="padding:8px 12px"><strong>${esc(niceDate)}</strong></td></tr>
      <tr><td style="padding:8px 12px;color:#666">Estimated Charges</td><td style="padding:8px 12px"><strong>₹${esc(estimatedCharge.toLocaleString("en-IN"))}</strong> <span style="color:#888">(₹${esc(perStudentCharge)}/student)</span></td></tr>
      ${notes ? `<tr><td style="padding:8px 12px;color:#666;vertical-align:top">Notes</td><td style="padding:8px 12px;white-space:pre-wrap">${esc(notes)}</td></tr>` : ""}
    `;

    const shell = (title: string, intro: string, footerNote: string) => `
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="margin:0;padding:24px;background:#f5f7f4;font-family:Segoe UI,Tahoma,Geneva,Verdana,sans-serif">
        <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
          <div style="background:linear-gradient(135deg,#2d5a3d,#1e4030);padding:28px;color:#fff;text-align:center">
            <h1 style="margin:0;font-size:22px">🌿 California Farms India</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px">School Farm Visit</p>
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
            <a href="mailto:californiafarmsindia@gmail.com" style="color:#9fe2b5">californiafarmsindia@gmail.com</a> · +91 81497 12801
          </div>
        </div>
      </body></html>
    `;

    // 1) Admin notification
    const adminSubject = `🌱 New Farm Visit Request – ${schoolName}`;
    const adminHtml = shell(
      "New Farm Visit Booking Request",
      `A new school/college farm visit request has been submitted. Please review and confirm the visit slot.`,
      `Reply directly to <strong>${esc(contactPerson)}</strong> at <a href="tel:+91${esc(phone)}">+91 ${esc(phone)}</a>${email ? ` or <a href="mailto:${esc(email)}">${esc(email)}</a>` : ""} to confirm the date.`,
    );

    try {
      const adminRes = await resend.emails.send({
        from: "California Farms India <orders@zomical.com>",
        to: ADMIN_EMAILS,
        subject: adminSubject,
        html: adminHtml,
        replyTo: email || undefined,
      });
      await logEmail(supabaseAdmin, {
        recipient_email: ADMIN_EMAILS.join(", "),
        subject: adminSubject,
        email_type: "farm_visit_booking_admin",
        status: adminRes.error ? "failed" : "sent",
        resend_id: (adminRes as any)?.data?.id,
        error_message: adminRes.error ? String(adminRes.error) : undefined,
        metadata: { schoolName, studentCount, preferredDate },
      });
    } catch (e: any) {
      console.error("Admin email failed:", e);
      await logEmail(supabaseAdmin, {
        recipient_email: ADMIN_EMAILS.join(", "),
        subject: adminSubject,
        email_type: "farm_visit_booking_admin",
        status: "failed",
        error_message: e?.message || String(e),
      });
    }

    // 2) Customer confirmation (if email provided)
    if (email) {
      const custSubject = `We received your farm visit request – California Farms India`;
      const custHtml = shell(
        `Thanks, ${esc(contactPerson)}! 🌾`,
        `We've received your farm visit request for <strong>${esc(schoolName)}</strong>. Our team will review the date and get back to you within <strong>1 working day</strong> with confirmation and arrival instructions.`,
        `For any questions, just reply to this email or call us at +91 81497 12801.`,
      );

      try {
        const custRes = await resend.emails.send({
          from: "California Farms India <orders@zomical.com>",
          to: [email],
          subject: custSubject,
          html: custHtml,
        });
        await logEmail(supabaseAdmin, {
          recipient_email: email,
          recipient_name: contactPerson,
          subject: custSubject,
          email_type: "farm_visit_booking_customer",
          status: custRes.error ? "failed" : "sent",
          resend_id: (custRes as any)?.data?.id,
          error_message: custRes.error ? String(custRes.error) : undefined,
          metadata: { schoolName, studentCount, preferredDate },
        });
      } catch (e: any) {
        console.error("Customer email failed:", e);
        await logEmail(supabaseAdmin, {
          recipient_email: email,
          subject: custSubject,
          email_type: "farm_visit_booking_customer",
          status: "failed",
          error_message: e?.message || String(e),
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (e: any) {
    console.error("send-farm-visit-booking error:", e);
    return new Response(
      JSON.stringify({ error: e?.message || "Unexpected error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
};

serve(handler);
