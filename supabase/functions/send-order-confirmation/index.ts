import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface OrderConfirmationRequest {
  email: string;
  orderNumber: string;
  customerName: string;
  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  total: number;
  deliveryAddress: string;
  deliveryDate: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      email,
      orderNumber,
      customerName,
      items,
      subtotal,
      deliveryCharge,
      total,
      deliveryAddress,
      deliveryDate,
    }: OrderConfirmationRequest = await req.json();

    console.log("Sending order confirmation to:", email);

    if (!email || !orderNumber) {
      return new Response(
        JSON.stringify({ error: "Email and order number are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate items HTML
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${item.product_name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">₹${item.unit_price}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">₹${item.total_price}</td>
      </tr>
    `).join("");

    const emailResponse = await resend.emails.send({
      from: "California Farms <onboarding@resend.dev>",
      to: [email],
      subject: `Order Confirmed! #${orderNumber} - California Farms India`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f7f4; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #2d5a3d, #1e4030); padding: 30px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .header p { color: rgba(255,255,255,0.8); margin: 10px 0 0; }
            .success-badge { display: inline-block; background: #4caf50; color: white; padding: 8px 20px; border-radius: 20px; font-weight: bold; margin: 20px 0; }
            .content { padding: 30px; }
            .order-info { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .order-info p { margin: 8px 0; }
            .order-info strong { color: #2d5a3d; }
            .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .items-table th { background: #2d5a3d; color: white; padding: 12px; text-align: left; }
            .items-table th:last-child, .items-table th:nth-child(2), .items-table th:nth-child(3) { text-align: right; }
            .items-table th:nth-child(2) { text-align: center; }
            .totals { margin-top: 20px; padding-top: 20px; border-top: 2px solid #2d5a3d; }
            .totals-row { display: flex; justify-content: space-between; padding: 8px 0; }
            .totals-row.total { font-size: 20px; font-weight: bold; color: #2d5a3d; border-top: 1px solid #e0e0e0; padding-top: 15px; margin-top: 10px; }
            .delivery-info { background: linear-gradient(135deg, #f0f9f4, #e8f5ed); padding: 20px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #2d5a3d; }
            .footer { background: #333; color: white; padding: 20px; text-align: center; font-size: 12px; }
            .footer a { color: #4caf50; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🌿 California Farms India</h1>
              <p>Fresh from our farms to your table</p>
            </div>
            <div class="content">
              <div style="text-align: center;">
                <div class="success-badge">✓ Order Confirmed!</div>
              </div>
              
              <p>Dear <strong>${customerName}</strong>,</p>
              <p>Thank you for your order! We've received your order and it's being prepared with care.</p>
              
              <div class="order-info">
                <p><strong>Order Number:</strong> ${orderNumber}</p>
                <p><strong>Expected Delivery:</strong> ${deliveryDate}</p>
                <p><strong>Delivery Time:</strong> 12:00 PM - 3:00 PM</p>
              </div>
              
              <h3 style="color: #2d5a3d;">Order Details</h3>
              <table class="items-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
              
              <div class="totals">
                <div class="totals-row">
                  <span>Subtotal</span>
                  <span>₹${subtotal}</span>
                </div>
                <div class="totals-row">
                  <span>Delivery Charge</span>
                  <span>${deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}</span>
                </div>
                <div class="totals-row total">
                  <span>Total Amount</span>
                  <span>₹${total}</span>
                </div>
              </div>
              
              <div class="delivery-info">
                <h4 style="margin: 0 0 10px; color: #2d5a3d;">📍 Delivery Address</h4>
                <p style="margin: 0; color: #555;">${deliveryAddress}</p>
              </div>
              
              <p style="margin-top: 30px; color: #666; font-size: 14px;">
                You'll receive updates about your order status. For any queries, please contact us.
              </p>
            </div>
            <div class="footer">
              <p>Thank you for choosing California Farms India!</p>
              <p>© ${new Date().getFullYear()} California Farms India. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Order confirmation email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Order confirmation sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending order confirmation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
