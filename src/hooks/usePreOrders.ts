import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { withNetworkRetry, getNetworkErrorMessage } from "@/lib/network-retry";

export interface PreOrder {
  id: string;
  user_id: string;
  product_name: string;
  banner_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  quantity: number;
  notes: string | null;
  status: "pending" | "confirmed" | "cancelled" | "fulfilled";
  payment_status: string;
  payment_amount: number;
  razorpay_payment_id: string | null;
  delivery_address: string | null;
  delivery_pincode: string | null;
  delivery_charge: number | null;
  delivery_distance_km: number | null;
  created_at: string;
  updated_at: string;
}

export const usePreOrders = (isAdmin: boolean = false) => {
  const [preOrders, setPreOrders] = useState<PreOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchPreOrders = async () => {
    try {
      await withNetworkRetry(async () => {
        const { data, error } = await supabase
          .from("pre_orders" as any)
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setPreOrders((data as any) || []);
      });
    } catch (error: any) {
      console.error("Error fetching pre-orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createPreOrder = async (preOrder: {
    product_name: string;
    banner_id?: string;
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    quantity: number;
    notes?: string;
    payment_status?: string;
    payment_amount?: number;
    razorpay_payment_id?: string;
    delivery_address?: string;
    delivery_pincode?: string;
    delivery_charge?: number;
    delivery_distance_km?: number;
  }) => {
    if (!user) {
      toast({ title: "Please login", description: "You need to be logged in to pre-order.", variant: "destructive" });
      return false;
    }

    try {
      let createdRecord: any = null;
      await withNetworkRetry(async () => {
        const { data, error } = await supabase
          .from("pre_orders" as any)
          .insert([{ ...preOrder, user_id: user.id }] as any)
          .select()
          .single();

        if (error) throw error;
        createdRecord = data;
      });
      toast({ title: "Pre-order placed!", description: "We'll notify you when the product is available." });
      fetchPreOrders();
      return createdRecord;
    } catch (error: any) {
      toast({ title: "Error", description: getNetworkErrorMessage(error, "placing pre-order"), variant: "destructive" });
      return false;
    }
  };

  const updatePreOrderStatus = async (id: string, status: PreOrder["status"]) => {
    try {
      await withNetworkRetry(async () => {
        const { error } = await supabase
          .from("pre_orders" as any)
          .update({ status } as any)
          .eq("id", id);

        if (error) throw error;
      });
      toast({ title: "Pre-order status updated" });
      fetchPreOrders();

      // Send status update email (fire-and-forget)
      try {
        await supabase.functions.invoke("send-preorder-status-update", {
          body: { preOrderId: id, newStatus: status },
        });
      } catch (emailError) {
        console.error("Pre-order status email failed:", emailError);
      }

      return true;
    } catch (error: any) {
      toast({ title: "Error", description: getNetworkErrorMessage(error, "updating pre-order"), variant: "destructive" });
      return false;
    }
  };

  const updatePreOrderPaymentStatus = async (id: string, paymentStatus: string) => {
    try {
      await withNetworkRetry(async () => {
        const { error } = await supabase
          .from("pre_orders" as any)
          .update({ payment_status: paymentStatus } as any)
          .eq("id", id);

        if (error) throw error;
      });

      toast({ title: "Payment status updated" });

      // Send refund email when marked as refunded
      if (paymentStatus === "refunded") {
        const po = preOrders.find(p => p.id === id);
        if (po) {
          try {
            await supabase.functions.invoke("send-refund-notification", {
              body: {
                orderId: po.id,
                orderNumber: `PRE-${po.id.substring(0, 8).toUpperCase()}`,
                customerName: po.customer_name,
                customerEmail: po.customer_email,
                userId: po.user_id,
                refundAmount: po.payment_amount || 0,
                totalAmount: po.payment_amount || 0,
                type: "refund_initiated",
                paymentMethod: po.razorpay_payment_id ? "online" : "cod",
                paymentId: po.razorpay_payment_id,
              },
            });
          } catch (emailError) {
            console.error("Failed to send pre-order refund notification:", emailError);
          }
        }
      }

      fetchPreOrders();
      return true;
    } catch (error: any) {
      toast({ title: "Error", description: getNetworkErrorMessage(error, "updating payment status"), variant: "destructive" });
      return false;
    }
  };

  const deletePreOrder = async (id: string) => {
    try {
      await withNetworkRetry(async () => {
        const { error } = await supabase
          .from("pre_orders" as any)
          .delete()
          .eq("id", id);

        if (error) throw error;
      });
      toast({ title: "Pre-order deleted" });
      fetchPreOrders();
      return true;
    } catch (error: any) {
      toast({ title: "Error", description: getNetworkErrorMessage(error, "deleting pre-order"), variant: "destructive" });
      return false;
    }
  };

  useEffect(() => {
    if (user || isAdmin) {
      fetchPreOrders();
    }
  }, [user, isAdmin]);

  return { preOrders, isLoading, fetchPreOrders, createPreOrder, updatePreOrderStatus, updatePreOrderPaymentStatus, deletePreOrder };
};
