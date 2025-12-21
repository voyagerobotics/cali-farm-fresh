import { ShoppingCart, AlertCircle, Loader2, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/hooks/useProducts";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import vegetablesImage from "@/assets/vegetables-display.jpg";

const ProductsSection = () => {
  const { products, isLoading, error } = useProducts(false);
  const { addItem } = useCart();
  const { toast } = useToast();

  const handleAddToCart = (product: any) => {
    if (!product.is_available || (product.stock_quantity !== null && product.stock_quantity <= 0)) {
      toast({
        title: "Out of Stock",
        description: `${product.name} is currently unavailable.`,
        variant: "destructive",
      });
      return;
    }

    addItem({
      id: product.id,
      name: product.name,
      price: parseFloat(product.price),
      unit: `per ${product.unit}`,
      image_url: product.image_url,
    });

    toast({
      title: "Added to Cart",
      description: `${product.name} has been added to your cart.`,
    });
  };

  const getStockStatus = (product: any) => {
    if (!product.is_available) return { label: "Out of Stock", color: "destructive" };
    if (product.stock_quantity === null) return null;
    if (product.stock_quantity <= 0) return { label: "Out of Stock", color: "destructive" };
    if (product.stock_quantity <= 5) return { label: `Only ${product.stock_quantity} left`, color: "warning" };
    return { label: "In Stock", color: "success" };
  };

  const getCategoryLabel = (category: string | null) => {
    const labels: Record<string, string> = {
      vegetables: "Vegetables",
      leafy: "Leafy Greens",
      fruits: "Fruits",
      herbs: "Herbs",
    };
    return labels[category || "vegetables"] || "Vegetables";
  };

  const isOrderDay = () => {
    const day = new Date().getDay();
    return day === 1 || day === 4; // Monday or Thursday
  };

  return (
    <section id="products" className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <p className="text-secondary font-medium mb-2">Our Produce</p>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
            Fresh From the Farm
          </h2>
          <p className="text-muted-foreground">
            Browse our selection of organic vegetables, harvested fresh daily from our farm in Ramgiri, Nagpur.
          </p>
        </div>

        {/* Order Day Notice */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className={`p-4 rounded-xl flex items-center gap-3 ${isOrderDay() ? 'bg-primary/10 border border-primary/20' : 'bg-secondary/10 border border-secondary/20'}`}>
            <AlertCircle className={`w-5 h-5 flex-shrink-0 ${isOrderDay() ? 'text-primary' : 'text-secondary'}`} />
            <div>
              <p className={`font-medium ${isOrderDay() ? 'text-primary' : 'text-foreground'}`}>
                {isOrderDay() ? "🌿 Today is order day!" : "Orders on Monday & Thursday only"}
              </p>
              <p className="text-sm text-muted-foreground">
                Delivery: 12 PM - 3 PM • Fresh from farm within 3 hours
              </p>
            </div>
          </div>
        </div>

        {/* Featured Image */}
        <div className="relative rounded-2xl overflow-hidden mb-12 shadow-elevated">
          <img
            src={vegetablesImage}
            alt="Fresh organic vegetables from California Farms India"
            className="w-full h-[300px] object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            <h3 className="font-heading text-2xl font-bold text-background mb-2">
              Seasonal Vegetable Box
            </h3>
            <p className="text-background/80 mb-4">
              A curated mix of 5-6 seasonal vegetables, perfect for a week's cooking
            </p>
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold text-background">₹299</span>
              <span className="text-background/70">per box</span>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading products...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-destructive">Failed to load products. Please try again.</p>
          </div>
        )}

        {/* Product Grid */}
        {!isLoading && !error && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {products.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">No products available at the moment.</p>
              </div>
            ) : (
              products.map((product) => {
                const stockStatus = getStockStatus(product);
                const isOutOfStock = !product.is_available || (product.stock_quantity !== null && product.stock_quantity <= 0);

                return (
                  <div
                    key={product.id}
                    className={`bg-card rounded-xl border border-border hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 ${isOutOfStock ? 'opacity-70' : ''}`}
                  >
                    <Link to={`/product/${product.id}`} className="block">
                      {product.image_url ? (
                        <div className="aspect-square bg-muted/50 rounded-t-xl overflow-hidden">
                          <img 
                            src={product.image_url} 
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="aspect-square bg-muted/50 rounded-t-xl flex items-center justify-center">
                          <Package className="w-16 h-16 text-muted-foreground/30" />
                        </div>
                      )}
                    </Link>
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="inline-block text-xs font-medium text-secondary bg-secondary/10 px-2 py-1 rounded-full">
                          {getCategoryLabel(product.category)}
                        </span>
                        {stockStatus && (
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            stockStatus.color === 'destructive' ? 'bg-destructive/10 text-destructive' :
                            stockStatus.color === 'warning' ? 'bg-yellow-500/10 text-yellow-600' :
                            'bg-green-500/10 text-green-600'
                          }`}>
                            {stockStatus.label}
                          </span>
                        )}
                      </div>
                      <Link to={`/product/${product.id}`}>
                        <h3 className="font-heading font-semibold text-lg text-foreground mb-1 hover:text-primary transition-colors">
                          {product.name}
                        </h3>
                      </Link>
                      {product.description && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {product.description}
                        </p>
                      )}
                      <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-xl font-bold text-primary">₹{product.price}</span>
                        <span className="text-sm text-muted-foreground">per {product.unit}</span>
                      </div>
                      <Button 
                        variant={isOutOfStock ? "outline" : "default"} 
                        size="sm" 
                        className="w-full" 
                        onClick={(e) => {
                          e.preventDefault();
                          handleAddToCart(product);
                        }}
                        disabled={isOutOfStock}
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        {isOutOfStock ? "Out of Stock" : "Add to Cart"}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* CTA */}
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            Want something specific? Contact us for custom orders!
          </p>
          <Button 
            size="lg" 
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
