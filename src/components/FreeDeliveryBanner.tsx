import { Truck } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const FreeDeliveryBanner = () => {
  const { settings, isLoading } = useSiteSettings();

  if (isLoading) return null;

  const threshold = settings.free_delivery_threshold || 399;

  return (
    <div className="bg-primary text-primary-foreground py-2 px-4 text-center text-sm font-medium sticky top-0 z-[60]">
      <div className="container mx-auto flex items-center justify-center gap-2">
        <Truck className="w-4 h-4" />
        <span>🚚 Free Delivery on Orders Above ₹{threshold}</span>
      </div>
    </div>
  );
};

export default FreeDeliveryBanner;
