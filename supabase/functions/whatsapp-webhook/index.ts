import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

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

// ─── Database Helpers ───
async function getAvailableProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, price, unit, stock_quantity, category, is_available, description, discount_enabled, discount_type, discount_value")
    .eq("is_available", true)
    .eq("is_hidden", false)
    .order("category")
    .order("name");
  if (error) { console.error("Error fetching products:", error); return []; }
  return data || [];
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
  products: Array<Record<string, unknown>>, chatHistory: Array<Record<string, unknown>>
) {
  const productCatalog = products
    .map((p) => {
      let priceStr = `₹${p.price}/${p.unit}`;
      if (p.discount_enabled && p.discount_value) {
        if (p.discount_type === 'percentage') {
          const discounted = (p.price as number) * (1 - (p.discount_value as number) / 100);
          priceStr = `₹${Math.round(discounted)}/${p.unit} (${p.discount_value}% off, was ₹${p.price})`;
        } else {
          const discounted = (p.price as number) - (p.discount_value as number);
          priceStr = `₹${discounted}/${p.unit} (₹${p.discount_value} off, was ₹${p.price})`;
        }
      }
      return `- ${p.name}: ${priceStr} (stock: ${p.stock_quantity})`;
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
  return text.replace(/<!--CART_UPDATE:.*?-->/gs, "").replace(/<!--CHECKOUT_READY-->/gs, "").trim();
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
        await updateConversation(cleanPhone, { conversation_state: "idle", cart: [] });
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
      const messageText = message.text?.body || "";
      const waMessageId = message.id;

      console.log(`Message from ${from}: ${messageText}`);
      await logMessage(from, "inbound", messageText, waMessageId);

      const conversation = await getConversation(from);
      if (!conversation) {
        await sendWhatsAppMessage(from, "Sorry, something went wrong. Please try again! 🙏");
        return new Response(JSON.stringify({ status: "ok" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const [products, chatHistory] = await Promise.all([getAvailableProducts(), getRecentMessages(from)]);

      const aiResponse = await getAIResponse(messageText, conversation, products, chatHistory);
      await processCartUpdate(from, aiResponse, conversation);

      const isCheckoutReady = aiResponse.includes("<!--CHECKOUT_READY-->");
      const cleanedResponse = cleanResponse(aiResponse);
      const chunks = cleanedResponse.match(/.{1,4000}/gs) || [cleanedResponse];
      for (const chunk of chunks) {
        await sendWhatsAppMessage(from, chunk);
        await logMessage(from, "outbound", chunk);
      }

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
