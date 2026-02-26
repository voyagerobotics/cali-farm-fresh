/**
 * Centralized fetch wrapper with retry, timeout, and network error detection.
 * Patches the global fetch used by supabase-js to add resilience.
 */

const SUPABASE_DOMAIN = import.meta.env.VITE_SUPABASE_URL
  ? new URL(import.meta.env.VITE_SUPABASE_URL).hostname
  : "";

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // exponential backoff
const DEFAULT_TIMEOUT_MS = 15000;

// Network status tracking
type NetworkListener = (online: boolean) => void;
const networkListeners = new Set<NetworkListener>();
let _isNetworkHealthy = true;

export const networkStatus = {
  get isHealthy() {
    return _isNetworkHealthy;
  },
  subscribe(listener: NetworkListener) {
    networkListeners.add(listener);
    return () => {
      networkListeners.delete(listener);
    };
  },
  _setHealthy(healthy: boolean) {
    if (_isNetworkHealthy !== healthy) {
      _isNetworkHealthy = healthy;
      networkListeners.forEach((l) => l(healthy));
    }
  },
};

function isNetworkError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  const msg =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("network request failed") ||
    msg.includes("networkerror") ||
    msg.includes("load failed") ||
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("aborted")
  );
}

function isSupabaseRequest(url: string): boolean {
  try {
    return new URL(url).hostname === SUPABASE_DOMAIN;
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const originalFetch = window.fetch.bind(window);

async function resilientFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

  // Only add retry logic for Supabase requests
  if (!isSupabaseRequest(url)) {
    return originalFetch(input, init);
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    // Merge abort signals
    const mergedInit: RequestInit = {
      ...init,
      signal: controller.signal,
    };

    // If the caller already set a signal, chain it
    if (init?.signal) {
      init.signal.addEventListener("abort", () => controller.abort());
    }

    try {
      const response = await originalFetch(input, mergedInit);
      clearTimeout(timeoutId);

      // Mark network as healthy on any successful response
      networkStatus._setHealthy(true);

      // Don't retry on 4xx client errors (except 408 Request Timeout, 429 Too Many Requests)
      if (!response.ok && (response.status === 408 || response.status === 429)) {
        if (attempt < MAX_RETRIES) {
          const delay = response.status === 429 ? RETRY_DELAYS[attempt] * 2 : RETRY_DELAYS[attempt];
          await sleep(delay);
          continue;
        }
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;

      if (isNetworkError(error)) {
        networkStatus._setHealthy(false);

        if (attempt < MAX_RETRIES) {
          console.warn(
            `[supabaseFetch] Retry ${attempt + 1}/${MAX_RETRIES} for ${url}`,
          );
          await sleep(RETRY_DELAYS[attempt]);
          continue;
        }
      } else {
        // Non-network error, don't retry
        throw error;
      }
    }
  }

  // All retries exhausted
  throw lastError;
}

/**
 * Install the resilient fetch globally. Call once at app startup.
 */
let installed = false;
export function installResilientFetch(): void {
  if (installed) return;
  installed = true;
  window.fetch = resilientFetch as typeof window.fetch;
}
