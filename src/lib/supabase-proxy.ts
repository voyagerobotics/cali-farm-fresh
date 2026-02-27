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

const normalizeBaseUrl = (value?: string): string | null => {
  if (!value) return null;
  try {
    const parsed = new URL(value.trim());
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
};

const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID?.trim();
const configuredBaseUrl = normalizeBaseUrl(import.meta.env.VITE_SUPABASE_URL);
const configuredHost = configuredBaseUrl ? new URL(configuredBaseUrl).host : null;
const proxyBaseUrlFromEnv = normalizeBaseUrl((import.meta.env as Record<string, string | undefined>).VITE_SUPABASE_PROXY_URL);
const projectHost = projectId ? `${projectId}.supabase.co` : null;

const isSupabaseHost = (host: string | null) => Boolean(host && host.endsWith(".supabase.co"));

const DEFAULT_PROXY_BASE_URL = "https://restless-silence-58cd.voyagerobotics.workers.dev";

const proxyBaseUrl =
  proxyBaseUrlFromEnv ??
  (configuredHost && !isSupabaseHost(configuredHost) ? configuredBaseUrl : DEFAULT_PROXY_BASE_URL);

const proxyUrlObject = proxyBaseUrl ? new URL(proxyBaseUrl) : null;
const proxyHost = proxyUrlObject?.host ?? null;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isBackendPath = (pathname: string) =>
  BACKEND_PATH_PREFIXES.some((prefix) => pathname === prefix.slice(0, -1) || pathname.startsWith(prefix));

const getRequestMethod = (input: RequestInfo | URL, init?: RequestInit) => {
  if (init?.method) return init.method.toUpperCase();
  if (input instanceof Request) return input.method.toUpperCase();
  return "GET";
};

// All backend GET/HEAD/OPTIONS can retry, plus safe POST endpoints
const canRetry = (method: string, pathname: string) => {
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return true;
  // POST to auth token (login) is also retriable
  if (method === "POST" && pathname.startsWith("/auth/v1/token")) return true;
  return method === "POST" && RETRY_SAFE_FUNCTION_PATHS.has(pathname);
};

const resolveBackendRequest = (rawUrl: string) => {
  try {
    const parsed = new URL(rawUrl, window.location.origin);

    const hostMatchesKnownBackend =
      isSupabaseHost(parsed.host) ||
      (projectHost !== null && parsed.host === projectHost) ||
      (configuredHost !== null && parsed.host === configuredHost) ||
      (proxyHost !== null && parsed.host === proxyHost);

    const backendRequest = hostMatchesKnownBackend && isBackendPath(parsed.pathname);

    // Store the original direct URL before rewriting
    const originalDirectUrl = parsed.toString();

    if (backendRequest && proxyUrlObject && parsed.host !== proxyHost) {
      parsed.protocol = proxyUrlObject.protocol;
      parsed.host = proxyUrlObject.host;
    }

    return {
      inputUrl: parsed.toString(),
      originalDirectUrl,
      pathname: parsed.pathname,
      backendRequest,
    };
  } catch {
    return {
      inputUrl: rawUrl,
      originalDirectUrl: rawUrl,
      pathname: "",
      backendRequest: false,
    };
  }
};

const createAttemptInput = (
  input: RequestInfo | URL,
  rewrittenUrl: string,
): RequestInfo | URL => {
  if (input instanceof Request) {
    return new Request(rewrittenUrl, input);
  }
  if (input instanceof URL) {
    return new URL(rewrittenUrl);
  }
  return rewrittenUrl;
};

window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const originalUrl = input instanceof Request ? input.url : input instanceof URL ? input.toString() : input;
  const { inputUrl, originalDirectUrl, pathname, backendRequest } = resolveBackendRequest(originalUrl);
  const requestMethod = getRequestMethod(input, init);

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    let timedOut = false;

    // Progressive timeout: first attempt 30s, subsequent attempts 15s
    const attemptTimeout = attempt === 1 ? FETCH_TIMEOUT_MS : FETCH_TIMEOUT_MS / 2;

    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, attemptTimeout);

    try {
      const attemptInput = createAttemptInput(input, inputUrl);
      const attemptInit = { ...init, signal: controller.signal };
      const response = await originalFetch(attemptInput, attemptInit);

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

      // On final attempt, try direct connection as ultimate fallback
      if (backendRequest && proxyUrlObject && inputUrl !== originalDirectUrl && attempt === MAX_ATTEMPTS) {
        try {
          const directController = new AbortController();
          const directTimeout = window.setTimeout(() => directController.abort(), FETCH_TIMEOUT_MS);
          const directInput = createAttemptInput(input, originalDirectUrl);
          const response = await originalFetch(directInput, { ...init, signal: directController.signal });
          window.clearTimeout(directTimeout);
          window.dispatchEvent(new CustomEvent(BACKEND_CONNECTIVITY_RECOVERED_EVENT));
          return response;
        } catch {
          // Direct fallback also failed
        }
      }

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
          url: inputUrl,
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
