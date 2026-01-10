import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Package, Clock, CheckCircle, Truck, XCircle, MapPin, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface OrderDetails {
  id: string;
  order_number: string;
  status: string;
  payment_method: string;
  payment_status: string;
  subtotal: number;
  delivery_charge: number;
  total: number;
  order_date: string;
  delivery_slot: string;
  delivery_name: string;
  delivery_phone: string;
  delivery_address: string;
  notes: string | null;
  created_at: string;
  order_items: OrderItem[];
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

const OrderDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate("/auth");
      return;
    }

    const fetchOrder = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (*)
        `)
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && data) {
        setOrder(data as OrderDetails);
      }
      setIsLoading(false);
    };

    fetchOrder();
  }, [user, authLoading, navigate, id]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Package className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="font-heading text-xl font-semibold mb-2">Order Not Found</h2>
          <p className="text-muted-foreground mb-6">
            This order doesn't exist or you don't have access to it.
          </p>
          <Button onClick={() => navigate("/orders")}>Back to Orders</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/orders")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-heading text-xl font-bold">{order.order_number}</h1>
            <p className="text-sm text-muted-foreground">
              Placed on {new Date(order.created_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Order Status */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3">
            {statusIcons[order.status]}
            <div>
              <p className="font-heading font-semibold text-lg">
                {statusLabels[order.status]}
              </p>
              <p className="text-sm text-muted-foreground">
                {order.status === "confirmed" && "Your order is confirmed and will be prepared soon."}
                {order.status === "pending" && "Waiting for confirmation."}
                {order.status === "preparing" && "Your order is being prepared."}
                {order.status === "out_for_delivery" && "Your order is on the way!"}
                {order.status === "delivered" && "Your order has been delivered."}
                {order.status === "cancelled" && "This order was cancelled."}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border grid sm:grid-cols-2 gap-4 text-sm">
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
          </div>
        </div>

        {/* Delivery Address */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-heading font-semibold text-lg mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Delivery Address
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{order.delivery_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>{order.delivery_phone}</span>
            </div>
            <p className="text-muted-foreground pl-6">{order.delivery_address}</p>
            {order.notes && (
              <p className="text-muted-foreground pl-6 italic">Note: {order.notes}</p>
            )}
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-heading font-semibold text-lg mb-4">Order Items</h2>
          <div className="space-y-3">
            {order.order_items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-3 border-b border-border last:border-0"
              >
                <div>
                  <p className="font-medium">{item.product_name}</p>
                  <p className="text-sm text-muted-foreground">
                    ₹{item.unit_price} × {item.quantity}
                  </p>
                </div>
                <p className="font-medium">₹{item.total_price}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Summary */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-heading font-semibold text-lg mb-4">Payment Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>₹{order.subtotal}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery Charge</span>
              <span>₹{order.delivery_charge || 0}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border font-semibold text-base">
              <span>Total</span>
              <span className="text-primary">₹{order.total}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Payment Method</span>
            <span className="font-medium capitalize">
              {order.payment_method === "cod" ? "Cash on Delivery" : "Online Payment"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-muted-foreground">Payment Status</span>
            <span
              className={`font-medium capitalize ${
                order.payment_status === "paid"
                  ? "text-green-600"
                  : order.payment_status === "failed"
                  ? "text-destructive"
                  : "text-yellow-600"
              }`}
            >
              {order.payment_status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
