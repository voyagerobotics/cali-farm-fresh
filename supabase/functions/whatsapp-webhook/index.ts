import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { handleShopMessage } from "./shop.ts";
import { resolveLang, type Lang } from "./i18n.ts";


const VERIFY_TOKEN = "zomical_whatsapp_verify_2024";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const whatsappToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN")!;
const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const STORE_COORDINATES = { lat: 21.114435, lng: 79.110042 };
const STORE_PINCODE = "440024";
const MAX_DELIVERY_DISTANCE_KM = 50;
const ADMIN_EMAILS = ["shradhatakalkhede15@gmail.com", "californiafarmsindia@gmail.com"];

// ─── WhatsApp Messaging ───
async function sendWhatsAppMessage(to: string, text: string) {
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${whatsappToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
  const data = await res.json();
  console.log("WhatsApp send response:", JSON.stringify(data));
  return data;
}

// Send an image with a caption (product card)
async function sendWhatsAppImage(to: string, imageUrl: string, caption: string) {
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${whatsappToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "image",
      image: { link: imageUrl, caption: caption.slice(0, 1020) },
    }),
  });
  const data = await res.json();
  console.log("WhatsApp image send response:", JSON.stringify(data));
  if (data.error) {
    // Fallback to text so the customer still gets the info
    await sendWhatsAppMessage(to, caption);
  }
  return data;
}

// Send an interactive message with up to 3 quick-reply buttons
async function sendWhatsAppButtons(
  to: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>,
) {
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${whatsappToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: bodyText.slice(0, 1024) },
        action: {
          buttons: buttons.slice(0, 3).map((b) => ({
            type: "reply",
            reply: { id: b.id.slice(0, 256), title: b.title.slice(0, 20) },
          })),
        },
      },
    }),
  });
  const data = await res.json();
  if (data.error) {
    console.error("WhatsApp button send error:", JSON.stringify(data.error));
    await sendWhatsAppMessage(to, bodyText);
  }
  return data;
}

// ─── Database Helpers ───
async function getAvailableProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, price, unit, stock_quantity, category, is_available, description, discount_enabled, discount_type, discount_value, image_url, image_urls, product_variants(name, price, stock_quantity, is_available, display_order)")
    .eq("is_available", true)
    .eq("is_hidden", false)
    .order("category")
    .order("name");
  if (error) { console.error("Error fetching products:", error); return []; }
  return data || [];
}

// Effective (discounted) price for a product
function effectivePrice(p: Record<string, any>): number {
  const base = Number(p.price) || 0;
  if (p.discount_enabled && p.discount_value) {
    if (p.discount_type === "percentage") return Math.round(base * (1 - Number(p.discount_value) / 100));
    return Math.max(0, base - Number(p.discount_value));
  }
  return base;
}

function productImage(p: Record<string, any>): string | null {
  if (p.image_url) return p.image_url;
  if (Array.isArray(p.image_urls) && p.image_urls.length > 0) return p.image_urls[0];
  return null;
}

// Build a rich WhatsApp caption for a product (price, variants, stock)
function buildProductCaption(p: Record<string, any>): string {
  const eff = effectivePrice(p);
  const lines: string[] = [];
  lines.push(`*${p.name}*`);
  if (eff !== Number(p.price)) {
    lines.push(`💰 ₹${eff}/${p.unit}  ~₹${p.price}~  🔖 SALE`);
  } else {
    lines.push(`💰 ₹${eff}/${p.unit}`);
  }

  const variants = (Array.isArray(p.product_variants) ? p.product_variants : [])
    .filter((v: any) => v.is_available !== false)
    .sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));
  if (variants.length > 0) {
    lines.push("");
    lines.push("📦 *Pack sizes:*");
    for (const v of variants) {
      const vStock = v.stock_quantity == null ? "" : v.stock_quantity > 0 ? ` (${v.stock_quantity} left)` : " (out of stock)";
      lines.push(`  • ${v.name} — ₹${v.price}${vStock}`);
    }
  } else {
    lines.push("");
    lines.push(`📦 *Pack sizes:*`);
    lines.push(`  • 500 g — ₹${Math.round(eff / 2)}`);
    lines.push(`  • 1 ${p.unit} — ₹${eff}`);
  }

  const stock = p.stock_quantity;
  if (stock == null) lines.push(`\n✅ In stock`);
  else if (stock <= 0) lines.push(`\n❌ Out of stock`);
  else if (stock <= 5) lines.push(`\n⚡ Only ${stock} ${p.unit} left — hurry!`);
  else lines.push(`\n✅ In stock (${stock} ${p.unit})`);

  if (p.description) lines.push(`\n_${String(p.description).slice(0, 160)}_`);
  lines.push(`\n🛒 Reply *"Add ${p.name}"* to add to cart`);
  return lines.join("\n");
}


async function getConversation(phone: string) {
  const { data, error } = await supabase
    .from("whatsapp_conversations")
    .select("*")
    .eq("phone_number", phone)
    .maybeSingle();
  if (error) console.error("Error fetching conversation:", error);
  if (data) return data;

  const { data: newConv, error: insertError } = await supabase
    .from("whatsapp_conversations")
    .insert({ phone_number: phone })
    .select()
    .single();
  if (insertError) { console.error("Error creating conversation:", insertError); return null; }
  return newConv;
}

async function updateConversation(phone: string, updates: Record<string, unknown>) {
  const { error } = await supabase
    .from("whatsapp_conversations")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("phone_number", phone);
  if (error) console.error("Error updating conversation:", error);
}

async function logMessage(phone: string, direction: string, text: string, waMessageId?: string) {
  await supabase.from("whatsapp_messages").insert({
    phone_number: phone,
    direction,
    message_text: text,
    wa_message_id: waMessageId || null,
  });
  // Keep the admin inbox in sync so every conversation is visible and ordered
  try {
    const preview = String(text || "").replace(/\s+/g, " ").slice(0, 160);
    const { data: conv } = await supabase
      .from("whatsapp_conversations")
      .select("unread_count")
      .eq("phone_number", phone)
      .maybeSingle();
    const patch: Record<string, unknown> = {
      last_message_at: new Date().toISOString(),
      last_message_text: preview,
      updated_at: new Date().toISOString(),
    };
    if (direction === "inbound") patch.unread_count = Number(conv?.unread_count || 0) + 1;
    if (conv) {
      await supabase.from("whatsapp_conversations").update(patch).eq("phone_number", phone);
    } else {
      await supabase.from("whatsapp_conversations").insert({ phone_number: phone, ...patch });
    }
  } catch (e) {
    console.error("conversation sync failed", e);
  }
}


/** Order-level WhatsApp activity log (button replies + bot responses tied to an order) */
async function logActivity(entry: Record<string, unknown>) {
  try {
    await supabase.from("whatsapp_activity_log").insert(entry);
  } catch (e) {
    console.error("activity log insert failed", e);
  }
}

/** Extract an order number from a button payload like `summary:CFI-...` */
function orderNumberFromPayload(payload: string | null): string | null {
  if (!payload || !payload.includes(":")) return null;
  const parts = payload.split(":");
  const candidate = parts[1];
  return candidate && candidate.startsWith("CFI-") ? candidate : null;
}

