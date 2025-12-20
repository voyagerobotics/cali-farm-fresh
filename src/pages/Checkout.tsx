import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Banknote, AlertCircle, CheckCircle, MapPin, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAddresses, UserAddress } from "@/hooks/useAddresses";
import { useDeliveryZones } from "@/hooks/useDeliveryZones";
import AddressManager from "@/components/AddressManager";
import OTPVerification from "@/components/OTPVerification";
import UPIPayment from "@/components/UPIPayment";

const Checkout = () => {
  const navigate = useNavigate();
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const { addresses, defaultAddress } = useAddresses();
  const { getDeliveryChargeByPincode, zones } = useDeliveryZones();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online">("cod");
  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(null);
  const [showAddressManager, setShowAddressManager] = useState(false);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  
  // OTP and UPI states
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [showUPIPayment, setShowUPIPayment] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState<any>(null);
  const [pendingOrderNumber, setPendingOrderNumber] = useState("");

  // Manual entry form for new users
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    pincode: "",
    notes: "",
  });

  // Set default address when loaded
  useEffect(() => {
    if (defaultAddress && !selectedAddress) {
      setSelectedAddress(defaultAddress);
    }
  }, [defaultAddress]);

  // Calculate delivery charge when pincode changes
  useEffect(() => {
    const pincode = selectedAddress?.pincode || formData.pincode;
    if (pincode && pincode.length >= 6) {
      const charge = getDeliveryChargeByPincode(pincode);
      setDeliveryCharge(charge);
    }
  }, [selectedAddress, formData.pincode, zones]);

  const isOrderDayAllowed = () => {
    const today = new Date();
    const day = today.getDay();
    return day === 1 || day === 4;
  };

  const getNextOrderDay = () => {
    const today = new Date();
    const day = today.getDay();
    
    let daysUntilNext = 0;
    if (day === 0) daysUntilNext = 1;
    else if (day < 4) daysUntilNext = 4 - day;
    else daysUntilNext = 8 - day;

    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + daysUntilNext);
    
    return nextDate.toLocaleDateString("en-IN", { 
      weekday: "long", 
      month: "short", 
      day: "numeric" 
    });
  };

  const getOrderDate = () => {
    const today = new Date();
    const day = today.getDay();
    let orderDate = new Date(today);
    
    if (day !== 1 && day !== 4) {
      let daysUntilNext = 0;
      if (day === 0) daysUntilNext = 1;
      else if (day < 4) daysUntilNext = 4 - day;
      else daysUntilNext = 8 - day;
      orderDate.setDate(today.getDate() + daysUntilNext);
    }
    
    return orderDate;
  };

  const grandTotal = total + deliveryCharge;

  const handleProceedToVerification = async () => {
    if (!user) {
      toast({
        title: "Please Login",
        description: "You need to be logged in to place an order.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    // Validate address
    const addressData = selectedAddress || {
      full_name: formData.name,
      phone: formData.phone,
      address: formData.address,
      pincode: formData.pincode,
    };

    if (!addressData.full_name || !addressData.phone || !addressData.address || !addressData.pincode) {
      toast({
        title: "Address Required",
        description: "Please fill in all delivery details",
        variant: "destructive",
      });
      return;
    }

    // Generate order number for reference
    const { data: orderNumber } = await supabase.rpc("generate_order_number");
    setPendingOrderNumber(orderNumber);

    // Store pending order data
    setPendingOrderData({
      user_id: user.id,
      order_number: orderNumber,
      payment_method: paymentMethod,
      subtotal: total,
      delivery_charge: deliveryCharge,
      total: grandTotal,
      delivery_address: `${addressData.address}, ${addressData.pincode}`,
      delivery_phone: addressData.phone,
      delivery_name: addressData.full_name,
      notes: formData.notes,
      order_date: getOrderDate().toISOString().split("T")[0],
    });

    // Show OTP verification
    setShowOTPVerification(true);
  };

  const handleOTPVerified = () => {
    setShowOTPVerification(false);
    
    if (paymentMethod === "online") {
      setShowUPIPayment(true);
    } else {
      // COD - place order directly
      placeOrder(null);
    }
  };

  const handleUPIPaymentConfirm = (upiReference: string) => {
    setShowUPIPayment(false);
    placeOrder(upiReference);
  };

  const placeOrder = async (upiReference: string | null) => {
    setIsSubmitting(true);

    try {
      const orderData = {
        ...pendingOrderData,
        upi_reference: upiReference,
        payment_status: upiReference ? "pending" : "pending", // Admin verifies UPI payments
      };

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert([orderData])
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

      // Save address if not already saved
      if (!selectedAddress && formData.name && formData.address) {
        await supabase.from("user_addresses").insert({
          user_id: user!.id,
          label: "Home",
          full_name: formData.name,
          phone: formData.phone,
          address: formData.address,
          pincode: formData.pincode,
          city: "Nagpur",
          is_default: addresses.length === 0,
        });
      }

      clearCart();
      
      toast({
        title: "Order Placed Successfully!",
        description: `Order #${pendingOrderNumber} will be delivered on ${getOrderDate().toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric" })}`,
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
      {/* OTP Verification Modal */}
      {showOTPVerification && user && (
        <OTPVerification
          email={user.email || ""}
          userId={user.id}
          onVerified={handleOTPVerified}
          onCancel={() => setShowOTPVerification(false)}
        />
      )}

      {/* UPI Payment Modal */}
      {showUPIPayment && (
        <UPIPayment
          amount={grandTotal}
          orderNumber={pendingOrderNumber}
          onPaymentConfirm={handleUPIPaymentConfirm}
          onCancel={() => setShowUPIPayment(false)}
        />
      )}

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
          <div className="space-y-6">
            {/* Order Day Notice */}
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">
                    Delivery: {isOrderDayAllowed() ? "Today" : getNextOrderDay()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Between 12:00 PM - 3:00 PM • Fresh from farm
                  </p>
                </div>
              </div>
            </div>

            {/* Delivery Address Section */}
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Delivery Address
                </h2>
                {addresses.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddressManager(!showAddressManager)}
                  >
                    {showAddressManager ? "Hide" : "Change"}
                  </Button>
                )}
              </div>

              {/* Show selected address or address manager */}
              {showAddressManager || addresses.length === 0 ? (
                <AddressManager
                  onSelect={(address) => {
                    setSelectedAddress(address);
                    setShowAddressManager(false);
                  }}
                  selectedId={selectedAddress?.id}
                  showSelectMode={addresses.length > 0}
                />
              ) : selectedAddress ? (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{selectedAddress.label}</span>
                  </div>
                  <p className="font-medium text-sm">{selectedAddress.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedAddress.phone}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedAddress.address}, {selectedAddress.city} - {selectedAddress.pincode}
                  </p>
                </div>
              ) : (
                // Manual entry form for first-time users
                <div className="space-y-4">
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
                </div>
              )}
            </div>

            {/* Special Instructions */}
            <div className="bg-card rounded-xl border border-border p-6">
              <label className="block text-sm font-medium mb-2">Special Instructions (Optional)</label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                placeholder="Any special requests..."
              />
            </div>

            {/* Payment Method */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="font-heading text-lg font-semibold mb-4">Payment Method</h2>
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
                    <p className="font-medium">UPI Payment</p>
                    <p className="text-xs text-muted-foreground">GPay, PhonePe, Paytm</p>
                  </div>
                </button>
              </div>
            </div>
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
                <span className="text-muted-foreground flex items-center gap-1">
                  <Truck className="w-4 h-4" />
                  Delivery
                </span>
                <span className={deliveryCharge === 0 ? "text-primary" : ""}>
                  {deliveryCharge === 0 ? "Free" : `₹${deliveryCharge}`}
                </span>
              </div>
              {deliveryCharge > 0 && (
                <p className="text-xs text-muted-foreground">
                  Based on your pincode delivery zone
                </p>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                <span>Total</span>
                <span>₹{grandTotal}</span>
              </div>
            </div>

            {/* Place Order Button */}
            <Button
              size="lg"
              className="w-full mt-6"
              disabled={isSubmitting}
              onClick={handleProceedToVerification}
            >
              {isSubmitting ? "Processing..." : `Proceed to Verify • ₹${grandTotal}`}
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-3">
              You'll receive an OTP to verify your order
            </p>

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
