import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { withNetworkRetry, getNetworkErrorMessage } from "@/lib/network-retry";

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
      await withNetworkRetry(async () => {
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

        if (response.error) throw response.error;
        setOrders(response.data || []);
      });
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      toast({ title: "Failed to load orders", description: "Please retry in a few seconds.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order["status"]) => {
    try {
      await withNetworkRetry(async () => {
        const { data, error } = await supabase.functions.invoke("update-order-status", {
          body: { orderId, status },
        });

        if (error) throw error;
        if (!data?.success) {
          throw new Error(data?.error || "Failed to update order status");
        }
      });

      toast({ title: "Order status updated" });
      fetchOrders();
      return true;
    } catch (error: any) {
      // Network can fail after write reaches backend. Verify persisted status before treating as failure.
      try {
        const verification = await withNetworkRetry(async () => {
          const { data, error: verificationError } = await supabase
            .from("orders")
            .select("status")
            .eq("id", orderId)
            .maybeSingle();

          if (verificationError) throw verificationError;
          return data;
        });

        if (verification?.status === status) {
          toast({ title: "Order status updated", description: "Saved after temporary network issue." });
          fetchOrders();
          return true;
        }
      } catch (verificationError) {
        console.error("Status verification after failure failed:", verificationError);
      }

      toast({ title: "Error", description: getNetworkErrorMessage(error, "updating status"), variant: "destructive" });
      return false;
    }
  };

  const updatePaymentStatus = async (orderId: string, paymentStatus: Order["payment_status"]) => {
    try {
      const updates: any = { payment_status: paymentStatus };
      if (paymentStatus === "paid") {
        updates.payment_verified_at = new Date().toISOString();
      }

      await withNetworkRetry(async () => {
        const { error } = await supabase
          .from("orders")
          .update(updates)
          .eq("id", orderId);

        if (error) throw error;
      });

      toast({ title: "Payment status updated" });
      fetchOrders();
      return true;
    } catch (error: any) {
      toast({ title: "Error", description: getNetworkErrorMessage(error, "updating payment"), variant: "destructive" });
      return false;
    }
  };

  useEffect(() => {
    fetchOrders();

    const ordersChannel = supabase
      .channel("orders-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, () => fetchOrders())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, () => fetchOrders())
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "orders" }, () => fetchOrders())
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
    };
  }, [isAdmin]);

  return { orders, isLoading, refetch: fetchOrders, updateOrderStatus, updatePaymentStatus };
};