// Send an interactive list message (up to 10 rows) — used for precise slot picking
async function sendWhatsAppList(
  to: string,
  bodyText: string,
  buttonLabel: string,
  rows: Array<{ id: string; title: string; description?: string }>,
  header?: string,
  sectionTitle?: string,
) {
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${whatsappToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "list",
        ...(header ? { header: { type: "text", text: header.slice(0, 60) } } : {}),
        body: { text: bodyText.slice(0, 1024) },
        footer: { text: "California Farms India • zomical.com" },
        action: {
          button: buttonLabel.slice(0, 20),
          sections: [{
            title: (sectionTitle || "Available slots").slice(0, 24),
            rows: rows.slice(0, 10).map((r) => ({
              id: r.id.slice(0, 200),
              title: r.title.slice(0, 24),
              ...(r.description ? { description: r.description.slice(0, 72) } : {}),
            })),
          }],
        },
      },
    }),
  });
  const data = await res.json();
  if (data.error) {
    console.error("WhatsApp list send error:", JSON.stringify(data.error));
    await sendWhatsAppMessage(to, bodyText);
  }
  return data;
}

// ─── Post-order actions: Contact support, Order summary & Reschedule delivery ───
const SUPPORT_CONTACT =
  "📞 Call/WhatsApp: +91 81497 12801\n📧 shradhatakalkhede15@gmail.com\n📧 californiafarmsindia@gmail.com\n🕘 Support hours: 8 AM – 8 PM IST";

const SUPPORT_TEXT =
  `💬 *California Farms Support*\n\nOur team is right here. Please tell us what went wrong (you can send photos too) and we'll reply shortly.\n\n${SUPPORT_CONTACT}\n\nType *MENU* anytime to continue shopping.`;

const IST_TZ = "Asia/Kolkata";

/** Creates a support request (visible to admins) with the customer's order details attached. */
async function createSupportTicket(
  phone: string,
  order: Record<string, any> | null,
): Promise<{ ref: string; body: string }> {
  const ref = `SUP-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${
    Math.random().toString(36).slice(2, 6).toUpperCase()
  }`;
  const items = Array.isArray(order?.order_items) ? order!.order_items : [];
  const itemLines = items.map((it: any) => `• ${it.product_name} ×${it.quantity} — ₹${it.total_price}`).join("\n");
  const note = [
    `🆘 SUPPORT REQUEST ${ref}`,
    `Raised from WhatsApp by +${phone}`,
    order
      ? [
        `Order: #${order.order_number}`,
        `Status: ${String(order.status).replace(/_/g, " ")} (locked for self-service edits)`,
        `Payment: ${order.payment_status} • Total: ₹${order.total}`,
        `Customer: ${order.delivery_name || "—"} • ${order.delivery_phone || phone}`,
        `Address: ${order.delivery_address || "—"}`,
        itemLines ? `Items:\n${itemLines}` : "",
      ].filter(Boolean).join("\n")
      : "No recent order found for this number.",
  ].join("\n");

  try {
    await supabase.from("whatsapp_customer_notes").insert({ phone_number: phone, note });
    await supabase
      .from("whatsapp_conversations")
      .update({ inbox_status: "open", is_starred: true, updated_at: new Date().toISOString() })
      .eq("phone_number", phone);
    if (order?.id) {
      await logActivity({
        order_id: order.id,
        order_number: order.order_number,
        phone_number: phone,
        direction: "inbound",
        event_type: "support_request",
        body: note,
        success: true,
      });
    }
  } catch (e) {
    console.error("support ticket creation failed", e);
  }

  const body = [
    `🎫 *Support request created — ${ref}*`,
    "",
    order
      ? `We've attached your order *#${order.order_number}* (${String(order.status).replace(/_/g, " ")}, ₹${order.total}) so our team already has everything they need.`
      : "Our team has your number and chat history — just tell us what you need help with.",
    "",
    "✍️ *Please describe your issue in a message below* (what happened, item name, etc.). You can also send a photo.",
    "",
    "⏱️ A team member will reply here, usually within 30 minutes during support hours.",
    "",
    SUPPORT_CONTACT,
  ].join("\n");

  return { ref, body };
}

const istDay = (d: Date) =>
  d.toLocaleDateString("en-IN", { timeZone: IST_TZ, weekday: "short", day: "numeric", month: "short" });

/** Precise delivery windows offered for rescheduling */
const SLOT_WINDOWS = [
  { id: "0810", label: "8 – 10 AM", startHour: 8 },
  { id: "1012", label: "10 AM – 12 PM", startHour: 10 },
  { id: "1204", label: "12 – 2 PM", startHour: 12 },
  { id: "0204", label: "2 – 4 PM", startHour: 14 },
  { id: "0406", label: "4 – 6 PM", startHour: 16 },
  { id: "0608", label: "6 – 8 PM", startHour: 18 },
];

function rescheduleRows(orderNumber: string) {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
  const rows: Array<{ id: string; title: string; description: string }> = [];
  const istHour = Number(now.toLocaleString("en-IN", { timeZone: IST_TZ, hour: "2-digit", hour12: false }));
  for (const w of SLOT_WINDOWS) {
    if (w.startHour > istHour + 1) {
      rows.push({ id: `reslot:${orderNumber}:today:${w.id}`, title: `Today ${w.label}`, description: istDay(now) });
    }
  }
  const todayRows = rows.slice(0, 4);
  const tomorrowRows = SLOT_WINDOWS.map((w) => ({
    id: `reslot:${orderNumber}:tmrw:${w.id}`,
    title: `Tmrw ${w.label}`,
    description: istDay(tomorrow),
  }));
  return [...todayRows, ...tomorrowRows].slice(0, 10);

}

function slotLabelFromId(dayKey: string, windowId: string) {
  const w = SLOT_WINDOWS.find((s) => s.id === windowId);
  if (!w) return null;
  const d = dayKey === "today" ? new Date() : new Date(Date.now() + 24 * 3600 * 1000);
  return `${dayKey === "today" ? "Today" : "Tomorrow"} (${istDay(d)}), ${w.label}`;
}

async function findRecentOrder(phone: string, orderNumber?: string | null) {
  const digits = phone.replace(/\D/g, "").slice(-10);
  let q = supabase
    .from("orders")
    .select("id, order_number, status, delivery_slot, notes, delivery_phone, delivery_name, delivery_address, subtotal, delivery_charge, total, payment_status, payment_method, order_items(product_name, quantity, unit, unit_price, total_price)")
    .order("created_at", { ascending: false })
    .limit(1);
  q = orderNumber ? q.eq("order_number", orderNumber) : q.like("delivery_phone", `%${digits}`);
  const { data } = await q.maybeSingle();
  return data as Record<string, any> | null;
}

async function listCustomerOrders(phone: string) {
  const digits = phone.replace(/\D/g, "").slice(-10);
  const { data } = await supabase
    .from("orders")
    .select("id, order_number, status, total, created_at")
    .like("delivery_phone", `%${digits}`)
    .order("created_at", { ascending: false })
    .limit(10);
  return (data ?? []) as Array<Record<string, any>>;
}

async function getCustomerOrder(orderId: string) {
  const { data } = await supabase
    .from("orders")
    .select("id, order_number, status, total, subtotal, delivery_charge, created_at, delivery_address, payment_status, order_items(product_id, product_name, quantity, unit, unit_price, total_price)")
    .eq("id", orderId)
    .maybeSingle();
  return (data ?? null) as Record<string, any> | null;
}

