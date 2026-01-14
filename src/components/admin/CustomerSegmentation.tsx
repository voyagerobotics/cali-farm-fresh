import { useState, useEffect } from "react";
import { Crown, Clock, UserPlus, Users, TrendingUp, ShoppingBag, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CustomerDetailModal from "./CustomerDetailModal";

interface CustomerSegment {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  created_at: string;
  total_orders: number;
  total_spent: number;
  last_order_date: string | null;
  days_since_last_order: number | null;
}

const CustomerSegmentation = () => {
  const [vipCustomers, setVipCustomers] = useState<CustomerSegment[]>([]);
  const [dormantCustomers, setDormantCustomers] = useState<CustomerSegment[]>([]);
  const [newCustomers, setNewCustomers] = useState<CustomerSegment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("vip");

  useEffect(() => {
    const fetchSegments = async () => {
      setIsLoading(true);
      try {
        // Fetch all profiles
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, phone, city, created_at");

        // Fetch all orders
        const { data: orders } = await supabase
          .from("orders")
          .select("user_id, total, created_at, status");

        if (!profiles) return;

        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Calculate customer stats
        const customerStats: Record<string, {
          total_orders: number;
          total_spent: number;
          last_order_date: string | null;
        }> = {};

        orders?.forEach(order => {
          if (!order.user_id || order.status === "cancelled") return;
          
          if (!customerStats[order.user_id]) {
            customerStats[order.user_id] = {
              total_orders: 0,
              total_spent: 0,
              last_order_date: null,
            };
          }
          
          customerStats[order.user_id].total_orders += 1;
          customerStats[order.user_id].total_spent += order.total || 0;
          
          const orderDate = order.created_at;
          if (!customerStats[order.user_id].last_order_date || 
              orderDate > customerStats[order.user_id].last_order_date!) {
            customerStats[order.user_id].last_order_date = orderDate;
          }
        });

        // Build customer segments
        const allCustomers: CustomerSegment[] = profiles.map(profile => {
          const stats = customerStats[profile.user_id] || {
            total_orders: 0,
            total_spent: 0,
            last_order_date: null,
          };
          
          let daysSinceLastOrder: number | null = null;
          if (stats.last_order_date) {
            const lastOrderDate = new Date(stats.last_order_date);
            daysSinceLastOrder = Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
          }

          return {
            user_id: profile.user_id,
            full_name: profile.full_name,
            phone: profile.phone,
            city: profile.city,
            created_at: profile.created_at,
            total_orders: stats.total_orders,
            total_spent: stats.total_spent,
            last_order_date: stats.last_order_date,
            days_since_last_order: daysSinceLastOrder,
          };
        });

        // VIP Customers: High spenders (top 20% by spend or > ₹2000 total)
        const spendThreshold = Math.max(
          2000,
          allCustomers
            .filter(c => c.total_spent > 0)
            .sort((a, b) => b.total_spent - a.total_spent)
            .slice(0, Math.ceil(allCustomers.length * 0.2))
            .pop()?.total_spent || 2000
        );
        
        const vip = allCustomers
          .filter(c => c.total_spent >= spendThreshold)
          .sort((a, b) => b.total_spent - a.total_spent);

        // Dormant Customers: Had orders but no order in 30+ days
        const dormant = allCustomers
          .filter(c => c.total_orders > 0 && c.days_since_last_order !== null && c.days_since_last_order >= 30)
          .sort((a, b) => (b.days_since_last_order || 0) - (a.days_since_last_order || 0));

        // New Customers: Registered in last 7 days
        const newCust = allCustomers
          .filter(c => new Date(c.created_at) >= sevenDaysAgo)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setVipCustomers(vip);
        setDormantCustomers(dormant);
        setNewCustomers(newCust);
      } catch (error) {
        console.error("Error fetching customer segments:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSegments();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const renderCustomerTable = (customers: CustomerSegment[], type: "vip" | "dormant" | "new") => {
    if (customers.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No customers in this segment
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-2 font-medium">#</th>
              <th className="text-left py-3 px-2 font-medium">Customer</th>
              <th className="text-left py-3 px-2 font-medium">Phone</th>
              <th className="text-left py-3 px-2 font-medium">City</th>
              {type !== "new" && (
                <>
                  <th className="text-right py-3 px-2 font-medium">Orders</th>
                  <th className="text-right py-3 px-2 font-medium">Total Spent</th>
                </>
              )}
              {type === "dormant" && (
                <th className="text-right py-3 px-2 font-medium">Days Inactive</th>
              )}
              {type === "new" && (
                <th className="text-left py-3 px-2 font-medium">Joined</th>
              )}
              <th className="text-left py-3 px-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer, index) => (
              <tr 
                key={customer.user_id} 
                className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                onClick={() => setSelectedUserId(customer.user_id)}
              >
                <td className="py-3 px-2">{index + 1}</td>
                <td className="py-3 px-2">
                  <div className="flex items-center gap-2">
                    {type === "vip" && <Crown className="w-4 h-4 text-yellow-500" />}
                    {type === "dormant" && <Clock className="w-4 h-4 text-orange-500" />}
                    {type === "new" && <UserPlus className="w-4 h-4 text-green-500" />}
                    <span className="font-medium">{customer.full_name || "Unknown"}</span>
                  </div>
                </td>
                <td className="py-3 px-2">{customer.phone || "-"}</td>
                <td className="py-3 px-2">{customer.city || "-"}</td>
                {type !== "new" && (
                  <>
                    <td className="py-3 px-2 text-right font-medium">{customer.total_orders}</td>
                    <td className="py-3 px-2 text-right font-medium text-green-600">
                      {formatCurrency(customer.total_spent)}
                    </td>
                  </>
                )}
                {type === "dormant" && (
                  <td className="py-3 px-2 text-right">
                    <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-200">
                      {customer.days_since_last_order} days
                    </Badge>
                  </td>
                )}
                {type === "new" && (
                  <td className="py-3 px-2 text-muted-foreground">
                    {formatDate(customer.created_at)}
                  </td>
                )}
                <td className="py-3 px-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedUserId(customer.user_id);
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div 
          className={`bg-card border rounded-xl p-4 cursor-pointer transition-all ${activeTab === "vip" ? "border-yellow-500 ring-2 ring-yellow-500/20" : "border-border hover:border-yellow-300"}`}
          onClick={() => setActiveTab("vip")}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Crown className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{vipCustomers.length}</p>
              <p className="text-sm text-muted-foreground">VIP Customers</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">High spenders (₹2000+ lifetime)</p>
        </div>

        <div 
          className={`bg-card border rounded-xl p-4 cursor-pointer transition-all ${activeTab === "dormant" ? "border-orange-500 ring-2 ring-orange-500/20" : "border-border hover:border-orange-300"}`}
          onClick={() => setActiveTab("dormant")}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{dormantCustomers.length}</p>
              <p className="text-sm text-muted-foreground">Dormant Customers</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">No orders in 30+ days</p>
        </div>

        <div 
          className={`bg-card border rounded-xl p-4 cursor-pointer transition-all ${activeTab === "new" ? "border-green-500 ring-2 ring-green-500/20" : "border-border hover:border-green-300"}`}
          onClick={() => setActiveTab("new")}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{newCustomers.length}</p>
              <p className="text-sm text-muted-foreground">New Customers</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Joined in last 7 days</p>
        </div>
      </div>

      {/* Segment Tables */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="vip" className="flex items-center gap-2">
            <Crown className="w-4 h-4" /> VIP ({vipCustomers.length})
          </TabsTrigger>
          <TabsTrigger value="dormant" className="flex items-center gap-2">
            <Clock className="w-4 h-4" /> Dormant ({dormantCustomers.length})
          </TabsTrigger>
          <TabsTrigger value="new" className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> New ({newCustomers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vip" className="mt-4">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="w-5 h-5 text-yellow-500" />
              <h3 className="font-heading font-semibold">VIP Customers</h3>
              <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200">
                ₹{vipCustomers.reduce((sum, c) => sum + c.total_spent, 0).toLocaleString()} total
              </Badge>
            </div>
            {renderCustomerTable(vipCustomers, "vip")}
          </div>
        </TabsContent>

        <TabsContent value="dormant" className="mt-4">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-orange-500" />
              <h3 className="font-heading font-semibold">Dormant Customers</h3>
              <Badge className="bg-orange-500/10 text-orange-600 border-orange-200">
                Need re-engagement
              </Badge>
            </div>
            {renderCustomerTable(dormantCustomers, "dormant")}
          </div>
        </TabsContent>

        <TabsContent value="new" className="mt-4">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="w-5 h-5 text-green-500" />
              <h3 className="font-heading font-semibold">New Customers</h3>
              <Badge className="bg-green-500/10 text-green-600 border-green-200">
                Last 7 days
              </Badge>
            </div>
            {renderCustomerTable(newCustomers, "new")}
          </div>
        </TabsContent>
      </Tabs>

      {/* Customer Detail Modal */}
      {selectedUserId && (
        <CustomerDetailModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
};

export default CustomerSegmentation;
