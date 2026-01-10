import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, orderNumber, customerName, customerEmail, customerPhone } = await req.json();

    if (!amount || !orderNumber) {
      return new Response(JSON.stringify({ error: "Amount and order number are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    // Debug: Log key presence and format (not the actual values)
    console.log("DEBUG - Key ID present:", !!keyId, "Key ID length:", keyId?.length, "Key ID prefix:", keyId?.substring(0, 8));
    console.log("DEBUG - Key Secret present:", !!keySecret, "Key Secret length:", keySecret?.length);

    if (!keyId || !keySecret) {
      console.error("Razorpay configuration missing - keyId:", !!keyId, "keySecret:", !!keySecret);
      return new Response(JSON.stringify({ error: "Razorpay configuration missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Razorpay order - ensure no whitespace in credentials
    const trimmedKeyId = keyId.trim();
    const trimmedKeySecret = keySecret.trim();
    const auth = btoa(`${trimmedKeyId}:${trimmedKeySecret}`);

    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Razorpay expects amount in paise
        currency: "INR",
        receipt: orderNumber,
        notes: {
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
        },
      }),
    });

    if (!razorpayResponse.ok) {
      const errorData = await razorpayResponse.text();
      console.error("Razorpay API error - Status:", razorpayResponse.status, "Response:", errorData);
      return new Response(JSON.stringify({ error: "Failed to create Razorpay order", details: errorData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const razorpayOrder = await razorpayResponse.json();

    return new Response(
      JSON.stringify({
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: keyId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("Error creating Razorpay order:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
