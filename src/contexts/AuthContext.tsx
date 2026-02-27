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
  role?: UserRole;
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
      lower.includes("load failed") ||
      lower.includes("timeout") ||
      lower.includes("timed out") ||
      lower.includes("aborted")
    );
  };

  const withTimeout = async <T,>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string,
  ): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(timeoutMessage));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  };

  const clearSupabaseAuthStorage = () => {
    if (typeof window === "undefined") return;

    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const projectScopedPrefixes = projectId
      ? [`sb-${projectId}-auth-token`, `sb-${projectId}-code-verifier`]
      : [];

    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;

      const isProjectScoped = projectScopedPrefixes.some((prefix) => key.startsWith(prefix));
      const looksLikeSupabaseAuthKey =
        key.startsWith("sb-") && (key.includes("auth-token") || key.includes("code-verifier"));

      if (isProjectScoped || looksLikeSupabaseAuthKey) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
  };

  const clearLocalAuthSession = async () => {
    clearSupabaseAuthStorage();

    try {
      await withTimeout(
        supabase.auth.signOut({ scope: "local" }),
        2500,
        "Local auth cleanup timed out",
      );
    } catch (error) {
      console.warn("Failed clearing local auth session:", error);
    } finally {
      setUser(null);
      setSession(null);
      setRole(null);
    }
  };

  const fetchUserRole = async (userId: string) => {
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .maybeSingle();

        if (!error && data?.role) {
          setRole(data.role as UserRole);
          return;
        }

        if (!error && !data) {
          // No row found - preserve existing admin role or default to customer
          setRole((previousRole) => (previousRole === "admin" ? "admin" : "customer"));
          return;
        }

        const networkFailure = isNetworkIssue(error?.message ?? "");
        const canRetry = networkFailure && attempt < maxAttempts;

        if (canRetry) {
          await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
          continue;
        }

        // On final failure, preserve existing role
        setRole((previousRole) => (previousRole === "admin" ? "admin" : "customer"));
        return;
      } catch (err) {
        if (attempt < maxAttempts && isNetworkIssue(err)) {
          await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
          continue;
        }
        setRole((previousRole) => (previousRole === "admin" ? "admin" : "customer"));
        return;
      }
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

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
            // Don't clear session on network issues during init - user may have valid cached session
            console.warn("Network issue during session init, keeping existing state");
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
          console.warn("Network issue during session init");
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

      // First try the custom sign-in endpoint (handles custom passwords)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      let result: CustomAuthResponse | null = null;
      let customSignInNetworkFailure = false;

      const controller = new AbortController();
      const requestTimeout = setTimeout(() => controller.abort(), 25000);

      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/custom-sign-in`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ email, password }),
          signal: controller.signal,
        });

        result = await response.json().catch(() => ({}));

        if (!response.ok) {
          console.error("Custom sign in failed:", result);
          return { error: new Error(result?.error || "Invalid email or password") };
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          customSignInNetworkFailure = true;
        } else if (isNetworkIssue(error)) {
          customSignInNetworkFailure = true;
        } else {
          throw error;
        }
      } finally {
        clearTimeout(requestTimeout);
      }

      // Set role from sign-in response immediately
      const roleFromSignIn = result?.role;
      if (roleFromSignIn === "admin" || roleFromSignIn === "customer") {
        setRole(roleFromSignIn);
      }

      // If custom auth returned a magic link token, verify it
      if (result?.token_hash && result.type === "magiclink") {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: result.token_hash,
          type: "magiclink",
        });

        if (error) {
          console.error("Token verification failed:", error);
          return { error: new Error("Authentication failed. Please try again.") };
        }

        return { error: null };
      }

      // If custom auth returned a session directly (standard auth fallback)
      if (result?.session) {
        let setSessionError: Error | null = null;

        try {
          const sessionResult = await withTimeout(
            supabase.auth.setSession({
              access_token: result.session.access_token,
              refresh_token: result.session.refresh_token,
            }),
            12000,
            "Session setup timed out",
          );

          setSessionError = sessionResult.error;
        } catch (error) {
          setSessionError = error instanceof Error ? error : new Error("Session setup failed");
        }

        if (setSessionError) {
          if (isNetworkIssue(setSessionError)) {
            // Fallback: keep the fresh session in memory to unblock login when token refresh endpoint is flaky
            const optimisticSession = result.session;
            const optimisticUser = result.user ?? result.session.user;
            setSession(optimisticSession);
            setUser(optimisticUser);
            if (optimisticUser?.id) {
              setTimeout(() => fetchUserRole(optimisticUser.id), 0);
            }
            return { error: null };
          }

          console.error("Failed to set session:", setSessionError);
          return { error: new Error("Authentication failed. Please try again.") };
        }

        return { error: null };
      }

      // If custom sign-in could not be reached, try direct auth
      if (customSignInNetworkFailure) {
        const directAuth = await withTimeout(
          supabase.auth.signInWithPassword({ email, password }),
          20000,
          "Connection timed out. Please try again.",
        );

        if (directAuth.error) {
          const isLikelyFallbackCredentialMismatch =
            directAuth.error.message.toLowerCase().includes("invalid login credentials");

          if (isLikelyFallbackCredentialMismatch) {
            return { error: new Error("Connection problem. Please retry in a moment.") };
          }

          return { error: new Error(directAuth.error.message || "Login failed") };
        }

        if (directAuth.data.session) {
          setSession(directAuth.data.session);
          setUser(directAuth.data.user);
          if (directAuth.data.user?.id) {
            setTimeout(() => fetchUserRole(directAuth.data.user.id), 0);
          }
        }

        return { error: null };
      }

      return { error: new Error("Authentication failed. Please try again.") };
    } catch (err) {
      console.error("Sign in error:", err);
      if (isNetworkIssue(err)) {
        return { error: new Error("Connection problem. Please check your internet and try again.") };
      }
      return { error: err instanceof Error ? err : new Error("Sign in failed") };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, phone: string) => {
    try {
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

      if (result.token_hash && result.type === "magiclink") {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: result.token_hash,
          type: "magiclink",
        });

        if (error) {
          console.error("Token verification failed:", error);
          return { error: null };
        }

        setSession(data.session);
        setUser(data.session?.user ?? null);
        return { error: null };
      }

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
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore signOut errors
    }
    setUser(null);
    setSession(null);
    setRole(null);
    clearSupabaseAuthStorage();
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
