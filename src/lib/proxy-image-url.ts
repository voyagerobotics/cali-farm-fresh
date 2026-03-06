/**
 * Image URL passthrough — no proxy rewriting needed.
 * Kept as a no-op wrapper so existing imports don't break.
 */

export const proxyImageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  return url;
};

export const proxyImageUrls = (urls: string[] | null | undefined): string[] | null => {
  if (!urls || urls.length === 0) return null;
  return [...urls];
};
