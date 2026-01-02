import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Category {
  id: string;
  slug: string;
  name: string;
  icon: string;
  display_order: number;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  subcategories?: Subcategory[];
}

export interface Subcategory {
  id: string;
  slug: string;
  name: string;
  category_id: string;
  display_order: number;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
}

export const useCategories = (isAdmin: boolean = false) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("categories")
        .select(`
          *,
          subcategories (*)
        `)
        .order("display_order", { ascending: true });

      if (error) throw error;

      // Sort subcategories by display_order
      const sortedData = (data || []).map(cat => ({
        ...cat,
        subcategories: (cat.subcategories || []).sort(
          (a: Subcategory, b: Subcategory) => a.display_order - b.display_order
        )
      }));

      setCategories(sortedData);
    } catch (error: any) {
      console.error("Error fetching categories:", error);
      toast({ title: "Error", description: "Failed to load categories", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const addCategory = async (category: Omit<Category, "id" | "created_at" | "updated_at" | "subcategories">) => {
    try {
      const { error } = await supabase.from("categories").insert(category);
      if (error) throw error;
      toast({ title: "Category added successfully" });
      fetchCategories();
      return true;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    try {
      const { error } = await supabase
        .from("categories")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Category updated successfully" });
      fetchCategories();
      return true;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Category deleted successfully" });
      fetchCategories();
      return true;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }
  };

  const toggleCategoryVisibility = async (id: string, is_hidden: boolean) => {
    return updateCategory(id, { is_hidden });
  };

  // Subcategory operations
  const addSubcategory = async (subcategory: Omit<Subcategory, "id" | "created_at" | "updated_at">) => {
    try {
      const { error } = await supabase.from("subcategories").insert(subcategory);
      if (error) throw error;
      toast({ title: "Subcategory added successfully" });
      fetchCategories();
      return true;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }
  };

  const updateSubcategory = async (id: string, updates: Partial<Subcategory>) => {
    try {
      const { error } = await supabase
        .from("subcategories")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Subcategory updated successfully" });
      fetchCategories();
      return true;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }
  };

  const deleteSubcategory = async (id: string) => {
    try {
      const { error } = await supabase.from("subcategories").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Subcategory deleted successfully" });
      fetchCategories();
      return true;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }
  };

  const toggleSubcategoryVisibility = async (id: string, is_hidden: boolean) => {
    return updateSubcategory(id, { is_hidden });
  };

  useEffect(() => {
    fetchCategories();
  }, [isAdmin]);

  return {
    categories,
    isLoading,
    refetch: fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryVisibility,
    addSubcategory,
    updateSubcategory,
    deleteSubcategory,
    toggleSubcategoryVisibility,
  };
};
