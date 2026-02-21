import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShoppingBag, Clock, CheckCircle, XCircle, Package, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { usePreOrders, PreOrder } from "@/hooks/usePreOrders";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PreOrderNotification {
  id: string;
  product_name: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const statusConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  pending: { icon: <Clock className="w-4 h-4" />, label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  confirmed: { icon: <CheckCircle className="w-4 h-4" />, label: "In Stock - Ready!", color: "bg-green-100 text-green-800" },
  fulfilled: { icon: <Package className="w-4 h-4" />, label: "Fulfilled", color: "bg-blue-100 text-blue-800" },
  cancelled: { icon: <XCircle className="w-4 h-4" />, label: "Cancelled", color: "bg-red-100 text-red-800" },
};

const MyPreOrders = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { preOrders, isLoading } = usePreOrders();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<PreOrderNotification[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }

    // Fetch notifications
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("pre_order_notifications" as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false });
      if (data) setNotifications(data as any);
    };
    fetchNotifications();

    // Subscribe to realtime notifications
    const channel = supabase
      .channel('pre-order-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'pre_order_notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const newNotif = payload.new as PreOrderNotification;
        setNotifications(prev => [newNotif, ...prev]);
        toast({
          title: "🎉 Product Available!",
          description: newNotif.message,
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, authLoading]);

  const markAsRead = async (id: string) => {
    await supabase.from("pre_order_notifications" as any).update({ is_read: true } as any).eq("id", id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Filter to only show user's pre-orders
  const userPreOrders = preOrders.filter(po => po.user_id === user?.id);

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-heading text-xl font-bold">My Pre-Orders</h1>
          {notifications.length > 0 && (
            <Badge variant="destructive" className="ml-auto">{notifications.length} new</Badge>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Unread Notifications */}
        {notifications.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" /> Notifications
            </h2>
            {notifications.map(notif => (
              <div key={notif.id} className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">{notif.product_name} is now available!</p>
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">{notif.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(notif.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => markAsRead(notif.id)}>
                  Dismiss
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Pre-Orders List */}
        <div>
          <h2 className="font-heading text-lg font-semibold mb-4">Your Bookings ({userPreOrders.length})</h2>
          {userPreOrders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="font-heading text-xl font-semibold mb-2">No Pre-Orders Yet</h3>
              <p className="text-muted-foreground mb-6">Check out our Coming Soon section to reserve upcoming products!</p>
              <Button onClick={() => navigate("/")}>Browse Products</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {userPreOrders.map((po: PreOrder) => {
                const status = statusConfig[po.status] || statusConfig.pending;
                return (
                  <div key={po.id} className="bg-card rounded-xl border border-border p-4 md:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-heading font-semibold text-lg">{po.product_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Booked on {new Date(po.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                        </p>
                      </div>
                      <Badge className={`${status.color} flex items-center gap-1`}>
                        {status.icon} {status.label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Quantity</p>
                        <p className="font-semibold text-lg">{po.quantity}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Payment</p>
                        <p className="font-medium capitalize">
                          {po.payment_status === 'not_required' ? 'Pay Later' :
                           po.payment_status === 'paid' ? '✅ Paid' :
                           po.payment_status === 'pending' ? '⏳ Pending' : po.payment_status}
                        </p>
                      </div>
                      {po.payment_amount > 0 && (
                        <div>
                          <p className="text-muted-foreground">Amount</p>
                          <p className="font-semibold">₹{po.payment_amount}</p>
                        </div>
                      )}
                      {po.notes && (
                        <div className="col-span-2">
                          <p className="text-muted-foreground">Notes</p>
                          <p className="text-sm">{po.notes}</p>
                        </div>
                      )}
                    </div>

                    {po.status === "confirmed" && (
                      <div className="mt-4 pt-3 border-t border-border">
                        <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                          🎉 This product is now in stock! Your {po.quantity} item(s) are reserved for you.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyPreOrders;
