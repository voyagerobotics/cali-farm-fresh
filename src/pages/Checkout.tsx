import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Banknote, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart, MINIMUM_ORDER } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Checkout = () => {
  const navigate = useNavigate();
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online">("cod");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    pincode: "",
    notes: "",
  });

  const isOrderDayAllowed = () => {
    const today = new Date();
    const day = today.getDay();
    return day === 1 || day === 4; // Monday or Thursday
  };

  const getNextOrderDay = () => {
    const today = new Date();
    const day = today.getDay();
    
    let daysUntilNext = 0;
    if (day === 0) daysUntilNext = 1; // Sunday -> Monday
    else if (day < 4) daysUntilNext = 4 - day; // Mon-Wed -> Thursday
    else daysUntilNext = 8 - day; // Thu-Sat -> Monday

    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + daysUntilNext);
    
    return nextDate.toLocaleDateString("en-IN", { 
      weekday: "long", 
      month: "short", 
      day: "numeric" 
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Please Login",
        description: "You need to be logged in to place an order.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (total < MINIMUM_ORDER) {
      toast({
        title: "Minimum Order Not Met",
        description: `Please add items worth at least ₹${MINIMUM_ORDER}`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate order number
      const { data: orderNumber } = await supabase.rpc("generate_order_number");

      // Determine order date (next Monday or Thursday)
      const today = new Date();
      const day = today.getDay();
      let orderDate = new Date(today);
      
      if (day === 1 || day === 4) {
        // If today is Monday or Thursday, order for today
        orderDate = today;
      } else {
        // Find next Monday or Thursday
        let daysUntilNext = 0;
        if (day === 0) daysUntilNext = 1;
        else if (day < 4) daysUntilNext = 4 - day;
        else daysUntilNext = 8 - day;
        
        orderDate.setDate(today.getDate() + daysUntilNext);
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert([
          {
            user_id: user.id,
            order_number: orderNumber,
            payment_method: paymentMethod,
            subtotal: total,
            total: total,
            delivery_address: `${formData.address}, ${formData.pincode}`,
            delivery_phone: formData.phone,
            delivery_name: formData.name,
            notes: formData.notes,
            order_date: orderDate.toISOString().split("T")[0],
          },
        ])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Clear cart and show success
      clearCart();
      
      toast({
        title: "Order Placed Successfully!",
        description: `Order #${orderNumber} will be delivered on ${orderDate.toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric" })} between 12 PM - 3 PM`,
      });

      navigate("/orders");
    } catch (error: any) {
      toast({
        title: "Order Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="font-heading text-2xl font-bold mb-4">Please Login</h2>
          <p className="text-muted-foreground mb-6">
            You need to be logged in to checkout
          </p>
          <Button onClick={() => navigate("/auth")}>Login / Sign Up</Button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="font-heading text-2xl font-bold mb-4">Your Cart is Empty</h2>
          <p className="text-muted-foreground mb-6">
            Add some fresh vegetables to your cart first
          </p>
          <Button onClick={() => navigate("/")}>Browse Products</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-heading text-xl font-bold">Checkout</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Order Form */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="font-heading text-lg font-semibold mb-6">
              Delivery Details
            </h2>

            {/* Order Day Notice */}
            <div className="p-4 bg-secondary/10 rounded-lg mb-6">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Delivery: {isOrderDayAllowed() ? "Today" : getNextOrderDay()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Between 12:00 PM - 3:00 PM • Fresh from farm
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phone / WhatsApp *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Your contact number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Delivery Address *</label>
                <textarea
                  required
                  rows={3}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  placeholder="Full address with landmark"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Pincode *</label>
                <input
                  type="text"
                  required
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="440001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Special Instructions</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  placeholder="Any special requests..."
                />
              </div>

              {/* Payment Method */}
              <div className="pt-4">
                <label className="block text-sm font-medium mb-3">Payment Method</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cod")}
                    className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                      paymentMethod === "cod"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Banknote className="w-5 h-5 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">Cash on Delivery</p>
                      <p className="text-xs text-muted-foreground">Pay when delivered</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("online")}
                    className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                      paymentMethod === "online"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">UPI / Card</p>
                      <p className="text-xs text-muted-foreground">Pay online now</p>
                    </div>
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full mt-6"
                disabled={isSubmitting || total < MINIMUM_ORDER}
              >
                {isSubmitting ? "Placing Order..." : `Place Order • ₹${total}`}
              </Button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="bg-card rounded-xl border border-border p-6 h-fit lg:sticky lg:top-24">
            <h2 className="font-heading text-lg font-semibold mb-4">Order Summary</h2>

            <div className="space-y-3 mb-6">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ₹{item.price} × {item.quantity}
                    </p>
                  </div>
                  <p className="font-medium">₹{item.price * item.quantity}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery</span>
                <span className="text-primary">Free</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                <span>Total</span>
                <span>₹{total}</span>
              </div>
            </div>

            {/* Delivery Info */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-primary mb-2">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Farm Fresh Guarantee</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Harvested fresh on delivery day</li>
                <li>• 100% organic, zero chemicals</li>
                <li>• Delivery within 3 hours</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