async function cancelCustomerOrder(orderId: string): Promise<{ ok: boolean; reason?: string }> {
  const order = await getCustomerOrder(orderId);
  if (!order) return { ok: false, reason: "Order not found." };
  if (!["pending", "confirmed", "preparing"].includes(String(order.status))) {
    return { ok: false, reason: `This order is already ${String(order.status).replace(/_/g, " ")}.` };
  }
  const { error } = await supabase
    .from("orders")
    .update({
      status: "cancelled",
      payment_status: order.payment_status === "paid" ? "refunded" : order.payment_status,
      notes: "[Cancelled by customer via WhatsApp]",
    })
    .eq("id", orderId);
  if (error) return { ok: false, reason: "Could not cancel right now." };

  // Notify the customer on WhatsApp that the order status changed
  try {
    await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-order-update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
        Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
      },
      body: JSON.stringify({
        orderId: order.id,
        orderNumber: order.order_number,
        customerName: order.delivery_name,
        phone: order.delivery_phone,
        status: "cancelled",
        total: order.total,
      }),
    });
    if (String(order.payment_status) === "paid") {
      await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-order-update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
          Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
        },
        body: JSON.stringify({
          orderId: order.id,
          orderNumber: order.order_number,
          customerName: order.delivery_name,
          phone: order.delivery_phone,
          status: "refund_requested",
          total: order.total,
        }),
      });
    }
  } catch (e) {
    console.error("WhatsApp cancellation update failed:", e);
  }

  return { ok: true };
}


function buildOrderSummary(order: Record<string, any>): string {
  const items = Array.isArray(order.order_items) ? order.order_items : [];
  const lines: string[] = [];
  lines.push(`🧾 *Order Summary — #${order.order_number}*`);
  lines.push("");
  if (items.length === 0) {
    lines.push("_No items found on this order._");
  } else {
    for (const it of items) {
      const qty = Number(it.quantity);
      lines.push(`• ${it.product_name} × ${qty}${it.unit ? ` ${it.unit}` : ""} — ₹${Number(it.total_price)}`);
    }
  }
  lines.push("");
  lines.push(`Subtotal: ₹${Number(order.subtotal || 0)}`);
  lines.push(`Delivery: ${Number(order.delivery_charge || 0) > 0 ? `₹${Number(order.delivery_charge)}` : "FREE"}`);
  lines.push(`*Total: ₹${Number(order.total || 0)}*`);
  lines.push("");
  lines.push(`💳 Payment: ${String(order.payment_status || "pending").toUpperCase()}${order.payment_method ? ` (${order.payment_method})` : ""}`);
  lines.push(`📦 Status: ${String(order.status || "").replace(/_/g, " ")}`);
  if (order.delivery_slot) lines.push(`🕒 Slot: ${order.delivery_slot}`);
  lines.push("");
  lines.push(`📍 *Delivery address:*\n${order.delivery_name || ""}\n${order.delivery_address || "—"}\n📞 ${order.delivery_phone || ""}`);
  return lines.join("\n");
}

/** Handles support, order summary & delivery-reschedule buttons sent in order update messages */
async function handleOrderActions(
  phone: string,
  text: string,
  buttonId: string | null,
): Promise<boolean> {
  const raw = (buttonId || text || "").trim();
  const lower = raw.toLowerCase();

  // Capture a short delivery note typed after rescheduling
  if (!buttonId && text) {
    const { data: conv } = await supabase
      .from("whatsapp_conversations")
      .select("conversation_state, menu_context")
      .eq("phone_number", phone)
      .maybeSingle();
    if (conv?.conversation_state === "awaiting_support_issue") {
      const ctx = (conv.menu_context || {}) as Record<string, any>;
      const issue = String(text).slice(0, 800);
      if (lower === "menu" || lower === "cancel") {
        await updateConversation(phone, { conversation_state: "idle", menu_context: {} });
        return false;
      }
      await supabase.from("whatsapp_customer_notes").insert({
        phone_number: phone,
        note: `🆘 ISSUE DESCRIPTION for ${ctx.support_ref || "support request"}${ctx.support_order ? ` (Order #${ctx.support_order})` : ""}:\n${issue}`,
      });
      await supabase
        .from("whatsapp_conversations")
        .update({ inbox_status: "open", is_starred: true, updated_at: new Date().toISOString() })
        .eq("phone_number", phone);
      await updateConversation(phone, { conversation_state: "idle", menu_context: {} });
      const msg = [
        `✅ *Thanks — we've added your issue to ${ctx.support_ref || "your support request"}.*`,
        "",
        `_"${issue}"_`,
        "",
        "⏱️ Our team will reply here shortly. You can keep sending messages or photos and they'll be added to this request.",
        "",
        SUPPORT_CONTACT,
      ].join("\n");
      await sendWhatsAppButtons(phone, msg, [{ id: "menu", title: "🛍️ Keep shopping" }]);
      await logMessage(phone, "outbound", msg);
      return true;
    }
    if (conv?.conversation_state === "awaiting_delivery_note") {
      const ctx = (conv.menu_context || {}) as Record<string, any>;
      if (lower === "skip" || lower === "no" || lower === "❌ skip note") {
        await updateConversation(phone, { conversation_state: "idle", menu_context: {} });
        const msg = "👍 No problem — your new slot is locked in. Type *MENU* to keep shopping.";
        await sendWhatsAppMessage(phone, msg);
        await logMessage(phone, "outbound", msg);
        return true;
      }
      if (ctx.note_order_id) {
        const note = `[WhatsApp delivery note] ${String(text).slice(0, 200)}`;
        const { data: existing } = await supabase.from("orders").select("notes").eq("id", ctx.note_order_id).maybeSingle();
        await supabase
          .from("orders")
          .update({ notes: existing?.notes ? `${existing.notes}\n${note}` : note })
          .eq("id", ctx.note_order_id);
        await updateConversation(phone, { conversation_state: "idle", menu_context: {} });
        const msg = `📝 *Note saved*\n\n_"${String(text).slice(0, 200)}"_\n\nOur rider will see this before delivery. Type *MENU* to keep shopping.`;
        await sendWhatsAppMessage(phone, msg);
        await logMessage(phone, "outbound", msg);
        return true;
      }
    }
  }

  // Contact support → auto-create a support request with the order details
  if (lower.startsWith("support:") || lower === "support" || lower === "contact support" || lower === "💬 contact support") {
    const orderNumber = raw.includes(":") ? raw.split(":")[1] : null;
    const order = await findRecentOrder(phone, orderNumber);
    const { ref, body } = await createSupportTicket(phone, order);
    await updateConversation(phone, {
      conversation_state: "awaiting_support_issue",
      menu_context: { support_ref: ref, support_order: order?.order_number || null },
    });
    await sendWhatsAppButtons(phone, body, [
      order ? { id: `summary:${order.order_number}`, title: "🧾 Order summary" } : { id: "orders", title: "📦 My Orders" },
      { id: "menu", title: "🛍️ Keep shopping" },
    ]);
    await logMessage(phone, "outbound", body);
    return true;
  }


  // Order summary
  if (
    lower.startsWith("summary:") || lower === "summary" || lower === "order summary" ||
    lower === "🧾 order summary"
  ) {
    const orderNumber = raw.includes(":") ? raw.split(":")[1] : null;
    const order = await findRecentOrder(phone, orderNumber);
    if (!order) {
      const msg = "🧾 I couldn't find an order for this number. Please share your order number (e.g. CFI-20260804-0001).";
      await sendWhatsAppMessage(phone, msg);
      await logMessage(phone, "outbound", msg);
      return true;
    }
    const body = buildOrderSummary(order);
    await sendWhatsAppButtons(phone, body, [
      { id: `resched:${order.order_number}`, title: "🗓️ Reschedule" },
      { id: `support:${order.order_number}`, title: "💬 Contact Support" },
    ]);
    await logMessage(phone, "outbound", body);
    return true;
  }

  // Reschedule → offer precise slots
  if (lower.startsWith("resched:") || lower === "reschedule" || lower === "🗓️ reschedule") {
    const orderNumber = raw.includes(":") ? raw.split(":")[1] : null;
    const order = await findRecentOrder(phone, orderNumber);
    if (!order) {
      const msg = "🗓️ I couldn't find an active order for this number. Please share your order number (e.g. CFI-20260804-0001).";
      await sendWhatsAppMessage(phone, msg);
      await logMessage(phone, "outbound", msg);
      return true;
    }
    const body = `🗓️ *Reschedule Delivery*\n\nOrder *#${order.order_number}*${
      order.delivery_slot ? `\nCurrent slot: ${order.delivery_slot}` : ""
    }\n\nTap below and pick an exact 2-hour delivery window. You can add a short note for the rider afterwards.`;
    await sendWhatsAppList(phone, body, "Pick a time slot", rescheduleRows(order.order_number), "Choose a new slot");
    await logMessage(phone, "outbound", body);
    return true;
  }

  // Reschedule → slot chosen
  if (lower.startsWith("reslot:")) {
    const parts = raw.split(":");
    const orderNumber = parts[1];
    const dayKey = parts[2];
    const windowId = parts[3];
    const slotLabel = slotLabelFromId(dayKey, windowId);
    const order = await findRecentOrder(phone, orderNumber);
    if (!order || !slotLabel) {
      const msg = "😔 Couldn't update that slot. Please reply *SUPPORT* and our team will reschedule it for you.";
      await sendWhatsAppMessage(phone, msg);
      await logMessage(phone, "outbound", msg);
      return true;
    }
    const note = `[Reschedule requested via WhatsApp] New slot: ${slotLabel}`;
    await supabase
      .from("orders")
      .update({
        delivery_slot: slotLabel,
        notes: order.notes ? `${order.notes}\n${note}` : note,
      })
      .eq("id", order.id);

    await updateConversation(phone, {
      conversation_state: "awaiting_delivery_note",
      menu_context: { note_order_id: order.id, note_order_number: order.order_number },
    });

    const msg = `✅ *Delivery Rescheduled*\n\nOrder *#${order.order_number}* is now set for *${slotLabel}*.\n\n📝 Want to add a short note for the rider (landmark, gate code, "call before arriving")? Just type it below — or tap *Skip*.`;
    await sendWhatsAppButtons(phone, msg, [
      { id: `notenote:skip`, title: "❌ Skip note" },
      { id: `summary:${order.order_number}`, title: "🧾 Order summary" },
    ]);
    await logMessage(phone, "outbound", msg);
    return true;
  }

  // Skip note button
  if (lower === "notenote:skip") {
    await updateConversation(phone, { conversation_state: "idle", menu_context: {} });
    const msg = "👍 No problem — your new slot is locked in. Type *MENU* to keep shopping.";
    await sendWhatsAppMessage(phone, msg);
    await logMessage(phone, "outbound", msg);
    return true;
  }

  return false;
}



async function getRecentMessages(phone: string, limit = 10) {
  const { data } = await supabase
    .from("whatsapp_messages")
    .select("direction, message_text, created_at")
    .eq("phone_number", phone)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data || []).reverse();
}

