import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_number } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(
        JSON.stringify({ error: "Missing payment details" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    
    if (!keySecret) {
      return new Response(
        JSON.stringify({ error: "Razorpay configuration missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify signature
    const encoder = new TextEncoder();
    const data = encoder.encode(`${razorpay_order_id}|${razorpay_payment_id}`);
    const keyData = encoder.encode(keySecret);
    
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);
    const generatedSignature = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (generatedSignature !== razorpay_signature) {
      return new Response(
        JSON.stringify({ error: "Invalid payment signature", verified: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update order payment status if order_number provided (server-side backup)
    if (order_number) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          status: "confirmed",
          upi_reference: razorpay_payment_id,
          payment_verified_at: new Date().toISOString(),
        })
        .eq("order_number", order_number);
    }

    return new Response(
      JSON.stringify({ 
        verified: true, 
        payment_id: razorpay_payment_id 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error verifying payment:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message, verified: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
