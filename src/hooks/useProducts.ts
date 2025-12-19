import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  unit: string;
  image_url: string | null;
  category: string | null;
  stock_quantity: number | null;
  is_available: boolean | null;
  is_hidden: boolean | null;
  created_at: string;
  updated_at: string;
}

export const useProducts = (includeHidden: boolean = false) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase.from("products").select("*").order("name");

      if (!includeHidden) {
        query = query.eq("is_hidden", false);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setProducts(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("products-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        () => {
          fetchProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [includeHidden]);

  return { products, isLoading, error, refetch: fetchProducts };
};

export const useProductMutations = () => {
  const createProduct = async (product: { name: string; price: number; unit: string; description?: string; image_url?: string; category?: string; stock_quantity?: number; is_available?: boolean; is_hidden?: boolean }) => {
    const { data, error } = await supabase
      .from("products")
      .insert([product])
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    const { data, error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Create stock notification if quantity changed
    if (updates.stock_quantity !== undefined || updates.is_available !== undefined) {
      const product = data;
      let message = "";

      if (updates.is_available === false) {
        message = `${product.name} is now out of stock`;
      } else if (updates.stock_quantity !== undefined && updates.stock_quantity > 0) {
        message = `${product.name} is back in stock! ${updates.stock_quantity} ${product.unit}(s) available`;
      }

      if (message) {
        await supabase.from("stock_notifications").insert([
          {
            product_id: id,
            message,
          },
        ]);
      }
    }

    return data;
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;
  };

  const toggleVisibility = async (id: string, isHidden: boolean) => {
    return updateProduct(id, { is_hidden: isHidden });
  };

  return { createProduct, updateProduct, deleteProduct, toggleVisibility };
};
