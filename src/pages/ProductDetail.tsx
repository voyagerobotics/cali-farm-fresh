import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ShoppingCart, Minus, Plus, Truck, Clock, Leaf, AlertCircle, CheckCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { Product } from "@/hooks/useProducts";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductImageGallery from "@/components/ProductImageGallery";

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem, items, updateQuantity } = useCart();
  const { toast } = useToast();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  // Get current quantity in cart
  const cartItem = items.find(item => item.id === id);
  const quantityInCart = cartItem?.quantity || 0;

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error || !data) {
        setProduct(null);
      } else {
        setProduct(data);
        
        // Fetch related products from same category
        const { data: related } = await supabase
          .from("products")
          .select("*")
          .eq("category", data.category)
          .neq("id", id)
          .eq("is_hidden", false)
          .limit(4);
        
        setRelatedProducts(related || []);
      }
      
      setIsLoading(false);
    };

    fetchProduct();
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;
    
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
      price: product.price,
      unit: `per ${product.unit}`,
      image_url: product.image_url,
    });

    toast({
      title: "Added to Cart",
      description: `${product.name} has been added to your cart.`,
    });
  };

  const handleUpdateQuantity = (newQuantity: number) => {
    if (!product) return;
    
    if (newQuantity <= 0) {
      updateQuantity(product.id, 0);
    } else {
      updateQuantity(product.id, newQuantity);
    }
  };

  const isOutOfStock = product && (!product.is_available || (product.stock_quantity !== null && product.stock_quantity <= 0));

  const getStockStatus = () => {
    if (!product) return null;
    if (!product.is_available) return { label: "Out of Stock", color: "destructive" };
    if (product.stock_quantity === null) return { label: "In Stock", color: "success" };
    if (product.stock_quantity <= 0) return { label: "Out of Stock", color: "destructive" };
    if (product.stock_quantity <= 5) return { label: `Only ${product.stock_quantity} left`, color: "warning" };
    return { label: "In Stock", color: "success" };
  };

  const stockStatus = getStockStatus();

  const getCategoryLabel = (category: string | null) => {
    const labels: Record<string, string> = {
      vegetables: "Vegetables",
      leafy: "Leafy Greens",
      fruits: "Fruits",
      herbs: "Herbs",
    };
    return labels[category || "vegetables"] || "Vegetables";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-heading text-2xl font-bold mb-4">Product Not Found</h1>
          <p className="text-muted-foreground mb-6">The product you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate("/")}>Back to Home</Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Breadcrumb */}
      <div className="bg-muted/30 border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">Home</Link>
            <span className="text-muted-foreground">/</span>
            <Link to="/#products" className="text-muted-foreground hover:text-primary transition-colors">Products</Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-foreground font-medium">{product.name}</span>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Product Details */}
        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          {/* Product Image Gallery */}
          <ProductImageGallery
            imageUrl={product.image_url}
            imageUrls={product.image_urls}
            productName={product.name}
          />

          {/* Product Info */}
          <div className="flex flex-col">
            {/* Category & Stock */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm font-medium text-secondary bg-secondary/10 px-3 py-1 rounded-full">
                {getCategoryLabel(product.category)}
              </span>
              {stockStatus && (
                <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                  stockStatus.color === 'destructive' ? 'bg-destructive/10 text-destructive' :
                  stockStatus.color === 'warning' ? 'bg-yellow-500/10 text-yellow-600' :
                  'bg-green-500/10 text-green-600'
                }`}>
                  {stockStatus.label}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
              {product.name}
            </h1>

            {/* Price */}
            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-4xl font-bold text-primary">₹{product.price}</span>
              <span className="text-lg text-muted-foreground">per {product.unit}</span>
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                {product.description}
              </p>
            )}

            {/* Add to Cart Section */}
            <div className="bg-muted/30 rounded-xl p-6 mb-8">
              {quantityInCart > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Already in cart</p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleUpdateQuantity(quantityInCart - 1)}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-12 text-center text-xl font-bold">{quantityInCart}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleUpdateQuantity(quantityInCart + 1)}
                        disabled={isOutOfStock}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-lg">₹{product.price * quantityInCart}</p>
                      <p className="text-sm text-muted-foreground">Total in cart</p>
                    </div>
                  </div>
                </div>
              ) : (
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  {isOutOfStock ? "Out of Stock" : "Add to Cart"}
                </Button>
              )}
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl">
                <Leaf className="w-6 h-6 text-primary" />
                <div>
                  <p className="font-medium text-sm">100% Organic</p>
                  <p className="text-xs text-muted-foreground">No chemicals</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl">
                <Clock className="w-6 h-6 text-primary" />
                <div>
                  <p className="font-medium text-sm">Farm Fresh</p>
                  <p className="text-xs text-muted-foreground">Harvested daily</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl">
                <Truck className="w-6 h-6 text-primary" />
                <div>
                  <p className="font-medium text-sm">Fast Delivery</p>
                  <p className="text-xs text-muted-foreground">Within 3 hours</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl">
                <CheckCircle className="w-6 h-6 text-primary" />
                <div>
                  <p className="font-medium text-sm">Quality Guaranteed</p>
                  <p className="text-xs text-muted-foreground">Fresh or refund</p>
                </div>
              </div>
            </div>

            {/* Order Notice */}
            <div className="mt-8 p-4 bg-secondary/10 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Orders on Monday & Thursday only</p>
                <p className="text-sm text-muted-foreground">Delivery between 12 PM - 3 PM</p>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section>
            <h2 className="font-heading text-2xl font-bold mb-6">Related Products</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <Link
                  key={relatedProduct.id}
                  to={`/product/${relatedProduct.id}`}
                  className="bg-card rounded-xl p-5 border border-border hover:shadow-elevated transition-all duration-300 hover:-translate-y-1"
                >
                  {relatedProduct.image_url ? (
                    <div className="aspect-square bg-muted/50 rounded-lg overflow-hidden mb-4">
                      <img 
                        src={relatedProduct.image_url} 
                        alt={relatedProduct.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square bg-muted/50 rounded-lg flex items-center justify-center mb-4">
                      <Package className="w-12 h-12 text-muted-foreground/30" />
                    </div>
                  )}
                  <h3 className="font-heading font-semibold text-lg text-foreground mb-1">
                    {relatedProduct.name}
                  </h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-primary">₹{relatedProduct.price}</span>
                    <span className="text-sm text-muted-foreground">per {relatedProduct.unit}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetail;
