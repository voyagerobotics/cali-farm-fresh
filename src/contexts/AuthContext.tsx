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

interface CustomAuthResponse {
  success?: boolean;
  error?: string;
  token_hash?: string;
  type?: "magiclink";
  email?: string;
  session?: Session;
  user?: User;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isNetworkIssue = (error: unknown) => {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error && "message" in error
          ? String((error as { message?: unknown }).message ?? "")
          : String(error ?? "");

    const lower = message.toLowerCase();
    return (
      lower.includes("failed to fetch") ||
      lower.includes("network request failed") ||
      lower.includes("networkerror") ||
      lower.includes("load failed")
    );
  };

  const clearLocalAuthSession = async () => {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch (error) {
      console.warn("Failed clearing local auth session:", error);
    } finally {
      setUser(null);
      setSession(null);
      setRole(null);
    }
  };

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
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      // Defer role fetching with setTimeout to avoid deadlock
      if (nextSession?.user) {
        setTimeout(() => {
          fetchUserRole(nextSession.user.id);
        }, 0);
      } else {
        setRole(null);
      }
      setIsLoading(false);
    });

    // THEN check for existing session
    const initializeSession = async () => {
      try {
        const {
          data: { session: initialSession },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          if (isNetworkIssue(error)) {
            await clearLocalAuthSession();
          }
        } else {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);

          if (initialSession?.user) {
            fetchUserRole(initialSession.user.id);
          } else {
            setRole(null);
          }
        }
      } catch (error) {
        if (isNetworkIssue(error)) {
          await clearLocalAuthSession();
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      // Clear potentially corrupt local auth state before a fresh login attempt
      await clearLocalAuthSession();

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

      const result: CustomAuthResponse = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error("Custom sign in failed:", result);
        return { error: new Error(result.error || "Invalid email or password") };
      }

      // If custom auth returned a magic link token, verify it
      if (result.token_hash && result.type === "magiclink") {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: result.token_hash,
          type: "magiclink",
        });

        if (error) {
          console.error("Token verification failed:", error);
          return { error: new Error("Authentication failed. Please try again.") };
        }

        // Session will be automatically persisted by the Supabase client
        // The onAuthStateChange listener will update our state
        console.log("Magic link verified successfully, session persisted");

        return { error: null };
      }

      // If custom auth returned a session directly (standard auth fallback)
      if (result.session) {
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token,
        });

        if (setSessionError) {
          if (isNetworkIssue(setSessionError)) {
            // Fallback: keep the fresh session in memory to unblock login when token refresh endpoint is flaky
            const optimisticSession = result.session;
            const optimisticUser = result.user ?? result.session.user;
            setSession(optimisticSession);
            setUser(optimisticUser);
            if (optimisticUser?.id) {
              setTimeout(() => {
                fetchUserRole(optimisticUser.id);
              }, 0);
            }
            return { error: null };
          }

          console.error("Failed to set session:", setSessionError);
          return { error: new Error("Authentication failed. Please try again.") };
        }

        console.log("Session set successfully and will be persisted");

        return { error: null };
      }

      return { error: new Error("Authentication failed. Please try again.") };
    } catch (err) {
      console.error("Sign in error:", err);
      if (isNetworkIssue(err)) {
        await clearLocalAuthSession();
      }
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
