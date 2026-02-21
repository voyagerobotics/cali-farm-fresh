import { useState } from "react";
import { usePromotionalBanners, PromotionalBanner } from "@/hooks/usePromotionalBanners";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag } from "lucide-react";
import PreOrderDialog from "./PreOrderDialog";

const PromotionalBanners = () => {
  const { banners, isLoading } = usePromotionalBanners(true);
  const [preOrderOpen, setPreOrderOpen] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState<PromotionalBanner | null>(null);

  if (isLoading || banners.length === 0) return null;

  const handlePreOrder = (banner: PromotionalBanner) => {
    setSelectedBanner(banner);
    setPreOrderOpen(true);
  };

  return (
    <>
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="space-y-6">
            {banners.map((banner) => (
              <div
                key={banner.id}
                className="relative rounded-2xl overflow-hidden shadow-lg border border-border"
                style={{
                  background: `linear-gradient(135deg, ${banner.background_color || '#FEF3C7'}, ${banner.background_color || '#FEF3C7'}dd)`,
                }}
              >
                <div className="flex flex-col md:flex-row items-center gap-6 p-6 md:p-10">
                  {/* Text content */}
                  <div className="flex-1 text-center md:text-left">
                    {banner.badge_text && (
                      <Badge
                        className="mb-3 text-sm px-3 py-1"
                        style={{
                          backgroundColor: banner.text_color || '#92400E',
                          color: '#fff',
                        }}
                      >
                        {banner.badge_text}
                      </Badge>
                    )}
                    <h3
                      className="font-heading text-2xl md:text-3xl font-bold mb-2"
                      style={{ color: banner.text_color || '#92400E' }}
                    >
                      {banner.title}
                    </h3>
                    {banner.subtitle && (
                      <p
                        className="text-lg font-medium mb-2"
                        style={{ color: `${banner.text_color || '#92400E'}cc` }}
                      >
                        {banner.subtitle}
                      </p>
                    )}
                    {banner.description && (
                      <p
                        className="mb-6 max-w-lg"
                        style={{ color: `${banner.text_color || '#92400E'}99` }}
                      >
                        {banner.description}
                      </p>
                    )}
                    <Button
                      size="lg"
                      className="font-semibold"
                      style={{
                        backgroundColor: banner.text_color || '#92400E',
                        color: '#fff',
                      }}
                      onClick={() => handlePreOrder(banner)}
                    >
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      {banner.cta_text || 'Pre-Order Now'}
                    </Button>
                  </div>

                  {/* Image */}
                  {banner.image_url && (
                    <div className="w-40 h-40 md:w-52 md:h-52 rounded-2xl overflow-hidden flex-shrink-0">
                      <img
                        src={banner.image_url}
                        alt={banner.product_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {selectedBanner && (
        <PreOrderDialog
          open={preOrderOpen}
          onOpenChange={setPreOrderOpen}
          productName={selectedBanner.product_name}
          bannerId={selectedBanner.id}
        />
      )}
    </>
  );
};

export default PromotionalBanners;
