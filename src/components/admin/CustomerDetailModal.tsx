import { useState, useEffect } from "react";
import { X, User, ShoppingBag, MapPin, Phone, Calendar, Package, Activity, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CustomerDetailModalProps {
  userId: string;
  onClose: () => void;
}

interface CustomerProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  pincode: string | null;
  created_at: string;
}

interface CustomerOrder {
  id: string;
  order_number: string;
  total: number;
  status: string;
  payment_method: string;
  payment_status: string;
  delivery_address: string;
  created_at: string;
  order_items?: { product_name: string; quantity: number; total_price: number }[];
}

interface CustomerActivity {
  id: string;
  action_type: string;
  action_details: unknown;
  page_path: string | null;
  created_at: string;
}

interface CustomerAddress {
  id: string;
  label: string;
  full_name: string;
  phone: string;
  address: string;
  city: string;
  pincode: string;
  is_default: boolean;
}

const CustomerDetailModal = ({ userId, onClose }: CustomerDetailModalProps) => {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [activities, setActivities] = useState<CustomerActivity[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCustomerData = async () => {
      setIsLoading(true);
      try {
        // Fetch profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .single();

        // Fetch orders with items
        const { data: ordersData } = await supabase
          .from("orders")
          .select("*, order_items(product_name, quantity, total_price)")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        // Fetch activities
        const { data: activitiesData } = await supabase
          .from("user_activity_logs")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50);

        // Fetch saved addresses
        const { data: addressesData } = await supabase
          .from("user_addresses")
          .select("*")
          .eq("user_id", userId)
          .order("is_default", { ascending: false });

        setProfile(profileData);
        setOrders(ordersData || []);
        setActivities(activitiesData || []);
        setAddresses(addressesData || []);
      } catch (error) {
        console.error("Error fetching customer data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomerData();
  }, [userId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered": return "bg-green-500/10 text-green-600";
      case "cancelled": return "bg-red-500/10 text-red-600";
      case "pending": return "bg-yellow-500/10 text-yellow-600";
      case "confirmed": return "bg-blue-500/10 text-blue-600";
      case "preparing": return "bg-purple-500/10 text-purple-600";
      case "out_for_delivery": return "bg-indigo-500/10 text-indigo-600";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const totalSpent = orders.reduce((sum, order) => 
    order.status !== "cancelled" ? sum + order.total : sum, 0
  );
  const completedOrders = orders.filter(o => o.status === "delivered").length;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-card rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-heading font-semibold text-lg">
                {profile?.full_name || "Unknown Customer"}
              </h2>
              <p className="text-sm text-muted-foreground">
                Customer since {profile ? new Date(profile.created_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "N/A"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 p-6 border-b border-border">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{orders.length}</p>
            <p className="text-sm text-muted-foreground">Total Orders</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{completedOrders}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">₹{totalSpent.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total Spent</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{addresses.length}</p>
            <p className="text-sm text-muted-foreground">Saved Addresses</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <Tabs defaultValue="orders">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
              <TabsTrigger value="activity">Activity ({activities.length})</TabsTrigger>
              <TabsTrigger value="addresses">Addresses</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
            </TabsList>

            {/* Orders Tab */}
            <TabsContent value="orders" className="mt-4 space-y-4">
              {orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No orders yet
                </div>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <ShoppingBag className="w-5 h-5 text-primary" />
                        <div>
                          <span className="font-medium">#{order.order_number}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            {formatDate(order.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(order.status)}>
                          {order.status.replace("_", " ")}
                        </Badge>
                        <span className="font-bold">₹{order.total}</span>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      <MapPin className="w-3 h-3 inline mr-1" />
                      {order.delivery_address}
                    </div>
                    {order.order_items && order.order_items.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-1">Items:</p>
                        <div className="flex flex-wrap gap-1">
                          {order.order_items.map((item, i) => (
                            <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded">
                              {item.product_name} × {item.quantity}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="mt-4">
              {activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No activity recorded
                </div>
              ) : (
                <div className="space-y-2">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                      <Activity className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                          activity.action_type === "add_to_cart" ? "bg-yellow-500/10 text-yellow-600" :
                          activity.action_type === "order_placed" ? "bg-emerald-500/10 text-emerald-600" :
                          "bg-primary/10 text-primary"
                        }`}>
                          {activity.action_type.replace(/_/g, " ")}
                        </span>
                        {activity.page_path && (
                          <span className="text-xs text-muted-foreground ml-2">
                            on {activity.page_path}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatDate(activity.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Addresses Tab */}
            <TabsContent value="addresses" className="mt-4">
              {addresses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No saved addresses
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {addresses.map((addr) => (
                    <div key={addr.id} className="border border-border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="font-medium">{addr.label}</span>
                        {addr.is_default && (
                          <Badge variant="secondary" className="text-xs">Default</Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium">{addr.full_name}</p>
                      <p className="text-sm text-muted-foreground">{addr.address}</p>
                      <p className="text-sm text-muted-foreground">{addr.city} - {addr.pincode}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3" /> {addr.phone}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile" className="mt-4">
              <div className="border border-border rounded-lg p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Full Name</label>
                    <p className="font-medium">{profile?.full_name || "Not provided"}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Phone</label>
                    <p className="font-medium">{profile?.phone || "Not provided"}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">City</label>
                    <p className="font-medium">{profile?.city || "Not provided"}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Pincode</label>
                    <p className="font-medium">{profile?.pincode || "Not provided"}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm text-muted-foreground">Address</label>
                    <p className="font-medium">{profile?.address || "Not provided"}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">User ID</label>
                    <p className="font-mono text-xs bg-muted px-2 py-1 rounded inline-block">
                      {profile?.user_id}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Registered On</label>
                    <p className="font-medium">{profile ? formatDate(profile.created_at) : "N/A"}</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailModal;
