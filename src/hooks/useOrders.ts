import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  unit?: string;
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
  delivery_latitude: number | null;
  delivery_longitude: number | null;
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
      let attempts = 0;
      let lastError: any = null;
      let data: any[] | null = null;

      while (attempts < 2) {
        attempts += 1;
        const response = await supabase
          .from("orders")
          .select(`
            *,
            order_items (
              id,
              product_name,
              quantity,
              unit_price,
              total_price,
              unit
            )
          `)
          .order("created_at", { ascending: false });

        if (!response.error) {
          data = response.data;
          break;
        }

        lastError = response.error;
      }

      if (lastError && !data) throw lastError;
      setOrders(data || []);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      toast({ title: "Failed to load orders", description: "Please retry in a few seconds.", variant: "destructive" });
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
      fetchOrders();
      
      // Fire-and-forget: send status update email (don't await or block)
      if (order && ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'].includes(status)) {
        supabase.functions.invoke('send-order-status-update', {
          body: {
            orderId: order.id,
            orderNumber: order.order_number,
            customerName: order.delivery_name,
            newStatus: status,
            deliveryAddress: order.delivery_address,
            userId: order.user_id,
          },
        }).then(response => {
          if (response.error) console.error('Status email failed:', response.error);
        }).catch(err => console.error('Status email error:', err));
      }
      
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
