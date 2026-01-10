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

// Store address coordinates: 105, Gali no 3, Wakekar layout, Ambika nagar, Ayodhyanagar, Nagpur, 440024
const STORE_LOCATION = {
  lat: 21.1458,
  lng: 79.0882,
  pincode: "440024",
};

// Approximate distance from store pincode (in km) for Nagpur pincodes
const PINCODE_DISTANCES: Record<string, number> = {
  "440024": 0, // Store location
  "440022": 2,
  "440023": 3,
  "440025": 2,
  "440027": 4,
  "440033": 5,
  "440034": 6,
  "440035": 7,
  "440001": 8,
  "440002": 9,
  "440003": 10,
  "440004": 11,
  "440005": 12,
  "440006": 13,
  "440007": 14,
  "440008": 15,
  "440009": 16,
  "440010": 17,
  "440011": 8,
  "440012": 9,
  "440013": 10,
  "440014": 11,
  "440015": 12,
  "440016": 13,
  "440017": 14,
  "440018": 15,
  "440019": 16,
  "440020": 17,
  "440021": 6,
  "440026": 5,
  "440028": 6,
  "440029": 7,
  "440030": 8,
  "440031": 9,
  "440032": 10,
  "440036": 11,
  "440037": 12,
};

const RATE_PER_KM = 20; // ₹20 per km

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

  const getDistanceByPincode = (pincode: string): number => {
    // If pincode is in our mapping, use that distance
    if (PINCODE_DISTANCES[pincode] !== undefined) {
      return PINCODE_DISTANCES[pincode];
    }
    // Default to 15km for unknown pincodes
    return 15;
  };

  const getDeliveryCharge = (distanceKm: number): number => {
    // ₹20 per km
    return distanceKm * RATE_PER_KM;
  };

  const getZoneByPincode = (pincode: string): DeliveryZone | null => {
    const distance = getDistanceByPincode(pincode);
    const zone = zones.find(
      (z) => distance >= z.min_distance_km && distance < z.max_distance_km
    );
    return zone || zones[zones.length - 1] || null;
  };

  const getDeliveryChargeByPincode = (pincode: string): number => {
    const distance = getDistanceByPincode(pincode);
    // Free delivery for same pincode as store
    if (pincode === STORE_LOCATION.pincode) {
      return 0;
    }
    return getDeliveryCharge(distance);
  };

  const getDeliveryInfo = (pincode: string): { distance: number; charge: number } => {
    const distance = getDistanceByPincode(pincode);
    const charge = pincode === STORE_LOCATION.pincode ? 0 : getDeliveryCharge(distance);
    return { distance, charge };
  };

  return {
    zones,
    isLoading,
    getDeliveryCharge,
    getZoneByPincode,
    getDeliveryChargeByPincode,
    getDistanceByPincode,
    getDeliveryInfo,
    refetch: fetchZones,
    storeLocation: STORE_LOCATION,
    ratePerKm: RATE_PER_KM,
  };
};
