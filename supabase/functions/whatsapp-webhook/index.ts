import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

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

// Send a WhatsApp text message
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

// Fetch available products from the database
async function getAvailableProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, price, unit, stock_quantity, category, is_available, description")
    .eq("is_available", true)
    .eq("is_hidden", false)
    .order("category")
    .order("name");

  if (error) {
    console.error("Error fetching products:", error);
    return [];
  }
  return data || [];
}

// Get or create conversation state
async function getConversation(phone: string) {
  const { data, error } = await supabase
    .from("whatsapp_conversations")
    .select("*")
    .eq("phone_number", phone)
    .maybeSingle();

  if (error) {
    console.error("Error fetching conversation:", error);
  }

  if (data) return data;

  // Create new conversation
  const { data: newConv, error: insertError } = await supabase
    .from("whatsapp_conversations")
    .insert({ phone_number: phone })
    .select()
    .single();

  if (insertError) {
    console.error("Error creating conversation:", insertError);
    return null;
  }
  return newConv;
}

// Update conversation state
async function updateConversation(phone: string, updates: Record<string, unknown>) {
  const { error } = await supabase
    .from("whatsapp_conversations")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("phone_number", phone);

  if (error) console.error("Error updating conversation:", error);
}

// Log a message
async function logMessage(phone: string, direction: string, text: string, waMessageId?: string) {
  await supabase.from("whatsapp_messages").insert({
    phone_number: phone,
    direction,
    message_text: text,
    wa_message_id: waMessageId || null,
  });
}

// Get recent conversation history for AI context
async function getRecentMessages(phone: string, limit = 10) {
  const { data } = await supabase
    .from("whatsapp_messages")
    .select("direction, message_text, created_at")
    .eq("phone_number", phone)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data || []).reverse();
}

// Create a Razorpay payment link for the order
async function createRazorpayPaymentLink(
  orderNumber: string,
  amount: number,
  customerName: string,
  customerPhone: string,
  description: string
) {
  const auth = btoa(`${RAZORPAY_KEY_ID.trim()}:${RAZORPAY_KEY_SECRET.trim()}`);

  // Clean phone: remove country code prefix for Razorpay contact
  const cleanPhone = customerPhone.replace(/^91/, "").replace(/^\+91/, "");

  const response = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(amount * 100), // paise
      currency: "INR",
      description: description,
      reference_id: orderNumber,
      customer: {
        name: customerName,
        contact: `+91${cleanPhone}`,
      },
      notify: {
        sms: false,
        email: false,
        whatsapp: false,
      },
      callback_url: `${supabaseUrl}/functions/v1/whatsapp-webhook?payment_callback=true&order_number=${orderNumber}&phone=${customerPhone}`,
      callback_method: "get",
      expire_by: Math.floor(Date.now() / 1000) + 30 * 60, // 30 min expiry
      notes: {
        order_number: orderNumber,
        source: "whatsapp",
        customer_phone: customerPhone,
      },
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

// Create the order in database and generate payment link
async function createOrderAndPaymentLink(phone: string, conversation: Record<string, unknown>) {
  const cart = conversation.cart as Array<{ name: string; qty: number; price: number; unit: string; product_id?: string }>;
  if (!cart || cart.length === 0) return null;

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const deliveryCharge = 0; // Can be calculated based on pincode/distance later
  const total = subtotal + deliveryCharge;

  // Generate order number
  const { data: orderNumData } = await supabase.rpc("generate_order_number");
  const orderNumber = orderNumData || `CFI-${Date.now()}`;

  const customerName = (conversation.delivery_name as string) || "WhatsApp Customer";
  const customerPhone = (conversation.delivery_phone as string) || phone;
  const deliveryAddress = (conversation.delivery_address as string) || "";

  // Create order with pending payment status
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
    })
    .select()
    .single();

  if (orderError) {
    console.error("Error creating order:", orderError);
    throw new Error("Failed to create order");
  }

  // Insert order items
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

  // Create Razorpay payment link
  const paymentLink = await createRazorpayPaymentLink(
    orderNumber,
    total,
    customerName,
    customerPhone,
    `California Farms India - Order #${orderNumber}`
  );

  // Store the order ID in conversation
  await updateConversation(phone, {
    last_order_id: order.id,
    conversation_state: "awaiting_payment",
  });

  return {
    orderNumber,
    total,
    paymentUrl: paymentLink.short_url,
    orderId: order.id,
  };
}

