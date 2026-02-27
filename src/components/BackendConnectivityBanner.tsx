import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  BACKEND_CONNECTIVITY_FAILED_EVENT,
  BACKEND_CONNECTIVITY_RECOVERED_EVENT,
  type BackendConnectivityFailureDetail,
} from "@/lib/backend-connectivity";

const BackendConnectivityBanner = () => {
  const [failure, setFailure] = useState<BackendConnectivityFailureDetail | null>(null);

  useEffect(() => {
    const handleFailure = (event: Event) => {
      const detail = (event as CustomEvent<BackendConnectivityFailureDetail>).detail;
      if (!detail) return;
      setFailure(detail);
    };

    const handleRecovery = () => {
      setFailure(null);
    };

    window.addEventListener(BACKEND_CONNECTIVITY_FAILED_EVENT, handleFailure as EventListener);
    window.addEventListener(BACKEND_CONNECTIVITY_RECOVERED_EVENT, handleRecovery);

    return () => {
      window.removeEventListener(BACKEND_CONNECTIVITY_FAILED_EVENT, handleFailure as EventListener);
      window.removeEventListener(BACKEND_CONNECTIVITY_RECOVERED_EVENT, handleRecovery);
    };
  }, []);

  if (!failure) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 top-4 z-50 px-4 pointer-events-none">
      <Alert variant="destructive" className="mx-auto max-w-3xl pointer-events-auto bg-background/95 backdrop-blur border-destructive/40 shadow-lg">
        <AlertTriangle className="h-4 w-4" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <AlertTitle>Connection problem detected</AlertTitle>
            <AlertDescription>
              We couldn't reach the backend after {failure.maxAttempts} attempts. Please retry once your network is stable.
            </AlertDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </Alert>
    </div>
  );
};

export default BackendConnectivityBanner;
