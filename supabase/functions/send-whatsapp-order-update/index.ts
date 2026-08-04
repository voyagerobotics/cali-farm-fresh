import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const whatsappToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
const whatsappPhoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const SUPPORT_PHONE = "918600011641";
const SUPPORT_URL = `https://wa.me/${SUPPORT_PHONE}`;
const RETRY_URL = "https://zomical.com/orders";

export const SUPPORTED_LANGUAGES = ["en", "hi", "mr"] as const;
type Lang = (typeof SUPPORTED_LANGUAGES)[number];

/** Built-in fallback template names per status (used when nothing is configured in the DB) */
const defaultTemplateMap: Record<string, string> = {
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

type TextMap = Record<string, (o: MsgCtx) => string>;

const textMapEn: TextMap = {
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

const textMapHi: TextMap = {
  confirmed: (o) =>
    `✅ *ऑर्डर कन्फर्म!*\n\nनमस्ते ${o.name}, आपका ऑर्डर *#${o.orderNumber}* कन्फर्म हो गया है और हम उसे ध्यान से तैयार कर रहे हैं। 🌿\n\nऑर्डर ट्रैक करें: https://zomical.com/orders`,
  preparing: (o) =>
    `📦 *ऑर्डर पैक हो गया*\n\nनमस्ते ${o.name}, आपका ऑर्डर *#${o.orderNumber}* ताज़ा पैक हो चुका है और भेजने के लिए तैयार है।${
      o.eta ? `\n\n🕒 *अनुमानित डिलीवरी:* ${o.eta}` : ""
    }`,
  out_for_delivery: (o) =>
    `🚚 *डिलीवरी के लिए निकल चुका है*\n\nनमस्ते ${o.name}, आपका ऑर्डर *#${o.orderNumber}* रास्ते में है।${
      o.eta ? `\n\n🕒 *अनुमानित डिलीवरी:* ${o.eta}` : ""
    }\n\nकृपया अपना फ़ोन पास रखें। मदद चाहिए? नीचे बटन दबाएँ।`,
  delivered: (o) =>
    `🎉 *ऑर्डर डिलीवर हो गया*\n\nनमस्ते ${o.name}, आपका ऑर्डर *#${o.orderNumber}* ${
      o.eta ? `*${o.eta}* को ` : ""
    }डिलीवर कर दिया गया है। ताज़ी फ़ार्म उपज का आनंद लें! 🌿\n\nकोई दिक्कत हो तो नीचे बटन दबाएँ, हमारी टीम मदद करेगी।\n\nदोबारा खरीदें: https://zomical.com`,
  cancelled: (o) =>
    `❌ *ऑर्डर रद्द*\n\nनमस्ते ${o.name}, आपका ऑर्डर *#${o.orderNumber}* रद्द कर दिया गया है। अगर यह ग़लती से हुआ है तो यहीं रिप्लाई करें।`,
  payment_failed: (o) =>
    `⚠️ *पेमेंट फेल*\n\nनमस्ते ${o.name}, आपके ऑर्डर *#${o.orderNumber}*${
      o.total ? ` (₹${o.total})` : ""
    } का पेमेंट पूरा नहीं हो पाया।\n\n*चिंता न करें — आपका ऑर्डर सेव है और सामान अगले 60 मिनट तक रिज़र्व है।*\n\n*आगे क्या करें:*\n1️⃣ ${RETRY_URL} खोलें\n2️⃣ ऑर्डर #${o.orderNumber} चुनें\n3️⃣ *Retry Payment* दबाकर UPI / कार्ड से भुगतान करें\n\nअगर पैसे कट गए हैं तो बैंक 3-5 कार्यदिवस में अपने आप वापस कर देता है — रेफ़रेंस नंबर भेजें, हम ट्रैक कर देंगे।`,
  payment_pending: (o) =>
    `⏳ *पेमेंट बाकी है*\n\nनमस्ते ${o.name}, आपके ऑर्डर *#${o.orderNumber}*${
      o.total ? ` (₹${o.total})` : ""
    } का भुगतान अभी तक नहीं मिला, इसलिए ऑर्डर कन्फर्म नहीं हुआ है।\n\n*2 आसान स्टेप:*\n1️⃣ ${RETRY_URL} खोलें\n2️⃣ ऑर्डर #${o.orderNumber} पर *Retry Payment* दबाएँ\n\nअगर आपने भुगतान कर दिया है तो UPI रेफ़रेंस नंबर यहाँ भेजें, हम तुरंत जाँच लेंगे। बिना भुगतान वाले ऑर्डर 24 घंटे बाद अपने आप रद्द हो जाते हैं।`,
  refund_requested: (o) =>
    `🔁 *रिफंड अनुरोध मिला*\n\nनमस्ते ${o.name}, ऑर्डर *#${o.orderNumber}*${
      o.total ? ` (₹${o.total})` : ""
    } के लिए आपका रिफंड अनुरोध मिल गया है।\n\n*आगे क्या होगा:*\n1️⃣ हमारी टीम *24 घंटे* में समीक्षा करेगी\n2️⃣ मंज़ूरी के बाद रिफंड उसी पेमेंट माध्यम में शुरू होगा\n3️⃣ प्रोसेस होते ही आपको WhatsApp पर सूचना मिलेगी\n\nअभी आपको कुछ करने की ज़रूरत नहीं है। फ़ोटो या कारण जोड़ना हो तो यहीं भेज दें।`,
  refund_processed: (o) =>
    `💸 *रिफंड प्रोसेस हो गया*\n\nनमस्ते ${o.name}, ऑर्डर *#${o.orderNumber}*${
      o.total ? ` का *₹${o.total}*` : ""
    } रिफंड सफलतापूर्वक प्रोसेस कर दिया गया है। ✅\n\n*आगे क्या होगा:*\n1️⃣ राशि आपके मूल पेमेंट माध्यम (UPI / कार्ड / बैंक) में वापस जाएगी\n2️⃣ बैंक आमतौर पर *5-7 कार्यदिवस* में क्रेडिट करते हैं\n3️⃣ स्टेटमेंट में यह Razorpay/California Farms क्रेडिट के रूप में दिखेगा\n\n7 कार्यदिवस बाद भी न दिखे तो *Contact Support* दबाएँ, हम रेफ़रेंस भेज देंगे।`,
};

const textMapMr: TextMap = {
  confirmed: (o) =>
    `✅ *ऑर्डर कन्फर्म!*\n\nनमस्कार ${o.name}, तुमची ऑर्डर *#${o.orderNumber}* कन्फर्म झाली आहे आणि आम्ही ती काळजीपूर्वक तयार करत आहोत. 🌿\n\nऑर्डर ट्रॅक करा: https://zomical.com/orders`,
  preparing: (o) =>
    `📦 *ऑर्डर पॅक झाली*\n\nनमस्कार ${o.name}, तुमची ऑर्डर *#${o.orderNumber}* ताजी पॅक झाली असून पाठवण्यासाठी तयार आहे.${
      o.eta ? `\n\n🕒 *अपेक्षित डिलिव्हरी:* ${o.eta}` : ""
    }`,
  out_for_delivery: (o) =>
    `🚚 *डिलिव्हरीसाठी निघाली*\n\nनमस्कार ${o.name}, तुमची ऑर्डर *#${o.orderNumber}* मार्गावर आहे.${
      o.eta ? `\n\n🕒 *अंदाजे डिलिव्हरी:* ${o.eta}` : ""
    }\n\nकृपया फोन जवळ ठेवा. मदत हवी आहे? खालील बटण दाबा.`,
  delivered: (o) =>
    `🎉 *ऑर्डर डिलिव्हर झाली*\n\nनमस्कार ${o.name}, तुमची ऑर्डर *#${o.orderNumber}* ${
      o.eta ? `*${o.eta}* रोजी ` : ""
    }डिलिव्हर झाली आहे. ताज्या शेतमालाचा आनंद घ्या! 🌿\n\nकाही अडचण असल्यास खालील बटण दाबा, आमची टीम मदत करेल.\n\nपुन्हा खरेदी करा: https://zomical.com`,
  cancelled: (o) =>
    `❌ *ऑर्डर रद्द*\n\nनमस्कार ${o.name}, तुमची ऑर्डर *#${o.orderNumber}* रद्द करण्यात आली आहे. हे अनपेक्षित असल्यास इथेच उत्तर द्या.`,
  payment_failed: (o) =>
    `⚠️ *पेमेंट अयशस्वी*\n\nनमस्कार ${o.name}, तुमच्या ऑर्डर *#${o.orderNumber}*${
      o.total ? ` (₹${o.total})` : ""
    } चे पेमेंट पूर्ण होऊ शकले नाही.\n\n*काळजी करू नका — ऑर्डर सुरक्षित आहे आणि वस्तू पुढील 60 मिनिटे राखून ठेवल्या आहेत.*\n\n*पुढे काय करावे:*\n1️⃣ ${RETRY_URL} उघडा\n2️⃣ ऑर्डर #${o.orderNumber} निवडा\n3️⃣ *Retry Payment* दाबून UPI / कार्डने भरणा करा\n\nपैसे कापले गेले असल्यास बँक 3-5 कामकाजाच्या दिवसांत परत करते — रेफरन्स नंबर पाठवा, आम्ही पाठपुरावा करू.`,
  payment_pending: (o) =>
    `⏳ *पेमेंट बाकी*\n\nनमस्कार ${o.name}, तुमच्या ऑर्डर *#${o.orderNumber}*${
      o.total ? ` (₹${o.total})` : ""
    } चे पेमेंट अद्याप मिळालेले नाही, त्यामुळे ऑर्डर कन्फर्म झालेली नाही.\n\n*2 सोप्या पायऱ्या:*\n1️⃣ ${RETRY_URL} उघडा\n2️⃣ ऑर्डर #${o.orderNumber} वर *Retry Payment* दाबा\n\nतुम्ही आधीच भरणा केला असल्यास UPI रेफरन्स नंबर इथे पाठवा, आम्ही लगेच तपासतो. न भरलेल्या ऑर्डर 24 तासांनी आपोआप रद्द होतात.`,
  refund_requested: (o) =>
    `🔁 *परतावा विनंती मिळाली*\n\nनमस्कार ${o.name}, ऑर्डर *#${o.orderNumber}*${
      o.total ? ` (₹${o.total})` : ""
    } साठी तुमची परतावा विनंती मिळाली आहे.\n\n*पुढे काय होईल:*\n1️⃣ आमची टीम *24 तासांत* पडताळणी करेल\n2️⃣ मंजुरीनंतर परतावा त्याच पेमेंट पद्धतीत सुरू होईल\n3️⃣ प्रक्रिया होताच WhatsApp वर कळवले जाईल\n\nसध्या तुम्हाला काहीही करण्याची गरज नाही. फोटो किंवा कारण द्यायचे असल्यास इथेच पाठवा.`,
  refund_processed: (o) =>
    `💸 *परतावा प्रक्रिया पूर्ण*\n\nनमस्कार ${o.name}, ऑर्डर *#${o.orderNumber}*${
      o.total ? ` चा *₹${o.total}*` : ""
    } परतावा यशस्वीरित्या प्रक्रिया झाला आहे. ✅\n\n*पुढे काय होईल:*\n1️⃣ रक्कम मूळ पेमेंट पद्धतीत (UPI / कार्ड / बँक) परत जाईल\n2️⃣ बँका साधारण *5-7 कामकाजाच्या दिवसांत* जमा करतात\n3️⃣ स्टेटमेंटमध्ये Razorpay/California Farms क्रेडिट असे दिसेल\n\n7 दिवसांनंतरही न दिसल्यास *Contact Support* दाबा, आम्ही रेफरन्स देऊ.`,
};

const textMaps: Record<Lang, TextMap> = { en: textMapEn, hi: textMapHi, mr: textMapMr };

const buttonLabels: Record<Lang, { reschedule: string; summary: string; support: string; footer: string }> = {
  en: {
    reschedule: "🗓️ Reschedule",
    summary: "🧾 Order summary",
    support: "💬 Contact Support",
    footer: "California Farms India • zomical.com",
  },
  hi: {
    reschedule: "🗓️ समय बदलें",
    summary: "🧾 ऑर्डर विवरण",
    support: "💬 सहायता",
    footer: "California Farms India • zomical.com",
  },
  mr: {
    reschedule: "🗓️ वेळ बदला",
    summary: "🧾 ऑर्डर तपशील",
    support: "💬 मदत",
    footer: "California Farms India • zomical.com",
  },
};

// Statuses that get interactive buttons (summary / support / reschedule)
const buttonStatuses = new Set([
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
  "payment_failed",
  "payment_pending",
  "refund_requested",
  "refund_processed",
]);

function normalizeLang(value?: string | null): Lang {
  const v = String(value || "").toLowerCase().slice(0, 2);
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(v) ? (v as Lang) : "en";
}

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

/** Records an entry in the order-level WhatsApp activity log */
async function logActivity(entry: Record<string, unknown>) {
  try {
    await supabaseAdmin.from("whatsapp_activity_log").insert(entry);
  } catch (e) {
    console.error("activity log insert failed", e);
  }
}

/** Resolve the approved template name for a status + language from the DB, else built-in default */
async function resolveTemplate(status: string, lang: Lang): Promise<{ name: string | null; language: Lang }> {
  const { data } = await supabaseAdmin
    .from("whatsapp_templates")
    .select("template_name, language, is_active, is_approved")
    .eq("status_key", status)
    .in("language", [lang, "en"]);
  const rows = (data || []).filter((r: any) => r.is_active && r.is_approved);
  const exact = rows.find((r: any) => r.language === lang);
  const fallback = rows.find((r: any) => r.language === "en");
  const picked = exact || fallback;
  if (picked) return { name: picked.template_name, language: normalizeLang(picked.language) };
  return { name: defaultTemplateMap[status] || null, language: "en" };
}

/** Detect the customer's preferred language from their WhatsApp conversation */
async function resolveLanguage(phone: string | null | undefined, override?: string | null): Promise<Lang> {
  if (override) return normalizeLang(override);
  if (!phone) return "en";
  const digits = phone.replace(/\D/g, "").slice(-10);
  const { data } = await supabaseAdmin
    .from("whatsapp_conversations")
    .select("language")
    .like("phone_number", `%${digits}`)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return normalizeLang(data?.language);
}

/** Is this number (or order) opted out of WhatsApp notifications? */
async function isOptedOut(phone: string | null | undefined, orderOptOut?: boolean | null): Promise<string | null> {
  if (orderOptOut) return "order_opted_out";
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "").slice(-10);
  const { data } = await supabaseAdmin
    .from("whatsapp_opt_outs")
    .select("phone_number, opted_out")
    .like("phone_number", `%${digits}`)
    .limit(1)
    .maybeSingle();
  return data?.opted_out ? "number_opted_out" : null;
}

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
      preview,
      language: languageOverride,
    } = await req.json();

    if (!status) return json({ success: false, error: "Missing status" }, 400);
    if (!preview && (!whatsappToken || !whatsappPhoneNumberId)) {
      return json({ success: false, sent: false, reason: "not_configured" });
    }

    let phone = phoneOverride as string | undefined;
    let name = customerName as string | undefined;
    let orderNumber = orderNumberOverride as string | undefined;
    let total = totalOverride as number | undefined;
    let orderRow: { order_date?: string | null; delivery_slot?: string | null } | null = null;
    let resolvedOrderId: string | null = (orderId as string | undefined) || null;
    let orderOptOut = false;

    if (orderId || orderNumber) {
      const query = supabaseAdmin
        .from("orders")
        .select("id, delivery_phone, delivery_name, order_number, order_date, delivery_slot, total, whatsapp_opt_out");
      const { data: order } = orderId
        ? await query.eq("id", orderId).maybeSingle()
        : await query.eq("order_number", orderNumber!).maybeSingle();
      if (order) {
        phone = phone || order.delivery_phone;
        name = name || order.delivery_name;
        orderNumber = orderNumber || order.order_number;
        total = total ?? Number(order.total);
        orderRow = { order_date: order.order_date, delivery_slot: order.delivery_slot };
        resolvedOrderId = order.id;
        orderOptOut = !!order.whatsapp_opt_out;
      }
    }

    const lang = await resolveLanguage(phone, languageOverride);
    const labels = buttonLabels[lang];
    const textMap = textMaps[lang];

    if (preview) {
      orderNumber = orderNumber || "CFI-SAMPLE-0001";
      const previewName = String(name || "Customer").split(" ")[0];
      let previewBody = (textMap[status] || textMapEn[status])?.({
        name: previewName,
        orderNumber,
        eta: buildEta(status, orderRow),
        total: total ?? 499,
      });
      if (!previewBody) {
        return json({ success: true, preview: true, supported: false, reason: "no_message_for_status", language: lang });
      }
      if (status === "payment_failed" && reason) previewBody += `\n\n_Reason: ${String(reason).slice(0, 120)}_`;
      const previewButtons: string[] = [];
      if (buttonStatuses.has(status)) {
        if (status === "out_for_delivery") previewButtons.push(labels.reschedule);
        previewButtons.push(labels.summary);
        previewButtons.push(labels.support);
      }
      const tpl = await resolveTemplate(status, lang);
      return json({
        success: true,
        preview: true,
        supported: true,
        language: lang,
        hasTranslation: !!textMap[status],
        body: previewBody,
        buttons: previewButtons,
        template: tpl.name,
        templateLanguage: tpl.language,
        footer: previewButtons.length ? labels.footer : null,
      });
    }

    const to = phone ? formatIndianPhone(phone) : null;
    if (!to || !orderNumber) return json({ success: false, sent: false, reason: "missing_phone_or_order" });

    const optOutReason = await isOptedOut(to, orderOptOut);
    if (optOutReason) {
      await logActivity({
        order_id: resolvedOrderId,
        order_number: orderNumber,
        phone_number: to,
        direction: "outbound",
        event_type: "skipped",
        status,
        language: lang,
        success: false,
        error: optOutReason,
      });
      return json({ success: true, sent: false, reason: optOutReason });
    }

    const firstName = String(name || "there").split(" ")[0];
    const eta = buildEta(status, orderRow);
    let body = (textMap[status] || textMapEn[status])?.({ name: firstName, orderNumber, eta, total });
    if (!body) return json({ success: true, sent: false, reason: "no_message_for_status" });
    if (status === "payment_failed" && reason) {
      body += `\n\n_Reason: ${String(reason).slice(0, 120)}_`;
    }

    const baseLog = {
      order_id: resolvedOrderId,
      order_number: orderNumber,
      phone_number: to,
      direction: "outbound",
      status,
      language: lang,
      body,
    };

    // 1) Rich interactive message with quick-reply buttons handled by our bot
    //    (free-form, valid inside the 24h customer-service window)
    if (buttonStatuses.has(status)) {
      const buttons: Array<{ id: string; title: string }> = [];
      if (status === "out_for_delivery") {
        buttons.push({ id: `resched:${orderNumber}`, title: labels.reschedule });
      }
      buttons.push({ id: `summary:${orderNumber}`, title: labels.summary });
      buttons.push({ id: `support:${orderNumber}`, title: labels.support });

      const interactive = await waSend({
        to,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: body.slice(0, 1024) },
          footer: { text: labels.footer },
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
        await logActivity({ ...baseLog, event_type: "status_update", channel: "interactive", success: true });
        return json({ success: true, sent: true, via: "interactive", language: lang });
      }
      console.error(`WhatsApp interactive '${status}' failed:`, JSON.stringify(interactive.data));
    }

    // 2) Approved utility template (works outside the 24h window)
    const tpl = await resolveTemplate(status, lang);
    if (tpl.name) {
      const sent = await waSend({
        to,
        type: "template",
        template: {
          name: tpl.name,
          language: { code: tpl.language },
          components: [
            { type: "body", parameters: [firstName, orderNumber].map((text) => ({ type: "text", text })) },
          ],
        },
      });
      if (sent.ok) {
        console.log(`WhatsApp template '${tpl.name}' sent to ${to}`);
        await logActivity({
          ...baseLog,
          event_type: "status_update",
          channel: "template",
          template_name: tpl.name,
          language: tpl.language,
          success: true,
        });
        return json({ success: true, sent: true, via: "template", language: tpl.language });
      }
      console.error(`WhatsApp template '${tpl.name}' failed:`, JSON.stringify(sent.data));
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
      await logActivity({
        ...baseLog,
        event_type: "status_update",
        channel: "text",
        success: false,
        error: JSON.stringify(txt.data).slice(0, 500),
      });
      return json({ success: false, sent: false, reason: "send_failed" });
    }
    await logActivity({ ...baseLog, event_type: "status_update", channel: "text", success: true });
    return json({ success: true, sent: true, via: "text", language: lang });
  } catch (error) {
    console.error("send-whatsapp-order-update error:", error);
    return json({ success: false, error: "Unexpected error" }, 500);
  }
});
