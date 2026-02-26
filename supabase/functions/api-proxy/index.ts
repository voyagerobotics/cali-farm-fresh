import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-proxy-target, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const targetPath = req.headers.get("x-proxy-target");
    if (!targetPath) {
      return new Response(
        JSON.stringify({ error: "Missing x-proxy-target header" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const targetUrl = `${supabaseUrl}${targetPath}`;

    // Forward all headers except host and the proxy target header
    const forwardHeaders = new Headers();
    req.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower !== "host" && lower !== "x-proxy-target" && lower !== "connection") {
        forwardHeaders.set(key, value);
      }
    });

    const proxyResponse = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: req.method !== "GET" && req.method !== "HEAD" ? await req.text() : undefined,
    });

    // Forward the response with CORS headers
    const responseHeaders = new Headers(corsHeaders);
    proxyResponse.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      // Skip hop-by-hop headers and access-control headers (we set our own)
      if (!lower.startsWith("access-control-") && lower !== "connection" && lower !== "transfer-encoding") {
        responseHeaders.set(key, value);
      }
    });

    return new Response(await proxyResponse.text(), {
      status: proxyResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(
      JSON.stringify({ error: "Proxy request failed" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
