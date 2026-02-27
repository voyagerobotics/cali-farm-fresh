// Intercept fetch to route Supabase requests through Cloudflare Worker proxy
// This bypasses ISP-level blocks on supabase.co domain

const SUPABASE_HOST = 'tawtsykkppopmyxhqkbw.supabase.co';
const PROXY_HOST = 'api.zomical.com';

const originalFetch = window.fetch.bind(window);

window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  let url: string;
  
  if (input instanceof Request) {
    url = input.url;
  } else if (input instanceof URL) {
    url = input.toString();
  } else {
    url = input;
  }

  // Only proxy requests to our Supabase instance
  if (url.includes(SUPABASE_HOST)) {
    const proxiedUrl = url.replace(`https://${SUPABASE_HOST}`, `https://${PROXY_HOST}`);
    
    if (input instanceof Request) {
      const newRequest = new Request(proxiedUrl, {
        method: input.method,
        headers: input.headers,
        body: input.body,
        mode: 'cors',
        credentials: input.credentials,
        redirect: input.redirect,
        referrer: input.referrer,
        signal: input.signal,
      });
      return originalFetch(newRequest, init);
    }
    
    return originalFetch(proxiedUrl, init);
  }

  return originalFetch(input, init);
};

export {};
