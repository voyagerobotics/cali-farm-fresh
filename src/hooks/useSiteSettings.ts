import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SiteSettings {
  show_seasonal_box: boolean;
  seasonal_box_title: string;
  seasonal_box_description: string;
  seasonal_box_price: number;
  seasonal_box_badge: string;
  seasonal_box_button_text: string;
  seasonal_box_button_link: string | null;
  order_days: string[];
  delivery_time_slot: string;
  map_url: string | null;
}

export const useSiteSettings = () => {
const [settings, setSettings] = useState<SiteSettings>({
    show_seasonal_box: true,
    seasonal_box_title: 'Seasonal Vegetable Box',
    seasonal_box_description: 'A curated mix of 5-6 seasonal vegetables, perfect for a week\'s healthy cooking',
    seasonal_box_price: 299,
    seasonal_box_badge: 'Best Value',
    seasonal_box_button_text: 'Order Now',
    seasonal_box_button_link: null,
    order_days: ['tuesday', 'friday'],
    delivery_time_slot: '12:00 PM - 3:00 PM',
    map_url: 'https://maps.app.goo.gl/7yhfzXpd9DizTaNE7',
  });
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
          seasonal_box_title: data.seasonal_box_title,
          seasonal_box_description: data.seasonal_box_description,
          seasonal_box_price: data.seasonal_box_price,
          seasonal_box_badge: data.seasonal_box_badge,
          seasonal_box_button_text: data.seasonal_box_button_text,
          seasonal_box_button_link: data.seasonal_box_button_link,
          order_days: data.order_days,
          delivery_time_slot: data.delivery_time_slot,
          map_url: data.map_url,
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
