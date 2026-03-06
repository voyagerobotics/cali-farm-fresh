import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Navigation, Search, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const GOOGLE_MAPS_API_KEY = "AIzaSyBAn94LD3foYF1Tc788LqZiNtKJn7TKGbw";

// Store location (California Farms India, Nagpur)
const STORE_LOCATION = { lat: 21.1458, lng: 79.0882 };
const MAX_DELIVERY_RADIUS_KM = 10;

interface LocationData {
  address: string;
  city: string;
  pincode: string;
  latitude: number;
  longitude: number;
}

interface GoogleMapsLocationPickerProps {
  open: boolean;
  onClose: () => void;
  onLocationSelect: (data: LocationData) => void;
  initialLat?: number;
  initialLng?: number;
}

// Calculate distance between two coordinates using Haversine formula
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Load Google Maps script
let googleMapsLoaded = false;
let googleMapsLoadPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (googleMapsLoaded && window.google?.maps) return Promise.resolve();
  if (googleMapsLoadPromise) return googleMapsLoadPromise;

  googleMapsLoadPromise = new Promise((resolve, reject) => {
    if (window.google?.maps) {
      googleMapsLoaded = true;
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      googleMapsLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });

  return googleMapsLoadPromise;
}

declare global {
  interface Window {
    google: any;
  }
}

