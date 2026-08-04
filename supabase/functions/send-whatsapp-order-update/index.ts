import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const whatsappToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
const whatsappPhoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

// Approved WhatsApp utility templates per order status
const templateMap: Record<string, string> = {
  confirmed: "order_confirmed",
  preparing: "order_packed",
  out_for_delivery: "order_out_for_delivery",
  delivered: "order_delivered",
};

const textMap: Record<string, (o: { name: string; orderNumber: string }) => string> = {
  confirmed: (o) =>
    `✅ *Order Confirmed!*\n\nHi ${o.name}, your order *#${o.orderNumber}* is confirmed and we're preparing it with care. 🌿\n\nTrack your order: https://zomical.com/orders`,
  preparing: (o) =>
    `📦 *Order Packed*\n\nHi ${o.name}, your order *#${o.orderNumber}* has been freshly packed and is ready for dispatch.`,
  out_for_delivery: (o) =>
    `🚚 *Out for Delivery*\n\nHi ${o.name}, your order *#${o.orderNumber}* is on its way. Our delivery partner will reach you shortly.`,
  delivered: (o) =>
    `🎉 *Order Delivered*\n\nHi ${o.name}, your order *#${o.orderNumber}* has been delivered. Enjoy your farm-fresh produce!\n\nShop again: https://zomical.com`,
  cancelled: (o) =>
    `❌ *Order Cancelled*\n\nHi ${o.name}, your order *#${o.orderNumber}* has been cancelled. If this was unexpected, reply here and we'll help.`,
};

function formatIndianPhone(phone: string): string | null {
  let p = String(phone || "").replace(/[\s\-()+]/g, "");
  if (!p) return null;
  if (p.length === 10) p = "91" + p;
  if (p.length === 12 && p.startsWith("91")) return p;
  return p.length >= 10 ? p : null;
}

async function waSend(payload: Record<string, unknown>) {
  const res = await fetch(`https://graph.facebook.com/v21.0/${whatsappPhoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${whatsappToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && !data?.error, data };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { orderId, status, phone: phoneOverride, customerName, orderNumber: orderNumberOverride } =
      await req.json();

    if (!status) return json({ success: false, error: "Missing status" }, 400);
    if (!whatsappToken || !whatsappPhoneNumberId) {
      return json({ success: false, sent: false, reason: "not_configured" });
    }

    let phone = phoneOverride as string | undefined;
    let name = customerName as string | undefined;
    let orderNumber = orderNumberOverride as string | undefined;

    if (orderId && (!phone || !orderNumber)) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("delivery_phone, delivery_name, order_number")
        .eq("id", orderId)
        .maybeSingle();
      phone = phone || order?.delivery_phone;
      name = name || order?.delivery_name;
      orderNumber = orderNumber || order?.order_number;
    }

    const to = phone ? formatIndianPhone(phone) : null;
    if (!to || !orderNumber) return json({ success: false, sent: false, reason: "missing_phone_or_order" });

    const firstName = String(name || "there").split(" ")[0];
    const templateName = templateMap[status];

    if (templateName) {
      const tpl = await waSend({
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: "en" },
          components: [
            { type: "body", parameters: [firstName, orderNumber].map((text) => ({ type: "text", text })) },
          ],
        },
      });
      if (tpl.ok) {
        console.log(`WhatsApp template '${templateName}' sent to ${to}`);
        return json({ success: true, sent: true, via: "template" });
      }
      console.error(`WhatsApp template '${templateName}' failed:`, JSON.stringify(tpl.data));
    }

    // Fallback: free-form text (works inside the 24h customer service window)
    const body = textMap[status]?.({ name: firstName, orderNumber });
    if (!body) return json({ success: true, sent: false, reason: "no_message_for_status" });

    const txt = await waSend({ to, type: "text", text: { body, preview_url: false } });
    if (!txt.ok) {
      console.error("WhatsApp text fallback failed:", JSON.stringify(txt.data));
      return json({ success: false, sent: false, reason: "send_failed" });
    }
    return json({ success: true, sent: true, via: "text" });
  } catch (error) {
    console.error("send-whatsapp-order-update error:", error);
    return json({ success: false, error: "Unexpected error" }, 500);
  }
});
