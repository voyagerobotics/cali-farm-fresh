import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Clock, CheckCircle, Truck, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePageTracking } from "@/hooks/useAnalytics";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Track page visit
  usePageTracking();

  const fetchOrders = async () => {
    if (!user) return;
    
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

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate("/auth");
      return;
    }

    fetchOrders();
  }, [user, authLoading, navigate]);

  // Check if order can be cancelled (before 1 day of delivery)
  const canCancelOrder = (order: Order): boolean => {
    if (order.status === "cancelled" || order.status === "delivered" || order.status === "out_for_delivery") {
      return false;
    }
    
    const deliveryDate = new Date(order.order_date);
    const now = new Date();
    const oneDayBefore = new Date(deliveryDate);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);
    oneDayBefore.setHours(23, 59, 59, 999);
    
    return now <= oneDayBefore;
  };

  // Get cancellation eligibility message
  const getCancellationMessage = (order: Order): string => {
    if (order.status === "cancelled") return "Order already cancelled";
    if (order.status === "delivered") return "Order already delivered";
    if (order.status === "out_for_delivery") return "Order is out for delivery";
    
    const deliveryDate = new Date(order.order_date);
    const now = new Date();
    const oneDayBefore = new Date(deliveryDate);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);
    
    if (now > oneDayBefore) {
      return "Cancellation window has passed (must cancel 1 day before delivery)";
    }
    
    return "Eligible for 100% refund";
  };

  const handleCancelClick = (order: Order) => {
    setOrderToCancel(order);
    setShowCancelDialog(true);
  };

  const handleConfirmCancel = async () => {
    if (!orderToCancel) return;
    
    setCancellingOrderId(orderToCancel.id);
    setShowCancelDialog(false);

    try {
      // Update order status to cancelled and payment status to refunded if it was paid
      const updates: { 
        status: "cancelled"; 
        payment_status?: "pending" | "paid" | "failed" | "refunded";
      } = {
        status: "cancelled",
      };
      
      // If payment was already made, mark for refund
      if (orderToCancel.payment_status === "paid") {
        updates.payment_status = "refunded";
      }

      const { error } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", orderToCancel.id);

      if (error) throw error;

      toast({
        title: "Order Cancelled",
        description: orderToCancel.payment_status === "paid" 
          ? "Your order has been cancelled. A 100% refund will be processed within 5 business days."
          : "Your order has been cancelled successfully.",
      });

      fetchOrders();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel order",
        variant: "destructive",
      });
    } finally {
      setCancellingOrderId(null);
      setOrderToCancel(null);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Cancel Order
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to cancel order <strong>{orderToCancel?.order_number}</strong>?</p>
              {orderToCancel && (
                <div className="bg-muted p-3 rounded-lg mt-2">
                  <p className="text-sm font-medium text-foreground">Refund Policy:</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {orderToCancel.payment_status === "paid" 
                      ? "You will receive a 100% refund within 5 business days."
                      : "No payment was made for this order."}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Order</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Cancel Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            {orders.map((order) => {
              const canCancel = canCancelOrder(order);
              const cancellationMessage = getCancellationMessage(order);
              
              return (
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
                              : order.payment_status === "refunded"
                              ? "text-blue-600"
                              : "text-yellow-600"
                          }
                        >
                          {order.payment_status}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-border">
                    <span className="font-heading text-lg font-bold text-primary">
                      ₹{order.total}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {order.status !== "cancelled" && order.status !== "delivered" && (
                        <div className="flex items-center gap-2">
                          {canCancel ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                              onClick={() => handleCancelClick(order)}
                              disabled={cancellingOrderId === order.id}
                            >
                              {cancellingOrderId === order.id ? "Cancelling..." : "Cancel Order"}
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground" title={cancellationMessage}>
                              {cancellationMessage}
                            </span>
                          )}
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/orders/${order.id}`)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