// Call AI to generate a response
async function getAIResponse(
  userMessage: string,
  conversation: Record<string, unknown>,
  products: Array<Record<string, unknown>>,
  chatHistory: Array<Record<string, unknown>>
) {
  const productCatalog = products
    .map((p) => `- ${p.name}: ₹${p.price}/${p.unit} (stock: ${p.stock_quantity})`)
    .join("\n");

  const cart = conversation.cart || [];
  const cartSummary =
    Array.isArray(cart) && cart.length > 0
      ? (cart as Array<{ name: string; qty: number; price: number; unit: string }>)
          .map((item) => `${item.name} x${item.qty} = ₹${item.price * item.qty}`)
          .join(", ")
      : "Empty";

  const historyText = chatHistory
    .map((m) => `${m.direction === "inbound" ? "Customer" : "Agent"}: ${m.message_text}`)
    .join("\n");

  const systemPrompt = `You are a friendly WhatsApp ordering assistant for California Farms India, a farm-fresh vegetable delivery service in Nagpur.

RULES:
- Be bilingual: respond in Hindi if the customer writes in Hindi, otherwise English. Mix naturally.
- Keep messages SHORT (WhatsApp style, max 300 chars per message).
- Use emojis naturally 🥬🥕🍅
- Always show prices in ₹

AVAILABLE PRODUCTS:
${productCatalog}

CUSTOMER'S CURRENT CART: ${cartSummary}
CONVERSATION STATE: ${conversation.conversation_state}

CAPABILITIES:
1. Show product catalog by category
2. Add/remove items to cart (respond with structured cart updates)
3. Help with checkout (collect name, address, phone, pincode)
4. Answer questions about products, delivery, pricing

CART INSTRUCTIONS:
When the customer wants to add items, include this JSON block in your response (hidden from customer):
<!--CART_UPDATE:{"action":"add","items":[{"name":"Product Name","qty":1,"price":100,"unit":"kg","product_id":"uuid"}]}-->

When removing items:
<!--CART_UPDATE:{"action":"remove","items":[{"name":"Product Name"}]}-->

When clearing cart:
<!--CART_UPDATE:{"action":"clear"}-->

When showing cart, list items with prices and total.

CHECKOUT FLOW:
When customer says "order", "checkout", "place order", or similar, you MUST collect ALL delivery details:
1. Full name
2. Delivery address
3. Phone number
4. Pincode

Once ALL 4 details are collected, include this tag in your response:
<!--CHECKOUT_READY-->

The system will automatically generate a Razorpay payment link and send it. Payment is online only (NO Cash on Delivery).

If the conversation state is "awaiting_payment", remind the customer to complete payment using the link already sent. If they say "paid" or ask about status, tell them payment will be confirmed automatically.

IMPORTANT: Do NOT confirm any order without payment. Always tell the customer they need to pay via the link to confirm the order.

RECENT CHAT:
${historyText}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
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

// Process cart updates from AI response
async function processCartUpdate(phone: string, aiResponse: string, conversation: Record<string, unknown>) {
  const cartMatch = aiResponse.match(/<!--CART_UPDATE:(.*?)-->/s);
  if (!cartMatch) return;

  try {
    const update = JSON.parse(cartMatch[1]);
    let cart = Array.isArray(conversation.cart) ? [...(conversation.cart as Array<{ name: string; qty: number; price: number; unit: string; product_id: string }>)] : [];

    if (update.action === "add") {
      for (const item of update.items) {
        const existingIndex = cart.findIndex((c) => c.name.toLowerCase() === item.name.toLowerCase());
        if (existingIndex >= 0) {
          cart[existingIndex].qty += item.qty;
        } else {
          cart.push(item);
        }
      }
    } else if (update.action === "remove") {
      for (const item of update.items) {
        cart = cart.filter((c) => c.name.toLowerCase() !== item.name.toLowerCase());
      }
    } else if (update.action === "clear") {
      cart = [];
    }

    await updateConversation(phone, { cart });
    // Update local conversation object too
    conversation.cart = cart;
  } catch (e) {
    console.error("Error processing cart update:", e);
  }
}

// Clean AI response (remove cart update and checkout tags)
function cleanResponse(text: string): string {
  return text
    .replace(/<!--CART_UPDATE:.*?-->/gs, "")
    .replace(/<!--CHECKOUT_READY-->/gs, "")
    .trim();
}

// Handle Razorpay payment callback
async function handlePaymentCallback(url: URL) {
  const orderNumber = url.searchParams.get("order_number");
  const phone = url.searchParams.get("phone");
  const razorpayPaymentId = url.searchParams.get("razorpay_payment_id");
  const razorpayPaymentLinkId = url.searchParams.get("razorpay_payment_link_id");
  const razorpayPaymentLinkStatus = url.searchParams.get("razorpay_payment_link_status");

  console.log("Payment callback:", { orderNumber, phone, razorpayPaymentLinkStatus, razorpayPaymentId });

  if (orderNumber && razorpayPaymentLinkStatus === "paid") {
    // Update order to paid & confirmed
    const { error } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        status: "confirmed",
        upi_reference: razorpayPaymentId || razorpayPaymentLinkId,
        payment_verified_at: new Date().toISOString(),
      })
      .eq("order_number", orderNumber);

    if (error) {
      console.error("Error updating order after payment:", error);
    } else {
      console.log(`Order ${orderNumber} marked as paid`);

      // Send confirmation message on WhatsApp
      if (phone) {
        const cleanPhone = phone.replace(/^\+/, "");
        await sendWhatsAppMessage(
          cleanPhone,
          `✅ Payment received! Your order #${orderNumber} is confirmed.\n\nWe're preparing your fresh produce! 🥬🚚\n\nThank you for ordering from California Farms India! 🌱`
        );
        await logMessage(cleanPhone, "outbound", `Payment confirmed for order #${orderNumber}`);

        // Reset conversation state
        await updateConversation(cleanPhone, {
          conversation_state: "idle",
          cart: [],
        });
      }
    }
  }

  // Redirect to website
  return new Response(null, {
    status: 302,
    headers: { Location: `https://zomical.com/orders` },
  });
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // ===== Payment Callback =====
  if (url.searchParams.get("payment_callback") === "true") {
    return handlePaymentCallback(url);
  }

  // ===== GET: Meta Webhook Verification =====
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    console.log("Webhook verification request:", { mode, token, challenge });

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Webhook verified successfully!");
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    console.error("Webhook verification failed: token mismatch");
    return new Response("Forbidden", { status: 403 });
  }

  // ===== POST: Incoming WhatsApp Messages =====
  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("Webhook POST body:", JSON.stringify(body).slice(0, 500));

      // Meta sends a status update or message
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      // Check if it's a message (not a status update)
      const message = value?.messages?.[0];
      if (!message) {
        return new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const from = message.from; // sender phone number
      const messageText = message.text?.body || "";
      const waMessageId = message.id;

      console.log(`Message from ${from}: ${messageText}`);

      // Log inbound message
      await logMessage(from, "inbound", messageText, waMessageId);

      // Get conversation state
      const conversation = await getConversation(from);
      if (!conversation) {
        await sendWhatsAppMessage(from, "Sorry, something went wrong. Please try again! 🙏");
        return new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get products and chat history
      const [products, chatHistory] = await Promise.all([
        getAvailableProducts(),
        getRecentMessages(from),
      ]);

      // Get AI response
      const aiResponse = await getAIResponse(messageText, conversation, products, chatHistory);

      // Process any cart updates
      await processCartUpdate(from, aiResponse, conversation);

      // Check if checkout is ready
      const isCheckoutReady = aiResponse.includes("<!--CHECKOUT_READY-->");

      // Clean and send the AI response first
      const cleanedResponse = cleanResponse(aiResponse);
      const chunks = cleanedResponse.match(/.{1,4000}/gs) || [cleanedResponse];
      for (const chunk of chunks) {
        await sendWhatsAppMessage(from, chunk);
        await logMessage(from, "outbound", chunk);
      }

      // If checkout is ready, create order + payment link
      if (isCheckoutReady) {
        try {
          const result = await createOrderAndPaymentLink(from, conversation);
          if (result) {
            const paymentMessage = `💳 *Payment Link for Order #${result.orderNumber}*\n\n💰 Total: ₹${result.total}\n\n👉 Pay here: ${result.paymentUrl}\n\n⏰ Link expires in 30 minutes.\nOrder will be confirmed automatically after payment! ✅`;
            await sendWhatsAppMessage(from, paymentMessage);
            await logMessage(from, "outbound", paymentMessage);
          }
        } catch (err) {
          console.error("Error creating order/payment link:", err);
          await sendWhatsAppMessage(from, "Sorry, there was an issue creating your payment link. Please try again! 🙏");
        }
      }

      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Webhook POST error:", error);
      return new Response(JSON.stringify({ error: "Internal error" }), {
        status: 200, // Always return 200 to Meta to avoid retries
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
