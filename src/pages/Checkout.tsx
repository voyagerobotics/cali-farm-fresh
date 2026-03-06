declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, AlertCircle, MapPin, Truck, CheckCircle, Loader2, RefreshCw, Navigation, Map, Edit2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { Percent } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAddresses, UserAddress } from "@/hooks/useAddresses";
import { useDeliveryZones } from "@/hooks/useDeliveryZones";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { usePageTracking, useActivityLogger } from "@/hooks/useAnalytics";
import AddressManager from "@/components/AddressManager";
import MapPreview from "@/components/MapPreview";
import GoogleMapsLocationPicker from "@/components/GoogleMapsLocationPicker";
import RazorpayPayment from "@/components/RazorpayPayment";
import WeeklySubscriptionCheckbox from "@/components/WeeklySubscriptionCheckbox";

const Checkout = () => {
  const navigate = useNavigate();
  const { items, total, clearCart, totalSavings } = useCart();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const { addresses, defaultAddress, addAddress, updateAddress, refetch: refetchAddresses } = useAddresses();
  const { calculateDeliveryDistance, isCalculating, ratePerKm, clearCache } = useDeliveryZones();
  const { settings } = useSiteSettings();
  const { logActivity } = useActivityLogger();
  
  usePageTracking();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod] = useState<"online">("online");
  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(null);
  const [showAddressManager, setShowAddressManager] = useState(false);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [deliveryDistance, setDeliveryDistance] = useState(0);
  const [deliveryUnavailable, setDeliveryUnavailable] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  
  // Razorpay payment state
  const [showRazorpay, setShowRazorpay] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState<any>(null);
  const [pendingOrderNumber, setPendingOrderNumber] = useState("");

  // Form for manual address or editing
  const [showManualForm, setShowManualForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    pincode: "",
    city: "Nagpur",
    notes: "",
    latitude: null as number | null,
    longitude: null as number | null,
  });

  // Auto-fill form data from profile for first-time users
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone, address, pincode")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setFormData(prev => ({
          ...prev,
          name: prev.name || data.full_name || "",
          phone: prev.phone || data.phone || "",
          address: prev.address || data.address || "",
          pincode: prev.pincode || data.pincode || "",
        }));
      }
    };
    fetchProfile();
  }, [user]);

  // Auto-select saved default address on load
  useEffect(() => {
    if (defaultAddress && !selectedAddress) {
      setSelectedAddress(defaultAddress);
    }
  }, [defaultAddress]);

  // When location is selected from map picker, auto-fill address and update selected address coords
  const handleLocationSelect = async (data: { address: string; city: string; pincode: string; latitude: number; longitude: number }) => {
    if (selectedAddress) {
      // Update the selected saved address with new coordinates
      const success = await updateAddress(selectedAddress.id, {
        address: data.address,
        city: data.city || selectedAddress.city,
        pincode: data.pincode || selectedAddress.pincode,
        latitude: data.latitude,
        longitude: data.longitude,
      });
      if (success) {
        await refetchAddresses();
        // Update local state immediately
        setSelectedAddress(prev => prev ? {
          ...prev,
          address: data.address,
          city: data.city || prev.city,
          pincode: data.pincode || prev.pincode,
          latitude: data.latitude,
          longitude: data.longitude,
        } : null);
        toast({ title: "Address updated", description: "Delivery location updated from map." });
      }
    } else {
      // Manual form mode - fill the form fields
      setFormData(prev => ({
        ...prev,
        address: data.address,
        city: data.city || prev.city,
        pincode: data.pincode || prev.pincode,
        latitude: data.latitude,
        longitude: data.longitude,
      }));
      setShowManualForm(true);
    }
  };

  // Use Current Location: get coords → open map picker at that location
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Not Supported", description: "Geolocation is not supported by your browser.", variant: "destructive" });
      return;
    }
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsGettingLocation(false);
        // Open map picker centered on current location
        if (selectedAddress) {
          // Update form data so map picker opens at current location
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }));
        }
        setShowMapPicker(true);
      },
      () => {
        setIsGettingLocation(false);
        setShowMapPicker(true);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Save manual form as a new saved address
  const handleSaveManualAddress = async () => {
    if (!user || !formData.name || !formData.phone || !formData.address || !formData.pincode) {
      toast({ title: "Missing Details", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }

    const result = await addAddress({
      label: "Home",
      full_name: formData.name,
      phone: formData.phone,
      address: formData.address,
      pincode: formData.pincode,
      city: formData.city,
      is_default: addresses.length === 0,
      latitude: formData.latitude,
      longitude: formData.longitude,
    });

    if (result) {
      setSelectedAddress(result);
      setShowManualForm(false);
      toast({ title: "Address saved!", description: "Your delivery address has been saved for future orders." });
    }
  };

  // Helper to convert day name to day number
  const dayNameToNumber = (dayName: string): number => {
    const dayMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
    };
    return dayMap[dayName.toLowerCase()] ?? -1;
  };

  const getOrderDayNumbers = useCallback(() => {
    return settings.order_days
      .map(day => dayNameToNumber(day))
      .filter(num => num !== -1)
      .sort((a, b) => a - b);
  }, [settings.order_days]);

  // Calculate delivery charge when pincode changes
  const calculateDelivery = useCallback(async (pincode: string, forceRefresh = false) => {
    if (!pincode || pincode.length < 6) {
      setDeliveryCharge(0);
      setDeliveryDistance(0);
      setDeliveryUnavailable(false);
      setDeliveryError(null);
      return;
    }
    if (forceRefresh) clearCache(pincode);
    const result = await calculateDeliveryDistance(pincode);
    if (result.deliveryUnavailable) {
      setDeliveryUnavailable(true);
      setDeliveryError(result.error || "Delivery not available for this location.");
      setDeliveryCharge(0);
      setDeliveryDistance(0);
    } else {
      setDeliveryUnavailable(false);
      setDeliveryError(null);
      const freeThreshold = settings.free_delivery_threshold || 399;
      const calculatedCharge = total >= freeThreshold ? 0 : result.deliveryCharge;
      setDeliveryCharge(calculatedCharge);
      setDeliveryDistance(result.distanceKm);
    }
  }, [calculateDeliveryDistance, clearCache, total, settings.free_delivery_threshold]);

  const handleRecalculateDistance = () => {
    const pincode = selectedAddress?.pincode || formData.pincode;
    if (pincode) calculateDelivery(pincode, true);
  };

  useEffect(() => {
    const pincode = selectedAddress?.pincode || formData.pincode;
    calculateDelivery(pincode);
  }, [selectedAddress, formData.pincode, calculateDelivery, total]);

  const isOrderDayAllowed = useCallback(() => {
    const today = new Date();
    return getOrderDayNumbers().includes(today.getDay());
  }, [getOrderDayNumbers]);

  const getNextOrderDay = useCallback(() => {
    const today = new Date();
    const currentDay = today.getDay();
    const orderDays = getOrderDayNumbers();
    if (orderDays.length === 0) return "Contact us for schedule";
    if (orderDays.includes(currentDay)) {
      return new Date().toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric" });
    }
    let daysUntilNext = 7;
    for (const orderDay of orderDays) {
      let diff = orderDay - currentDay;
      if (diff <= 0) diff += 7;
      if (diff < daysUntilNext) daysUntilNext = diff;
    }
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + daysUntilNext);
    return nextDate.toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric" });
  }, [getOrderDayNumbers]);

  const getOrderDate = useCallback(() => {
    const today = new Date();
    const currentDay = today.getDay();
    const orderDays = getOrderDayNumbers();
    if (orderDays.length === 0) return today;
    if (orderDays.includes(currentDay)) return today;
    let daysUntilNext = 7;
    for (const orderDay of orderDays) {
      let diff = orderDay - currentDay;
      if (diff <= 0) diff += 7;
      if (diff < daysUntilNext) daysUntilNext = diff;
    }
    const orderDate = new Date(today);
    orderDate.setDate(today.getDate() + daysUntilNext);
    return orderDate;
  }, [getOrderDayNumbers]);

  const grandTotal = total + deliveryCharge;

  // Get the active address data (selected saved or manual form)
  const getActiveAddressData = () => {
    if (selectedAddress) {
      return {
        full_name: selectedAddress.full_name,
        phone: selectedAddress.phone,
        address: selectedAddress.address,
        pincode: selectedAddress.pincode,
        latitude: selectedAddress.latitude,
        longitude: selectedAddress.longitude,
      };
    }
    return {
      full_name: formData.name,
      phone: formData.phone,
      address: formData.address,
      pincode: formData.pincode,
      latitude: formData.latitude,
      longitude: formData.longitude,
    };
  };

  const handleProceedToVerification = async () => {
    if (!user) {
      toast({ title: "Please Login", description: "You need to be logged in to place an order.", variant: "destructive" });
      navigate("/auth");
      return;
    }

    if (deliveryUnavailable) {
      toast({ title: "Delivery Unavailable", description: deliveryError || "We cannot deliver to this location.", variant: "destructive" });
      return;
    }

    const addressData = getActiveAddressData();
    if (!addressData.full_name || !addressData.phone || !addressData.address || !addressData.pincode) {
      toast({ title: "Address Required", description: "Please fill in all delivery details", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: orderNumber } = await supabase.rpc("generate_order_number");
      setPendingOrderNumber(orderNumber);

      const orderData = {
        user_id: user.id,
        order_number: orderNumber,
        payment_method: paymentMethod as "online",
        subtotal: total,
        delivery_charge: deliveryCharge,
        total: grandTotal,
        delivery_address: `${addressData.address}, ${addressData.pincode}`,
        delivery_phone: addressData.phone,
        delivery_name: addressData.full_name,
        delivery_latitude: addressData.latitude || null,
        delivery_longitude: addressData.longitude || null,
        notes: formData.notes,
        order_date: getOrderDate().toISOString().split("T")[0],
        payment_status: "pending" as const,
        status: "pending" as const,
      };

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert([orderData])
        .select()
        .single();
      if (orderError) throw orderError;

      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
        unit: item.unit || 'kg',
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      // Auto-save address if manual entry was used
      if (!selectedAddress && formData.name && formData.address) {
        await addAddress({
          label: "Home",
          full_name: formData.name,
          phone: formData.phone,
          address: formData.address,
          pincode: formData.pincode,
          city: formData.city,
          is_default: addresses.length === 0,
          latitude: formData.latitude,
          longitude: formData.longitude,
        });
      }

      setPendingOrderData({ orderId: order.id, orderNumber: orderNumber });
      setShowRazorpay(true);
    } catch (error: any) {
      toast({ title: "Order Failed", description: error.message || "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = async (paymentId: string) => {
    setShowRazorpay(false);
    setIsSubmitting(true);

    try {
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          status: "confirmed",
          upi_reference: paymentId,
          payment_verified_at: new Date().toISOString(),
        })
        .eq("id", pendingOrderData.orderId);
      if (updateError) throw updateError;

      const addressData = getActiveAddressData();
      const deliveryDate = getOrderDate().toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric" });

      try {
        await supabase.functions.invoke("send-order-confirmation", {
          body: {
            email: user?.email,
            orderNumber: pendingOrderData.orderNumber,
            customerName: addressData.full_name,
            customerPhone: addressData.phone,
            items: items.map((item) => ({
              product_name: item.name,
              quantity: item.quantity,
              unit_price: item.price,
              total_price: item.price * item.quantity,
            })),
            subtotal: total,
            deliveryCharge: deliveryCharge,
            total: grandTotal,
            deliveryAddress: `${addressData.address}, ${addressData.pincode}`,
            deliveryDate: deliveryDate,
            paymentMethod: "online",
            paymentStatus: "paid",
            paymentId: paymentId,
          },
        });
      } catch (emailError) {
        console.error("Failed to send order confirmation email:", emailError);
      }

      try {
        await supabase.from("user_activity_logs").insert([{
          user_id: user?.id || null,
          action_type: "order_placed",
          action_details: JSON.parse(JSON.stringify({
            order_number: pendingOrderData.orderNumber,
            order_total: grandTotal,
            item_count: items.length,
            payment_method: "online",
          })),
          page_path: "/checkout",
        }]);
      } catch (trackError) {
        console.error("Error tracking order:", trackError);
      }

      clearCart();

      if (typeof window.gtag === 'function') {
        window.gtag('event', 'purchase', {
          transaction_id: pendingOrderData.orderNumber,
          value: grandTotal,
          currency: 'INR',
          items: items.map((item) => ({
            item_name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
        });
      }

      toast({ title: "Order Confirmed!", description: `Order #${pendingOrderData.orderNumber} is confirmed. Delivery on ${deliveryDate}` });
      navigate("/orders");
    } catch (error: any) {
      toast({ title: "Payment received but order update failed", description: "Your payment was successful. Please contact support with your payment ID: " + paymentId, variant: "destructive" });
      navigate("/orders");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentFailure = (error: string) => {
    setShowRazorpay(false);
    toast({ title: "Payment Failed", description: `${error}. Your order #${pendingOrderData?.orderNumber} is saved. You can retry payment from your orders page.`, variant: "destructive" });
    navigate("/orders");
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="font-heading text-2xl font-bold mb-4">Please Login</h2>
          <p className="text-muted-foreground mb-6">You need to be logged in to checkout</p>
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
          <p className="text-muted-foreground mb-6">Add some fresh vegetables to your cart first</p>
          <Button onClick={() => navigate("/")}>Browse Products</Button>
        </div>
      </div>
    );
  }

  const activeAddress = getActiveAddressData();
  const hasActiveAddress = !!(activeAddress.full_name && activeAddress.address && activeAddress.pincode);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Razorpay Payment */}
      {showRazorpay && (
        <RazorpayPayment
          amount={grandTotal}
          orderNumber={pendingOrderNumber}
          customerName={activeAddress.full_name}
          customerEmail={user?.email || ""}
          customerPhone={activeAddress.phone}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentFailure={handlePaymentFailure}
          onCancel={() => {
            setShowRazorpay(false);
            toast({ title: "Payment Cancelled", description: `Your order #${pendingOrderData?.orderNumber} is saved. You can complete payment later.` });
            navigate("/orders");
          }}
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
                {addresses.length > 0 && !showAddressManager && !showManualForm && (
                  <Button variant="ghost" size="sm" onClick={() => setShowAddressManager(true)}>
                    Change
                  </Button>
                )}
              </div>

              {/* Address Manager (select from saved) */}
              {showAddressManager ? (
                <div className="space-y-3">
                  <AddressManager
                    onSelect={(address) => {
                      setSelectedAddress(address);
                      setShowAddressManager(false);
                      setShowManualForm(false);
                    }}
                    selectedId={selectedAddress?.id}
                    showSelectMode={addresses.length > 0}
                  />
                  <Button variant="ghost" size="sm" onClick={() => setShowAddressManager(false)} className="w-full">
                    Cancel
                  </Button>
                </div>
              ) : showManualForm ? (
                /* Manual Address Form */
                <div className="space-y-4">
                  {/* Location Picker Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button type="button" variant="outline" size="sm" className="gap-2 flex-1" onClick={handleUseCurrentLocation} disabled={isGettingLocation}>
                      {isGettingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                      Use Current Location
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="gap-2 flex-1" onClick={() => setShowMapPicker(true)}>
                      <Map className="w-4 h-4" />
                      Pick on Map
                    </Button>
                  </div>

                  {/* Map preview if coordinates exist */}
                  {formData.latitude && formData.longitude && (
                    <MapPreview latitude={formData.latitude} longitude={formData.longitude} address={formData.address} />
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-1">Full Name *</label>
                    <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Enter your name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone / WhatsApp *</label>
                    <input type="tel" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Your contact number" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Delivery Address *</label>
                    <textarea required rows={3} value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                      placeholder="Full address with landmark" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Pincode *</label>
                      <input type="text" required value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="440001" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">City</label>
                      <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="Nagpur" />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={handleSaveManualAddress} disabled={!formData.name || !formData.address || !formData.pincode}>
                      Save & Use Address
                    </Button>
                    {(addresses.length > 0 || selectedAddress) && (
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowManualForm(false)}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ) : hasActiveAddress && (selectedAddress || formData.address) ? (
                /* Address Preview Card (Swiggy-like) */
                <div className="space-y-3">
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="font-semibold text-sm">{selectedAddress?.label || "Delivery"}</span>
                          {selectedAddress?.is_default && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">Default</span>
                          )}
                        </div>
                        <p className="font-medium text-sm">{activeAddress.full_name}</p>
                        <p className="text-sm text-muted-foreground">{activeAddress.phone}</p>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                          {activeAddress.address}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {selectedAddress?.city || formData.city} - {activeAddress.pincode}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8" onClick={() => setShowAddressManager(true)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Map preview */}
                    {activeAddress.latitude && activeAddress.longitude && (
                      <div className="mt-3">
                        <MapPreview latitude={activeAddress.latitude} longitude={activeAddress.longitude} address={activeAddress.address} />
                      </div>
                    )}
                  </div>

                  {/* Location update buttons */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button type="button" variant="outline" size="sm" className="gap-2 flex-1" onClick={handleUseCurrentLocation} disabled={isGettingLocation}>
                      {isGettingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                      Update with Current Location
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="gap-2 flex-1" onClick={() => setShowMapPicker(true)}>
                      <Map className="w-4 h-4" />
                      Pick on Map
                    </Button>
                  </div>

                  {/* Add new address link */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAddress(null);
                      setShowManualForm(true);
                    }}
                    className="w-full text-left p-3 rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
                  >
                    <MapPin className="w-4 h-4" />
                    Add a new delivery address
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </button>
                </div>
              ) : (
                /* No address at all - prompt to add */
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <MapPin className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-4">Add your delivery address to continue</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button type="button" variant="default" size="sm" className="gap-2 flex-1" onClick={handleUseCurrentLocation} disabled={isGettingLocation}>
                      {isGettingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                      Use Current Location
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="gap-2 flex-1" onClick={() => setShowMapPicker(true)}>
                      <Map className="w-4 h-4" />
                      Pick on Map
                    </Button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowManualForm(true)}
                    className="w-full text-left p-3 rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
                  >
                    <Edit2 className="w-4 h-4" />
                    Enter address manually
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </button>
                </div>
              )}
            </div>

            {/* Location Picker Modal */}
            <GoogleMapsLocationPicker
              open={showMapPicker}
              onClose={() => setShowMapPicker(false)}
              onLocationSelect={handleLocationSelect}
              initialLat={formData.latitude || selectedAddress?.latitude || undefined}
              initialLng={formData.longitude || selectedAddress?.longitude || undefined}
            />

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
              <div className="mt-4 pt-4 border-t border-border">
                <WeeklySubscriptionCheckbox email={user?.email} phone={activeAddress.phone} />
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="font-heading text-lg font-semibold mb-4">Payment Method</h2>
              <div className="p-4 rounded-lg border-2 border-primary bg-primary/5 flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Razorpay</p>
                  <p className="text-xs text-muted-foreground">Cards, UPI, Wallets, Net Banking</p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-card rounded-xl border border-border p-6 h-fit lg:sticky lg:top-24">
            <h2 className="font-heading text-lg font-semibold mb-4">Order Summary</h2>

            <div className="space-y-3 mb-6">
              {items.map((item) => (
                <div key={`${item.id}-${item.variantId || 'base'}`} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.variantName && <span className="text-primary">{item.variantName} • </span>}
                      ₹{item.price} × {item.quantity}
                      {item.originalPrice && item.originalPrice > item.price && (
                        <span className="ml-1 line-through text-muted-foreground/60">₹{item.originalPrice}</span>
                      )}
                    </p>
                  </div>
                  <p className="font-medium">₹{item.price * item.quantity}</p>
                </div>
              ))}
            </div>

            {totalSavings > 0 && (
              <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2 text-primary">
                  <Percent className="w-4 h-4" />
                  <span className="font-semibold">You're saving ₹{totalSavings.toFixed(0)}!</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Discount applied on selected products</p>
              </div>
            )}

            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Truck className="w-4 h-4" />
                  Delivery {isCalculating ? "" : deliveryDistance > 0 ? `(${deliveryDistance.toFixed(1)} km)` : ""}
                  {!isCalculating && (selectedAddress?.pincode || formData.pincode) && (
                    <button onClick={handleRecalculateDistance} className="ml-1 p-1 hover:bg-muted rounded-full transition-colors" title="Recalculate distance" type="button">
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  )}
                </span>
                {isCalculating ? (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Calculating...
                  </span>
                ) : deliveryUnavailable ? (
                  <span className="text-destructive text-xs">Unavailable</span>
                ) : (
                  <span className={deliveryCharge === 0 ? "text-primary" : ""}>
                    {deliveryCharge === 0 ? "Free" : `₹${deliveryCharge}`}
                  </span>
                )}
              </div>
              {deliveryUnavailable && deliveryError && (
                <div className="p-2 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {deliveryError}
                  </p>
                </div>
              )}
              {!deliveryUnavailable && deliveryCharge > 0 && !isCalculating && (
                <p className="text-xs text-muted-foreground">
                  ₹{settings.delivery_rate_per_km || 10}/km from our farm • {deliveryDistance.toFixed(1)} km to your location
                </p>
              )}
              {!deliveryUnavailable && deliveryCharge === 0 && total >= (settings.free_delivery_threshold || 399) && !isCalculating && (
                <p className="text-xs text-primary font-medium">
                  🎉 Free delivery on orders above ₹{settings.free_delivery_threshold || 399}!
                </p>
              )}
              {!deliveryUnavailable && total < (settings.free_delivery_threshold || 399) && !isCalculating && deliveryCharge > 0 && (
                <p className="text-xs text-primary font-medium">
                  Add ₹{((settings.free_delivery_threshold || 399) - total).toFixed(0)} more for FREE delivery!
                </p>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                <span>Total</span>
                <span>₹{grandTotal}</span>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full mt-6"
              disabled={isSubmitting || isCalculating || deliveryUnavailable || !hasActiveAddress}
              onClick={handleProceedToVerification}
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Processing...</>
              ) : isCalculating ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Calculating Delivery...</>
              ) : deliveryUnavailable ? (
                "Delivery Unavailable"
              ) : !hasActiveAddress ? (
                "Add Delivery Address"
              ) : (
                `Proceed to Verify • ₹${grandTotal}`
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-3">
              {deliveryUnavailable 
                ? "Please try a different delivery address"
                : !hasActiveAddress
                ? "Please add your delivery address to continue"
                : "You'll receive an OTP to verify your order"}
            </p>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-primary mb-2">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Farm Fresh Guarantee</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Harvested fresh on delivery day</li>
                <li>• 100% chemical free, zero chemicals</li>
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
