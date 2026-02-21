import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  created_at: string;
  updated_at: string;
}

export const usePromotionalBanners = (activeOnly: boolean = true) => {
  const [banners, setBanners] = useState<PromotionalBanner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchBanners = async () => {
    try {
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
    } catch (error: any) {
      console.error("Error fetching banners:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createBanner = async (banner: Partial<PromotionalBanner>) => {
    try {
      const { error } = await supabase
        .from("promotional_banners" as any)
        .insert([banner] as any);
      if (error) throw error;
      toast({ title: "Banner created" });
      fetchBanners();
      return true;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }
  };

  const updateBanner = async (id: string, updates: Partial<PromotionalBanner>) => {
    try {
      const { error } = await supabase
        .from("promotional_banners" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Banner updated" });
      fetchBanners();
      return true;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }
  };

  const deleteBanner = async (id: string) => {
    try {
      const { error } = await supabase
        .from("promotional_banners" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Banner deleted" });
      fetchBanners();
      return true;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  return { banners, isLoading, fetchBanners, createBanner, updateBanner, deleteBanner };
};
