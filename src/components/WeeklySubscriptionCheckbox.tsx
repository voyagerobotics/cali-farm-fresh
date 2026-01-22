import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface WeeklySubscriptionCheckboxProps {
  email?: string;
  phone?: string;
  className?: string;
}

const WeeklySubscriptionCheckbox = ({ email, phone, className = "" }: WeeklySubscriptionCheckboxProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check existing subscription on mount
  useEffect(() => {
    const checkSubscription = async () => {
      const emailToCheck = email || user?.email;
      if (!emailToCheck) return;

      const { data } = await supabase
        .from("weekly_subscriptions")
        .select("is_active")
        .eq("email", emailToCheck)
        .single();

      if (data) {
        setIsSubscribed(data.is_active);
      }
    };

    checkSubscription();
  }, [email, user?.email]);

  const handleSubscriptionChange = async (checked: boolean) => {
    const emailToUse = email || user?.email;
    
    if (!emailToUse) {
      toast({
        title: "Email Required",
        description: "Please provide your email to subscribe for weekly reminders.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (checked) {
        // Try to insert or update
        const { error } = await supabase
          .from("weekly_subscriptions")
          .upsert({
            email: emailToUse,
            phone: phone || null,
            user_id: user?.id || null,
            is_active: true,
          }, { onConflict: "email" });

        if (error) throw error;

        toast({
          title: "Subscribed!",
          description: "You'll receive weekly reminders about fresh produce.",
        });
      } else {
        // Update to inactive
        const { error } = await supabase
          .from("weekly_subscriptions")
          .update({ is_active: false })
          .eq("email", emailToUse);

        if (error) throw error;

        toast({
          title: "Unsubscribed",
          description: "You won't receive weekly reminders anymore.",
        });
      }

      setIsSubscribed(checked);
    } catch (error: any) {
      console.error("Subscription error:", error);
      toast({
        title: "Error",
        description: "Failed to update subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Checkbox
        id="weekly-subscription"
        checked={isSubscribed}
        onCheckedChange={handleSubscriptionChange}
        disabled={isLoading}
      />
      <Label 
        htmlFor="weekly-subscription" 
        className="text-sm cursor-pointer flex items-center gap-2"
      >
        <Bell className="w-4 h-4 text-primary" />
        Subscribe for weekly reminders
      </Label>
    </div>
  );
};

export default WeeklySubscriptionCheckbox;
