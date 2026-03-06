import { isBackendNetworkError } from "@/lib/backend-connectivity";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const toError = (error: unknown): Error => {
  if (error instanceof Error) return error;

  if (typeof error === "string") {
    const trimmed = error.trim();
    return new Error(trimmed.length > 0 ? trimmed : "Request failed");
  }

  if (typeof error === "object" && error !== null) {
    const maybeError = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
      error_description?: unknown;
    };

    const messageParts = [
      maybeError.message,
      maybeError.error_description,
      maybeError.details,
      maybeError.hint,
      maybeError.code,
    ]
      .map((part) => (typeof part === "string" ? part.trim() : ""))
      .filter(Boolean);

    if (messageParts.length > 0) {
      return new Error(messageParts.join(" • "));
    }

    try {
      return new Error(JSON.stringify(error));
    } catch {
      return new Error("Request failed");
    }
  }

  return new Error("Request failed");
};

/**
 * Retries an async operation on transient network failures (Failed to fetch, timeout, etc).
 * Used across all hooks that perform backend mutations routed through the connectivity proxy.
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

  throw toError(lastError);
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
  return toError(error).message;
};
