import { isBackendNetworkError } from "@/lib/backend-connectivity";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retries an async operation on transient network failures (Failed to fetch, timeout, etc).
 * Used across all hooks that perform Supabase mutations routed through the Cloudflare proxy.
 */
export const withNetworkRetry = async <T = void>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelayMs: number = 600,
): Promise<T> => {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const shouldRetry = isBackendNetworkError(error) && attempt < maxAttempts;

      if (!shouldRetry) {
        break;
      }

      await sleep(baseDelayMs * attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Request failed");
};

/**
 * Returns a user-friendly error description for network vs application errors.
 */
export const getNetworkErrorMessage = (
  error: unknown,
  fallbackAction: string = "completing this action",
): string => {
  if (isBackendNetworkError(error)) {
    return `Network issue while ${fallbackAction}. Please retry.`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong";
};
