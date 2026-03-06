import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { withNetworkRetry, getNetworkErrorMessage } from "@/lib/network-retry";

export interface UserAddress {
  id: string;
  user_id: string;
  label: string;
  full_name: string;
  phone: string;
  address: string;
  pincode: string;
  city: string;
  is_default: boolean;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

export const useAddresses = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAddresses = async () => {
    if (!user) {
      setAddresses([]);
      setIsLoading(false);
      return;
    }

    try {
      await withNetworkRetry(async () => {
        const { data, error } = await supabase
          .from("user_addresses")
          .select("*")
          .eq("user_id", user.id)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false });

        if (error) throw error;
        setAddresses(data || []);
      });
    } catch (error: any) {
      console.error("Error fetching addresses:", error);
      toast({ title: "Error", description: "Failed to load addresses", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, [user]);

  const addAddress = async (addressData: Omit<UserAddress, "id" | "user_id" | "created_at" | "updated_at">) => {
    if (!user) return null;

    try {
      let result: any = null;

      await withNetworkRetry(async () => {
        if (addressData.is_default) {
          await supabase
            .from("user_addresses")
            .update({ is_default: false })
            .eq("user_id", user.id);
        }

        const { data, error } = await supabase
          .from("user_addresses")
          .insert({ ...addressData, user_id: user.id })
          .select()
          .single();

        if (error) throw error;
        result = data;
      });

      await fetchAddresses();
      toast({ title: "Address added successfully" });
      return result;
    } catch (error: any) {
      toast({ title: "Error", description: getNetworkErrorMessage(error, "adding address"), variant: "destructive" });
      return null;
    }
  };

  const updateAddress = async (id: string, addressData: Partial<UserAddress>) => {
    if (!user) return false;

    try {
      await withNetworkRetry(async () => {
        if (addressData.is_default) {
          await supabase
            .from("user_addresses")
            .update({ is_default: false })
            .eq("user_id", user.id);
        }

        const { error } = await supabase
          .from("user_addresses")
          .update(addressData)
          .eq("id", id)
          .eq("user_id", user.id);

        if (error) throw error;
      });

      await fetchAddresses();
      toast({ title: "Address updated successfully" });
      return true;
    } catch (error: any) {
      toast({ title: "Error", description: getNetworkErrorMessage(error, "updating address"), variant: "destructive" });
      return false;
    }
  };

  const deleteAddress = async (id: string) => {
    if (!user) return false;

    try {
      await withNetworkRetry(async () => {
        const { error } = await supabase
          .from("user_addresses")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);

        if (error) throw error;
      });

      await fetchAddresses();
      toast({ title: "Address deleted" });
      return true;
    } catch (error: any) {
      toast({ title: "Error", description: getNetworkErrorMessage(error, "deleting address"), variant: "destructive" });
      return false;
    }
  };

  const setDefaultAddress = async (id: string) => {
    return updateAddress(id, { is_default: true });
  };

  const defaultAddress = addresses.find((a) => a.is_default) || addresses[0];

  return {
    addresses,
    isLoading,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    defaultAddress,
    refetch: fetchAddresses,
  };
};
