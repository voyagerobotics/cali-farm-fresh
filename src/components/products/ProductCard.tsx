import { useState } from "react";
import { ShoppingCart, Minus, Plus, Package, Leaf, Sparkles, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Product } from "@/hooks/useProducts";
import { cn } from "@/lib/utils";
interface ProductCardProps {
  product: Product & {
    is_bestseller?: boolean;
    is_fresh_today?: boolean;
  };
  onAddToCart: (product: Product, quantity: number) => void;
}
const ProductCard = ({
  product,
  onAddToCart
}: ProductCardProps) => {
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const isOutOfStock = !product.is_available || product.stock_quantity !== null && product.stock_quantity <= 0;
  const isLowStock = product.stock_quantity !== null && product.stock_quantity > 0 && product.stock_quantity <= 5;
  const handleAddToCart = async () => {
    if (isOutOfStock) return;
    setIsAdding(true);
    onAddToCart(product, quantity);
    setTimeout(() => {
      setIsAdding(false);
      setQuantity(1);
    }, 500);
  };
  const incrementQuantity = () => {
    if (product.stock_quantity === null || quantity < product.stock_quantity) {
      setQuantity(q => q + 1);
    }
  };
  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(q => q - 1);
    }
  };
  return <div className={cn("group bg-card rounded-2xl border border-border overflow-hidden transition-all duration-300", "hover:shadow-elevated hover:-translate-y-1", isOutOfStock && "opacity-60")}>
      {/* Image container */}
      <Link to={`/product/${product.id}`} className="block relative aspect-square overflow-hidden bg-muted/30">
        {product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center bg-accent/30">
            <Package className="w-16 h-16 text-muted-foreground/30" />
          </div>}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {/* Organic badge - always shown */}
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full shadow-sm">
            <Leaf className="w-3 h-3" />
            {product.id.charCodeAt(0) % 2 === 0 ? "0% Chemical" : "Zero Chemicals"}
          </span>

          {/* Fresh Today badge */}
          {product.is_fresh_today && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-secondary text-secondary-foreground text-xs font-semibold rounded-full shadow-sm">
              <Sparkles className="w-3 h-3" />
              Fresh Today
            </span>}

          {/* Bestseller badge */}
          {product.is_bestseller && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-500 text-yellow-950 text-xs font-semibold rounded-full shadow-sm">
              <Award className="w-3 h-3" />
              Best Seller
            </span>}
        </div>

        {/* Stock status overlay */}
        {isOutOfStock && <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <span className="bg-destructive text-destructive-foreground px-4 py-2 rounded-full font-semibold text-sm">
              Out of Stock
            </span>
          </div>}

        {isLowStock && !isOutOfStock && <div className="absolute bottom-3 right-3">
            <span className="bg-yellow-500/90 text-yellow-950 px-2.5 py-1 rounded-full text-xs font-semibold">
              Only {product.stock_quantity} left
            </span>
          </div>}
      </Link>

      {/* Content */}
      <div className="p-4">
        {/* Category tag */}
        <span className="inline-block text-xs font-medium text-secondary bg-secondary/10 px-2 py-0.5 rounded-full mb-2 capitalize">
          {product.category || "Vegetables"}
        </span>

        {/* Product name */}
        <Link to={`/product/${product.id}`}>
          <h3 className="font-heading font-semibold text-lg text-foreground mb-1 hover:text-primary transition-colors line-clamp-1">
            {product.name}
          </h3>
        </Link>

        {/* Description */}
        {product.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {product.description}
          </p>}

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-xl font-bold text-primary">₹{product.price}</span>
          <span className="text-sm text-muted-foreground">per {product.unit}</span>
        </div>

        {/* Quantity selector and Add to Cart */}
        {!isOutOfStock && <div className="flex items-center gap-2">
            {/* Quantity controls */}
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md hover:bg-accent" onClick={decrementQuantity} disabled={quantity <= 1}>
                <Minus className="w-4 h-4" />
              </Button>
              <span className="w-8 text-center font-semibold text-sm">{quantity}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md hover:bg-accent" onClick={incrementQuantity} disabled={product.stock_quantity !== null && quantity >= product.stock_quantity}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Add to cart button */}
            <Button className={cn("flex-1 h-10 font-semibold transition-all", isAdding && "bg-primary/80 scale-95")} onClick={handleAddToCart} disabled={isAdding}>
              <ShoppingCart className={cn("w-4 h-4 mr-2", isAdding && "animate-bounce")} />
              {isAdding ? "Added!" : "Add"}
            </Button>
          </div>}

        {isOutOfStock && <Button variant="outline" className="w-full" disabled>
            Out of Stock
          </Button>}
      </div>
    </div>;
};
export default ProductCard;