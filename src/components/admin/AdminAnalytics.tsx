import { useState, useEffect } from "react";
import { TrendingUp, ShoppingBag, DollarSign, Users, Package, Calendar, Download, BarChart3, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import AnalyticsTrendCharts from "./AnalyticsTrendCharts";

interface AnalyticsData {
  totalUsers: number;
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
    delivery_name: string;
    delivery_address: string;
  }>;
  topProducts: Array<{
    product_name: string;
    total_quantity: number;
    total_revenue: number;
  }>;
  productStock: Array<{
    name: string;
    stock_quantity: number;
    is_available: boolean;
    sold_quantity: number;
  }>;
}

type ChartRange = "7days" | "30days" | "90days";

const AdminAnalytics = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [chartRange, setChartRange] = useState<ChartRange>("7days");
  const { toast } = useToast();

  useEffect(() => {
    const fetchAnalytics = async () => {
      // Secondary server-side check: verify admin role before fetching data
      if (!user) return;
      
      const { data: roleCheck } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      
      if (!roleCheck) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Fetch user count from profiles table
        const { count: userCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });

        // Fetch all orders
        const { data: orders } = await supabase
          .from("orders")
          .select("*");

        // Fetch order items for top products
        const { data: orderItems } = await supabase
          .from("order_items")
          .select("product_name, quantity, total_price");

        // Fetch products for stock info
        const { data: products } = await supabase
          .from("products")
          .select("name, stock_quantity, is_available");

        const today = new Date().toISOString().split("T")[0];

        const totalOrders = orders?.length || 0;
        const totalRevenue = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
        const pendingOrders = orders?.filter(o => o.status === "pending").length || 0;
        const deliveredOrders = orders?.filter(o => o.status === "delivered").length || 0;
        const todayOrders = orders?.filter(o => o.created_at.startsWith(today)).length || 0;
        const todayRevenue = orders?.filter(o => o.created_at.startsWith(today))
          .reduce((sum, o) => sum + (o.total || 0), 0) || 0;

        // Recent orders with delivery info
        const recentOrders = orders
          ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
          .map(o => ({
            order_number: o.order_number,
            total: o.total,
            status: o.status,
            created_at: o.created_at,
            delivery_name: o.delivery_name,
            delivery_address: o.delivery_address,
          })) || [];

        // Calculate product sales
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

        // Product stock with sold quantities
        const productStock = products?.map(p => ({
          name: p.name,
          stock_quantity: p.stock_quantity ?? 0,
          is_available: p.is_available ?? true,
          sold_quantity: productStats[p.name]?.quantity || 0,
        })).sort((a, b) => b.sold_quantity - a.sold_quantity) || [];

        setAnalytics({
          totalUsers: userCount || 0,
          totalOrders,
          totalRevenue,
          pendingOrders,
          deliveredOrders,
          todayOrders,
          todayRevenue,
          recentOrders,
          topProducts,
          productStock,
        });
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();

    // Set up real-time subscriptions for orders, profiles, and products
    const ordersChannel = supabase
      .channel('admin-analytics-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          console.log('Orders changed, refreshing analytics...');
          fetchAnalytics();
        }
      )
      .subscribe();

    const profilesChannel = supabase
      .channel('admin-analytics-profiles')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          console.log('Profiles changed, refreshing analytics...');
          fetchAnalytics();
        }
      )
      .subscribe();

    const productsChannel = supabase
      .channel('admin-analytics-products')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          console.log('Products changed, refreshing analytics...');
          fetchAnalytics();
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(productsChannel);
    };
  }, [user]);

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains comma
          const stringValue = String(value ?? "");
          if (stringValue.includes(",") || stringValue.includes('"')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({ title: `Exported ${filename}.csv successfully` });
  };

  const exportOrders = async () => {
    const { data: orders } = await supabase
      .from("orders")
      .select("order_number, delivery_name, delivery_phone, delivery_address, subtotal, delivery_charge, total, status, payment_method, payment_status, order_date, created_at")
      .order("created_at", { ascending: false });
    
    if (orders) {
      exportToCSV(orders, "orders");
    }
  };

  const exportProducts = async () => {
    const { data: products } = await supabase
      .from("products")
      .select("name, price, unit, category, stock_quantity, is_available, created_at");
    
    if (products) {
      exportToCSV(products, "products_inventory");
    }
  };

  const exportUsers = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("full_name, phone, address, city, pincode, created_at");
    
    if (profiles) {
      exportToCSV(profiles, "users");
    }
  };

  const deleteAllOrders = async () => {
    setIsDeleting(true);
    try {
      // First delete order items, then orders
      await supabase.from("order_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      toast({ title: "All orders deleted successfully" });
      window.location.reload();
    } catch (error) {
      console.error("Error deleting orders:", error);
      toast({ title: "Error deleting orders", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteAllProducts = async () => {
    setIsDeleting(true);
    try {
      // Delete variants first due to FK constraint
      await supabase.from("product_variants").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("products").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      toast({ title: "All products deleted successfully" });
      window.location.reload();
    } catch (error) {
      console.error("Error deleting products:", error);
      toast({ title: "Error deleting products", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

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
    { label: "Total Users", value: analytics.totalUsers, icon: Users, color: "bg-indigo-500/10 text-indigo-600" },
    { label: "Total Orders", value: analytics.totalOrders, icon: ShoppingBag, color: "bg-primary/10 text-primary" },
    { label: "Total Revenue", value: `₹${analytics.totalRevenue.toLocaleString()}`, icon: DollarSign, color: "bg-green-500/10 text-green-600" },
    { label: "Pending Orders", value: analytics.pendingOrders, icon: Package, color: "bg-yellow-500/10 text-yellow-600" },
    { label: "Delivered", value: analytics.deliveredOrders, icon: TrendingUp, color: "bg-blue-500/10 text-blue-600" },
    { label: "Today's Orders", value: analytics.todayOrders, icon: Calendar, color: "bg-purple-500/10 text-purple-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Export & Delete Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={exportOrders}>
            <Download className="w-4 h-4 mr-2" /> Export Orders
          </Button>
          <Button variant="outline" size="sm" onClick={exportProducts}>
            <Download className="w-4 h-4 mr-2" /> Export Inventory
          </Button>
          <Button variant="outline" size="sm" onClick={exportUsers}>
            <Download className="w-4 h-4 mr-2" /> Export Users
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isDeleting}>
                <Trash2 className="w-4 h-4 mr-2" /> Delete All Orders
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete All Orders?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete ALL orders and order items. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteAllOrders} className="bg-destructive text-destructive-foreground">
                  Delete All Orders
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isDeleting}>
                <Trash2 className="w-4 h-4 mr-2" /> Delete All Products
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete All Products?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete ALL products and variants. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteAllProducts} className="bg-destructive text-destructive-foreground">
                  Delete All Products
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Trend Charts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-semibold text-lg">Trends Overview</h3>
          <Select value={chartRange} onValueChange={(value: ChartRange) => setChartRange(value)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <AnalyticsTrendCharts dateRange={chartRange} />
      </div>

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
                    <p className="text-xs text-muted-foreground">{order.delivery_name}</p>
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
          <h3 className="font-heading font-semibold text-lg mb-4">Top Products by Sales</h3>
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

      {/* Stock Overview */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-lg">Inventory Status</h3>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Real-time stock levels</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 font-medium">Product</th>
                <th className="text-right py-3 px-2 font-medium">Sold</th>
                <th className="text-right py-3 px-2 font-medium">Remaining</th>
                <th className="text-center py-3 px-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {analytics.productStock.map((product, index) => (
                <tr key={index} className="border-b border-border last:border-0">
                  <td className="py-3 px-2">{product.name}</td>
                  <td className="text-right py-3 px-2 font-medium">{product.sold_quantity}</td>
                  <td className="text-right py-3 px-2 font-medium">{product.stock_quantity}</td>
                  <td className="text-center py-3 px-2">
                    {product.stock_quantity === 0 ? (
                      <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded-full">Out of Stock</span>
                    ) : product.stock_quantity <= 10 ? (
                      <span className="text-xs bg-yellow-500/10 text-yellow-600 px-2 py-1 rounded-full">Low Stock</span>
                    ) : (
                      <span className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded-full">In Stock</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
