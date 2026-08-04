import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOG_TYPE = "whatsapp_payment_pending";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const now = Date.now();
    const olderThan = new Date(now - 30 * 60 * 1000).toISOString(); // pending > 30 min
    const newerThan = new Date(now - 24 * 60 * 60 * 1000).toISOString(); // within last 24h

    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, order_number, delivery_name, delivery_phone, total, order_source, status")
      .eq("payment_status", "pending")
      .eq("payment_method", "online")
      .neq("status", "cancelled")
      .lt("created_at", olderThan)
      .gt("created_at", newerThan);

    if (error) throw error;

    let sent = 0;
    for (const order of orders || []) {
      if (order.order_source === "whatsapp" || !order.delivery_phone) continue;

      const { data: already } = await supabase
        .from("email_logs")
        .select("id")
        .eq("email_type", LOG_TYPE)
        .eq("related_order_id", order.id)
        .maybeSingle();
      if (already) continue;

      const res = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-order-update`, {
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
          total: order.total,
          status: "payment_pending",
        }),
      });
      const result = await res.json().catch(() => ({}));

      await supabase.from("email_logs").insert({
        recipient_email: `whatsapp:${order.delivery_phone}`,
        recipient_name: order.delivery_name,
        subject: `Pending payment reminder for #${order.order_number}`,
        email_type: LOG_TYPE,
        status: result?.sent ? "sent" : "failed",
        related_order_id: order.id,
        metadata: result,
      });

      if (result?.sent) sent++;
    }

    return new Response(JSON.stringify({ success: true, checked: orders?.length || 0, sent }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    console.error("check-pending-payments error:", e);
    return new Response(JSON.stringify({ success: false, error: "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
