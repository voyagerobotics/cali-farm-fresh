// Lightweight Google Analytics (gtag) event helper.
// gtag.js is bootstrapped in index.html (deferred), so `window.gtag` may not
// exist yet — dataLayer queuing keeps early events from being lost.

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export const trackEvent = (
  eventName: string,
  params: Record<string, unknown> = {},
) => {
  try {
    if (typeof window === "undefined") return;
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, params);
    } else {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(["event", eventName, params]);
    }
  } catch (err) {
    console.error("Analytics event failed:", err);
  }
};

/** Fired when an enquiry form scrolls into the viewport (once per page load). */
export const trackFormView = (formName: string, extra: Record<string, unknown> = {}) =>
  trackEvent("form_view", { form_name: formName, ...extra });

/** Fired on every submit attempt, before validation results are known. */
export const trackFormSubmit = (formName: string, extra: Record<string, unknown> = {}) =>
  trackEvent("form_submit", { form_name: formName, ...extra });

/** Fired when a submission actually succeeds — this is the conversion. */
export const trackConversion = (formName: string, extra: Record<string, unknown> = {}) => {
  trackEvent("generate_lead", { form_name: formName, currency: "INR", value: 1, ...extra });
  trackEvent("conversion", { form_name: formName, ...extra });
};

/** Fired when a submission fails (validation or server error). */
export const trackFormError = (formName: string, reason: string) =>
  trackEvent("form_error", { form_name: formName, reason });
