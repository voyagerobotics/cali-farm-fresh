import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type UserRole = "admin" | "customer";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserRole = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (!error && data) {
      setRole(data.role as UserRole);
    } else {
      // Default to customer if role can't be fetched (e.g. missing policy/record)
      setRole("customer");
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer role fetching with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setRole(null);
        }
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      // First try the custom sign-in edge function (handles custom passwords)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/custom-sign-in`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Custom sign in failed:", result);
        return { error: new Error(result.error || "Invalid email or password") };
      }

      // If custom auth returned a magic link token, verify it
      if (result.token_hash && result.type === "magiclink") {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: result.token_hash,
          type: "magiclink",
        });

        if (error) {
          console.error("Token verification failed:", error);
          return { error: new Error("Authentication failed. Please try again.") };
        }

        setSession(data.session);
        setUser(data.session?.user ?? null);
        
        // Fetch user role after successful login
        if (data.session?.user) {
          await fetchUserRole(data.session.user.id);
        }
        
        return { error: null };
      }

      // If custom auth returned a session directly (standard auth fallback)
      if (result.session) {
        setSession(result.session);
        setUser(result.session?.user ?? null);
        
        // Fetch user role after successful login
        if (result.session?.user) {
          await fetchUserRole(result.session.user.id);
        }
        
        return { error: null };
      }

      return { error: new Error("Authentication failed. Please try again.") };
    } catch (err) {
      console.error("Sign in error:", err);
      return { error: err instanceof Error ? err : new Error("Sign in failed") };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, phone: string) => {
    try {
      // Use custom sign-up edge function to bypass pwned password checks
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/custom-sign-up`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ email, password, fullName, phone }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Custom sign up failed:", result);
        return { error: new Error(result.error || "Registration failed") };
      }

      // If custom auth returned a magic link token, verify it to log the user in
      if (result.token_hash && result.type === "magiclink") {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: result.token_hash,
          type: "magiclink",
        });

        if (error) {
          console.error("Token verification failed:", error);
          // Account was created, but auto-login failed - user can log in manually
          return { error: null };
        }

        setSession(data.session);
        setUser(data.session?.user ?? null);
        return { error: null };
      }

      // If requiresSignIn is true, account was created but needs manual login
      if (result.requiresSignIn) {
        return { error: null };
      }

      return { error: null };
    } catch (err) {
      console.error("Sign up error:", err);
      return { error: err instanceof Error ? err : new Error("Sign up failed") };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/reset-password`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error: error ? new Error(error.message) : null };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error: error ? new Error(error.message) : null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        isLoading,
        isAdmin: role === "admin",
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
