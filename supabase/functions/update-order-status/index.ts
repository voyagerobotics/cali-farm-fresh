import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type OrderStatus = "pending" | "confirmed" | "preparing" | "out_for_delivery" | "delivered" | "cancelled";

interface UpdateOrderStatusRequest {
  orderId?: string;
  status?: OrderStatus;
}

const ALLOWED_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ success: false, error: "Authentication required" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ success: false, error: "Server configuration missing" }, 500);
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token);

    if (authError || !user) {
      return json({ success: false, error: "Invalid authentication" }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: adminRole, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !adminRole) {
      return json({ success: false, error: "Admin access required" }, 403);
    }

    const body = (await req.json()) as UpdateOrderStatusRequest;
    const orderId = body.orderId;
    const nextStatus = body.status;

    if (!orderId || !nextStatus || !ALLOWED_STATUSES.includes(nextStatus)) {
      return json({ success: false, error: "Invalid order status payload" }, 400);
    }

    const { data: existingOrder, error: orderReadError } = await adminClient
      .from("orders")
      .select("id, order_number, delivery_name, delivery_address, user_id, payment_status, payment_method, total, upi_reference")
      .eq("id", orderId)
      .maybeSingle();

    if (orderReadError || !existingOrder) {
      return json({ success: false, error: "Order not found" }, 404);
    }

    // If cancelling a paid order, also update payment_status to refunded
    const updatePayload: any = { status: nextStatus };
    if (nextStatus === "cancelled" && existingOrder.payment_status === "paid") {
      updatePayload.payment_status = "refunded";
    }

    const { error: updateError } = await adminClient
      .from("orders")
      .update(updatePayload)
      .eq("id", orderId);

    if (updateError) {
      return json({ success: false, error: updateError.message || "Failed to update order" }, 500);
    }

    let emailWarning: string | null = null;

    try {
      const emailResp = await fetch(`${supabaseUrl}/functions/v1/send-order-status-update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
          apikey: anonKey,
        },
        body: JSON.stringify({
          orderId: existingOrder.id,
          orderNumber: existingOrder.order_number,
          customerName: existingOrder.delivery_name,
          newStatus: nextStatus,
          deliveryAddress: existingOrder.delivery_address,
          userId: existingOrder.user_id,
        }),
      });

      if (!emailResp.ok) {
        const errorText = await emailResp.text();
        emailWarning = `Status updated but email failed: ${errorText}`;
      }
    } catch (emailError) {
      emailWarning = `Status updated but email failed: ${emailError instanceof Error ? emailError.message : "Unknown error"}`;
    }

    // Auto-send refund notification when cancelling a paid order
    if (nextStatus === "cancelled" && existingOrder.payment_status === "paid") {
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-refund-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
            apikey: anonKey,
          },
          body: JSON.stringify({
            orderId: existingOrder.id,
            orderNumber: existingOrder.order_number,
            customerName: existingOrder.delivery_name,
            userId: existingOrder.user_id,
            refundAmount: existingOrder.total,
            totalAmount: existingOrder.total,
            type: "refund_initiated",
            paymentMethod: existingOrder.payment_method,
            paymentId: existingOrder.upi_reference,
          }),
        });
      } catch (refundEmailError) {
        console.error("Refund notification failed:", refundEmailError);
      }
    }

    return json({
      success: true,
      orderId,
      status: nextStatus,
      ...(emailWarning ? { warning: emailWarning } : {}),
    });
  } catch (error) {
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unexpected server error",
      },
      500,
    );
  }
});
