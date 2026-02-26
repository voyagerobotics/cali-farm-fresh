import { useState, useEffect } from "react";
import { networkStatus } from "@/lib/supabaseFetch";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const NetworkStatusBanner = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // Subscribe to our custom network health tracker
    const unsubscribe = networkStatus.subscribe((healthy) => {
      setIsOffline(!healthy);
    });

    // Also listen to browser online/offline events
    const handleOnline = () => {
      networkStatus._setHealthy(true);
    };
    const handleOffline = () => {
      networkStatus._setHealthy(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check initial state
    if (!navigator.onLine) {
      networkStatus._setHealthy(false);
    }

    return () => {
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      // Try a lightweight ping to the backend
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: "HEAD",
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      if (response.ok || response.status === 400) {
        networkStatus._setHealthy(true);
        // Reload the page to refresh all data
        window.location.reload();
      }
    } catch {
      // Still offline
    } finally {
      setIsRetrying(false);
    }
  };

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground px-4 py-3 flex items-center justify-center gap-3 shadow-lg animate-slide-up">
      <WifiOff className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm font-medium">
        Connection issue detected. Some features may not work.
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRetry}
        disabled={isRetrying}
        className="bg-destructive-foreground/10 border-destructive-foreground/30 text-destructive-foreground hover:bg-destructive-foreground/20 text-xs"
      >
        {isRetrying ? (
          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
        ) : (
          <RefreshCw className="w-3 h-3 mr-1" />
        )}
        Retry
      </Button>
    </div>
  );
};

export default NetworkStatusBanner;
