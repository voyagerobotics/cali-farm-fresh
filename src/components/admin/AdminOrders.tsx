import { useState } from "react";
import { Clock, CheckCircle, Truck, Package, XCircle, ChevronDown, ChevronUp, CreditCard, Banknote, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Order, useOrders } from "@/hooks/useOrders";

const statusConfig: Record<Order["status"], { label: string; icon: any; color: string }> = {
  pending: { label: "Pending", icon: Clock, color: "bg-yellow-500/10 text-yellow-600" },
  confirmed: { label: "Confirmed", icon: CheckCircle, color: "bg-blue-500/10 text-blue-600" },
  preparing: { label: "Preparing", icon: Package, color: "bg-purple-500/10 text-purple-600" },
  out_for_delivery: { label: "Out for Delivery", icon: Truck, color: "bg-primary/10 text-primary" },
  delivered: { label: "Delivered", icon: CheckCircle, color: "bg-green-500/10 text-green-600" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "bg-destructive/10 text-destructive" },
};

const paymentStatusConfig: Record<Order["payment_status"], { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-yellow-500/10 text-yellow-600" },
  paid: { label: "Paid", color: "bg-green-500/10 text-green-600" },
  failed: { label: "Failed", color: "bg-destructive/10 text-destructive" },
  refunded: { label: "Refunded", color: "bg-blue-500/10 text-blue-600" },
};

const AdminOrders = () => {
  const { orders, isLoading, refetch, updateOrderStatus, updatePaymentStatus } = useOrders(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<Order["status"] | "all">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const filteredOrders = statusFilter === "all" 
    ? orders 
    : orders.filter(order => order.status === statusFilter);

  const statusCounts = {
    all: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    confirmed: orders.filter(o => o.status === "confirmed").length,
    preparing: orders.filter(o => o.status === "preparing").length,
    out_for_delivery: orders.filter(o => o.status === "out_for_delivery").length,
    delivered: orders.filter(o => o.status === "delivered").length,
    cancelled: orders.filter(o => o.status === "cancelled").length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Orders ({orders.length})</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        {(["all", "pending", "confirmed", "preparing", "out_for_delivery", "delivered", "cancelled"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === status
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            {status === "all" ? "All" : statusConfig[status].label} ({statusCounts[status]})
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No orders found
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const StatusIcon = statusConfig[order.status].icon;
            const isExpanded = expandedOrder === order.id;

            return (
              <div
                key={order.id}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                {/* Order Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">#{order.order_number}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig[order.status].color}`}>
                            {statusConfig[order.status].label}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${paymentStatusConfig[order.payment_status].color}`}>
                            {paymentStatusConfig[order.payment_status].label}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {order.delivery_name} • {order.delivery_phone}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-lg">₹{order.total}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          {order.payment_method === "cod" ? (
                            <><Banknote className="w-3 h-3" /> COD</>
                          ) : (
                            <><CreditCard className="w-3 h-3" /> UPI</>
                          )}
                        </p>
                      </div>
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-border p-4 space-y-4 bg-muted/20">
                    {/* Order Items */}
                    <div>
                      <h4 className="font-medium mb-2">Items</h4>
                      <div className="space-y-2">
                        {order.order_items?.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span>{item.product_name} × {item.quantity}</span>
                            <span>₹{item.total_price}</span>
                          </div>
                        ))}
                        <div className="border-t border-border pt-2 mt-2">
                          <div className="flex justify-between text-sm">
                            <span>Subtotal</span>
                            <span>₹{order.subtotal}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Delivery</span>
                            <span>₹{order.delivery_charge || 0}</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span>Total</span>
                            <span>₹{order.total}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Delivery Address */}
                    <div>
                      <h4 className="font-medium mb-2">Delivery Address</h4>
                      <p className="text-sm text-muted-foreground">{order.delivery_address}</p>
                      {order.notes && (
                        <p className="text-sm text-muted-foreground mt-1">
                          <span className="font-medium">Notes:</span> {order.notes}
                        </p>
                      )}
                    </div>

                    {/* UPI Reference */}
                    {order.upi_reference && (
                      <div>
                        <h4 className="font-medium mb-2">UPI Reference</h4>
                        <p className="text-sm font-mono bg-muted px-2 py-1 rounded inline-block">
                          {order.upi_reference}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {/* Status Actions */}
                      {order.status !== "delivered" && order.status !== "cancelled" && (
                        <>
                          {order.status === "pending" && (
                            <Button size="sm" onClick={() => updateOrderStatus(order.id, "confirmed")}>
                              Confirm Order
                            </Button>
                          )}
                          {order.status === "confirmed" && (
                            <Button size="sm" onClick={() => updateOrderStatus(order.id, "preparing")}>
                              Start Preparing
                            </Button>
                          )}
                          {order.status === "preparing" && (
                            <Button size="sm" onClick={() => updateOrderStatus(order.id, "out_for_delivery")}>
                              Out for Delivery
                            </Button>
                          )}
                          {order.status === "out_for_delivery" && (
                            <Button size="sm" onClick={() => updateOrderStatus(order.id, "delivered")}>
                              Mark Delivered
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateOrderStatus(order.id, "cancelled")}
                          >
                            Cancel Order
                          </Button>
                        </>
                      )}

                      {/* Payment Actions */}
                      {order.payment_method === "online" && order.payment_status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updatePaymentStatus(order.id, "paid")}
                        >
                          Verify Payment
                        </Button>
                      )}
                    </div>

                    {/* Timestamps */}
                    <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                      <p>Order Date: {new Date(order.order_date).toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric" })}</p>
                      <p>Created: {new Date(order.created_at).toLocaleString("en-IN")}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
