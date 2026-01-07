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
      // Use custom sign-in edge function
      const { data, error } = await supabase.functions.invoke("custom-sign-in", {
        body: { email, password },
      });

      if (error) {
        return { error: new Error(error.message || "Sign in failed") };
      }

      if (data?.error) {
        return { error: new Error(data.error) };
      }

      // If we got a session directly (fallback to Supabase auth)
      if (data?.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        return { error: null };
      }

      // If we got a magic link token (custom password auth)
      if (data?.token && data?.email) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email: data.email,
          token: data.token,
          type: "magiclink",
        });

        if (verifyError) {
          return { error: new Error(verifyError.message) };
        }
        return { error: null };
      }

      return { error: new Error("Sign in failed") };
    } catch (err) {
      console.error("Sign in error:", err);
      return { error: err instanceof Error ? err : new Error("Sign in failed") };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, phone: string) => {
    try {
      // Use custom sign-up edge function
      const { data, error } = await supabase.functions.invoke("custom-sign-up", {
        body: { email, password, fullName, phone },
      });

      if (error) {
        return { error: new Error(error.message || "Sign up failed") };
      }

      if (data?.error) {
        return { error: new Error(data.error) };
      }

      // If we got a magic link token, verify it to sign in
      if (data?.token && data?.email) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email: data.email,
          token: data.token,
          type: "magiclink",
        });

        if (verifyError) {
          // Account created but couldn't auto-sign-in
          console.log("Account created, but couldn't auto-sign-in:", verifyError);
        }
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
