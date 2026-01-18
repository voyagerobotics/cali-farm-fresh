import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook for server-side admin role verification.
 * Provides defense-in-depth by verifying admin role directly from the database
 * in addition to the client-side role check in AuthContext.
 */
export const useAdminVerification = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  const verifyAdminRole = useCallback(async () => {
    if (!user) {
      setIsVerified(false);
      setIsVerifying(false);
      return false;
    }

    try {
      // Server-side verification: Query the database directly for admin role
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (error) {
        console.error("Error verifying admin role:", error);
        setIsVerified(false);
        setIsVerifying(false);
        return false;
      }

      const hasAdminRole = !!data;
      setIsVerified(hasAdminRole);
      setIsVerifying(false);

      if (!hasAdminRole) {
        // Redirect non-admin users
        navigate("/");
      }

      return hasAdminRole;
    } catch (error) {
      console.error("Error in admin verification:", error);
      setIsVerified(false);
      setIsVerifying(false);
      return false;
    }
  }, [user, navigate]);

  useEffect(() => {
    // Only run verification after auth state is fully loaded
    if (authLoading) {
      return;
    }
    
    // Small delay to ensure auth state is stable after page reload
    const timer = setTimeout(() => {
      if (!user) {
        setIsVerified(false);
        setIsVerifying(false);
        navigate("/auth?type=admin", { replace: true });
      } else {
        verifyAdminRole();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [user, authLoading, verifyAdminRole, navigate]);

  return {
    isVerified,
    isVerifying: authLoading || isVerifying,
    verifyAdminRole,
  };
};
