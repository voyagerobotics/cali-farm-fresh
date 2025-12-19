import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Clock, CheckCircle, Truck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_method: string;
  payment_status: string;
  total: number;
  order_date: string;
  delivery_slot: string;
  created_at: string;
}

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="w-5 h-5 text-yellow-500" />,
  confirmed: <CheckCircle className="w-5 h-5 text-blue-500" />,
  preparing: <Package className="w-5 h-5 text-orange-500" />,
  out_for_delivery: <Truck className="w-5 h-5 text-primary" />,
  delivered: <CheckCircle className="w-5 h-5 text-green-500" />,
  cancelled: <XCircle className="w-5 h-5 text-destructive" />,
};

const statusLabels: Record<string, string> = {
  pending: "Order Pending",
  confirmed: "Order Confirmed",
  preparing: "Being Prepared",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const Orders = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate("/auth");
      return;
    }

    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setOrders(data);
      }
      setIsLoading(false);
    };

    fetchOrders();
  }, [user, authLoading, navigate]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-heading text-xl font-bold">My Orders</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="font-heading text-xl font-semibold mb-2">No Orders Yet</h2>
            <p className="text-muted-foreground mb-6">
              Start ordering fresh vegetables from our farm!
            </p>
            <Button onClick={() => navigate("/")}>Browse Products</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-card rounded-xl border border-border p-4 md:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="font-heading font-semibold text-lg">
                      {order.order_number}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Placed on {new Date(order.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
                    {statusIcons[order.status]}
                    <span className="text-sm font-medium">
                      {statusLabels[order.status]}
                    </span>
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Delivery Date</p>
                    <p className="font-medium">
                      {new Date(order.order_date).toLocaleDateString("en-IN", {
                        weekday: "long",
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Time Slot</p>
                    <p className="font-medium">{order.delivery_slot}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Payment</p>
                    <p className="font-medium capitalize">
                      {order.payment_method === "cod" ? "Cash on Delivery" : "Online"} •{" "}
                      <span
                        className={
                          order.payment_status === "paid"
                            ? "text-green-600"
                            : "text-yellow-600"
                        }
                      >
                        {order.payment_status}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <span className="font-heading text-lg font-bold text-primary">
                    ₹{order.total}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/orders/${order.id}`)}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
