import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

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
      const { data, error } = await supabase
        .from("pre_orders" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPreOrders((data as any) || []);
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
  }) => {
    if (!user) {
      toast({ title: "Please login", description: "You need to be logged in to pre-order.", variant: "destructive" });
      return false;
    }

    try {
      const { error } = await supabase
        .from("pre_orders" as any)
        .insert([{
          ...preOrder,
          user_id: user.id,
        }] as any);

      if (error) throw error;
      toast({ title: "Pre-order placed!", description: "We'll notify you when the product is available." });
      fetchPreOrders();
      return true;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }
  };

  const updatePreOrderStatus = async (id: string, status: PreOrder["status"]) => {
    try {
      const { error } = await supabase
        .from("pre_orders" as any)
        .update({ status } as any)
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Pre-order status updated" });
      fetchPreOrders();
      return true;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }
  };

  useEffect(() => {
    if (user || isAdmin) {
      fetchPreOrders();
    }
  }, [user, isAdmin]);

  return { preOrders, isLoading, fetchPreOrders, createPreOrder, updatePreOrderStatus };
};
