import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FarmVisitSettings {
  farm_visit_enabled: boolean;
  farm_visit_period: string;
  farm_visit_hours: string;
  farm_visit_days: string;
  farm_visit_max_primary: number;
  farm_visit_max_secondary: number;
  farm_visit_max_college: number;
  farm_visit_price_school: number;
  farm_visit_price_college: number;
  farm_visit_notes: string | null;
}

const DEFAULTS: FarmVisitSettings = {
  farm_visit_enabled: true,
  farm_visit_period: "15 July to 15 February",
  farm_visit_hours: "8:00 AM to 11:00 AM",
  farm_visit_days: "Monday to Friday",
  farm_visit_max_primary: 50,
  farm_visit_max_secondary: 100,
  farm_visit_max_college: 200,
  farm_visit_price_school: 50,
  farm_visit_price_college: 100,
  farm_visit_notes: null,
};

export const useFarmVisitSettings = () => {
  const [settings, setSettings] = useState<FarmVisitSettings>(DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select(
          "farm_visit_enabled, farm_visit_period, farm_visit_hours, farm_visit_days, farm_visit_max_primary, farm_visit_max_secondary, farm_visit_max_college, farm_visit_price_school, farm_visit_price_college, farm_visit_notes",
        )
        .eq("id", "default")
        .single();
      if (!error && data) setSettings({ ...DEFAULTS, ...(data as any) });
    } catch (e) {
      console.error("farm visit settings fetch failed", e);
    } finally {
      setIsLoading(false);
    }
  };

  const update = async (patch: Partial<FarmVisitSettings>) => {
    const { error } = await supabase
      .from("site_settings")
      .update(patch as any)
      .eq("id", "default");
    if (error) return false;
    setSettings((p) => ({ ...p, ...patch }));
    return true;
  };

  useEffect(() => {
    fetch();
  }, []);

  return { settings, isLoading, update, refetch: fetch };
};
