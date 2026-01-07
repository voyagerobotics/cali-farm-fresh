import { X, Minus, Plus, ShoppingBag, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "react-router-dom";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const CartDrawer = ({ isOpen, onClose }: CartDrawerProps) => {
  const { items, removeItem, updateQuantity, total, clearCart } = useCart();
  const navigate = useNavigate();

  const isOrderAllowed = () => {
    const today = new Date();
    const day = today.getDay();
    // Monday = 1, Thursday = 4
    return day === 1 || day === 4;
  };

  const getNextOrderDay = () => {
    const today = new Date();
    const day = today.getDay();
    
    if (day < 1) return "Monday";
    if (day < 4) return "Thursday";
    if (day < 8) return "Monday";
    return "Monday";
  };

  const handleCheckout = () => {
    onClose();
    navigate("/checkout");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-card border-l border-border shadow-elevated animate-slide-in-right">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              <h2 className="font-heading text-lg font-semibold">Your Cart</h2>
              <span className="text-sm text-muted-foreground">
                ({items.length} items)
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Order Day Notice */}
          <div className="p-4 bg-secondary/10 border-b border-border">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Orders on Monday & Thursday Only
                </p>
                <p className="text-xs text-muted-foreground">
                  Delivery: 12 PM - 3 PM • Within 3 hours
                </p>
              </div>
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <ShoppingBag className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <h3 className="font-heading text-lg font-medium mb-2">Your cart is empty</h3>
                <p className="text-muted-foreground text-sm">
                  Add some fresh vegetables to get started!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.variantId ? `${item.id}-${item.variantId}` : item.id}
                    className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{item.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {item.originalPrice && item.originalPrice > item.price ? (
                          <>
                            <span className="line-through mr-1">₹{item.originalPrice}</span>
                            <span className="text-primary font-medium">₹{item.price}</span>
                          </>
                        ) : (
                          <>₹{item.price}</>
                        )}
                        {" "}{item.variantName || item.unit}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1, item.variantId)}
                        className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1, item.variantId)}
                        className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold text-primary">
                        ₹{item.price * item.quantity}
                      </p>
                      <button
                        onClick={() => removeItem(item.id, item.variantId)}
                        className="text-destructive hover:text-destructive/80 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="p-4 border-t border-border space-y-4">

              {/* Order Day Warning */}
              {!isOrderAllowed() && (
                <div className="p-3 bg-secondary/10 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-secondary flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Orders can only be placed on Monday & Thursday. Next order day: <strong>{getNextOrderDay()}</strong>
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-xl font-bold text-foreground">₹{total}</span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={clearCart}
                  className="flex-1"
                >
                  Clear Cart
                </Button>
                <Button
                  onClick={handleCheckout}
                  className="flex-1"
                >
                  Checkout
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartDrawer;