const GoogleMapsLocationPicker = ({
  open,
  onClose,
  onLocationSelect,
  initialLat,
  initialLng,
}: GoogleMapsLocationPickerProps) => {
  const { toast } = useToast();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const autocompleteRef = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [isOutOfRange, setIsOutOfRange] = useState(false);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    const geocoder = new window.google.maps.Geocoder();
    const result = await new Promise<any>((resolve) => {
      geocoder.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
        resolve(status === "OK" && results[0] ? results[0] : null);
      });
    });

    if (!result) return null;

    let address = result.formatted_address || "";
    let city = "";
    let pincode = "";

    for (const component of result.address_components) {
      const types = component.types;
      if (types.includes("locality")) city = component.long_name;
      if (types.includes("postal_code")) pincode = component.long_name;
    }

    const dist = getDistanceKm(STORE_LOCATION.lat, STORE_LOCATION.lng, lat, lng);
    setDistanceKm(dist);
    setIsOutOfRange(dist > MAX_DELIVERY_RADIUS_KM);

    const locationData: LocationData = { address, city, pincode, latitude: lat, longitude: lng };
    setSelectedLocation(locationData);
    return locationData;
  }, []);

  const updateMarkerPosition = useCallback(
    (lat: number, lng: number) => {
      if (markerRef.current) {
        markerRef.current.setPosition({ lat, lng });
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo({ lat, lng });
      }
      reverseGeocode(lat, lng);
    },
    [reverseGeocode]
  );

  // Initialize map
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const initMap = async () => {
      try {
        await loadGoogleMaps();
        if (cancelled || !mapRef.current) return;

        const center = {
          lat: initialLat || STORE_LOCATION.lat,
          lng: initialLng || STORE_LOCATION.lng,
        };

        const map = new window.google.maps.Map(mapRef.current, {
          center,
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
        });

        const marker = new window.google.maps.Marker({
          position: center,
          map,
          draggable: true,
          animation: window.google.maps.Animation.DROP,
          icon: {
            url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
          },
        });

        // Draw delivery radius circle
        new window.google.maps.Circle({
          map,
          center: STORE_LOCATION,
          radius: MAX_DELIVERY_RADIUS_KM * 1000,
          fillColor: "#3d7a47",
          fillOpacity: 0.08,
          strokeColor: "#3d7a47",
          strokeOpacity: 0.3,
          strokeWeight: 1,
        });

        marker.addListener("dragend", () => {
          const pos = marker.getPosition();
          if (pos) {
            reverseGeocode(pos.lat(), pos.lng());
          }
        });

        map.addListener("click", (e: any) => {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          marker.setPosition({ lat, lng });
          reverseGeocode(lat, lng);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;

        // Setup autocomplete
        if (searchInputRef.current) {
          const autocomplete = new window.google.maps.places.Autocomplete(
            searchInputRef.current,
            {
              componentRestrictions: { country: "in" },
              fields: ["geometry", "formatted_address", "address_components"],
            }
          );

          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            if (place.geometry?.location) {
              const lat = place.geometry.location.lat();
              const lng = place.geometry.location.lng();
              map.setCenter({ lat, lng });
              map.setZoom(17);
              marker.setPosition({ lat, lng });
              reverseGeocode(lat, lng);
            }
          });

          autocompleteRef.current = autocomplete;
        }

        // Reverse geocode initial position
        reverseGeocode(center.lat, center.lng);
        setIsLoading(false);
      } catch (error) {
        console.error("Error initializing map:", error);
        toast({
          title: "Map Error",
          description: "Failed to load Google Maps. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    };

    initMap();

    return () => {
      cancelled = true;
    };
  }, [open, initialLat, initialLng, reverseGeocode, toast]);

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Not Supported",
        description: "Geolocation is not supported by your browser.",
        variant: "destructive",
      });
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        updateMarkerPosition(latitude, longitude);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setZoom(17);
        }
        setIsGettingLocation(false);
      },
      (error) => {
        setIsGettingLocation(false);
        let message = "Unable to get your location.";
        if (error.code === 1) message = "Location permission denied. Please allow location access.";
        else if (error.code === 2) message = "Location unavailable. Please try again.";
        else if (error.code === 3) message = "Location request timed out. Please try again.";
        toast({ title: "Location Error", description: message, variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleConfirm = () => {
    if (!selectedLocation) {
      toast({ title: "Select a location", description: "Please pick a location on the map.", variant: "destructive" });
      return;
    }
    if (isOutOfRange) {
      toast({
        title: "Delivery Unavailable",
        description: `Sorry, delivery is not available in this area. You are ${distanceKm?.toFixed(1)} km from our farm (max ${MAX_DELIVERY_RADIUS_KM} km).`,
        variant: "destructive",
      });
      return;
    }
    onLocationSelect(selectedLocation);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Pick Delivery Location
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search for your area, street name..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleUseCurrentLocation}
              disabled={isGettingLocation}
              className="gap-2"
            >
              {isGettingLocation ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Navigation className="w-4 h-4" />
              )}
              Use Current Location
            </Button>
          </div>
        </div>

        {/* Map Container */}
        <div className="relative mx-4">
          <div
            ref={mapRef}
            className="w-full h-[300px] sm:h-[350px] rounded-lg border border-border"
          />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/80 rounded-lg">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
        </div>

        {/* Selected Location Info */}
        <div className="px-4 pb-4 space-y-3">
          {selectedLocation && (
            <div
              className={`p-3 rounded-lg border ${
                isOutOfRange
                  ? "bg-destructive/10 border-destructive/30"
                  : "bg-primary/5 border-primary/20"
              }`}
            >
              <div className="flex items-start gap-2">
                <MapPin className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isOutOfRange ? "text-destructive" : "text-primary"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedLocation.address}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedLocation.city && `${selectedLocation.city} • `}
                    {selectedLocation.pincode && `PIN: ${selectedLocation.pincode} • `}
                    {distanceKm !== null && `${distanceKm.toFixed(1)} km from farm`}
                  </p>
                  {isOutOfRange && (
                    <p className="text-xs text-destructive font-medium mt-1">
                      ⚠️ Sorry, delivery is not available in this area (max {MAX_DELIVERY_RADIUS_KM} km).
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirm}
              disabled={!selectedLocation || isOutOfRange}
            >
              <MapPin className="w-4 h-4 mr-2" />
              Confirm Location
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoogleMapsLocationPicker;
