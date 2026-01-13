import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string | null;
  status: "pending" | "confirmed" | "preparing" | "out_for_delivery" | "delivered" | "cancelled";
  payment_method: "cod" | "online";
  payment_status: "pending" | "paid" | "failed" | "refunded";
  subtotal: number;
  delivery_charge: number | null;
  total: number;
  delivery_name: string;
  delivery_phone: string;
  delivery_address: string;
  delivery_slot: string | null;
  notes: string | null;
  upi_reference: string | null;
  order_date: string;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export const useOrders = (isAdmin: boolean = false) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            id,
            product_name,
            quantity,
            unit_price,
            total_price
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order["status"]) => {
    try {
      // Get order details first for email notification
      const order = orders.find(o => o.id === orderId);
      
      const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", orderId);

      if (error) throw error;
      
      toast({ title: "Order status updated" });
      
      // Send status update email notification for key status changes
      if (order && ['confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'].includes(status)) {
        try {
          const response = await supabase.functions.invoke('send-order-status-update', {
            body: {
              orderId: order.id,
              orderNumber: order.order_number,
              customerName: order.delivery_name,
              newStatus: status,
              deliveryAddress: order.delivery_address,
              userId: order.user_id,
            },
          });
          
          if (response.error) {
            console.error('Failed to send status update email:', response.error);
          } else {
            console.log('Status update email sent successfully');
          }
        } catch (emailError) {
          console.error('Error sending status update email:', emailError);
          // Don't fail the status update if email fails
        }
      }
      
      fetchOrders();
      return true;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }
  };

  const updatePaymentStatus = async (orderId: string, paymentStatus: Order["payment_status"]) => {
    try {
      const updates: any = { payment_status: paymentStatus };
      if (paymentStatus === "paid") {
        updates.payment_verified_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", orderId);

      if (error) throw error;
      
      toast({ title: "Payment status updated" });
      fetchOrders();
      return true;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }
  };

  useEffect(() => {
    fetchOrders();

    // Subscribe to realtime updates for orders table
    const ordersChannel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          console.log("New order received:", payload);
          fetchOrders();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          console.log("Order updated:", payload);
          fetchOrders();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "orders",
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });

    return () => {
      supabase.removeChannel(ordersChannel);
    };
  }, [isAdmin]);

  return { orders, isLoading, refetch: fetchOrders, updateOrderStatus, updatePaymentStatus };
};
