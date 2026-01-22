import { useState, useEffect, useCallback, useRef } from "react";
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

export interface DeliveryCalculationResult {
  distanceKm: number;
  deliveryCharge: number;
  durationMinutes?: number;
  deliveryUnavailable: boolean;
  error?: string;
  coordinates?: { lat: number; lng: number };
  ratePerKm?: number;
}

// Store address coordinates: 105, Gali no 3, Wakekar layout, Ambika nagar, Ayodhyanagar, Nagpur, 440024
const STORE_LOCATION = {
  lat: 21.1458,
  lng: 79.0882,
  pincode: "440024",
};

// In-memory cache for delivery calculations
const deliveryCache = new Map<string, { result: DeliveryCalculationResult; timestamp: number }>();
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export const useDeliveryZones = () => {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [ratePerKm, setRatePerKm] = useState(10);
  const pendingRequests = useRef<Map<string, Promise<DeliveryCalculationResult>>>(new Map());

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

  // Check cache for valid result
  const getCachedResult = (pincode: string): DeliveryCalculationResult | null => {
    const cached = deliveryCache.get(pincode);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
      return cached.result;
    }
    // Clean up expired cache entry
    if (cached) {
      deliveryCache.delete(pincode);
    }
    return null;
  };

  // Save result to cache
  const setCachedResult = (pincode: string, result: DeliveryCalculationResult) => {
    deliveryCache.set(pincode, { result, timestamp: Date.now() });
    
    // Also persist to localStorage for session persistence
    try {
      const storageKey = `delivery_cache_${pincode}`;
      localStorage.setItem(storageKey, JSON.stringify({
        result,
        timestamp: Date.now(),
      }));
    } catch (e) {
      console.warn("Failed to save delivery cache to localStorage:", e);
    }
  };

  // Load from localStorage on first access
  const loadFromStorage = (pincode: string): DeliveryCalculationResult | null => {
    try {
      const storageKey = `delivery_cache_${pincode}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.timestamp < CACHE_DURATION_MS) {
          // Also populate in-memory cache
          deliveryCache.set(pincode, parsed);
          return parsed.result;
        } else {
          localStorage.removeItem(storageKey);
        }
      }
    } catch (e) {
      console.warn("Failed to load delivery cache from localStorage:", e);
    }
    return null;
  };

  // Calculate real delivery distance using edge function
  const calculateDeliveryDistance = useCallback(async (pincode: string): Promise<DeliveryCalculationResult> => {
    const cleanPincode = pincode.trim().replace(/\s/g, "");
    
    // Validate pincode format
    if (!/^\d{6}$/.test(cleanPincode)) {
      return {
        distanceKm: 0,
        deliveryCharge: 0,
        deliveryUnavailable: true,
        error: "Invalid pincode format. Please enter a valid 6-digit pincode.",
      };
    }

    // Check in-memory cache first
    const cachedResult = getCachedResult(cleanPincode);
    if (cachedResult) {
      console.log("Using cached delivery result for pincode:", cleanPincode);
      return cachedResult;
    }

    // Check localStorage cache
    const storedResult = loadFromStorage(cleanPincode);
    if (storedResult) {
      console.log("Using stored delivery result for pincode:", cleanPincode);
      return storedResult;
    }

    // Check if there's already a pending request for this pincode
    const pendingRequest = pendingRequests.current.get(cleanPincode);
    if (pendingRequest) {
      console.log("Waiting for pending request for pincode:", cleanPincode);
      return pendingRequest;
    }

    // Create new request
    const requestPromise = (async (): Promise<DeliveryCalculationResult> => {
      setIsCalculating(true);
      
      try {
        console.log("Calculating delivery distance for pincode:", cleanPincode);
        
        const { data, error } = await supabase.functions.invoke("calculate-delivery-distance", {
          body: { pincode: cleanPincode },
        });

        if (error) {
          console.error("Edge function error:", error);
          return {
            distanceKm: 0,
            deliveryCharge: 0,
            deliveryUnavailable: true,
            error: "Failed to calculate delivery distance. Please try again.",
          };
        }

        if (data.deliveryUnavailable) {
          const result: DeliveryCalculationResult = {
            distanceKm: data.distanceKm || 0,
            deliveryCharge: 0,
            deliveryUnavailable: true,
            error: data.error || "Delivery not available for this location.",
          };
          // Cache negative results too to avoid repeated API calls
          setCachedResult(cleanPincode, result);
          return result;
        }

        const result: DeliveryCalculationResult = {
          distanceKm: data.distanceKm,
          deliveryCharge: data.deliveryCharge,
          durationMinutes: data.durationMinutes,
          deliveryUnavailable: false,
          coordinates: data.coordinates,
          ratePerKm: data.ratePerKm,
        };

        // Update rate from server
        if (data.ratePerKm) {
          setRatePerKm(data.ratePerKm);
        }

        // Cache successful result
        setCachedResult(cleanPincode, result);
        
        return result;
      } catch (error) {
        console.error("Error calculating delivery distance:", error);
        return {
          distanceKm: 0,
          deliveryCharge: 0,
          deliveryUnavailable: true,
          error: "Network error. Please check your connection and try again.",
        };
      } finally {
        setIsCalculating(false);
        pendingRequests.current.delete(cleanPincode);
      }
    })();

    // Store the pending request
    pendingRequests.current.set(cleanPincode, requestPromise);
    
    return requestPromise;
  }, []);

  // Legacy methods for backward compatibility (now deprecated)
  const getDistanceByPincode = (pincode: string): number => {
    console.warn("getDistanceByPincode is deprecated. Use calculateDeliveryDistance instead.");
    const cached = getCachedResult(pincode) || loadFromStorage(pincode);
    return cached?.distanceKm || 0;
  };

  const getDeliveryCharge = (distanceKm: number): number => {
    return distanceKm * ratePerKm;
  };

  const getZoneByPincode = (pincode: string): DeliveryZone | null => {
    const cached = getCachedResult(pincode) || loadFromStorage(pincode);
    if (!cached) return null;
    
    const distance = cached.distanceKm;
    const zone = zones.find(
      (z) => distance >= z.min_distance_km && distance < z.max_distance_km
    );
    return zone || zones[zones.length - 1] || null;
  };

  const getDeliveryChargeByPincode = (pincode: string): number => {
    console.warn("getDeliveryChargeByPincode is deprecated. Use calculateDeliveryDistance instead.");
    const cached = getCachedResult(pincode) || loadFromStorage(pincode);
    if (cached) {
      return cached.deliveryCharge;
    }
    return 0;
  };

  const getDeliveryInfo = (pincode: string): { distance: number; charge: number } => {
    console.warn("getDeliveryInfo is deprecated. Use calculateDeliveryDistance instead.");
    const cached = getCachedResult(pincode) || loadFromStorage(pincode);
    if (cached) {
      return { distance: cached.distanceKm, charge: cached.deliveryCharge };
    }
    return { distance: 0, charge: 0 };
  };

  // Clear cache for a specific pincode or all
  const clearCache = (pincode?: string) => {
    if (pincode) {
      deliveryCache.delete(pincode);
      try {
        localStorage.removeItem(`delivery_cache_${pincode}`);
      } catch (e) {
        console.warn("Failed to clear localStorage cache:", e);
      }
    } else {
      deliveryCache.clear();
      try {
        // Clear all delivery cache entries from localStorage
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith("delivery_cache_")) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.warn("Failed to clear localStorage cache:", e);
      }
    }
  };

  return {
    zones,
    isLoading,
    isCalculating,
    calculateDeliveryDistance,
    // Legacy methods (deprecated but kept for compatibility)
    getDeliveryCharge,
    getZoneByPincode,
    getDeliveryChargeByPincode,
    getDistanceByPincode,
    getDeliveryInfo,
    clearCache,
    refetch: fetchZones,
    storeLocation: STORE_LOCATION,
    ratePerKm,
  };
};
