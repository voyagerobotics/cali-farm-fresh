import { useState, useMemo } from "react";
import { AlertCircle, Loader2, SlidersHorizontal } from "lucide-react";
import { useProducts, Product } from "@/hooks/useProducts";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { ProductVariant, calculateDiscountedPrice } from "@/hooks/useProductVariants";
import { useSiteSettings } from "@/hooks/useSiteSettings";

import CategorySidebar from "./products/CategorySidebar";
import MobileCategoryScroll from "./products/MobileCategoryScroll";
import ProductSearch from "./products/ProductSearch";
import ProductCard from "./products/ProductCard";
import { CATEGORIES } from "./products/CategoryData";

import vegetablesImage from "@/assets/vegetables-display.jpg";

const ProductsSection = () => {
  const { products, isLoading, error } = useProducts(false);
  const { addItem } = useCart();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { settings } = useSiteSettings();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter products based on category and search
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.category?.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    return filtered;
  }, [products, selectedCategory, searchQuery]);

  const handleAddToCart = (product: Product, quantity: number, variant?: ProductVariant) => {
    const stockQuantity = variant ? variant.stock_quantity : product.stock_quantity;
    const isAvailable = variant ? variant.is_available : product.is_available;
    
    if (!isAvailable || (stockQuantity !== null && stockQuantity <= 0)) {
      toast({
        title: "Out of Stock",
        description: `${product.name} is currently unavailable.`,
        variant: "destructive",
      });
      return;
    }

    // Calculate the price with discount
    const basePrice = variant ? variant.price : product.price;
    const { finalPrice } = calculateDiscountedPrice(
      basePrice,
      product.discount_type,
      product.discount_value,
      product.discount_enabled
    );

    // Add item multiple times based on quantity
    for (let i = 0; i < quantity; i++) {
      addItem({
        id: product.id,
        name: product.name,
        price: finalPrice,
        originalPrice: finalPrice < basePrice ? basePrice : undefined,
        unit: variant ? variant.name : `per ${product.unit}`,
        image_url: product.image_url ?? undefined,
        variantId: variant?.id,
        variantName: variant?.name,
      });
    }

    toast({
      title: "Added to Cart",
      description: `${quantity}x ${product.name}${variant ? ` (${variant.name})` : ""} added to your cart.`,
    });
  };

  const isOrderDay = () => {
    const day = new Date().getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDayName = dayNames[day];
    return settings.order_days.map(d => d.toLowerCase()).includes(currentDayName);
  };

  const getOrderDaysText = () => {
    const dayMap: Record<string, string> = {
      'sunday': 'Sunday', 'monday': 'Monday', 'tuesday': 'Tuesday',
      'wednesday': 'Wednesday', 'thursday': 'Thursday', 'friday': 'Friday', 'saturday': 'Saturday'
    };
    return settings.order_days.map(d => dayMap[d.toLowerCase()] || d).join(' & ');
  };

  const getCategoryName = () => {
    if (!selectedCategory) return "All Products";
    const category = CATEGORIES.find((c) => c.id === selectedCategory);
    return category?.name || "Products";
  };

  return (
    <section id="products" className="py-12 md:py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <p className="text-secondary font-semibold mb-2 tracking-wide uppercase text-sm">Our Produce</p>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Fresh From the Farm
          </h2>
          <p className="text-muted-foreground text-lg">
            Browse our selection of certified chemical free produce, harvested fresh daily from our farm in Ramgiri, Nagpur.
          </p>
        </div>

        {/* Order Day Notice */}
        <div className="max-w-2xl mx-auto mb-8">
          <div
            className={`p-4 rounded-2xl flex items-center gap-3 ${
              isOrderDay()
                ? "bg-primary/10 border-2 border-primary/30"
                : "bg-secondary/10 border-2 border-secondary/20"
            }`}
          >
            <AlertCircle
              className={`w-5 h-5 flex-shrink-0 ${isOrderDay() ? "text-primary" : "text-secondary"}`}
            />
            <div>
              <p className={`font-semibold ${isOrderDay() ? "text-primary" : "text-foreground"}`}>
                {isOrderDay() ? "🌿 Today is order day!" : `Orders on ${getOrderDaysText()} only`}
              </p>
              <p className="text-sm text-muted-foreground">
                Delivery: {settings.delivery_time_slot} • Fresh from farm within 3 hours
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex justify-center mb-8">
          <ProductSearch
            products={products}
            onSearch={setSearchQuery}
          />
        </div>

        {/* Mobile Category Scroll */}
        <div className="lg:hidden mb-6">
          <MobileCategoryScroll
            selectedCategory={selectedCategory}
            onSelectCategory={(cat) => {
              setSelectedCategory(cat);
              setSelectedSubcategory(null);
            }}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <CategorySidebar
              selectedCategory={selectedCategory}
              selectedSubcategory={selectedSubcategory}
              onSelectCategory={setSelectedCategory}
              onSelectSubcategory={setSelectedSubcategory}
            />
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            {/* Results header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-heading text-xl font-bold text-foreground">
                  {getCategoryName()}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""} available
                </p>
              </div>

              {/* Mobile Filter Button */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden">
                    <SlidersHorizontal className="w-4 h-4 mr-2" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  <div className="p-4">
                    <CategorySidebar
                      selectedCategory={selectedCategory}
                      selectedSubcategory={selectedSubcategory}
                      onSelectCategory={setSelectedCategory}
                      onSelectSubcategory={setSelectedSubcategory}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                <span className="text-muted-foreground font-medium">Loading fresh produce...</span>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="text-center py-16 bg-destructive/5 rounded-2xl border border-destructive/20">
                <p className="text-destructive font-medium">Failed to load products. Please try again.</p>
              </div>
            )}

            {/* Product Grid */}
            {!isLoading && !error && (
              <>
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-16 bg-muted/30 rounded-2xl">
                    <p className="text-muted-foreground text-lg mb-2">No products found</p>
                    <p className="text-sm text-muted-foreground">
                      Try adjusting your search or browse all categories
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        setSelectedCategory(null);
                        setSearchQuery("");
                      }}
                    >
                      View All Products
                    </Button>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onAddToCart={handleAddToCart}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Featured Box CTA - Conditionally rendered */}
        {settings.show_seasonal_box && (
          <div className="mt-16 relative rounded-3xl overflow-hidden shadow-elevated">
            <img
              src={vegetablesImage}
              alt="Fresh chemical free vegetables from California Farms India"
              className="w-full h-[300px] md:h-[350px] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/60 to-transparent" />
            <div className="absolute inset-0 flex items-center">
              <div className="p-8 md:p-12 max-w-xl">
                <span className="inline-block bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm font-semibold mb-4">
                  {settings.seasonal_box_badge}
                </span>
                <h3 className="font-heading text-3xl md:text-4xl font-bold text-background mb-3">
                  {settings.seasonal_box_title}
                </h3>
                <p className="text-background/80 mb-6 text-lg">
                  {settings.seasonal_box_description}
                </p>
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-3xl font-bold text-background">₹{settings.seasonal_box_price}</span>
                  <span className="text-background/70">per box</span>
                </div>
                <Button size="lg" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold">
                  {settings.seasonal_box_button_text}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4 text-lg">
            Want something specific? We're happy to help!
          </p>
          <Button
            size="lg"
            variant="outline"
            className="font-semibold"
            onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
          >
            Contact Us for Custom Orders
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ProductsSection;
