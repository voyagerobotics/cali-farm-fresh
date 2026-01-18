import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  icon: string;
  display_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export const useSocialLinks = (showAll = false) => {
  const queryClient = useQueryClient();

  const { data: socialLinks = [], isLoading, error } = useQuery({
    queryKey: ["social-links", showAll],
    queryFn: async () => {
      let query = supabase
        .from("social_links")
        .select("*")
        .order("display_order", { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      return data as SocialLink[];
    },
  });

  const addSocialLink = useMutation({
    mutationFn: async (link: Omit<SocialLink, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("social_links")
        .insert(link)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-links"] });
    },
  });

  const updateSocialLink = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SocialLink> & { id: string }) => {
      const { data, error } = await supabase
        .from("social_links")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-links"] });
    },
  });

  const deleteSocialLink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("social_links").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-links"] });
    },
  });

  return {
    socialLinks,
    isLoading,
    error,
    addSocialLink,
    updateSocialLink,
    deleteSocialLink,
  };
};
