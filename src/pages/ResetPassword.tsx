import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Leaf, Lock, ArrowLeft, Eye, EyeOff, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const passwordSchema = z.string().min(4, "Password must be at least 4 characters");

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const { updatePassword, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // If no user session from the recovery link, redirect to auth
    if (!user) {
      const timer = setTimeout(() => {
        if (!user) {
          toast({
            title: "Session Expired",
            description: "Please request a new password reset link.",
            variant: "destructive",
          });
          navigate("/auth");
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      passwordSchema.parse(password);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        return;
      }
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await updatePassword(password);
      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setIsSuccess(true);
        toast({
          title: "Password Updated!",
          description: "Your password has been successfully changed.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl border border-border shadow-elevated p-8 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-2">
              Password Updated!
            </h2>
            <p className="text-muted-foreground mb-6">
              Your password has been successfully changed.
            </p>
            <Button onClick={() => navigate("/")} className="w-full">
              Continue Shopping
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        <div className="bg-card rounded-2xl border border-border shadow-elevated p-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
              <Leaf className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="text-left">
              <h1 className="font-heading text-xl font-bold text-foreground">
                California Farms
              </h1>
              <p className="text-xs text-muted-foreground">India</p>
            </div>
          </div>

          <h2 className="font-heading text-2xl font-bold text-foreground text-center mb-2">
            Set New Password
          </h2>
          <p className="text-muted-foreground text-center mb-6">
            Enter your new password below
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Minimum 4 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;