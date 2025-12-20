import { useState } from "react";
import { QrCode, Copy, Check, Smartphone, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface UPIPaymentProps {
  amount: number;
  orderNumber: string;
  onPaymentConfirm: (upiReference: string) => void;
  onCancel: () => void;
}

// You can replace this with your actual UPI ID
const UPI_ID = "californiafarmsindia@paytm";

const UPIPayment = ({ amount, orderNumber, onPaymentConfirm, onCancel }: UPIPaymentProps) => {
  const { toast } = useToast();
  const [upiReference, setUpiReference] = useState("");
  const [copied, setCopied] = useState(false);
  const [showReferenceInput, setShowReferenceInput] = useState(false);

  const copyUPIId = async () => {
    try {
      await navigator.clipboard.writeText(UPI_ID);
      setCopied(true);
      toast({ title: "UPI ID copied!" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const handlePaymentDone = () => {
    setShowReferenceInput(true);
  };

  const handleConfirmPayment = () => {
    if (!upiReference.trim()) {
      toast({
        title: "Reference Required",
        description: "Please enter the UPI transaction reference number",
        variant: "destructive",
      });
      return;
    }
    onPaymentConfirm(upiReference.trim());
  };

  // Generate UPI deep link
  const upiDeepLink = `upi://pay?pa=${UPI_ID}&pn=California%20Farms%20India&am=${amount}&tn=Order%20${orderNumber}&cu=INR`;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-md w-full shadow-lg animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="bg-primary p-4 text-primary-foreground text-center">
          <h2 className="font-heading text-xl font-bold">Pay with UPI</h2>
          <p className="text-sm opacity-90">Order #{orderNumber}</p>
        </div>

        <div className="p-6">
          {!showReferenceInput ? (
            <>
              {/* Amount */}
              <div className="text-center mb-6">
                <p className="text-sm text-muted-foreground">Amount to Pay</p>
                <p className="text-4xl font-bold text-primary">₹{amount}</p>
              </div>

              {/* QR Code Placeholder */}
              <div className="bg-muted/50 rounded-xl p-6 mb-6 text-center">
                <div className="w-48 h-48 mx-auto bg-card rounded-lg flex items-center justify-center border-2 border-dashed border-border mb-4">
                  <div className="text-center">
                    <QrCode className="w-16 h-16 mx-auto text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground">
                      Scan QR with any UPI app
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Contact admin to get the payment QR code
                </p>
              </div>

              {/* Or Divider */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-border" />
                <span className="text-sm text-muted-foreground">OR</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* UPI ID */}
              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-2 text-center">
                  Pay to this UPI ID
                </p>
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <span className="flex-1 font-mono text-sm break-all">
                    {UPI_ID}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={copyUPIId}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-primary" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* UPI Apps */}
              <a
                href={upiDeepLink}
                className="flex items-center justify-center gap-2 p-3 bg-primary/10 rounded-lg text-primary hover:bg-primary/20 transition-colors mb-4"
              >
                <Smartphone className="w-5 h-5" />
                <span className="font-medium">Open in UPI App</span>
              </a>

              {/* Instructions */}
              <div className="p-3 bg-secondary/10 rounded-lg mb-6">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">How to pay:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Open any UPI app (GPay, PhonePe, Paytm)</li>
                      <li>Scan QR or enter the UPI ID above</li>
                      <li>Enter amount: ₹{amount}</li>
                      <li>Complete payment & note the reference number</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={onCancel} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handlePaymentDone} className="flex-1">
                  I've Paid
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Reference Number Input */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-heading text-lg font-bold mb-2">
                  Enter Transaction Details
                </h3>
                <p className="text-sm text-muted-foreground">
                  Enter the UPI reference/transaction ID from your payment app
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  UPI Reference Number *
                </label>
                <input
                  type="text"
                  value={upiReference}
                  onChange={(e) => setUpiReference(e.target.value)}
                  placeholder="e.g., 408765432123 or TXN12345678"
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  You can find this in your UPI app under transaction history
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowReferenceInput(false)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button onClick={handleConfirmPayment} className="flex-1">
                  Confirm Order
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UPIPayment;
