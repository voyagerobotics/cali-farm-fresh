import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Leaf, Mail, Lock, User, Phone, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(4, "Password must be at least 4 characters");
const phoneSchema = z.string().min(10, "Please enter a valid phone number").max(15);
const nameSchema = z.string().min(2, "Name must be at least 2 characters").max(100);

const Auth = () => {
  const [searchParams] = useSearchParams();
  const isAdminLogin = searchParams.get("type") === "admin";
  
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resetStep, setResetStep] = useState<"email" | "otp" | "newPassword">("email");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
  });

  const { signIn, signUp, user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      if (isAdminLogin && isAdmin) {
        navigate("/admin");
      } else if (!isAdminLogin) {
        navigate("/");
      }
    }
  }, [user, isAdmin, isAdminLogin, navigate]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    try {
      emailSchema.parse(formData.email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }

    try {
      passwordSchema.parse(formData.password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }

    if (!isLogin) {
      try {
        nameSchema.parse(formData.fullName);
      } catch (e) {
        if (e instanceof z.ZodError) {
          newErrors.fullName = e.errors[0].message;
        }
      }

      try {
        phoneSchema.parse(formData.phone);
      } catch (e) {
        if (e instanceof z.ZodError) {
          newErrors.phone = e.errors[0].message;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(formData.email);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setErrors({ email: err.errors[0].message });
        return;
      }
    }
    
    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-password-reset-otp', {
        body: { email: formData.email }
      });
      
      if (error) {
        toast({
          title: "Error",
          description: error.message || "Failed to send OTP",
          variant: "destructive",
        });
      } else {
        setResetStep("otp");
        toast({
          title: "OTP Sent!",
          description: "Check your email for the 6-digit code.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to send OTP",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyAndResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match" });
      return;
    }
    
    try {
      passwordSchema.parse(newPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setErrors({ newPassword: err.errors[0].message });
        return;
      }
    }
    
    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('verify-password-reset-otp', {
        body: { 
          email: formData.email,
          otp: otpCode,
          newPassword: newPassword
        }
      });
      
      if (error) {
        toast({
          title: "Error",
          description: error.message || "Failed to reset password",
          variant: "destructive",
        });
      } else if (data?.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Password Reset!",
          description: "Your password has been updated. Please login.",
        });
        setShowForgotPassword(false);
        setResetStep("email");
        setOtpCode("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          const msg = error.message || "Login failed";

          toast({
            title: "Login Failed",
            description:
              msg === "Invalid login credentials"
                ? "Email or password is incorrect. If you created your account earlier, use ‘Forgot password?’ once to set a new password."
                : msg,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Welcome back!",
            description: "You have successfully logged in.",
          });
        }
      } else {
        const { error } = await signUp(
          formData.email,
          formData.password,
          formData.fullName,
          formData.phone
        );
        if (error) {
          const errorMsg = error.message.toLowerCase();
          
          // Check if account already exists - switch to login mode with email prefilled
          if (errorMsg.includes("already") || 
              errorMsg.includes("exists") ||
              errorMsg.includes("registered")) {
            toast({
              title: "Account Already Exists",
              description: "Switching to login. Please enter your password.",
            });
            setIsLogin(true);
            setFormData(prev => ({ ...prev, password: "" }));
          } 
          // Handle weak/pwned password errors with friendly message
          else if (errorMsg.includes("weak") || errorMsg.includes("pwned") || errorMsg.includes("easy to guess")) {
            toast({
              title: "Please Choose a Stronger Password",
              description: "This password is too common or has been exposed in data breaches. Try a unique password with at least 6 characters.",
              variant: "destructive",
            });
          }
          else {
            toast({
              title: "Registration Failed",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Account Created!",
            description: "Welcome! If you’re not logged in yet, please check your email (or just try logging in).",
          });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Forgot Password View
  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => {
              setShowForgotPassword(false);
              setResetStep("email");
              setOtpCode("");
              setNewPassword("");
              setConfirmPassword("");
              setErrors({});
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Button>

          <div className="bg-card rounded-2xl border border-border shadow-elevated p-8">
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                <Leaf className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>

            <h2 className="font-heading text-2xl font-bold text-foreground text-center mb-2">
              Reset Password
            </h2>
            <p className="text-muted-foreground text-center mb-6">
              {resetStep === "email" && "Enter your email to receive an OTP"}
              {resetStep === "otp" && "Enter the 6-digit code sent to your email"}
              {resetStep === "newPassword" && "Set your new password"}
            </p>

            {resetStep === "email" && (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="your@email.com"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-destructive mt-1">{errors.email}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? "Sending..." : "Send OTP"}
                </Button>
              </form>
            )}

            {resetStep === "otp" && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otpCode}
                    onChange={(value) => {
                      setOtpCode(value);
                      if (value.length === 6) {
                        setResetStep("newPassword");
                      }
                    }}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  We sent a code to <strong>{formData.email}</strong>
                </p>
                <Button
                  variant="outline"
                  onClick={() => setResetStep("email")}
                  className="w-full"
                >
                  Resend OTP
                </Button>
              </div>
            )}

            {resetStep === "newPassword" && (
              <form onSubmit={handleVerifyAndResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
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
                  {errors.newPassword && (
                    <p className="text-sm text-destructive mt-1">{errors.newPassword}</p>
                  )}
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
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive mt-1">{errors.confirmPassword}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? "Resetting..." : "Reset Password"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        <div className="bg-card rounded-2xl border border-border shadow-elevated p-8">
          {/* Logo */}
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

          {/* Title */}
          <h2 className="font-heading text-2xl font-bold text-foreground text-center mb-2">
            {isAdminLogin ? "Admin Login" : isLogin ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="text-muted-foreground text-center mb-6">
            {isAdminLogin 
              ? "Access your admin dashboard" 
              : isLogin 
                ? "Login to order fresh chemical free vegetables" 
                : "Join us to get farm-fresh vegetables"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Enter your full name"
                    />
                  </div>
                  {errors.fullName && (
                    <p className="text-sm text-destructive mt-1">{errors.fullName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Phone / WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Your WhatsApp number"
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-sm text-destructive mt-1">{errors.phone}</p>
                  )}
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="your@email.com"
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
              {!isLogin && (
                <p className="text-xs text-muted-foreground mt-1">Minimum 4 characters</p>
              )}
              {errors.password && (
                <p className="text-sm text-destructive mt-1">{errors.password}</p>
              )}
            </div>

            {isLogin && !isAdminLogin && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? "Please wait..." : isLogin ? "Login" : "Create Account"}
            </Button>
          </form>

          {!isAdminLogin && (
            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="ml-1 text-primary font-medium hover:underline"
                >
                  {isLogin ? "Sign up" : "Login"}
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
