import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const whatsappToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN")!;
const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!;

const admin = createClient(supabaseUrl, serviceKey);

const GRAPH = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

async function waSend(payload: Record<string, unknown>) {
  const res = await fetch(GRAPH, {
    method: "POST",
    headers: { Authorization: `Bearer ${whatsappToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data?.error?.message || `WhatsApp send failed (${res.status})`);
  }
  return data;
}

async function sendText(to: string, body: string) {
  return waSend({ to, type: "text", text: { preview_url: true, body } });
}

async function sendMedia(to: string, url: string, type: string, caption: string) {
  if (type === "image") return waSend({ to, type: "image", image: { link: url, caption } });
  if (type === "video") return waSend({ to, type: "video", video: { link: url, caption } });
  return waSend({ to, type: "document", document: { link: url, caption, filename: "California-Farms.pdf" } });
}

async function sendButtonMessage(
  to: string,
  body: string,
  buttons: Array<{ id: string; title: string }>,
  mediaUrl?: string | null,
  mediaType?: string | null,
) {
  return waSend({
    to,
    type: "interactive",
    interactive: {
      type: "button",
      ...(mediaUrl && mediaType === "image" ? { header: { type: "image", image: { link: mediaUrl } } } : {}),
      body: { text: body.slice(0, 1024) },
      footer: { text: "California Farms India • zomical.com" },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: "reply",
          reply: { id: b.id.slice(0, 200), title: b.title.slice(0, 20) },
        })),
      },
    },
  });
}

async function logMessage(phone: string, direction: string, text: string) {
  await admin.from("whatsapp_messages").insert({
    phone_number: phone,
    direction,
    message_text: text,
    message_type: "text",
  });
}

/** Resolve the recipients for a broadcast audience filter. */
async function resolveAudience(audience: Record<string, any>): Promise<string[]> {
  const segment = audience?.segment || "all";

  const { data: convs } = await admin
    .from("whatsapp_conversations")
    .select("phone_number, delivery_city, created_at, last_message_at, cart, user_id, customer_name");
  let phones = (convs || []).map((c: any) => c.phone_number);

  const { data: orders } = await admin
    .from("orders")
    .select("delivery_phone, total, created_at, id")
    .order("created_at", { ascending: false });
  const byPhone = new Map<string, { count: number; spend: number; last: string }>();
  for (const o of orders || []) {
    const p = String(o.delivery_phone || "").replace(/\D/g, "").slice(-10);
    if (!p) continue;
    const prev = byPhone.get(p) || { count: 0, spend: 0, last: o.created_at };
    byPhone.set(p, { count: prev.count + 1, spend: prev.spend + Number(o.total || 0), last: prev.last });
  }
  const stat = (phone: string) => byPhone.get(phone.replace(/\D/g, "").slice(-10));

  if (segment === "vip") {
    phones = phones.filter((p) => (stat(p)?.spend ?? 0) >= Number(audience.minSpend ?? 2000));
  } else if (segment === "new") {
    phones = phones.filter((p) => !stat(p));
  } else if (segment === "returning") {
    phones = phones.filter((p) => (stat(p)?.count ?? 0) > 1);
  } else if (segment === "abandoned_cart") {
    const withCart = new Set(
      (convs || []).filter((c: any) => Array.isArray(c.cart) && c.cart.length > 0).map((c: any) => c.phone_number),
    );
    phones = phones.filter((p) => withCart.has(p));
  } else if (segment === "city" && audience.city) {
    const target = String(audience.city).toLowerCase();
    const inCity = new Set(
      (convs || [])
        .filter((c: any) => String(c.delivery_city || "").toLowerCase().includes(target))
        .map((c: any) => c.phone_number),
    );
    phones = phones.filter((p) => inCity.has(p));
  } else if (segment === "product" && audience.productId) {
    const { data: items } = await admin
      .from("order_items")
      .select("order_id, product_id")
      .eq("product_id", audience.productId);
    const orderIds = new Set((items || []).map((i: any) => i.order_id));
    const buyers = new Set(
      (orders || [])
        .filter((o: any) => orderIds.has(o.id))
        .map((o: any) => String(o.delivery_phone || "").replace(/\D/g, "").slice(-10)),
    );
    phones = phones.filter((p) => buyers.has(p.replace(/\D/g, "").slice(-10)));
  } else if (segment === "inactive") {
    const days = Number(audience.days ?? 30);
    const cutoff = Date.now() - days * 86400000;
    phones = phones.filter((p) => {
      const s = stat(p);
      return !s || new Date(s.last).getTime() < cutoff;
    });
  }

  // Respect opt-outs
  const { data: optOuts } = await admin
    .from("whatsapp_opt_outs")
    .select("phone_number")
    .eq("opted_out", true);
  const blocked = new Set((optOuts || []).map((o: any) => String(o.phone_number).replace(/\D/g, "").slice(-10)));
  return [...new Set(phones)].filter((p) => !blocked.has(String(p).replace(/\D/g, "").slice(-10)));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const action = body.action;

    // ── Admin reply from the Conversation Manager inbox ──
    if (action === "reply") {
      const phone = String(body.phone || "").replace(/\D/g, "");
      const text = String(body.text || "").trim();
      if (!phone || !text) throw new Error("Phone and message text are required");
      await sendText(phone, text);
      await logMessage(phone, "outbound", text);
      await admin.from("whatsapp_conversations")
        .update({
          last_message_at: new Date().toISOString(),
          last_message_text: text.slice(0, 200),
          unread_count: 0,
        })
        .eq("phone_number", phone);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Preview audience size ──
    if (action === "preview_audience") {
      const phones = await resolveAudience(body.audience || {});
      return new Response(JSON.stringify({ count: phones.length, sample: phones.slice(0, 10) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Send a broadcast campaign ──
    if (action === "send_broadcast") {
      const { data: bc, error: bcErr } = await admin
        .from("whatsapp_broadcasts").select("*").eq("id", body.broadcastId).single();
      if (bcErr || !bc) throw new Error("Broadcast not found");

      const phones = await resolveAudience((bc.audience as Record<string, any>) || {});
      await admin.from("whatsapp_broadcasts")
        .update({ status: "sending", total_recipients: phones.length })
        .eq("id", bc.id);

      // Optional product cards appended to the message
      let productBlock = "";
      const productIds = (bc.product_ids as string[]) || [];
      if (productIds.length) {
        const { data: prods } = await admin
          .from("products").select("name, price, unit").in("id", productIds);
        if (prods?.length) {
          productBlock = "\n\n🌿 *Featured today*\n" +
            prods.map((p: any) => `• ${p.name} — ₹${p.price}/${p.unit}`).join("\n") +
            "\n\n🛒 https://zomical.com/products";
        }
      }
      const couponBlock = bc.coupon_code ? `\n\n🎁 Use code *${bc.coupon_code}*` : "";
      const messageBody = `${bc.message_text}${productBlock}${couponBlock}`;
      const buttons = (bc.buttons as Array<{ id: string; title: string }>) || [];

      let sent = 0, failed = 0;
      for (const phone of phones) {
        try {
          if (buttons.length) {
            await sendButtonMessage(phone, messageBody, buttons, bc.media_url, bc.media_type);
          } else if (bc.media_url) {
            await sendMedia(phone, bc.media_url, bc.media_type || "image", messageBody);
          } else {
            await sendText(phone, messageBody);
          }
          sent++;
          await admin.from("whatsapp_broadcast_recipients").insert({
            broadcast_id: bc.id, phone_number: phone, status: "sent", sent_at: new Date().toISOString(),
          });
          await logMessage(phone, "outbound", messageBody);
        } catch (e: any) {
          failed++;
          await admin.from("whatsapp_broadcast_recipients").insert({
            broadcast_id: bc.id, phone_number: phone, status: "failed", error: String(e?.message || e).slice(0, 400),
          });
        }
      }

      await admin.from("whatsapp_broadcasts").update({
        status: "sent",
        sent_at: new Date().toISOString(),
        sent_count: sent,
        failed_count: failed,
      }).eq("id", bc.id);

      return new Response(JSON.stringify({ success: true, sent, failed, total: phones.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (e: any) {
    console.error("whatsapp-admin-send error:", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
