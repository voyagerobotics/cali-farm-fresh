import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { withNetworkRetry, getNetworkErrorMessage } from "@/lib/network-retry";

export interface WeightOption {
  label: string;
  min_weight: number;
  max_weight: number;
  price: number;
}

export interface PromotionalBanner {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  product_name: string;
  image_url: string | null;
  badge_text: string | null;
  cta_text: string | null;
  cta_link: string | null;
  background_color: string | null;
  text_color: string | null;
  is_active: boolean;
  display_order: number;
  start_date: string | null;
  end_date: string | null;
  payment_required: boolean;
  price_per_unit: number;
  unit: string;
  weight_options: WeightOption[] | null;
  hide_quantity: boolean;
  created_at: string;
  updated_at: string;
}

export const usePromotionalBanners = (activeOnly: boolean = true) => {
  const [banners, setBanners] = useState<PromotionalBanner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchBanners = async () => {
    try {
      await withNetworkRetry(async () => {
        let query = supabase
          .from("promotional_banners" as any)
          .select("*")
          .order("display_order", { ascending: true });

        if (activeOnly) {
          query = query.eq("is_active", true);
        }

        const { data, error } = await query;
        if (error) throw error;
        setBanners((data as any) || []);
      });
    } catch (error: any) {
      console.error("Error fetching banners:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createBanner = async (banner: Partial<PromotionalBanner>) => {
    try {
      await withNetworkRetry(async () => {
        const { error } = await supabase
          .from("promotional_banners" as any)
          .insert([banner] as any);
        if (error) throw error;
      });
      toast({ title: "Banner created" });
      fetchBanners();
      return true;
    } catch (error: any) {
      toast({ title: "Error", description: getNetworkErrorMessage(error, "creating banner"), variant: "destructive" });
      return false;
    }
  };

  const updateBanner = async (id: string, updates: Partial<PromotionalBanner>) => {
    try {
      await withNetworkRetry(async () => {
        const { error } = await supabase
          .from("promotional_banners" as any)
          .update(updates as any)
          .eq("id", id);
        if (error) throw error;
      });

      toast({ title: "Banner updated" });
      fetchBanners();
      return true;
    } catch (error: any) {
      // Reconcile potential network failure where write succeeded server-side.
      try {
        const verification = await withNetworkRetry(async () => {
          const { data, error: verificationError } = await supabase
            .from("promotional_banners" as any)
            .select("*")
            .eq("id", id)
            .maybeSingle();

          if (verificationError) throw verificationError;
          return data as unknown as PromotionalBanner | null;
        });

        if (verification) {
          const hasAllUpdatedFieldsMatch = Object.entries(updates).every(([key, value]) => {
            if (value === undefined) return true;
            const current = (verification as any)[key];
            return String(current ?? "") === String(value ?? "");
          });

          if (hasAllUpdatedFieldsMatch) {
            toast({
              title: "Banner updated",
              description: "Saved after temporary network issue.",
            });
            fetchBanners();
            return true;
          }
        }
      } catch (verificationError) {
        console.error("Banner verification after update failure failed:", verificationError);
      }

      toast({ title: "Error", description: getNetworkErrorMessage(error, "updating banner"), variant: "destructive" });
      return false;
    }
  };

  const deleteBanner = async (id: string) => {
    try {
      await withNetworkRetry(async () => {
        const { error } = await supabase
          .from("promotional_banners" as any)
          .delete()
          .eq("id", id);
        if (error) throw error;
      });
      toast({ title: "Banner deleted" });
      fetchBanners();
      return true;
    } catch (error: any) {
      toast({ title: "Error", description: getNetworkErrorMessage(error, "deleting banner"), variant: "destructive" });
      return false;
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  return { banners, isLoading, fetchBanners, createBanner, updateBanner, deleteBanner };
};
