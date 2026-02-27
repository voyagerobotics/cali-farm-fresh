export const BACKEND_CONNECTIVITY_FAILED_EVENT = "backend-connectivity:failed";
export const BACKEND_CONNECTIVITY_RECOVERED_EVENT = "backend-connectivity:recovered";

export interface BackendConnectivityFailureDetail {
  url: string;
  attempt: number;
  maxAttempts: number;
  timeoutMs: number;
  error: string;
}

export const isBackendNetworkError = (error: unknown): boolean => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : String(error ?? "");

  const normalized = message.toLowerCase();

  return (
    normalized.includes("failed to fetch") ||
    normalized.includes("networkerror") ||
    normalized.includes("network request failed") ||
    normalized.includes("load failed") ||
    normalized.includes("timed out") ||
    normalized.includes("timeout") ||
    normalized.includes("aborted")
  );
};
