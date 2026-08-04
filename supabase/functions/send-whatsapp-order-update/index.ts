import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const whatsappToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
const whatsappPhoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

const SUPPORT_PHONE = "918600011641";
const SUPPORT_URL = `https://wa.me/${SUPPORT_PHONE}`;
const RETRY_URL = "https://zomical.com/orders";

// Approved WhatsApp utility templates per order status
const templateMap: Record<string, string> = {
  confirmed: "order_confirmed",
  preparing: "order_packed",
  out_for_delivery: "order_out_for_delivery",
  delivered: "order_delivered",
};

interface MsgCtx {
  name: string;
  orderNumber: string;
  eta?: string;
  total?: number;
}

const textMap: Record<string, (o: MsgCtx) => string> = {
  confirmed: (o) =>
    `✅ *Order Confirmed!*\n\nHi ${o.name}, your order *#${o.orderNumber}* is confirmed and we're preparing it with care. 🌿\n\nTrack your order: https://zomical.com/orders`,
  preparing: (o) =>
    `📦 *Order Packed*\n\nHi ${o.name}, your order *#${o.orderNumber}* has been freshly packed and is ready for dispatch.${
      o.eta ? `\n\n🕒 *Expected delivery:* ${o.eta}` : ""
    }`,
  out_for_delivery: (o) =>
    `🚚 *Out for Delivery*\n\nHi ${o.name}, your order *#${o.orderNumber}* is on its way.${
      o.eta ? `\n\n🕒 *Estimated delivery:* ${o.eta}` : ""
    }\n\nPlease keep your phone reachable. Need help? Tap the button below.`,
  delivered: (o) =>
    `🎉 *Order Delivered*\n\nHi ${o.name}, your order *#${o.orderNumber}* was delivered${
      o.eta ? ` on *${o.eta}*` : ""
    }. Enjoy your farm-fresh produce! 🌿\n\nAnything not right with your order? Tap below and our team will sort it out.\n\nShop again: https://zomical.com`,
  cancelled: (o) =>
    `❌ *Order Cancelled*\n\nHi ${o.name}, your order *#${o.orderNumber}* has been cancelled. If this was unexpected, reply here and we'll help.`,
  payment_failed: (o) =>
    `⚠️ *Payment Failed*\n\nHi ${o.name}, we couldn't process the payment for your order *#${o.orderNumber}*${
      o.total ? ` (₹${o.total})` : ""
    }.\n\n*Don't worry — your order is saved and your items are reserved for the next 60 minutes.*\n\n*What to do next:*\n1️⃣ Open ${RETRY_URL}\n2️⃣ Find order #${o.orderNumber}\n3️⃣ Tap *Retry Payment* and pay via UPI / card\n\nIf money was deducted, it is auto-refunded by your bank in 3-5 working days — send us the payment reference and we'll track it for you.`,
  payment_pending: (o) =>
    `⏳ *Payment Pending*\n\nHi ${o.name}, we still haven't received the payment for your order *#${o.orderNumber}*${
      o.total ? ` (₹${o.total})` : ""
    }, so it's not confirmed yet.\n\n*Complete it in 2 steps:*\n1️⃣ Open ${RETRY_URL}\n2️⃣ Tap *Retry Payment* on order #${o.orderNumber}\n\nIf you've already paid, share the UPI reference number here and we'll verify it right away. Unpaid orders are cancelled automatically after 24 hours.`,
  refund_requested: (o) =>
    `🔁 *Refund Requested*\n\nHi ${o.name}, we've received your refund request for order *#${o.orderNumber}*${
      o.total ? ` (₹${o.total})` : ""
    }.\n\n*What happens next:*\n1️⃣ Our team reviews the request within *24 hours*\n2️⃣ Once approved, the refund is initiated to your original payment method\n3️⃣ You'll get a WhatsApp confirmation the moment it's processed\n\nNothing is needed from you right now. If you'd like to add photos or a reason, just send them in this chat.`,
  refund_processed: (o) =>
    `💸 *Refund Processed*\n\nHi ${o.name}, the refund for order *#${o.orderNumber}*${
      o.total ? ` of *₹${o.total}*` : ""
    } has been processed successfully. ✅\n\n*What happens next:*\n1️⃣ The amount goes back to your original payment method (UPI / card / bank)\n2️⃣ Banks usually credit it in *5-7 working days*\n3️⃣ Check your bank statement — it appears as a Razorpay/California Farms credit\n\nIf you don't see it after 7 working days, tap *Contact Support* and we'll share the refund reference.`,
};

// Statuses that get interactive buttons (support / reschedule)
const buttonStatuses = new Set([
  "out_for_delivery",
  "delivered",
  "payment_failed",
  "payment_pending",
  "refund_requested",
  "refund_processed",
]);


