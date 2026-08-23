import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type NavLink = {
  id: string;
  label: string;
  link_type: string; // 'scroll' | 'route' | 'external'
  link_value: string;
  display_order: number;
  is_visible: boolean;
  open_in_new_tab: boolean;
};

export const DEFAULT_NAV_LINKS: NavLink[] = [
  { id: "d1", label: "About", link_type: "scroll", link_value: "about", display_order: 1, is_visible: true, open_in_new_tab: false },
  { id: "d2", label: "Products", link_type: "scroll", link_value: "products", display_order: 2, is_visible: true, open_in_new_tab: false },
  { id: "d3", label: "Why Us", link_type: "scroll", link_value: "benefits", display_order: 3, is_visible: true, open_in_new_tab: false },
  { id: "d4", label: "Contact", link_type: "scroll", link_value: "contact", display_order: 5, is_visible: true, open_in_new_tab: false },
];

export const useNavLinks = () => {
  const [links, setLinks] = useState<NavLink[]>(DEFAULT_NAV_LINKS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("nav_links")
        .select("*")
        .eq("is_visible", true)
        .order("display_order", { ascending: true });
      if (!cancelled && !error && data && data.length > 0) {
        setLinks(data as NavLink[]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return links;
};
