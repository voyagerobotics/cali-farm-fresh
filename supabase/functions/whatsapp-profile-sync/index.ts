import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

const GRAPH = "https://graph.facebook.com/v22.0";
const TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN")!;
const PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!;

async function getAppId(): Promise<string | null> {
  const r = await fetch(
    `${GRAPH}/debug_token?input_token=${TOKEN}&access_token=${TOKEN}`,
  );
  const j = await r.json().catch(() => null);
  return j?.data?.app_id ?? null;
}

async function uploadProfilePicture(imageUrl: string): Promise<string | null> {
  const appId = await getAppId();
  if (!appId) {
    console.error("Could not resolve app id from access token");
    return null;
  }
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) {
    console.error("Could not download logo", imgRes.status);
    return null;
  }
  const bytes = new Uint8Array(await imgRes.arrayBuffer());
  const type = imgRes.headers.get("content-type") || "image/png";

  const startRes = await fetch(
    `${GRAPH}/${appId}/uploads?file_length=${bytes.length}&file_type=${encodeURIComponent(type)}&access_token=${TOKEN}`,
    { method: "POST" },
  );
  const start = await startRes.json();
  if (!startRes.ok || !start.id) {
    console.error("Upload session failed", JSON.stringify(start));
    return null;
  }

  const upRes = await fetch(`${GRAPH}/${start.id}`, {
    method: "POST",
    headers: {
      Authorization: `OAuth ${TOKEN}`,
      file_offset: "0",
      "Content-Type": "application/octet-stream",
    },
    body: bytes,
  });
  const up = await upRes.json();
  if (!upRes.ok || !up.h) {
    console.error("Upload failed", JSON.stringify(up));
    return null;
  }
  return up.h as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: s, error } = await supabase
      .from("whatsapp_bot_settings")
      .select("*")
      .eq("id", "default")
      .maybeSingle();
    if (error || !s) throw new Error(error?.message || "Bot settings not found");

    const result: Record<string, unknown> = {};

    // 1) Profile picture
    let handle: string | null = null;
    if (s.business_logo_url) {
      handle = await uploadProfilePicture(s.business_logo_url);
      result.profile_picture_uploaded = !!handle;
    }

    // 2) Business profile
    const profileBody: Record<string, unknown> = {
      messaging_product: "whatsapp",
      about: (s.business_description || "").slice(0, 139) || undefined,
      address: s.business_address || undefined,
      description: s.business_description || undefined,
      email: s.business_email || undefined,
      vertical: "GROCERY",
      websites: [s.business_website].filter(Boolean),
    };
    if (handle) profileBody.profile_picture_handle = handle;

    const profRes = await fetch(`${GRAPH}/${PHONE_ID}/whatsapp_business_profile`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(profileBody),
    });
    const profJson = await profRes.json().catch(() => ({}));
    result.business_profile = { status: profRes.status, body: profJson };
    if (!profRes.ok) console.error("Profile update failed", JSON.stringify(profJson));

    // 3) India "Business details" compliance info (business / customer care / grievance officer)
    const supportEmail = s.business_email || "californiafarmsindia@gmail.com";
    let supportPhone = (s.support_number || "").replace(/\D/g, "");
    if (supportPhone.startsWith("91") && supportPhone.length > 10) supportPhone = supportPhone.slice(2);
    const complianceBody: Record<string, unknown> = {
      messaging_product: "whatsapp",
      entity_name: s.business_name,
      entity_type: "PRIVATE_COMPANY",
      is_registered: true,
      grievance_officer_details: {
        name: s.business_name,
        email: supportEmail,
        mobile_number: `+91${supportPhone}`,
        landline_number: `+91${supportPhone}`,
      },
      customer_care_details: {
        email: supportEmail,
        mobile_number: `+91${supportPhone}`,
        landline_number: `+91${supportPhone}`,
      },
    };

    const compRes = await fetch(`${GRAPH}/${PHONE_ID}/business_compliance_info`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(complianceBody),
    });
    const compJson = await compRes.json().catch(() => ({}));
    result.compliance_info = { status: compRes.status, body: compJson };
    if (!compRes.ok) console.error("Compliance update failed", JSON.stringify(compJson));

    return new Response(JSON.stringify({ ok: profRes.ok, result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("whatsapp-profile-sync error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
