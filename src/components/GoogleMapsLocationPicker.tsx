import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Navigation, Search, Loader2, Save } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

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

interface NominatimAddress {
  display_name?: string;
  address?: {
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    postcode?: string;
  };
}

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const fetchWithTimeout = async (url: string, timeoutMs = 10000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("Request failed");
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
};

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

const GoogleMapsLocationPicker = ({
  open,
  onClose,
  onLocationSelect,
  initialLat,
  initialLng,
}: GoogleMapsLocationPickerProps) => {
  const { toast } = useToast();
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const startPosition = useMemo(
    () => ({ lat: initialLat || STORE_LOCATION.lat, lng: initialLng || STORE_LOCATION.lng }),
    [initialLat, initialLng]
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [position, setPosition] = useState(startPosition);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [isOutOfRange, setIsOutOfRange] = useState(false);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Editable address fields
  const [addressField, setAddressField] = useState("");
  const [cityField, setCityField] = useState("Nagpur");
  const [pincodeField, setPincodeField] = useState("");
  const [hasSelectedLocation, setHasSelectedLocation] = useState(false);

  const reverseGeocode = async (lat: number, lng: number) => {
    setIsResolvingLocation(true);
    try {
      const data = (await fetchWithTimeout(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`
      )) as NominatimAddress;

      const city =
        data.address?.city ||
        data.address?.town ||
        data.address?.village ||
        data.address?.county ||
        "";

      const pincode = data.address?.postcode?.replace(/\s/g, "") || "";
      
      // Build a cleaner address from parts
      const parts = [
        data.address?.road,
        data.address?.neighbourhood || data.address?.suburb,
        data.address?.city || data.address?.town || data.address?.village,
        data.address?.state,
      ].filter(Boolean);
      const address = parts.length > 0 ? parts.join(", ") : (data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);

      const dist = getDistanceKm(STORE_LOCATION.lat, STORE_LOCATION.lng, lat, lng);
      setDistanceKm(dist);
      setIsOutOfRange(dist > MAX_DELIVERY_RADIUS_KM);

      // Auto-fill editable fields
      setAddressField(address);
      if (city) setCityField(city);
      if (pincode) setPincodeField(pincode);
      setHasSelectedLocation(true);
    } catch {
      const dist = getDistanceKm(STORE_LOCATION.lat, STORE_LOCATION.lng, lat, lng);
      setDistanceKm(dist);
      setIsOutOfRange(dist > MAX_DELIVERY_RADIUS_KM);
      setAddressField(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      setHasSelectedLocation(true);
      toast({
        title: "Address lookup delayed",
        description: "Pin is set but address lookup failed. You can edit the address manually.",
        variant: "destructive",
      });
    } finally {
      setIsResolvingLocation(false);
    }
  };

  // Clean up map when dialog closes
  useEffect(() => {
    if (!open && mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      markerRef.current = null;
    }
  }, [open]);

  // Initialize map when dialog opens
  useEffect(() => {
    if (!open) return;

    setPosition(startPosition);
    setHasSelectedLocation(false);
    setAddressField("");
    setCityField("Nagpur");
    setPincodeField("");

    const initTimer = setTimeout(() => {
      if (!mapElementRef.current || mapRef.current) return;

      const map = L.map(mapElementRef.current, {
        center: [startPosition.lat, startPosition.lng],
        zoom: 15,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      L.circle([STORE_LOCATION.lat, STORE_LOCATION.lng], {
        radius: MAX_DELIVERY_RADIUS_KM * 1000,
        color: "hsl(var(--primary))",
        fillColor: "hsl(var(--primary))",
        fillOpacity: 0.08,
        weight: 1,
      }).addTo(map);

      const marker = L.marker([startPosition.lat, startPosition.lng], {
        draggable: true,
        icon: markerIcon,
      }).addTo(map);

      marker.on("dragend", () => {
        const next = marker.getLatLng();
        setPosition({ lat: next.lat, lng: next.lng });
      });

      map.on("click", (event: L.LeafletMouseEvent) => {
        setPosition({ lat: event.latlng.lat, lng: event.latlng.lng });
      });

      mapRef.current = map;
      markerRef.current = marker;

      map.invalidateSize();
      setTimeout(() => map.invalidateSize(), 100);
      setTimeout(() => map.invalidateSize(), 300);
      setTimeout(() => map.invalidateSize(), 600);
    }, 350);

    return () => {
      clearTimeout(initTimer);
    };
  }, [open, startPosition]);

  // Reverse geocode when position changes
  useEffect(() => {
    if (!open) return;
    reverseGeocode(position.lat, position.lng);

    if (mapRef.current && markerRef.current) {
      const nextPoint: L.LatLngExpression = [position.lat, position.lng];
      markerRef.current.setLatLng(nextPoint);
      mapRef.current.panTo(nextPoint);
    }
  }, [open, position]);

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    try {
      const data = (await fetchWithTimeout(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&countrycodes=in&limit=1&addressdetails=1`
      )) as Array<{ lat: string; lon: string }>;

      if (!data.length) {
        toast({ title: "Location not found", description: "Try a more specific area, street, or landmark.", variant: "destructive" });
        return;
      }

      setPosition({ lat: Number(data[0].lat), lng: Number(data[0].lon) });
    } catch {
      toast({ title: "Search failed", description: "Unable to search location right now.", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Not Supported", description: "Geolocation is not supported by your browser.", variant: "destructive" });
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (geo) => {
        setPosition({ lat: geo.coords.latitude, lng: geo.coords.longitude });
        setIsGettingLocation(false);
        if (mapRef.current) {
          mapRef.current.setZoom(17);
        }
      },
      (error) => {
        setIsGettingLocation(false);
        let message = "Unable to get your current location.";
        if (error.code === 1) message = "Location permission denied. Please allow location access.";
        else if (error.code === 2) message = "Location unavailable. Please try again.";
        else if (error.code === 3) message = "Location request timed out. Please try again.";
        toast({ title: "Location Error", description: message, variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const canSave = hasSelectedLocation && addressField.trim() && pincodeField.trim() && !isOutOfRange && !isResolvingLocation;

  const handleSave = () => {
    if (!canSave) return;

    onLocationSelect({
      address: addressField.trim(),
      city: cityField.trim() || "Nagpur",
      pincode: pincodeField.trim(),
      latitude: position.lat,
      longitude: position.lng,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Pick Delivery Location
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 space-y-3">
          {/* Search */}
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search area, street, landmark..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <Button type="button" variant="outline" onClick={handleSearch} disabled={isSearching}>
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
            </Button>
          </div>

          {/* Current Location Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleUseCurrentLocation}
            disabled={isGettingLocation}
            className="gap-2"
          >
            {isGettingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
            Use Current Location
          </Button>

          {/* Map */}
          <div className="relative">
            <div ref={mapElementRef} className="w-full h-[250px] sm:h-[300px] rounded-lg border border-border" />
            {isResolvingLocation && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/70 rounded-lg">
                <Loader2 className="w-7 h-7 animate-spin text-primary" />
              </div>
            )}
          </div>

          {/* Distance info */}
          {distanceKm !== null && (
            <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
              isOutOfRange ? "bg-destructive/10 border-destructive/30 text-destructive" : "bg-primary/5 border-primary/20 text-primary"
            }`}>
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{distanceKm.toFixed(1)} km from farm</span>
              {isOutOfRange && <span className="font-medium ml-1">— Delivery not available (max {MAX_DELIVERY_RADIUS_KM} km)</span>}
            </div>
          )}

          {/* Editable Address Fields */}
          {hasSelectedLocation && (
            <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Delivery Address Details</p>
              
              <div className="space-y-2">
                <div>
                  <Label htmlFor="loc-address" className="text-xs">Address / Street *</Label>
                  <Input
                    id="loc-address"
                    value={addressField}
                    onChange={(e) => setAddressField(e.target.value)}
                    placeholder="Enter full address"
                    className="mt-1 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="loc-city" className="text-xs">City</Label>
                    <Input
                      id="loc-city"
                      value={cityField}
                      onChange={(e) => setCityField(e.target.value)}
                      placeholder="City"
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="loc-pincode" className="text-xs">Pincode *</Label>
                    <Input
                      id="loc-pincode"
                      value={pincodeField}
                      onChange={(e) => setPincodeField(e.target.value)}
                      placeholder="Pincode"
                      className="mt-1 text-sm"
                      maxLength={6}
                    />
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">
                📍 Lat: {position.lat.toFixed(5)}, Lng: {position.lng.toFixed(5)}
              </p>
            </div>
          )}
        </div>

        {/* Footer with Cancel / Save */}
        <DialogFooter className="p-4 pt-3 border-t border-border gap-2 sm:gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1 gap-2" onClick={handleSave} disabled={!canSave}>
            <Save className="w-4 h-4" />
            Save Address
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GoogleMapsLocationPicker;
