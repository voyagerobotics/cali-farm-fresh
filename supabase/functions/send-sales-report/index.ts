import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SalesReportData {
  reportType: "weekly" | "monthly";
  startDate: string;
  endDate: string;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  newCustomers: number;
  topProducts: { name: string; quantity: number; revenue: number }[];
  ordersByStatus: { status: string; count: number }[];
  dailyRevenue: { date: string; revenue: number; orders: number }[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportType = "weekly", adminEmail } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    if (reportType === "weekly") {
      startDate.setDate(startDate.getDate() - 7);
    } else {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    // Fetch orders in date range
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("*, order_items(product_name, quantity, total_price)")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    if (ordersError) throw ordersError;

    // Fetch new customers
    const { count: newCustomersCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    // Calculate metrics
    const totalOrders = orders?.length || 0;
    const totalRevenue = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Top products
    const productStats: Record<string, { quantity: number; revenue: number }> = {};
    orders?.forEach(order => {
      order.order_items?.forEach((item: { product_name: string; quantity: number; total_price: number }) => {
        if (!productStats[item.product_name]) {
          productStats[item.product_name] = { quantity: 0, revenue: 0 };
        }
        productStats[item.product_name].quantity += item.quantity;
        productStats[item.product_name].revenue += item.total_price;
      });
    });

    const topProducts = Object.entries(productStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Orders by status
    const statusCounts: Record<string, number> = {};
    orders?.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });
    const ordersByStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

    // Daily revenue
    const dailyStats: Record<string, { revenue: number; orders: number }> = {};
    orders?.forEach(order => {
      const date = order.created_at.split("T")[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { revenue: 0, orders: 0 };
      }
      dailyStats[date].revenue += order.total || 0;
      dailyStats[date].orders += 1;
    });
    const dailyRevenue = Object.entries(dailyStats)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const reportData: SalesReportData = {
      reportType,
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      totalOrders,
      totalRevenue,
      averageOrderValue: Math.round(averageOrderValue),
      newCustomers: newCustomersCount || 0,
      topProducts,
      ordersByStatus,
      dailyRevenue,
    };

    // Send email if Resend API key is available
    if (resendApiKey && adminEmail) {
      const reportTitle = reportType === "weekly" ? "Weekly" : "Monthly";
      
      const topProductsHtml = topProducts.length > 0
        ? topProducts.map((p, i) => `<tr><td>${i + 1}</td><td>${p.name}</td><td>${p.quantity}</td><td>₹${p.revenue.toLocaleString()}</td></tr>`).join("")
        : "<tr><td colspan='4'>No products sold</td></tr>";

      const dailyRevenueHtml = dailyRevenue.map(d => 
        `<tr><td>${new Date(d.date).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}</td><td>${d.orders}</td><td>₹${d.revenue.toLocaleString()}</td></tr>`
      ).join("");

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2d5016, #4a7c23); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
            .stat-card { background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .stat-value { font-size: 28px; font-weight: bold; color: #2d5016; }
            .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
            th { background: #f0f0f0; font-weight: 600; }
            .section-title { font-size: 16px; font-weight: 600; margin: 25px 0 10px; color: #2d5016; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">📊 ${reportTitle} Sales Report</h1>
              <p style="margin: 10px 0 0; opacity: 0.9;">${reportData.startDate} to ${reportData.endDate}</p>
            </div>
            <div class="content">
              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-value">${totalOrders}</div>
                  <div class="stat-label">Total Orders</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">₹${totalRevenue.toLocaleString()}</div>
                  <div class="stat-label">Total Revenue</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">₹${Math.round(averageOrderValue).toLocaleString()}</div>
                  <div class="stat-label">Avg Order Value</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${newCustomersCount || 0}</div>
                  <div class="stat-label">New Customers</div>
                </div>
              </div>

              <div class="section-title">📦 Top Selling Products</div>
              <table>
                <thead>
                  <tr><th>#</th><th>Product</th><th>Qty</th><th>Revenue</th></tr>
                </thead>
                <tbody>${topProductsHtml}</tbody>
              </table>

              <div class="section-title">📅 Daily Breakdown</div>
              <table>
                <thead>
                  <tr><th>Date</th><th>Orders</th><th>Revenue</th></tr>
                </thead>
                <tbody>${dailyRevenueHtml}</tbody>
              </table>

              <div class="section-title">📋 Orders by Status</div>
              <table>
                <thead>
                  <tr><th>Status</th><th>Count</th></tr>
                </thead>
                <tbody>
                  ${ordersByStatus.map(s => `<tr><td style="text-transform: capitalize;">${s.status.replace("_", " ")}</td><td>${s.count}</td></tr>`).join("")}
                </tbody>
              </table>

              <p style="margin-top: 30px; font-size: 12px; color: #888; text-align: center;">
                This report was automatically generated by Cali Farm Fresh
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "Cali Farm Fresh <reports@resend.dev>",
          to: [adminEmail],
          subject: `${reportTitle} Sales Report - ${reportData.startDate} to ${reportData.endDate}`,
          html: emailHtml,
        }),
      });

      if (!emailRes.ok) {
        const errorText = await emailRes.text();
        console.error("Failed to send email:", errorText);
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: reportData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating sales report:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