function formatIndianPhone(phone: string): string | null {
  let p = String(phone || "").replace(/[\s\-()+]/g, "");
  if (!p) return null;
  if (p.length === 10) p = "91" + p;
  if (p.length === 12 && p.startsWith("91")) return p;
  return p.length >= 10 ? p : null;
}

const IST = "Asia/Kolkata";

function istDate(d: Date) {
  return d.toLocaleDateString("en-IN", {
    timeZone: IST,
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function istTime(d: Date) {
  return d.toLocaleTimeString("en-IN", {
    timeZone: IST,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Build a human ETA string for a status from order data */
function buildEta(
  status: string,
  order: { order_date?: string | null; delivery_slot?: string | null } | null,
): string | undefined {
  const now = new Date();
  if (status === "delivered") {
    return `${istDate(now)}, ${istTime(now)}`;
  }
  const slot = order?.delivery_slot?.trim();
  if (status === "out_for_delivery") {
    const arrival = new Date(now.getTime() + 90 * 60 * 1000);
    if (slot) return `Today (${istDate(now)}) between ${slot}`;
    return `Today (${istDate(now)}) by around ${istTime(arrival)}`;
  }
  if (status === "preparing") {
    const day = order?.order_date ? new Date(`${order.order_date}T00:00:00+05:30`) : now;
    return slot ? `${istDate(day)} between ${slot}` : istDate(day);
  }
  return undefined;
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
    const {
      orderId,
      status,
      phone: phoneOverride,
      customerName,
      orderNumber: orderNumberOverride,
      total: totalOverride,
      reason,
    } = await req.json();

    if (!status) return json({ success: false, error: "Missing status" }, 400);
    if (!whatsappToken || !whatsappPhoneNumberId) {
      return json({ success: false, sent: false, reason: "not_configured" });
    }

    let phone = phoneOverride as string | undefined;
    let name = customerName as string | undefined;
    let orderNumber = orderNumberOverride as string | undefined;
    let total = totalOverride as number | undefined;
    let orderRow: { order_date?: string | null; delivery_slot?: string | null } | null = null;

    if (orderId || orderNumber) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const query = supabaseAdmin
        .from("orders")
        .select("delivery_phone, delivery_name, order_number, order_date, delivery_slot, total");
      const { data: order } = orderId
        ? await query.eq("id", orderId).maybeSingle()
        : await query.eq("order_number", orderNumber!).maybeSingle();
      if (order) {
        phone = phone || order.delivery_phone;
        name = name || order.delivery_name;
        orderNumber = orderNumber || order.order_number;
        total = total ?? Number(order.total);
        orderRow = { order_date: order.order_date, delivery_slot: order.delivery_slot };
      }
    }

    const to = phone ? formatIndianPhone(phone) : null;
    if (!to || !orderNumber) return json({ success: false, sent: false, reason: "missing_phone_or_order" });

    const firstName = String(name || "there").split(" ")[0];
    const eta = buildEta(status, orderRow);
    let body = textMap[status]?.({ name: firstName, orderNumber, eta, total });
    if (!body) return json({ success: true, sent: false, reason: "no_message_for_status" });
    if (status === "payment_failed" && reason) {
      body += `\n\n_Reason: ${String(reason).slice(0, 120)}_`;
    }

    // 1) Rich interactive message with quick-reply buttons handled by our bot
    //    (free-form, valid inside the 24h customer-service window)
    if (buttonStatuses.has(status)) {
      const buttons: Array<{ id: string; title: string }> = [];
      if (status === "out_for_delivery") {
        buttons.push({ id: `resched:${orderNumber}`, title: "🗓️ Reschedule" });
      }
      buttons.push({ id: `support:${orderNumber}`, title: "💬 Contact Support" });

      const interactive = await waSend({
        to,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: body.slice(0, 1024) },
          footer: { text: "California Farms India • zomical.com" },
          action: {
            buttons: buttons.map((b) => ({
              type: "reply",
              reply: { id: b.id.slice(0, 256), title: b.title.slice(0, 20) },
            })),
          },
        },
      });
      if (interactive.ok) {
        console.log(`WhatsApp interactive '${status}' sent to ${to}`);
        return json({ success: true, sent: true, via: "interactive" });
      }
      console.error(`WhatsApp interactive '${status}' failed:`, JSON.stringify(interactive.data));
    }


    // 2) Approved utility template (works outside the 24h window)
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

    // 3) Plain text fallback
    const supportLine = buttonStatuses.has(status)
      ? `${
        status === "out_for_delivery"
          ? "\n\n🗓️ Need a different time? Reply *RESCHEDULE* and pick a new slot."
          : ""
      }\n\n💬 Need help? Chat with support: ${SUPPORT_URL}`
      : "";

    const txt = await waSend({
      to,
      type: "text",
      text: { body: body + supportLine, preview_url: false },
    });
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
