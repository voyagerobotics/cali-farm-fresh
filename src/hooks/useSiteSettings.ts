import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SiteSettings {
  show_seasonal_box: boolean;
}

export const useSiteSettings = () => {
  const [settings, setSettings] = useState<SiteSettings>({ show_seasonal_box: true });
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .eq("id", "default")
        .single();

      if (error) throw error;
      if (data) {
        setSettings({
          show_seasonal_box: data.show_seasonal_box,
        });
      }
    } catch (error) {
      console.error("Error fetching site settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<SiteSettings>) => {
    try {
      const { error } = await supabase
        .from("site_settings")
        .update(newSettings)
        .eq("id", "default");

      if (error) throw error;
      
      setSettings((prev) => ({ ...prev, ...newSettings }));
      return true;
    } catch (error) {
      console.error("Error updating site settings:", error);
      return false;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    isLoading,
    updateSettings,
    refetch: fetchSettings,
  };
};
