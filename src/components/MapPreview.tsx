import { MapPin, ExternalLink } from "lucide-react";

interface MapPreviewProps {
  latitude: number;
  longitude: number;
  address?: string;
  compact?: boolean;
}

const buildOsmEmbedUrl = (latitude: number, longitude: number) => {
  const delta = 0.006;
  const left = longitude - delta;
  const right = longitude + delta;
  const top = latitude + delta;
  const bottom = latitude - delta;

  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${latitude}%2C${longitude}`;
};

const MapPreview = ({ latitude, longitude, address, compact = false }: MapPreviewProps) => {
  const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
  const embedUrl = buildOsmEmbedUrl(latitude, longitude);

  return (
    <div className={`rounded-lg border border-border overflow-hidden ${compact ? "inline-block" : ""}`}>
      <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="block relative group">
        <iframe
          src={embedUrl}
          title="Delivery location map"
          className={`w-full border-0 pointer-events-none ${compact ? "h-[80px]" : "h-[140px]"}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors flex items-center justify-center">
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
