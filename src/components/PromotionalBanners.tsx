import { useState } from "react";
import { usePromotionalBanners, PromotionalBanner } from "@/hooks/usePromotionalBanners";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Sparkles } from "lucide-react";
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
      <section className="py-10 md:py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
              <Sparkles className="w-7 h-7 text-primary" />
              Coming Soon
              <Sparkles className="w-7 h-7 text-primary" />
            </h2>
            <p className="text-muted-foreground text-lg">Fresh arrivals you don't want to miss!</p>
          </div>

          <div className="space-y-8">
            {banners.map((banner) => (
              <div
                key={banner.id}
                className="relative rounded-3xl overflow-hidden shadow-xl border border-border group"
              >
                {/* Background gradient layer */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(135deg, ${banner.background_color || '#FEF3C7'} 0%, ${banner.background_color || '#FEF3C7'}88 50%, ${banner.background_color || '#FEF3C7'}44 100%)`,
                  }}
                />
                {/* Decorative circles */}
                <div
                  className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-20"
                  style={{ backgroundColor: banner.text_color || '#92400E' }}
                />
                <div
                  className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full opacity-10"
                  style={{ backgroundColor: banner.text_color || '#92400E' }}
                />

                <div className="relative flex flex-col md:flex-row items-center gap-6 md:gap-10 p-6 md:p-12">
                  {/* Text content */}
                  <div className="flex-1 text-center md:text-left z-10">
                    {banner.badge_text && (
                      <Badge
                        className="mb-4 text-sm px-4 py-1.5 font-semibold tracking-wide uppercase animate-pulse"
                        style={{
                          backgroundColor: banner.text_color || '#92400E',
                          color: '#fff',
                        }}
                      >
                        ✨ {banner.badge_text}
                      </Badge>
                    )}
                    <h3
                      className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold mb-3 leading-tight"
                      style={{ color: banner.text_color || '#92400E' }}
                    >
                      {banner.title}
                    </h3>
                    {banner.subtitle && (
                      <p
                        className="text-xl md:text-2xl font-semibold mb-3"
                        style={{ color: `${banner.text_color || '#92400E'}cc` }}
                      >
                        {banner.subtitle}
                      </p>
                    )}
                    {banner.description && (
                      <p
                        className="mb-8 max-w-lg text-base md:text-lg leading-relaxed"
                        style={{ color: `${banner.text_color || '#92400E'}99` }}
                      >
                        {banner.description}
                      </p>
                    )}
                    <Button
                      size="lg"
                      className="font-bold text-base px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                      style={{
                        backgroundColor: banner.text_color || '#92400E',
                        color: '#fff',
                      }}
                      onClick={() => handlePreOrder(banner)}
                    >
                      <ShoppingBag className="w-5 h-5 mr-2" />
                      {banner.cta_text || 'Pre-Order Now'}
                    </Button>
                  </div>

                  {/* Image */}
                  {banner.image_url && (
                    <div className="w-48 h-48 md:w-64 md:h-64 lg:w-72 lg:h-72 rounded-3xl overflow-hidden flex-shrink-0 shadow-2xl ring-4 ring-white/30 group-hover:scale-105 transition-transform duration-500 z-10">
                      <img
                        src={banner.image_url}
                        alt={banner.product_name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Fallback emoji display when no image */}
                  {!banner.image_url && (
                    <div
                      className="w-48 h-48 md:w-64 md:h-64 rounded-3xl flex items-center justify-center text-8xl md:text-9xl flex-shrink-0 shadow-2xl ring-4 ring-white/30 z-10"
                      style={{ backgroundColor: `${banner.text_color || '#92400E'}15` }}
                    >
                      🍉
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
          paymentRequired={selectedBanner.payment_required}
        />
      )}
    </>
  );
};

export default PromotionalBanners;