// ─── Delivery Distance Calculation (same as website) ───
async function geocodePincode(pincode: string) {
  try {
    const query = `${pincode}, India`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=in`;
    const response = await fetch(url, { headers: { "User-Agent": "DeliveryApp/1.0" } });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data || data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (error) { console.error("Geocoding error:", error); return null; }
}

async function calculateDrivingDistance(storeLat: number, storeLng: number, destLat: number, destLng: number) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${storeLng},${storeLat};${destLng},${destLat}?overview=false`;
    const response = await fetch(url, { headers: { "User-Agent": "DeliveryApp/1.0" } });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) return null;
    const route = data.routes[0];
    return { distanceKm: route.distance / 1000, durationMinutes: route.duration / 60 };
  } catch (error) { console.error("Distance calculation error:", error); return null; }
}

/** Reverse-geocode a shared WhatsApp location pin and check serviceability. */
async function resolveSharedLocation(lat: number, lng: number) {
  let address = `Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}`;
  let pincode: string | null = null;
  let city: string | null = null;
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
    const res = await fetch(url, { headers: { "User-Agent": "CaliforniaFarms/1.0" } });
    if (res.ok) {
      const data = await res.json();
      if (data?.display_name) address = data.display_name;
      const a = data?.address || {};
      pincode = a.postcode || null;
      city = a.city || a.town || a.village || a.suburb || a.county || null;
    }
  } catch (e) {
    console.error("Reverse geocode error:", e);
  }

  const route = await calculateDrivingDistance(STORE_COORDINATES.lat, STORE_COORDINATES.lng, lat, lng);
  const distanceKm = route ? Math.round(route.distanceKm * 10) / 10 : null;
  if (distanceKm != null && distanceKm > MAX_DELIVERY_DISTANCE_KM) {
    return {
      address, pincode, city, distanceKm, serviceable: false,
      error: `We currently deliver within ${MAX_DELIVERY_DISTANCE_KM} km of our farm. Your location is ${distanceKm} km away.`,
    };
  }
  return { address, pincode, city, distanceKm, serviceable: true };
}

async function calculateDeliveryCharge(pincode: string) {
  // Fetch delivery rate from settings
  const { data: settings } = await supabase
    .from("site_settings")
    .select("delivery_rate_per_km, free_delivery_threshold")
    .eq("id", "default")
    .single();

  const RATE_PER_KM = settings?.delivery_rate_per_km || 10;
  const FREE_THRESHOLD = settings?.free_delivery_threshold || 399;

  if (pincode === STORE_PINCODE) {
    return { deliveryCharge: 0, distanceKm: 0, freeThreshold: FREE_THRESHOLD, serviceable: true };
  }

  const customerCoords = await geocodePincode(pincode);
  if (!customerCoords) {
    return { deliveryCharge: 0, distanceKm: 0, freeThreshold: FREE_THRESHOLD, serviceable: false, error: "Could not locate pincode" };
  }

  const distanceResult = await calculateDrivingDistance(
    STORE_COORDINATES.lat, STORE_COORDINATES.lng, customerCoords.lat, customerCoords.lng
  );
  if (!distanceResult) {
    return { deliveryCharge: 0, distanceKm: 0, freeThreshold: FREE_THRESHOLD, serviceable: false, error: "Could not calculate route" };
  }

  const distanceKm = Math.round(distanceResult.distanceKm * 10) / 10;
  if (distanceKm > MAX_DELIVERY_DISTANCE_KM) {
    return { deliveryCharge: 0, distanceKm, freeThreshold: FREE_THRESHOLD, serviceable: false, error: `Delivery not available beyond ${MAX_DELIVERY_DISTANCE_KM} km (${distanceKm} km away)` };
  }

  const deliveryCharge = Math.round(distanceKm * RATE_PER_KM);
  return { deliveryCharge, distanceKm, freeThreshold: FREE_THRESHOLD, serviceable: true };
}

// ─── Razorpay Payment Link ───
async function createRazorpayPaymentLink(
  orderNumber: string, amount: number, customerName: string, customerPhone: string, description: string
) {
  const auth = btoa(`${RAZORPAY_KEY_ID.trim()}:${RAZORPAY_KEY_SECRET.trim()}`);
  const cleanPhone = customerPhone.replace(/^91/, "").replace(/^\+91/, "");

  const response = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: Math.round(amount * 100),
      currency: "INR",
      description,
      reference_id: orderNumber,
      customer: { name: customerName, contact: `+91${cleanPhone}` },
      notify: { sms: false, email: false, whatsapp: false },
      callback_url: `${supabaseUrl}/functions/v1/whatsapp-webhook?payment_callback=true&order_number=${orderNumber}&phone=${customerPhone}`,
      callback_method: "get",
      expire_by: Math.floor(Date.now() / 1000) + 30 * 60,
      notes: { order_number: orderNumber, source: "whatsapp", customer_phone: customerPhone },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Razorpay payment link error:", response.status, errorText);
    throw new Error(`Failed to create payment link: ${errorText}`);
  }

  const data = await response.json();
  console.log("Razorpay payment link created:", data.id, data.short_url);
  return data;
}

