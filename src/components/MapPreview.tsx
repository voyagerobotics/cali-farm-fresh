import { MapPin, ExternalLink } from "lucide-react";

interface MapPreviewProps {
  latitude: number;
  longitude: number;
  address?: string;
  compact?: boolean;
}

const MapPreview = ({ latitude, longitude, address, compact = false }: MapPreviewProps) => {
  const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
  const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=16&size=${compact ? "200x120" : "400x200"}&markers=color:red%7C${latitude},${longitude}&key=AIzaSyBAn94LD3foYF1Tc788LqZiNtKJn7TKGbw`;

  return (
    <div className={`rounded-lg border border-border overflow-hidden ${compact ? "inline-block" : ""}`}>
      <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="block relative group">
        <img
          src={staticMapUrl}
          alt="Delivery location map"
          className={`w-full object-cover ${compact ? "h-[80px]" : "h-[140px]"}`}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            Open in Google Maps
          </span>
        </div>
      </a>
      {address && !compact && (
        <div className="p-2 bg-muted/50">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{address}</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default MapPreview;
