import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RazorpayPaymentProps {
  amount: number;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  onPaymentSuccess: (paymentId: string) => void;
  onPaymentFailure: (error: string) => void;
  onCancel: () => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const RazorpayPayment = ({
  amount,
  orderNumber,
  customerName,
  customerEmail,
  customerPhone,
  onPaymentSuccess,
  onPaymentFailure,
  onCancel,
}: RazorpayPaymentProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      initializePayment();
    };
    script.onerror = () => {
      setError("Failed to load payment gateway");
      setIsLoading(false);
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const initializePayment = async () => {
    try {
      // Create Razorpay order
      const { data, error: fnError } = await supabase.functions.invoke(
        "create-razorpay-order",
        {
          body: {
            amount,
            orderNumber,
            customerName,
            customerEmail,
            customerPhone,
          },
        }
      );

      if (fnError || data?.error) {
        throw new Error(data?.error || fnError?.message || "Failed to create order");
      }

      setIsLoading(false);

      // Open Razorpay checkout
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "California Farms India",
        description: `Order #${orderNumber}`,
        order_id: data.orderId,
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone,
        },
        theme: {
          color: "#22c55e",
        },
        handler: async function (response: any) {
          // Verify payment
          const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
            "verify-razorpay-payment",
            {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                order_number: orderNumber,
              },
            }
          );

          if (verifyError || !verifyData?.verified) {
            onPaymentFailure("Payment verification failed");
            return;
          }

          onPaymentSuccess(response.razorpay_payment_id);
        },
        modal: {
          ondismiss: function () {
            onCancel();
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", function (response: any) {
        onPaymentFailure(response.error.description || "Payment failed");
      });
      razorpay.open();
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
      toast({
        title: "Payment Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={onCancel}>Go Back</Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Initializing payment...</p>
        </div>
      </div>
    );
  }

  return null;
};

export default RazorpayPayment;
