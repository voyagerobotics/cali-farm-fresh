import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ShoppingBag, CreditCard, MapPin, Truck, RefreshCw, AlertCircle, Check, Tag } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePreOrders } from "@/hooks/usePreOrders";
import { useAddresses, UserAddress } from "@/hooks/useAddresses";
import { useDeliveryZones } from "@/hooks/useDeliveryZones";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { WeightOption } from "@/hooks/usePromotionalBanners";
import { cn } from "@/lib/utils";
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
  weightOptions?: WeightOption[] | null;
  discountPercent?: number;
  hideQuantity?: boolean;
}

const PreOrderDialog = ({
  open,
  onOpenChange,
  productName,
  bannerId,
  paymentRequired = false,
  pricePerUnit = 0,
  unit = "kg",
  weightOptions = null,
  discountPercent = 20,
}: PreOrderDialogProps) => {
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
  const [selectedWeight, setSelectedWeight] = useState<WeightOption | null>(null);
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    quantity: 1,
    notes: "",
  });

  const hasWeightOptions = weightOptions && weightOptions.length > 0;

  // Determine effective price based on weight selection or base price
  const effectivePrice = hasWeightOptions && selectedWeight
    ? selectedWeight.price
    : pricePerUnit;

  const originalPrice = Math.round(effectivePrice / (1 - discountPercent / 100));
  const productTotal = effectivePrice * form.quantity;
  const grandTotal = productTotal + deliveryCharge;

  // Auto-select first weight option
  useEffect(() => {
    if (hasWeightOptions && !selectedWeight && open) {
      setSelectedWeight(weightOptions![0]);
    }
  }, [weightOptions, open]);

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

    if (hasWeightOptions && !selectedWeight) return;

    const name = selectedAddress.full_name || form.customer_name;
    const phone = selectedAddress.phone || form.customer_phone;
    if (!name || !phone) return;

    if (paymentRequired && effectivePrice > 0) {
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

    const weightNote = selectedWeight ? `Weight: ${selectedWeight.label}` : "";
    const combinedNotes = [weightNote, form.notes].filter(Boolean).join(" | ");

    const success = await createPreOrder({
      product_name: productName,
      banner_id: bannerId,
      customer_name: name,
      customer_phone: phone,
      customer_email: user?.email || undefined,
      quantity: form.quantity,
      notes: combinedNotes || undefined,
      payment_status: paymentId ? "paid" : (paymentRequired ? "pending" : "not_required"),
      payment_amount: paymentRequired ? grandTotal : 0,
      razorpay_payment_id: paymentId,
      delivery_address: deliveryAddr,
      delivery_pincode: selectedAddress?.pincode || "",
      delivery_charge: deliveryCharge,
      delivery_distance_km: deliveryDistance,
    });

    if (success) {
      try {
        await supabase.functions.invoke("send-preorder-confirmation", {
          body: {
            email: user?.email || "",
            customerName: name,
            customerPhone: phone,
            productName: `${productName}${selectedWeight ? ` (${selectedWeight.label})` : ""}`,
            quantity: form.quantity,
            unit: hasWeightOptions ? "piece" : unit,
            pricePerUnit: effectivePrice,
            totalAmount: paymentRequired ? grandTotal : 0,
            paymentStatus: paymentId ? "paid" : (paymentRequired ? "pending" : "not_required"),
            razorpayPaymentId: paymentId,
            notes: combinedNotes || undefined,
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
      setSelectedWeight(null);
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
            {/* Weight Range Selector */}
            {hasWeightOptions && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" />
                  Select Weight Range
                </Label>
                <div className="grid grid-cols-1 gap-2">
                  {weightOptions!.map((opt, idx) => {
                    const isSelected = selectedWeight?.label === opt.label;
                    const optOriginalPrice = Math.round(opt.price / (1 - discountPercent / 100));
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedWeight(opt)}
                        className={cn(
                          "relative flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary shadow-sm"
                            : "border-border bg-card hover:border-primary/50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                            isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                          )}>
                            {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>
                          <span className="font-semibold">{opt.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs line-through text-muted-foreground">₹{optOriginalPrice}</span>
                          <span className="font-bold text-base">₹{opt.price}</span>
                          <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full font-semibold">
                            {discountPercent}% OFF
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="preorder-qty">Quantity ({hasWeightOptions ? "pieces" : unit})</Label>
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
            {paymentRequired && effectivePrice > 0 && selectedAddress && !deliveryUnavailable && (
              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">Payment Summary</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {selectedWeight ? `${selectedWeight.label}` : `₹${effectivePrice}/${unit}`} × {form.quantity}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs line-through text-muted-foreground">₹{originalPrice * form.quantity}</span>
                      <span>₹{productTotal}</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-green-600 dark:text-green-400 text-xs">
                    <span>Discount ({discountPercent}%)</span>
                    <span>-₹{(originalPrice * form.quantity) - productTotal}</span>
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
              disabled={isSubmitting || isCalculating || deliveryUnavailable || !selectedAddress || (hasWeightOptions && !selectedWeight)}
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Placing Pre-Order...</>
              ) : !selectedAddress ? (
                "Select Delivery Address"
              ) : hasWeightOptions && !selectedWeight ? (
                "Select Weight Range"
              ) : deliveryUnavailable ? (
                "Delivery Unavailable"
              ) : paymentRequired && effectivePrice > 0 ? (
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
