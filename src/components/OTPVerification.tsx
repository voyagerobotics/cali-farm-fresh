import { useState, useRef, useEffect } from "react";
import { Mail, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OTPVerificationProps {
  email: string;
  userId: string;
  onVerified: () => void;
  onCancel: () => void;
}

const OTPVerification = ({ email, userId, onVerified, onCancel }: OTPVerificationProps) => {
  const { toast } = useToast();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const sendOTP = async () => {
    setIsSending(true);
    setError("");

    try {
      const { data, error } = await supabase.functions.invoke("send-order-otp", {
        body: { email, userId },
      });

      if (error) throw error;

      if (data.success) {
        setOtpSent(true);
        setCountdown(60);
        toast({
          title: "OTP Sent!",
          description: `Verification code sent to ${email}`,
        });
        // Focus first input
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      } else {
        throw new Error(data.error || "Failed to send OTP");
      }
    } catch (error: any) {
      setError(error.message || "Failed to send OTP. Please try again.");
      toast({
        title: "Error",
        description: error.message || "Failed to send OTP",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const verifyOTP = async () => {
    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.functions.invoke("verify-order-otp", {
        body: { userId, otpCode },
      });

      if (error) throw error;

      if (data.valid) {
        toast({
          title: "Verified!",
          description: "Your order is being processed",
        });
        onVerified();
      } else {
        setError(data.error || "Invalid OTP code");
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch (error: any) {
      setError(error.message || "Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError("");

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);
    inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-lg animate-scale-in">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-heading text-xl font-bold mb-2">Verify Your Order</h2>
          <p className="text-sm text-muted-foreground">
            {otpSent
              ? `Enter the 6-digit code sent to ${email}`
              : `We'll send a verification code to ${email}`}
          </p>
        </div>

        {!otpSent ? (
          <div className="space-y-4">
            <Button
              onClick={sendOTP}
              disabled={isSending}
              className="w-full"
              size="lg"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Verification Code"
              )}
            </Button>
            <Button variant="outline" onClick={onCancel} className="w-full">
              Cancel
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* OTP Input */}
            <div className="flex justify-center gap-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="w-12 h-14 text-center text-2xl font-bold rounded-lg border-2 border-input bg-background focus:outline-none focus:border-primary transition-colors"
                />
              ))}
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive justify-center">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {/* Verify Button */}
            <Button
              onClick={verifyOTP}
              disabled={isLoading || otp.join("").length !== 6}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Verify & Place Order
                </>
              )}
            </Button>

            {/* Resend */}
            <div className="text-center text-sm">
              {countdown > 0 ? (
                <span className="text-muted-foreground">
                  Resend code in {countdown}s
                </span>
              ) : (
                <button
                  onClick={sendOTP}
                  disabled={isSending}
                  className="text-primary hover:underline"
                >
                  Resend verification code
                </button>
              )}
            </div>

            <Button variant="ghost" onClick={onCancel} className="w-full">
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OTPVerification;
