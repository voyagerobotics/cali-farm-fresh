import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  price: number;
  stock_quantity: number | null;
  is_available: boolean | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export const useProductVariants = (productId?: string) => {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVariants = async () => {
    if (!productId) {
      setVariants([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", productId)
        .order("display_order");

      if (fetchError) throw fetchError;
      setVariants(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVariants();
  }, [productId]);

  return { variants, isLoading, error, refetch: fetchVariants };
};

export const useVariantMutations = () => {
  const createVariant = async (variant: {
    product_id: string;
    name: string;
    price: number;
    stock_quantity?: number;
    is_available?: boolean;
    display_order?: number;
  }) => {
    const { data, error } = await supabase
      .from("product_variants")
      .insert([variant])
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const updateVariant = async (id: string, updates: Partial<ProductVariant>) => {
    const { data, error } = await supabase
      .from("product_variants")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const deleteVariant = async (id: string) => {
    const { error } = await supabase
      .from("product_variants")
      .delete()
      .eq("id", id);

    if (error) throw error;
  };

  const toggleVariantAvailability = async (id: string, isAvailable: boolean) => {
    return updateVariant(id, { is_available: isAvailable });
  };

  return { createVariant, updateVariant, deleteVariant, toggleVariantAvailability };
};

// Helper function to calculate discounted price
export const calculateDiscountedPrice = (
  basePrice: number,
  discountType: string | null,
  discountValue: number | null,
  discountEnabled: boolean | null
): { finalPrice: number; savings: number; discountLabel: string | null } => {
  if (!discountEnabled || !discountType || discountValue === null || discountValue <= 0) {
    return { finalPrice: basePrice, savings: 0, discountLabel: null };
  }

  let finalPrice: number;
  let savings: number;
  let discountLabel: string;

  if (discountType === "percentage") {
    savings = Math.round((basePrice * discountValue) / 100);
    finalPrice = basePrice - savings;
    discountLabel = `${discountValue}% OFF`;
  } else {
    // flat discount
    savings = Math.min(discountValue, basePrice);
    finalPrice = basePrice - savings;
    discountLabel = `Save ₹${savings}`;
  }

  return { finalPrice: Math.max(0, finalPrice), savings, discountLabel };
};
