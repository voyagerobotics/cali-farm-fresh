import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DeliveryZone {
  id: string;
  zone_name: string;
  min_distance_km: number;
  max_distance_km: number;
  delivery_charge: number;
  is_active: boolean;
  created_at: string;
}

export const useDeliveryZones = () => {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchZones = async () => {
    try {
      const { data, error } = await supabase
        .from("delivery_zones")
        .select("*")
        .eq("is_active", true)
        .order("min_distance_km", { ascending: true });

      if (error) throw error;
      setZones(data || []);
    } catch (error) {
      console.error("Error fetching delivery zones:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  const getDeliveryCharge = (distanceKm: number): number => {
    const zone = zones.find(
      (z) => distanceKm >= z.min_distance_km && distanceKm < z.max_distance_km
    );
    return zone ? zone.delivery_charge : zones[zones.length - 1]?.delivery_charge || 0;
  };

  const getZoneByPincode = (pincode: string): DeliveryZone | null => {
    // Simple pincode-based zone mapping for Nagpur area
    // Zone A: Central Nagpur (440001-440010)
    // Zone B: Inner city (440011-440020)
    // Zone C: Outer city (440021-440030)
    // Zone D: Suburbs (440031-440040)
    // Zone E: Remote (other)
    const pincodeNum = parseInt(pincode);
    
    if (pincodeNum >= 440001 && pincodeNum <= 440010) {
      return zones.find(z => z.min_distance_km === 0) || null;
    } else if (pincodeNum >= 440011 && pincodeNum <= 440020) {
      return zones.find(z => z.min_distance_km === 3) || null;
    } else if (pincodeNum >= 440021 && pincodeNum <= 440030) {
      return zones.find(z => z.min_distance_km === 5) || null;
    } else if (pincodeNum >= 440031 && pincodeNum <= 440040) {
      return zones.find(z => z.min_distance_km === 10) || null;
    } else {
      return zones.find(z => z.min_distance_km === 15) || zones[zones.length - 1] || null;
    }
  };

  const getDeliveryChargeByPincode = (pincode: string): number => {
    const zone = getZoneByPincode(pincode);
    return zone?.delivery_charge || 0;
  };

  return {
    zones,
    isLoading,
    getDeliveryCharge,
    getZoneByPincode,
    getDeliveryChargeByPincode,
    refetch: fetchZones,
  };
};
