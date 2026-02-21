import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ShoppingBag, CreditCard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePreOrders } from "@/hooks/usePreOrders";
import { useNavigate } from "react-router-dom";
import RazorpayPayment from "./RazorpayPayment";

interface PreOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  bannerId?: string;
  paymentRequired?: boolean;
  pricePerUnit?: number;
}

const PreOrderDialog = ({ open, onOpenChange, productName, bannerId, paymentRequired = false, pricePerUnit = 0 }: PreOrderDialogProps) => {
  const { user } = useAuth();
  const { createPreOrder } = usePreOrders();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    quantity: 1,
    notes: "",
  });

  const totalAmount = pricePerUnit * form.quantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      navigate("/auth");
      return;
    }

    if (!form.customer_name || !form.customer_phone) return;

    if (paymentRequired && pricePerUnit > 0) {
      setShowPayment(true);
      return;
    }

    await placePreOrder();
  };

  const placePreOrder = async (paymentId?: string) => {
    setIsSubmitting(true);
    const success = await createPreOrder({
      product_name: productName,
      banner_id: bannerId,
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      customer_email: user?.email || undefined,
      quantity: form.quantity,
      notes: form.notes || undefined,
      payment_status: paymentId ? "paid" : (paymentRequired ? "pending" : "not_required"),
      payment_amount: paymentRequired ? totalAmount : 0,
      razorpay_payment_id: paymentId,
    });

    if (success) {
      setForm({ customer_name: "", customer_phone: "", quantity: 1, notes: "" });
      onOpenChange(false);
      setShowPayment(false);
    }
    setIsSubmitting(false);
  };

  if (showPayment) {
    return (
      <RazorpayPayment
        amount={totalAmount}
        orderNumber={`PRE-${Date.now()}`}
        customerName={form.customer_name}
        customerEmail={user?.email || ""}
        customerPhone={form.customer_phone}
        onPaymentSuccess={(paymentId) => placePreOrder(paymentId)}
        onPaymentFailure={() => setShowPayment(false)}
        onCancel={() => setShowPayment(false)}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
            <div className="space-y-2">
              <Label htmlFor="preorder-name">Your Name</Label>
              <Input
                id="preorder-name"
                value={form.customer_name}
                onChange={(e) => setForm(f => ({ ...f, customer_name: e.target.value }))}
                placeholder="Full name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preorder-phone">Phone Number</Label>
              <Input
                id="preorder-phone"
                value={form.customer_phone}
                onChange={(e) => setForm(f => ({ ...f, customer_phone: e.target.value }))}
                placeholder="10-digit phone number"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preorder-qty">Quantity</Label>
              <Input
                id="preorder-qty"
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => setForm(f => ({ ...f, quantity: Number(e.target.value) }))}
              />
            </div>
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

            {paymentRequired && pricePerUnit > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">Payment Required</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  ₹{pricePerUnit} × {form.quantity} = <span className="font-bold text-foreground">₹{totalAmount}</span>
                </p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Placing Pre-Order...</>
              ) : paymentRequired && pricePerUnit > 0 ? (
                <><CreditCard className="w-4 h-4 mr-2" /> Pay ₹{totalAmount} & Pre-Order</>
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
