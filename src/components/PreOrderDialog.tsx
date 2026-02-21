import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ShoppingBag, CreditCard, MapPin, Truck, RefreshCw, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePreOrders } from "@/hooks/usePreOrders";
import { useAddresses, UserAddress } from "@/hooks/useAddresses";
import { useDeliveryZones } from "@/hooks/useDeliveryZones";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import RazorpayPayment from "./RazorpayPayment";
import AddressManager from "./AddressManager";

interface PreOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  bannerId?: string;
  paymentRequired?: boolean;
  pricePerUnit?: number;
  unit?: string;
}

const PreOrderDialog = ({ open, onOpenChange, productName, bannerId, paymentRequired = false, pricePerUnit = 0, unit = "kg" }: PreOrderDialogProps) => {
  const { user } = useAuth();
  const { createPreOrder } = usePreOrders();
  const { addresses, defaultAddress } = useAddresses();
  const { calculateDeliveryDistance, isCalculating, clearCache } = useDeliveryZones();
  const { settings } = useSiteSettings();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showAddressManager, setShowAddressManager] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(null);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [deliveryDistance, setDeliveryDistance] = useState(0);
  const [deliveryUnavailable, setDeliveryUnavailable] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    quantity: 1,
    notes: "",
  });

  const productTotal = pricePerUnit * form.quantity;
  const grandTotal = productTotal + deliveryCharge;

  // Set default address when loaded
  useEffect(() => {
    if (defaultAddress && !selectedAddress && open) {
      setSelectedAddress(defaultAddress);
    }
  }, [defaultAddress, open]);

  // Calculate delivery when address changes
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
      const calculatedCharge = productTotal >= freeThreshold ? 0 : result.deliveryCharge;
      setDeliveryCharge(calculatedCharge);
      setDeliveryDistance(result.distanceKm);
    }
  }, [calculateDeliveryDistance, clearCache, productTotal, settings.free_delivery_threshold]);

  useEffect(() => {
    if (selectedAddress?.pincode) {
      calculateDelivery(selectedAddress.pincode);
    }
  }, [selectedAddress, calculateDelivery]);

  const handleRecalculateDistance = () => {
    if (selectedAddress?.pincode) {
      calculateDelivery(selectedAddress.pincode, true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      navigate("/auth");
      return;
    }

    if (!selectedAddress) {
      setShowAddressManager(true);
      return;
    }

    if (deliveryUnavailable) return;

    const name = selectedAddress.full_name || form.customer_name;
    const phone = selectedAddress.phone || form.customer_phone;
    if (!name || !phone) return;

    if (paymentRequired && pricePerUnit > 0) {
      setShowPayment(true);
      return;
    }

    await placePreOrder();
  };

  const placePreOrder = async (paymentId?: string) => {
    setIsSubmitting(true);
    const name = selectedAddress?.full_name || form.customer_name;
    const phone = selectedAddress?.phone || form.customer_phone;
    const deliveryAddr = selectedAddress ? `${selectedAddress.address}, ${selectedAddress.city} - ${selectedAddress.pincode}` : "";

    const success = await createPreOrder({
      product_name: productName,
      banner_id: bannerId,
      customer_name: name,
      customer_phone: phone,
      customer_email: user?.email || undefined,
      quantity: form.quantity,
      notes: form.notes || undefined,
      payment_status: paymentId ? "paid" : (paymentRequired ? "pending" : "not_required"),
      payment_amount: paymentRequired ? grandTotal : 0,
      razorpay_payment_id: paymentId,
      delivery_address: deliveryAddr,
      delivery_pincode: selectedAddress?.pincode || "",
      delivery_charge: deliveryCharge,
      delivery_distance_km: deliveryDistance,
    });

    if (success) {
      // Send confirmation email
      try {
        await supabase.functions.invoke("send-preorder-confirmation", {
          body: {
            email: user?.email || "",
            customerName: name,
            customerPhone: phone,
            productName,
            quantity: form.quantity,
            unit,
            pricePerUnit,
            totalAmount: paymentRequired ? grandTotal : 0,
            paymentStatus: paymentId ? "paid" : (paymentRequired ? "pending" : "not_required"),
            razorpayPaymentId: paymentId,
            notes: form.notes || undefined,
            deliveryAddress: deliveryAddr,
            deliveryCharge,
            deliveryDistance,
          },
        });
      } catch (emailErr) {
        console.error("Failed to send pre-order confirmation email:", emailErr);
      }
      setForm({ customer_name: "", customer_phone: "", quantity: 1, notes: "" });
      setSelectedAddress(null);
      onOpenChange(false);
      setShowPayment(false);
    }
    setIsSubmitting(false);
  };

  if (showPayment) {
    return (
      <RazorpayPayment
        amount={grandTotal}
        orderNumber={`PRE-${Date.now()}`}
        customerName={selectedAddress?.full_name || form.customer_name}
        customerEmail={user?.email || ""}
        customerPhone={selectedAddress?.phone || form.customer_phone}
        onPaymentSuccess={(paymentId) => placePreOrder(paymentId)}
        onPaymentFailure={() => setShowPayment(false)}
        onCancel={() => setShowPayment(false)}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Pre-Order: {productName}
          </DialogTitle>
          <DialogDescription>
            Reserve your order. We'll contact you when it's available.
          </DialogDescription>
        </DialogHeader>

        {!user ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-4">Please login to place a pre-order.</p>
            <Button onClick={() => navigate("/auth")}>Login / Sign Up</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="preorder-qty">Quantity ({unit})</Label>
              <Input
                id="preorder-qty"
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => setForm(f => ({ ...f, quantity: Number(e.target.value) }))}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="preorder-notes">Notes (optional)</Label>
              <Textarea
                id="preorder-notes"
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any preferences or special requests..."
                rows={2}
              />
            </div>

            {/* Delivery Address Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Delivery Address
                </Label>
                {addresses.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddressManager(!showAddressManager)}
                    className="text-xs"
                  >
                    {showAddressManager ? "Hide" : "Change"}
                  </Button>
                )}
              </div>

              {selectedAddress ? (
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 text-sm">
                  <p className="font-medium">{selectedAddress.full_name}</p>
                  <p className="text-muted-foreground">{selectedAddress.phone}</p>
                  <p className="text-muted-foreground mt-1">
                    {selectedAddress.address}, {selectedAddress.city} - {selectedAddress.pincode}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No address selected. Please add or select an address.</p>
              )}

              {(showAddressManager || !selectedAddress) && (
                <div className="border border-border rounded-lg p-3">
                  <AddressManager
                    showSelectMode
                    selectedId={selectedAddress?.id}
                    onSelect={(addr) => {
                      setSelectedAddress(addr);
                      setShowAddressManager(false);
                    }}
                  />
                </div>
              )}
            </div>

            {/* Delivery Charge Info */}
            {selectedAddress && (
              <div className="bg-muted/50 rounded-lg p-3 border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">Delivery</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRecalculateDistance}
                    disabled={isCalculating}
                    className="text-xs h-7"
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${isCalculating ? 'animate-spin' : ''}`} />
                    Recalculate
                  </Button>
                </div>

                {isCalculating ? (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> Calculating delivery...
                  </p>
                ) : deliveryUnavailable ? (
                  <div className="flex items-start gap-2 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{deliveryError}</span>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Distance: {deliveryDistance.toFixed(1)} km
                    </p>
                    <p className="text-sm">
                      {deliveryCharge === 0 ? (
                        <span className="text-primary font-medium">🎉 Free Delivery!</span>
                      ) : (
                        <span>Delivery Charge: <span className="font-bold">₹{deliveryCharge}</span></span>
                      )}
                    </p>
                    {deliveryCharge > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Free delivery on orders ≥ ₹{settings.free_delivery_threshold}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Payment Summary */}
            {paymentRequired && pricePerUnit > 0 && selectedAddress && !deliveryUnavailable && (
              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">Payment Summary</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">₹{pricePerUnit}/{unit} × {form.quantity}</span>
                    <span>₹{productTotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery</span>
                    <span>{deliveryCharge === 0 ? "Free" : `₹${deliveryCharge}`}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-border pt-1 mt-1">
                    <span>Total</span>
                    <span>₹{grandTotal}</span>
                  </div>
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || isCalculating || deliveryUnavailable || !selectedAddress}
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Placing Pre-Order...</>
              ) : !selectedAddress ? (
                "Select Delivery Address"
              ) : deliveryUnavailable ? (
                "Delivery Unavailable"
              ) : paymentRequired && pricePerUnit > 0 ? (
                <><CreditCard className="w-4 h-4 mr-2" /> Pay ₹{grandTotal} & Pre-Order</>
              ) : (
                "Place Pre-Order"
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PreOrderDialog;