// ─── Email Helpers ───
function escapeHtml(text: string | number | undefined | null): string {
  if (text === null || text === undefined) return '';
  if (typeof text === 'number') return text.toString();
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

async function sendOrderConfirmationEmail(order: Record<string, any>, items: Array<Record<string, any>>, customerEmail?: string) {
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #e0e0e0;">${escapeHtml(item.product_name)}</td>
      <td style="padding:12px;border-bottom:1px solid #e0e0e0;text-align:center;">${escapeHtml(item.quantity)}</td>
      <td style="padding:12px;border-bottom:1px solid #e0e0e0;text-align:right;">₹${escapeHtml(item.unit_price)}</td>
      <td style="padding:12px;border-bottom:1px solid #e0e0e0;text-align:right;">₹${escapeHtml(item.total_price)}</td>
    </tr>
  `).join("");

  const deliveryChargeText = order.delivery_charge === 0 ? 'FREE' : `₹${escapeHtml(order.delivery_charge)}`;

  const emailHtml = `
    <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
    <style>
      body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f8f7f4;margin:0;padding:20px}
      .c{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1)}
      .hd{background:linear-gradient(135deg,#2d5a3d,#1e4030);padding:30px;text-align:center}
      .hd h1{color:#fff;margin:0;font-size:24px}.hd p{color:rgba(255,255,255,.8);margin:10px 0 0}
      .badge{display:inline-block;background:#4caf50;color:#fff;padding:8px 20px;border-radius:20px;font-weight:bold;margin:20px 0}
      .cnt{padding:30px}.oi{background:#f5f5f5;padding:20px;border-radius:8px;margin-bottom:20px}.oi p{margin:8px 0}.oi strong{color:#2d5a3d}
      .tbl{width:100%;border-collapse:collapse;margin:20px 0}.tbl th{background:#2d5a3d;color:#fff;padding:12px;text-align:left}
      .tbl th:last-child,.tbl th:nth-child(2),.tbl th:nth-child(3){text-align:right}.tbl th:nth-child(2){text-align:center}
      .wa-badge{display:inline-block;background:#25D366;color:#fff;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:bold;margin-left:8px}
      .ft{background:#333;color:#fff;padding:20px;text-align:center;font-size:12px}
    </style></head><body>
    <div class="c">
      <div class="hd"><h1>🌿 California Farms India</h1><p>Fresh from our farms to your table</p></div>
      <div class="cnt">
        <div style="text-align:center"><div class="badge">✓ Order Confirmed!</div><span class="wa-badge">📱 WhatsApp Order</span></div>
        <p>Dear <strong>${escapeHtml(order.delivery_name)}</strong>,</p>
        <p>Thank you for your WhatsApp order! It's being prepared with care.</p>
        <div class="oi">
          <p><strong>Order Number:</strong> ${escapeHtml(order.order_number)}</p>
          <p><strong>Delivery Time:</strong> 12:00 PM - 3:00 PM</p>
          <p><strong>Order Source:</strong> 📱 WhatsApp</p>
        </div>
        <h3 style="color:#2d5a3d">Order Details</h3>
        <table class="tbl"><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${itemsHtml}</tbody></table>
        <div style="margin-top:20px;padding-top:20px;border-top:2px solid #2d5a3d">
          <div style="display:flex;justify-content:space-between;padding:8px 0"><span>Subtotal</span><span>₹${escapeHtml(order.subtotal)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:8px 0"><span>Delivery</span><span>${deliveryChargeText}</span></div>
          <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:20px;font-weight:bold;color:#2d5a3d;border-top:1px solid #e0e0e0;padding-top:15px;margin-top:10px"><span>Total</span><span>₹${escapeHtml(order.total)}</span></div>
        </div>
        <div style="background:linear-gradient(135deg,#f0f9f4,#e8f5ed);padding:20px;border-radius:8px;margin-top:20px;border-left:4px solid #2d5a3d">
          <h4 style="margin:0 0 10px;color:#2d5a3d">📍 Delivery Address</h4>
          <p style="margin:0;color:#555">${escapeHtml(order.delivery_address)}</p>
        </div>
      </div>
      <div class="ft"><p>Thank you for choosing California Farms India!</p><p>📧 californiafarmsindia@gmail.com | 📞 +91 8149712801</p></div>
    </div></body></html>`;

  const adminHtml = `
    <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
    <style>
      body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f8f7f4;margin:0;padding:20px}
      .c{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1)}
      .hd{background:linear-gradient(135deg,#d97706,#b45309);padding:30px;text-align:center}
      .hd h1{color:#fff;margin:0;font-size:24px}.hd p{color:rgba(255,255,255,.8);margin:10px 0 0}
      .badge{display:inline-block;background:#16a34a;color:#fff;padding:8px 20px;border-radius:20px;font-weight:bold;margin:20px 0}
      .wa-badge{display:inline-block;background:#25D366;color:#fff;padding:6px 14px;border-radius:12px;font-size:13px;font-weight:bold;margin-left:8px}
      .cnt{padding:30px}.ci{background:#fef3c7;padding:20px;border-radius:8px;margin-bottom:20px;border-left:4px solid #d97706}.ci p{margin:8px 0}.ci strong{color:#92400e}
      .oi{background:#f5f5f5;padding:20px;border-radius:8px;margin-bottom:20px}.oi p{margin:8px 0}.oi strong{color:#2d5a3d}
      .tbl{width:100%;border-collapse:collapse;margin:20px 0}.tbl th{background:#d97706;color:#fff;padding:12px;text-align:left}
      .tbl th:last-child,.tbl th:nth-child(2),.tbl th:nth-child(3){text-align:right}.tbl th:nth-child(2){text-align:center}
      .ft{background:#333;color:#fff;padding:20px;text-align:center;font-size:12px}
    </style></head><body>
    <div class="c">
      <div class="hd"><h1>🛒 New WhatsApp Order!</h1><p>California Farms India - Admin Notification</p></div>
      <div class="cnt">
        <div style="text-align:center"><div class="badge">📦 ${escapeHtml(order.order_number)}</div><span class="wa-badge">📱 WhatsApp</span></div>
        <div class="ci">
          <h4 style="margin:0 0 10px;color:#92400e">👤 Customer Details</h4>
          <p><strong>Name:</strong> ${escapeHtml(order.delivery_name)}</p>
          <p><strong>Phone:</strong> ${escapeHtml(order.delivery_phone)}</p>
          ${customerEmail ? `<p><strong>Email:</strong> ${escapeHtml(customerEmail)}</p>` : ''}
          <p><strong>Source:</strong> 📱 WhatsApp Order</p>
        </div>
        <div class="oi">
          <p><strong>Order Number:</strong> ${escapeHtml(order.order_number)}</p>
          <p><strong>Order Date:</strong> ${new Date().toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}</p>
          <p><strong>Payment:</strong> ✅ Paid via Razorpay</p>
          ${order.upi_reference ? `<p><strong>Transaction ID:</strong> ${escapeHtml(order.upi_reference)}</p>` : ''}
        </div>
        <h3 style="color:#d97706">Order Items</h3>
        <table class="tbl"><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${itemsHtml}</tbody></table>
        <div style="margin-top:20px;padding-top:20px;border-top:2px solid #d97706">
          <div style="display:flex;justify-content:space-between;padding:8px 0"><span>Subtotal</span><span>₹${escapeHtml(order.subtotal)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:8px 0"><span>Delivery (${escapeHtml(order.delivery_distance_km || 0)} km)</span><span>${deliveryChargeText}</span></div>
          <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:20px;font-weight:bold;color:#d97706;border-top:1px solid #e0e0e0;padding-top:15px;margin-top:10px"><span>Total</span><span>₹${escapeHtml(order.total)}</span></div>
        </div>
        <div style="background:linear-gradient(135deg,#fef9c3,#fef3c7);padding:20px;border-radius:8px;margin-top:20px;border-left:4px solid #d97706">
          <h4 style="margin:0 0 10px;color:#92400e">📍 Delivery Address</h4>
          <p style="margin:0;color:#555">${escapeHtml(order.delivery_address)}</p>
        </div>
      </div>
      <div class="ft"><p>California Farms India - Admin Panel</p></div>
    </div></body></html>`;

  // Send to customer if email available
  if (customerEmail) {
    try {
      await resend.emails.send({
        from: "California Farms <orders@zomical.com>",
        to: [customerEmail],
        subject: `Order Confirmed! #${order.order_number} - California Farms India`,
        html: emailHtml,
      });
      await logEmailRecord(order.order_number, customerEmail, order.delivery_name, "order_confirmation_customer", "sent");
    } catch (e) { console.error("Customer email failed:", e); }
  }

  // Send to admins
  try {
    await resend.emails.send({
      from: "California Farms <orders@zomical.com>",
      to: ADMIN_EMAILS,
      subject: `🛒 WhatsApp Order #${order.order_number} - ₹${order.total} - ${order.delivery_name}`,
      html: adminHtml,
    });
    for (const ae of ADMIN_EMAILS) {
      await logEmailRecord(order.order_number, ae, null, "order_confirmation_admin", "sent");
    }
  } catch (e) { console.error("Admin email failed:", e); }
}

async function logEmailRecord(orderNumber: string, email: string, name: string | null, type: string, status: string) {
  await supabase.from("email_logs").insert({
    recipient_email: email,
    recipient_name: name,
    subject: `Order #${orderNumber}`,
    email_type: type,
    status,
    metadata: { orderNumber, source: "whatsapp" },
  });
}

// ─── Order Creation with Delivery Charges ───
async function createOrderAndPaymentLink(phone: string, conversation: Record<string, unknown>) {
  const cart = conversation.cart as Array<{ name: string; qty: number; price: number; unit: string; product_id?: string }>;
  if (!cart || cart.length === 0) return null;

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const pincode = (conversation.delivery_pincode as string) || "";

  // Calculate delivery charge based on pincode (same as website)
  let deliveryCharge = 0;
  let distanceKm = 0;
  if (pincode) {
    const result = await calculateDeliveryCharge(pincode);
    if (!result.serviceable) {
      throw new Error(result.error || "Delivery not available for this pincode");
    }
    distanceKm = result.distanceKm;
    // Apply free delivery threshold (same as website: ₹399+)
    deliveryCharge = subtotal >= result.freeThreshold ? 0 : result.deliveryCharge;
  }

  const total = subtotal + deliveryCharge;

  const { data: orderNumData } = await supabase.rpc("generate_order_number");
  const orderNumber = orderNumData || `CFI-${Date.now()}`;

  const customerName = (conversation.delivery_name as string) || "WhatsApp Customer";
  const customerPhone = (conversation.delivery_phone as string) || phone;
  const deliveryAddress = (conversation.delivery_address as string) || "";

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_number: orderNumber,
      user_id: (conversation.user_id as string) || null,
      status: "pending",
      payment_method: "online",
      payment_status: "pending",
      subtotal,
      delivery_charge: deliveryCharge,
      total,
      delivery_name: customerName,
      delivery_phone: customerPhone,
      delivery_address: deliveryAddress,
      order_date: new Date().toISOString().split("T")[0],
      notes: `WhatsApp order from ${phone}`,
      order_source: "whatsapp",
    })
    .select()
    .single();

  if (orderError) { console.error("Error creating order:", orderError); throw new Error("Failed to create order"); }

  const orderItems = cart.map((item) => ({
    order_id: order.id,
    product_id: item.product_id || null,
    product_name: item.name,
    quantity: item.qty,
    unit_price: item.price,
    total_price: item.price * item.qty,
    unit: item.unit || "kg",
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
  if (itemsError) console.error("Error inserting order items:", itemsError);

  const paymentLink = await createRazorpayPaymentLink(
    orderNumber, total, customerName, customerPhone,
    `California Farms India - Order #${orderNumber}`
  );

  await updateConversation(phone, {
    last_order_id: order.id,
    conversation_state: "awaiting_payment",
  });

  return { orderNumber, subtotal, deliveryCharge, distanceKm, total, paymentUrl: paymentLink.short_url, orderId: order.id };
}

// ─── AI Response ───
async function getAIResponse(
  userMessage: string, conversation: Record<string, unknown>,
  products: Array<Record<string, unknown>>, chatHistory: Array<Record<string, unknown>>,
  lang: Lang = "en"
) {
  const productCatalog = products
    .map((p: any) => {
      const eff = effectivePrice(p);
      let priceStr = `₹${eff}/${p.unit}`;
      if (eff !== Number(p.price)) priceStr += ` (was ₹${p.price})`;
      const variants = (Array.isArray(p.product_variants) ? p.product_variants : [])
        .filter((v: any) => v.is_available !== false);
      const variantStr = variants.length > 0
        ? ` | packs: ${variants.map((v: any) => `${v.name} ₹${v.price}`).join(", ")}`
        : ` | packs: 500g ₹${Math.round(eff / 2)}, 1${p.unit} ₹${eff}`;
      const stockStr = p.stock_quantity == null ? "in stock" : p.stock_quantity <= 0 ? "OUT OF STOCK" : `${p.stock_quantity} ${p.unit} left`;
      const photo = productImage(p) ? " | 📷 photo available" : "";
      return `- ${p.name}: ${priceStr}${variantStr} (${stockStr})${photo}`;
    })
    .join("\n");


  const cart = conversation.cart || [];
  const cartSummary = Array.isArray(cart) && cart.length > 0
    ? (cart as Array<{ name: string; qty: number; price: number; unit: string }>)
        .map((item) => `${item.name} x${item.qty} = ₹${item.price * item.qty}`)
        .join(", ")
    : "Empty";

  const historyText = chatHistory
    .map((m) => `${m.direction === "inbound" ? "Customer" : "Agent"}: ${m.message_text}`)
    .join("\n");

  const systemPrompt = `You are a premium WhatsApp shopping assistant for California Farms India, a farm-fresh grocery delivery service in Nagpur (zomical.com).

RULES:
- LANGUAGE (strict): reply ONLY in ${lang === "hi" ? "Hindi (Devanagari)" : lang === "mr" ? "Marathi (Devanagari)" : "English"}. Never switch language on your own — the customer decides the language, and only they can change it.
- NEVER send long product lists. The app has a tappable category menu that does browsing for you.
- Keep every reply to ONE short screen (max 300 chars). No walls of text.
- Use emojis sparingly but warmly 🥬🥕🍅
- Always show prices in ₹
- End replies by guiding the customer back to navigation, e.g. "Type *MENU* to browse categories 🌿".
- Never invent products, prices or stock — use only the live catalog below.


AVAILABLE PRODUCTS:
${productCatalog}

CUSTOMER'S CURRENT CART: ${cartSummary}
CONVERSATION STATE: ${conversation.conversation_state}
DELIVERY INFO COLLECTED:
- Name: ${conversation.delivery_name || "Not provided"}
- Address: ${conversation.delivery_address || "Not provided"}
- Phone: ${conversation.delivery_phone || "Not provided"}
- Pincode: ${conversation.delivery_pincode || "Not provided"}

CAPABILITIES:
1. Show product catalog by category with current discounts
2. Add/remove items to cart
3. Help with checkout (collect name, address, phone, pincode)
4. Answer questions about products, delivery, pricing
5. Inform about delivery charges: ₹10/km, FREE delivery on orders ≥₹399
6. Delivery available within 50 km of Nagpur store

CART INSTRUCTIONS:
When the customer wants to add items, include this JSON block:
<!--CART_UPDATE:{"action":"add","items":[{"name":"Product Name","qty":1,"price":100,"unit":"kg","product_id":"uuid"}]}-->
When removing items:
<!--CART_UPDATE:{"action":"remove","items":[{"name":"Product Name"}]}-->
When clearing cart:
<!--CART_UPDATE:{"action":"clear"}-->

PRODUCT PHOTOS (VERY IMPORTANT):
Whenever the customer asks to see products, the catalog, a category, prices, stock, or a specific item, ALWAYS send photo cards by adding this tag at the END of your reply:
<!--SHOW_PRODUCTS:["Exact Product Name 1","Exact Product Name 2"]-->
- Use EXACT product names from the AVAILABLE PRODUCTS list.
- Send up to 5 products per reply (the most relevant / bestselling ones first).
- The system automatically sends a beautiful photo card for each with price, 500g/1kg pack prices and live stock — so keep YOUR text very short (1-2 lines like "Here are our fresh picks today 🥬") and DO NOT repeat prices or stock in your text.
- If the customer asks for "more" or another category, send the next set of products the same way.


CHECKOUT FLOW:
When customer says "order", "checkout", "place order" or similar, collect ALL delivery details step by step:
1. Full name
2. Delivery address (ask for complete address with landmark)
3. Phone number (10 digit)
4. Pincode (6 digit, for delivery charge calculation)

IMPORTANT DELIVERY RULES:
- Delivery charge is ₹10/km based on distance from our farm in Nagpur
- Orders of ₹399 or more get FREE delivery 🎉
- Show the delivery charge before checkout
- Max delivery radius: 50 km

Once ALL 4 details are collected AND the customer confirms, include:
<!--CHECKOUT_READY-->

Payment is online only via Razorpay (NO Cash on Delivery).
If state is "awaiting_payment", remind to pay via the link already sent.

RECENT CHAT:
${historyText}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 500,
      }),
    });
    if (!response.ok) {
      console.error("AI gateway error:", response.status, await response.text());
      return "Sorry, I'm having trouble right now. Please try again in a moment! 🙏";
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Sorry, I couldn't process that. Please try again!";
  } catch (error) {
    console.error("AI call error:", error);
    return "Sorry, something went wrong. Please try again! 🙏";
  }
}

// ─── Cart Processing ───
async function processCartUpdate(phone: string, aiResponse: string, conversation: Record<string, unknown>) {
  const cartMatch = aiResponse.match(/<!--CART_UPDATE:(.*?)-->/s);
  if (!cartMatch) return;
  try {
    const update = JSON.parse(cartMatch[1]);
    let cart = Array.isArray(conversation.cart) ? [...(conversation.cart as Array<any>)] : [];
    if (update.action === "add") {
      for (const item of update.items) {
        const existingIndex = cart.findIndex((c) => c.name.toLowerCase() === item.name.toLowerCase());
        if (existingIndex >= 0) { cart[existingIndex].qty += item.qty; }
        else { cart.push(item); }
      }
    } else if (update.action === "remove") {
      for (const item of update.items) { cart = cart.filter((c) => c.name.toLowerCase() !== item.name.toLowerCase()); }
    } else if (update.action === "clear") { cart = []; }
    await updateConversation(phone, { cart });
    conversation.cart = cart;
  } catch (e) { console.error("Error processing cart update:", e); }
}

// Extract delivery details from AI response
async function processDeliveryDetails(phone: string, aiResponse: string, conversation: Record<string, unknown>) {
  // The AI collects these via conversation - update from conversation context stored by AI
  // This is handled via the AI prompt which stores details in the conversation
}

function cleanResponse(text: string): string {
  return text
    .replace(/<!--CART_UPDATE:.*?-->/gs, "")
    .replace(/<!--SHOW_PRODUCTS:.*?-->/gs, "")
    .replace(/<!--CHECKOUT_READY-->/gs, "")
    .trim();
}

// Send photo cards for the products the AI asked to showcase
async function sendProductShowcase(
  phone: string, aiResponse: string, products: Array<Record<string, any>>
): Promise<boolean> {
  const match = aiResponse.match(/<!--SHOW_PRODUCTS:(.*?)-->/s);
  if (!match) return false;
  let names: string[] = [];
  try {
    const parsed = JSON.parse(match[1]);
    if (Array.isArray(parsed)) names = parsed.map((n) => String(n));
  } catch (e) { console.error("Bad SHOW_PRODUCTS payload:", e); return false; }

  let sent = 0;
  for (const name of names.slice(0, 5)) {
    const p = products.find((x) => String(x.name).toLowerCase() === name.toLowerCase())
      || products.find((x) => String(x.name).toLowerCase().includes(name.toLowerCase()));
    if (!p) continue;
    const caption = buildProductCaption(p);
    const img = productImage(p);
    if (img) await sendWhatsAppImage(phone, img, caption);
    else await sendWhatsAppMessage(phone, caption);
    await logMessage(phone, "outbound", caption);
    sent++;
  }
  if (sent > 0) {
    const footer = `🌱 *Order more on our website:* https://zomical.com/products\n🚚 ₹10/km delivery • FREE above ₹399`;
    await sendWhatsAppMessage(phone, footer);
    await logMessage(phone, "outbound", footer);
  }
  return sent > 0;
}


// ─── Payment Callback ───
async function handlePaymentCallback(url: URL) {
  const orderNumber = url.searchParams.get("order_number");
  const phone = url.searchParams.get("phone");
  const razorpayPaymentId = url.searchParams.get("razorpay_payment_id");
  const razorpayPaymentLinkId = url.searchParams.get("razorpay_payment_link_id");
  const razorpayPaymentLinkStatus = url.searchParams.get("razorpay_payment_link_status");

  console.log("Payment callback:", { orderNumber, phone, razorpayPaymentLinkStatus, razorpayPaymentId });

  if (orderNumber && razorpayPaymentLinkStatus === "paid") {
    const { data: order, error } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        status: "confirmed",
        upi_reference: razorpayPaymentId || razorpayPaymentLinkId,
        payment_verified_at: new Date().toISOString(),
      })
      .eq("order_number", orderNumber)
      .select("*")
      .single();

    if (error) {
      console.error("Error updating order after payment:", error);
    } else if (order) {
      console.log(`Order ${orderNumber} marked as paid`);

      // Fetch order items for email
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", order.id);

      // Look up customer email from profile if user_id exists
      let customerEmail: string | undefined;
      if (order.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", order.user_id)
          .maybeSingle();
        // Get email from auth (service role can access)
        // Use conversation phone to look up
      }
      // Also check if conversation has email context
      if (phone) {
        const cleanPhone = phone.replace(/^\+/, "");
        const { data: conv } = await supabase
          .from("whatsapp_conversations")
          .select("user_id")
          .eq("phone_number", cleanPhone)
          .maybeSingle();
        if (conv?.user_id) {
          // Try to get email from auth admin API
          try {
            const authRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${conv.user_id}`, {
              headers: { Authorization: `Bearer ${supabaseServiceKey}`, apikey: supabaseServiceKey },
            });
            if (authRes.ok) {
              const userData = await authRes.json();
              customerEmail = userData.email;
            }
          } catch (e) { console.error("Failed to fetch user email:", e); }
        }
      }

      // Send order confirmation email to admin + customer
      await sendOrderConfirmationEmail(
        { ...order, delivery_distance_km: 0 },
        orderItems || [],
        customerEmail
      );

      // Send WhatsApp confirmation
      if (phone) {
        const cleanPhone = phone.replace(/^\+/, "");
        const deliveryChargeText = order.delivery_charge > 0 ? `\n🚚 Delivery: ₹${order.delivery_charge}` : "\n🚚 Delivery: FREE";
        await sendWhatsAppMessage(
          cleanPhone,
          `✅ Payment received! Your order #${orderNumber} is confirmed.\n\n💰 Subtotal: ₹${order.subtotal}${deliveryChargeText}\n💵 Total: ₹${order.total}\n\nWe're preparing your fresh produce! 🥬🚚\n\nThank you for ordering from California Farms India! 🌱`
        );
        await logMessage(cleanPhone, "outbound", `Payment confirmed for order #${orderNumber}`);
        await updateConversation(cleanPhone, { conversation_state: "idle", cart: [], menu_context: {} });

        // Recommend related products after every purchase
        try {
          const products = await getAvailableProducts();
          const bought = new Set((orderItems || []).map((i: any) => String(i.product_name).toLowerCase()));
          const recos = (products as Array<Record<string, any>>)
            .filter((p) => !bought.has(String(p.name).toLowerCase()) && (p.stock_quantity == null || Number(p.stock_quantity) > 0))
            .slice(0, 3);
          if (recos.length) {
            const msg = `✨ *Customers also loved*\n${recos.map((p) => `• ${p.name} — ₹${effectivePrice(p)}/${p.unit}`).join("\n")}\n\nType *MENU* to shop again 🌿`;
            await sendWhatsAppMessage(cleanPhone, msg);
            await logMessage(cleanPhone, "outbound", msg);
          }
        } catch (e) { console.error("Reco error:", e); }

      }
    }
  }

  return new Response(null, { status: 302, headers: { Location: `https://zomical.com/orders` } });
}

// ─── Main Server ───
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // Payment Callback
  if (url.searchParams.get("payment_callback") === "true") {
    return handlePaymentCallback(url);
  }

  // GET: Meta Webhook Verification
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
    }
    return new Response("Forbidden", { status: 403 });
  }

  // POST: Incoming WhatsApp Messages
  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("Webhook POST body:", JSON.stringify(body).slice(0, 500));

      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];

      if (!message) {
        return new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const from = message.from;
      const buttonId: string | null =
        message.interactive?.button_reply?.id ||
        message.interactive?.list_reply?.id ||
        message.button?.payload ||
        null;
      const messageText = message.text?.body
        || message.interactive?.button_reply?.title
        || message.interactive?.list_reply?.title
        || "";
      const sharedLocation = message.location
        ? {
            latitude: Number(message.location.latitude),
            longitude: Number(message.location.longitude),
            address: message.location.address ?? null,
            name: message.location.name ?? null,
          }
        : null;
      const waMessageId = message.id;

      console.log(`Message from ${from}: ${messageText} (button: ${buttonId}, location: ${!!sharedLocation})`);
      await logMessage(from, "inbound", buttonId || messageText || (sharedLocation ? "[location shared]" : ""), waMessageId);
      if (buttonId) {
        await logActivity({
          order_number: orderNumberFromPayload(buttonId),
          phone_number: from,
          direction: "inbound",
          event_type: "button_reply",
          button_id: buttonId,
          body: messageText || buttonId,
          success: true,
        });
      }

      // Support / reschedule buttons from order-update messages take priority
      try {
        if (await handleOrderActions(from, messageText, buttonId)) {
          return new Response(JSON.stringify({ status: "ok" }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (e) {
        console.error("Order action error:", e);
      }


      const conversation = await getConversation(from);
      if (!conversation) {
        await sendWhatsAppMessage(from, "Sorry, something went wrong. Please try again! 🙏");
        return new Response(JSON.stringify({ status: "ok" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const [products, chatHistory] = await Promise.all([getAvailableProducts(), getRecentMessages(from)]);

      // Mirror the customer's language: switch only when they clearly write in
      // another language, never on the bot's own initiative.
      const lang: Lang = buttonId
        ? ((conversation as any).language as Lang) || "en"
        : resolveLang((conversation as any).language, messageText);
      (conversation as any).language = lang;

      // Inbox metadata so the admin Conversation Manager stays live
      await updateConversation(from, {
        language: lang,
        last_message_at: new Date().toISOString(),
        last_message_text: (buttonId ? messageText || buttonId : messageText || "[location shared]").slice(0, 200),
        unread_count: (Number((conversation as any).unread_count) || 0) + 1,
        is_archived: false,
      });

      // Premium menu-driven shopping engine handles navigation, browsing,
      // product cards, cart and checkout deterministically. The AI only steps
      // in for free-form conversation it can't resolve.
      try {
        const handled = await handleShopMessage({
          phone: from,
          text: messageText,
          buttonId,
          location: sharedLocation,
          lang,
          conversation: conversation as Record<string, any>,
          products: products as Array<Record<string, any>>,
          sendText: sendWhatsAppMessage,
          sendImage: sendWhatsAppImage,
          sendButtons: sendWhatsAppButtons,
          sendList: sendWhatsAppList,
          updateConversation,
          log: (p, d, t) => logMessage(p, d, t),
          createOrder: createOrderAndPaymentLink,
          listOrders: listCustomerOrders,
          getOrder: getCustomerOrder,
          cancelOrder: cancelCustomerOrder,
          resolveLocation: resolveSharedLocation,
        });
        if (handled) {
          return new Response(JSON.stringify({ status: "ok" }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (e) {
        console.error("Shop engine error:", e);
      }

      const aiResponse = await getAIResponse(messageText, conversation, products, chatHistory, lang);
      await processCartUpdate(from, aiResponse, conversation);


      const isCheckoutReady = aiResponse.includes("<!--CHECKOUT_READY-->");
      const cleanedResponse = cleanResponse(aiResponse);
      if (cleanedResponse) {
        const chunks = cleanedResponse.match(/.{1,4000}/gs) || [cleanedResponse];
        for (const chunk of chunks) {
          await sendWhatsAppMessage(from, chunk);
          await logMessage(from, "outbound", chunk);
        }
      }

      // Send rich product photo cards (price, pack sizes, live stock)
      try {
        await sendProductShowcase(from, aiResponse, products as Array<Record<string, any>>);
      } catch (e) { console.error("Product showcase error:", e); }


      if (isCheckoutReady) {
        try {
          const result = await createOrderAndPaymentLink(from, conversation);
          if (result) {
            const deliveryText = result.deliveryCharge > 0
              ? `\n🚚 Delivery (${result.distanceKm} km): ₹${result.deliveryCharge}`
              : "\n🚚 Delivery: FREE 🎉";
            const paymentMessage = `💳 *Payment Link for Order #${result.orderNumber}*\n\n🛒 Subtotal: ₹${result.subtotal}${deliveryText}\n💰 Total: ₹${result.total}\n\n👉 Pay here: ${result.paymentUrl}\n\n⏰ Link expires in 30 minutes.\nOrder confirmed automatically after payment! ✅`;
            await sendWhatsAppMessage(from, paymentMessage);
            await logMessage(from, "outbound", paymentMessage);
          }
        } catch (err: any) {
          console.error("Error creating order/payment link:", err);
          const errorMsg = err.message?.includes("Delivery not available")
            ? `Sorry, ${err.message}. Please provide a different pincode. 🙏`
            : "Sorry, there was an issue creating your payment link. Please try again! 🙏";
          await sendWhatsAppMessage(from, errorMsg);
        }
      }

      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Webhook POST error:", error);
      return new Response(JSON.stringify({ error: "Internal error" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
