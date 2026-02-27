/**
 * Rewrites Supabase storage URLs to go through the Cloudflare Worker proxy.
 * <img src> tags don't use fetch(), so the fetch-level proxy doesn't help.
 * This utility rewrites the URL so images also bypass ISP blocking.
 */

const SUPABASE_HOST = "tawtsykkppopmyxhqkbw.supabase.co";
const PROXY_BASE = "https://restless-silence-58cd.voyagerobotics.workers.dev";

export const proxyImageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.includes(SUPABASE_HOST)) {
    return url.replace(`https://${SUPABASE_HOST}`, PROXY_BASE);
  }
  return url;
};

export const proxyImageUrls = (urls: string[] | null | undefined): string[] | null => {
  if (!urls || urls.length === 0) return null;
  return urls.map((u) => proxyImageUrl(u) ?? u);
};
