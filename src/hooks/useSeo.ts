import { useEffect } from "react";

const SITE_URL = "https://zomical.com";

export interface SeoOptions {
  title: string;
  description: string;
  /** Path only, e.g. "/farmers". Defaults to the current pathname. */
  path?: string;
  /** Absolute or root-relative image path for social previews. */
  image?: string;
  type?: string;
  /** JSON-LD object injected for this page only. */
  jsonLd?: Record<string, unknown>;
}

type MetaKind = "name" | "property";

const upsertMeta = (kind: MetaKind, key: string, value: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${kind}="${key}"]`);
  const created = !el;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(kind, key);
    document.head.appendChild(el);
  }
  const prev = el.getAttribute("content") ?? "";
  el.setAttribute("content", value);
  return () => {
    if (created) el?.remove();
    else el?.setAttribute("content", prev);
  };
};

const upsertCanonical = (href: string) => {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const created = !el;
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  const prev = el.getAttribute("href") ?? "";
  el.setAttribute("href", href);
  return () => {
    if (created) el?.remove();
    else el?.setAttribute("href", prev);
  };
};

/**
 * Sets title, description, canonical, Open Graph and Twitter tags for a route
 * and restores the previous values on unmount.
 */
export const useSeo = ({ title, description, path, image, type = "website", jsonLd }: SeoOptions) => {
  useEffect(() => {
    const url = `${SITE_URL}${path ?? window.location.pathname}`;
    const absImage = image
      ? image.startsWith("http")
        ? image
        : `${SITE_URL}${image}`
      : undefined;

    const prevTitle = document.title;
    document.title = title;

    const restores = [
      upsertMeta("name", "description", description),
      upsertMeta("property", "og:title", title),
      upsertMeta("property", "og:description", description),
      upsertMeta("property", "og:type", type),
      upsertMeta("property", "og:url", url),
      upsertMeta("property", "og:site_name", "California Farms India"),
      upsertMeta("property", "og:locale", "en_IN"),
      upsertMeta("name", "twitter:card", "summary_large_image"),
      upsertMeta("name", "twitter:title", title),
      upsertMeta("name", "twitter:description", description),
      upsertCanonical(url),
    ];

    if (absImage) {
      restores.push(upsertMeta("property", "og:image", absImage));
      restores.push(upsertMeta("name", "twitter:image", absImage));
    }

    let script: HTMLScriptElement | null = null;
    if (jsonLd) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.seoRoute = "true";
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      document.title = prevTitle;
      restores.forEach((restore) => restore());
      script?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, path, image, type]);
};

export default useSeo;
