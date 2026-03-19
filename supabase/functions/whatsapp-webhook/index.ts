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
When customer says "order" or "checkout", ask for delivery details one by one if not already provided:
1. Full name
2. Delivery address
3. Phone number  
4. Pincode
Then confirm the order with COD payment.

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
  } catch (e) {
    console.error("Error processing cart update:", e);
  }
}

// Clean AI response (remove cart update tags)
function cleanResponse(text: string): string {
  return text.replace(/<!--CART_UPDATE:.*?-->/gs, "").trim();
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

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
        // Status update or other event, acknowledge
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

      // Clean and send response
      const cleanedResponse = cleanResponse(aiResponse);

      // WhatsApp has a 4096 char limit, split if needed
      const chunks = cleanedResponse.match(/.{1,4000}/gs) || [cleanedResponse];
      for (const chunk of chunks) {
        await sendWhatsAppMessage(from, chunk);
        await logMessage(from, "outbound", chunk);
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
