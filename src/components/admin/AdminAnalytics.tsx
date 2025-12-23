import { useState, useEffect } from "react";
import { TrendingUp, ShoppingBag, DollarSign, Users, Package, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AnalyticsData {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  deliveredOrders: number;
  todayOrders: number;
  todayRevenue: number;
  recentOrders: Array<{
    order_number: string;
    total: number;
    status: string;
    created_at: string;
  }>;
  topProducts: Array<{
    product_name: string;
    total_quantity: number;
    total_revenue: number;
  }>;
}

const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        // Fetch all orders
        const { data: orders } = await supabase
          .from("orders")
          .select("*");

        // Fetch order items for top products
        const { data: orderItems } = await supabase
          .from("order_items")
          .select("product_name, quantity, total_price");

        const today = new Date().toISOString().split("T")[0];

        const totalOrders = orders?.length || 0;
        const totalRevenue = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
        const pendingOrders = orders?.filter(o => o.status === "pending").length || 0;
        const deliveredOrders = orders?.filter(o => o.status === "delivered").length || 0;
        const todayOrders = orders?.filter(o => o.created_at.startsWith(today)).length || 0;
        const todayRevenue = orders?.filter(o => o.created_at.startsWith(today))
          .reduce((sum, o) => sum + (o.total || 0), 0) || 0;

        // Recent orders
        const recentOrders = orders
          ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
          .map(o => ({
            order_number: o.order_number,
            total: o.total,
            status: o.status,
            created_at: o.created_at,
          })) || [];

        // Top products
        const productStats: Record<string, { quantity: number; revenue: number }> = {};
        orderItems?.forEach(item => {
          if (!productStats[item.product_name]) {
            productStats[item.product_name] = { quantity: 0, revenue: 0 };
          }
          productStats[item.product_name].quantity += item.quantity;
          productStats[item.product_name].revenue += item.total_price;
        });

        const topProducts = Object.entries(productStats)
          .map(([name, stats]) => ({
            product_name: name,
            total_quantity: stats.quantity,
            total_revenue: stats.revenue,
          }))
          .sort((a, b) => b.total_quantity - a.total_quantity)
          .slice(0, 5);

        setAnalytics({
          totalOrders,
          totalRevenue,
          pendingOrders,
          deliveredOrders,
          todayOrders,
          todayRevenue,
          recentOrders,
          topProducts,
        });
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!analytics) {
    return <div className="text-center py-12 text-muted-foreground">Failed to load analytics</div>;
  }

  const statCards = [
    { label: "Total Orders", value: analytics.totalOrders, icon: ShoppingBag, color: "bg-primary/10 text-primary" },
    { label: "Total Revenue", value: `₹${analytics.totalRevenue.toLocaleString()}`, icon: DollarSign, color: "bg-green-500/10 text-green-600" },
    { label: "Pending Orders", value: analytics.pendingOrders, icon: Package, color: "bg-yellow-500/10 text-yellow-600" },
    { label: "Delivered", value: analytics.deliveredOrders, icon: TrendingUp, color: "bg-blue-500/10 text-blue-600" },
    { label: "Today's Orders", value: analytics.todayOrders, icon: Calendar, color: "bg-purple-500/10 text-purple-600" },
    { label: "Today's Revenue", value: `₹${analytics.todayRevenue.toLocaleString()}`, icon: DollarSign, color: "bg-secondary/10 text-secondary" },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-card border border-border rounded-xl p-4">
            <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-heading font-semibold text-lg mb-4">Recent Orders</h3>
          {analytics.recentOrders.length === 0 ? (
            <p className="text-muted-foreground text-sm">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {analytics.recentOrders.map((order, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium">#{order.order_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">₹{order.total}</p>
                    <p className={`text-xs capitalize ${
                      order.status === "delivered" ? "text-green-600" :
                      order.status === "cancelled" ? "text-destructive" :
                      "text-muted-foreground"
                    }`}>
                      {order.status.replace("_", " ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-heading font-semibold text-lg mb-4">Top Products</h3>
          {analytics.topProducts.length === 0 ? (
            <p className="text-muted-foreground text-sm">No product data yet</p>
          ) : (
            <div className="space-y-3">
              {analytics.topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                      {index + 1}
                    </span>
                    <p className="font-medium">{product.product_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{product.total_quantity} sold</p>
                    <p className="text-xs text-muted-foreground">₹{product.total_revenue}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
