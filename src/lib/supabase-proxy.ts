/**
 * Lightweight fetch interceptor for backend resilience.
 * NO proxy URL rewriting — all requests go directly to Supabase.
 * Provides: timeout, retry on transient network errors, connectivity events.
 */
import {
  BACKEND_CONNECTIVITY_FAILED_EVENT,
  BACKEND_CONNECTIVITY_RECOVERED_EVENT,
  isBackendNetworkError,
} from "@/lib/backend-connectivity";

const FETCH_TIMEOUT_MS = 30000;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 800;

const BACKEND_PATH_PREFIXES = ["/auth/v1/", "/rest/v1/", "/storage/v1/", "/functions/v1/"];
const RETRY_SAFE_FUNCTION_PATHS = new Set(["/functions/v1/custom-sign-in", "/functions/v1/custom-sign-up"]);

const originalFetch = window.fetch.bind(window);

const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID?.trim();
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()?.replace(/\/$/, "");
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).host : null;
const projectHost = projectId ? `${projectId}.supabase.co` : null;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isBackendPath = (pathname: string) =>
  BACKEND_PATH_PREFIXES.some((prefix) => pathname === prefix.slice(0, -1) || pathname.startsWith(prefix));

const isSupabaseRequest = (host: string) =>
  host.endsWith(".supabase.co") ||
  (supabaseHost !== null && host === supabaseHost) ||
  (projectHost !== null && host === projectHost);

const getRequestMethod = (input: RequestInfo | URL, init?: RequestInit) => {
  if (init?.method) return init.method.toUpperCase();
  if (input instanceof Request) return input.method.toUpperCase();
  return "GET";
};

const canRetry = (method: string, pathname: string) => {
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return true;
  if (method === "POST" && (pathname.startsWith("/auth/v1/token") || pathname.startsWith("/auth/v1/verify"))) return true;
  return method === "POST" && RETRY_SAFE_FUNCTION_PATHS.has(pathname);
};

const resolveBackendRequest = (rawUrl: string) => {
  try {
    const parsed = new URL(rawUrl, window.location.origin);
    const backendRequest = isSupabaseRequest(parsed.host) && isBackendPath(parsed.pathname);
    return { pathname: parsed.pathname, backendRequest };
  } catch {
    return { pathname: "", backendRequest: false };
  }
};

window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const originalUrl = input instanceof Request ? input.url : input instanceof URL ? input.toString() : input;
  const { pathname, backendRequest } = resolveBackendRequest(originalUrl);
  const requestMethod = getRequestMethod(input, init);

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    let timedOut = false;

    const attemptTimeout = attempt === 1 ? FETCH_TIMEOUT_MS : FETCH_TIMEOUT_MS / 2;

    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, attemptTimeout);

    try {
      const response = await originalFetch(input, {
        ...init,
        signal: controller.signal,
      });

      if (backendRequest) {
        window.dispatchEvent(new CustomEvent(BACKEND_CONNECTIVITY_RECOVERED_EVENT));
      }

      return response;
    } catch (error) {
      const normalizedError =
        timedOut && !isBackendNetworkError(error)
          ? new Error(`Request timed out after ${attemptTimeout}ms`)
          : error;

      lastError = normalizedError;

      const shouldRetry =
        backendRequest &&
        isBackendNetworkError(normalizedError) &&
        attempt < MAX_ATTEMPTS &&
        canRetry(requestMethod, pathname);

      if (!shouldRetry) {
        break;
      }

      await sleep(RETRY_DELAY_MS * attempt);
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  if (backendRequest) {
    const errorMessage =
      lastError instanceof Error ? lastError.message : typeof lastError === "string" ? lastError : "Network request failed";

    window.dispatchEvent(
      new CustomEvent(BACKEND_CONNECTIVITY_FAILED_EVENT, {
        detail: {
          url: originalUrl,
          attempt: MAX_ATTEMPTS,
          maxAttempts: MAX_ATTEMPTS,
          timeoutMs: FETCH_TIMEOUT_MS,
          error: errorMessage,
        },
      }),
    );
  }

  throw lastError instanceof Error ? lastError : new Error("Request failed");
};

export {};
