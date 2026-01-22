import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Store location: 105, Galli No. 3, Wakekar Layout, Ambekar Nagar, Ayodhya Nagar, Nagpur - 440024
// Coordinates: 21.114435, 79.110042
const STORE_COORDINATES = {
  lat: 21.114435,
  lng: 79.110042,
};

interface GeocodingResult {
  lat: number;
  lng: number;
}

interface DistanceResult {
  distanceKm: number;
  durationMinutes: number;
}

// Geocode pincode using Nominatim (OpenStreetMap)
async function geocodePincode(pincode: string): Promise<GeocodingResult | null> {
  try {
    // Search for Indian pincode
    const query = `${pincode}, India`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=in`;
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "DeliveryApp/1.0",
      },
    });

    if (!response.ok) {
      console.error("Nominatim API error:", response.status);
      return null;
    }

    const data = await response.json();
    
    if (!data || data.length === 0) {
      console.error("No geocoding results for pincode:", pincode);
      return null;
    }

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    };
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

// Calculate driving distance using OSRM (Open Source Routing Machine)
async function calculateDrivingDistance(
  storeLat: number,
  storeLng: number,
  destLat: number,
  destLng: number
): Promise<DistanceResult | null> {
  try {
    // OSRM expects coordinates as lng,lat
    const url = `https://router.project-osrm.org/route/v1/driving/${storeLng},${storeLat};${destLng},${destLat}?overview=false`;
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "DeliveryApp/1.0",
      },
    });

    if (!response.ok) {
      console.error("OSRM API error:", response.status);
      return null;
    }

    const data = await response.json();
    
    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      console.error("No route found:", data.code);
      return null;
    }

    const route = data.routes[0];
    return {
      distanceKm: route.distance / 1000, // Convert meters to km
      durationMinutes: route.duration / 60, // Convert seconds to minutes
    };
  } catch (error) {
    console.error("Distance calculation error:", error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pincode } = await req.json();

    if (!pincode || typeof pincode !== "string") {
      return new Response(
        JSON.stringify({ error: "Pincode is required", deliveryUnavailable: true }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean pincode
    const cleanPincode = pincode.trim().replace(/\s/g, "");
    
    // Validate Indian pincode format (6 digits)
    if (!/^\d{6}$/.test(cleanPincode)) {
      return new Response(
        JSON.stringify({ error: "Invalid pincode format", deliveryUnavailable: true }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Calculating delivery distance for pincode:", cleanPincode);

    // Step 1: Geocode the customer pincode
    const customerCoords = await geocodePincode(cleanPincode);
    
    if (!customerCoords) {
      console.error("Failed to geocode pincode:", cleanPincode);
      return new Response(
        JSON.stringify({ 
          error: "Could not locate pincode. Delivery unavailable for this area.", 
          deliveryUnavailable: true 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Customer coordinates:", customerCoords);

    // Step 2: Calculate driving distance
    const distanceResult = await calculateDrivingDistance(
      STORE_COORDINATES.lat,
      STORE_COORDINATES.lng,
      customerCoords.lat,
      customerCoords.lng
    );

    if (!distanceResult) {
      console.error("Failed to calculate distance for pincode:", cleanPincode);
      return new Response(
        JSON.stringify({ 
          error: "Could not calculate delivery route. Delivery unavailable for this area.", 
          deliveryUnavailable: true 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Distance result:", distanceResult);

    // Step 3: Calculate delivery charge (₹10 per km)
    const RATE_PER_KM = 10;
    const distanceKm = Math.round(distanceResult.distanceKm * 10) / 10; // Round to 1 decimal
    const deliveryCharge = Math.round(distanceKm * RATE_PER_KM);

    // Check if distance is within serviceable range (e.g., max 50 km)
    const MAX_DELIVERY_DISTANCE_KM = 50;
    if (distanceKm > MAX_DELIVERY_DISTANCE_KM) {
      return new Response(
        JSON.stringify({ 
          error: `Delivery not available beyond ${MAX_DELIVERY_DISTANCE_KM} km. Your location is ${distanceKm} km away.`, 
          deliveryUnavailable: true,
          distanceKm,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Free delivery for same pincode as store
    const STORE_PINCODE = "440024";
    const finalCharge = cleanPincode === STORE_PINCODE ? 0 : deliveryCharge;

    return new Response(
      JSON.stringify({
        success: true,
        pincode: cleanPincode,
        distanceKm,
        durationMinutes: Math.round(distanceResult.durationMinutes),
        deliveryCharge: finalCharge,
        deliveryUnavailable: false,
        coordinates: customerCoords,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in calculate-delivery-distance:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to calculate delivery distance", 
        deliveryUnavailable: true 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
