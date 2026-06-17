import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALERT_RECIPIENTS = [
  "voyagerobotics@gmail.com",
  "nirajtakalkhede@gmail.com",
  "shradhatakalkhede15@gmail.com",
];

const DOWNTIME_ALERT_THRESHOLD_SECONDS = 60;

const fmtIST = (d: Date) =>
  d.toLocaleString("en-IN", { dateStyle: "full", timeStyle: "long", timeZone: "Asia/Kolkata" });

const fmtDuration = (sec: number) => {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m ${s}s`;
};

async function checkUrl(url: string): Promise<{ ok: boolean; status: number | null; error: string | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow", signal: controller.signal });
    return { ok: res.status < 500, status: res.status, error: res.status >= 500 ? `HTTP ${res.status}` : null };
  } catch (e) {
    return { ok: false, status: null, error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timeout);
  }
}

function downEmailHtml(url: string, startedAt: Date, statusCode: number | null, error: string | null, durationSec: number) {
  return `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;background:#fef2f2;padding:24px;margin:0">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.1)">
    <div style="background:linear-gradient(135deg,#dc2626,#991b1b);color:#fff;padding:24px;text-align:center">
      <h1 style="margin:0;font-size:22px">🚨 Website Down</h1>
    </div>
    <div style="padding:24px;color:#111">
      <p><strong>Website URL:</strong> <a href="${url}">${url}</a></p>
      <p><strong>Time of outage:</strong> ${fmtIST(startedAt)}</p>
      <p><strong>Status / Error:</strong> ${statusCode ? `HTTP ${statusCode}` : "Unreachable"}${error ? ` — ${error}` : ""}</p>
      <p><strong>Downtime so far:</strong> ${fmtDuration(durationSec)}</p>
      <p style="color:#6b7280;font-size:13px;margin-top:24px">Monitor will continue checking and notify on recovery.</p>
    </div>
  </div></body></html>`;
}

function recoveryEmailHtml(url: string, startedAt: Date, endedAt: Date, durationSec: number) {
  return `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;background:#f0fdf4;padding:24px;margin:0">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.1)">
    <div style="background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;padding:24px;text-align:center">
      <h1 style="margin:0;font-size:22px">✅ Website Recovered</h1>
    </div>
    <div style="padding:24px;color:#111">
      <p><strong>Website URL:</strong> <a href="${url}">${url}</a></p>
      <p><strong>Outage started:</strong> ${fmtIST(startedAt)}</p>
      <p><strong>Recovered at:</strong> ${fmtIST(endedAt)}</p>
      <p><strong>Total downtime:</strong> ${fmtDuration(durationSec)}</p>
    </div>
  </div></body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);

    const { data: state } = await supabase
      .from("uptime_monitor_state")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (!state) return new Response(JSON.stringify({ error: "No monitor state" }), { status: 500, headers: corsHeaders });

    const url = state.url as string;
    const result = await checkUrl(url);
    const now = new Date();

    if (!result.ok) {
      // DOWN
      let incidentId = state.current_incident_id as string | null;
      let downSince = state.down_since ? new Date(state.down_since) : now;

      if (!state.is_down) {
        // Just went down — open incident
        downSince = now;
        const { data: inc } = await supabase
          .from("uptime_incidents")
          .insert({
            url,
            started_at: now.toISOString(),
            status_code: result.status,
            error_message: result.error,
          })
          .select("id")
          .single();
        incidentId = inc?.id ?? null;
      }

      const durationSec = Math.floor((now.getTime() - downSince.getTime()) / 1000);

      // Send alert if >= threshold and not yet sent
      let alertJustSent = false;
      if (incidentId && durationSec >= DOWNTIME_ALERT_THRESHOLD_SECONDS) {
        const { data: inc } = await supabase
          .from("uptime_incidents")
          .select("alert_sent_at")
          .eq("id", incidentId)
          .single();

        if (inc && !inc.alert_sent_at) {
          try {
            await resend.emails.send({
              from: "Uptime Monitor <orders@zomical.com>",
              to: ALERT_RECIPIENTS,
              subject: `🚨 ${url} is DOWN (${result.status ? `HTTP ${result.status}` : "Unreachable"})`,
              html: downEmailHtml(url, downSince, result.status, result.error, durationSec),
            });
            await supabase.from("uptime_incidents").update({ alert_sent_at: now.toISOString() }).eq("id", incidentId);
            alertJustSent = true;
          } catch (e) {
            console.error("Failed to send down alert:", e);
          }
        }
      }

      await supabase.from("uptime_monitor_state").update({
        is_down: true,
        down_since: downSince.toISOString(),
        current_incident_id: incidentId,
        last_status_code: result.status,
        last_error: result.error,
        last_checked_at: now.toISOString(),
        updated_at: now.toISOString(),
      }).eq("id", 1);

      return new Response(JSON.stringify({ status: "down", durationSec, alertJustSent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // UP
      if (state.is_down && state.current_incident_id) {
        const downSince = state.down_since ? new Date(state.down_since) : now;
        const durationSec = Math.floor((now.getTime() - downSince.getTime()) / 1000);

        const { data: inc } = await supabase
          .from("uptime_incidents")
          .update({
            ended_at: now.toISOString(),
            duration_seconds: durationSec,
          })
          .eq("id", state.current_incident_id)
          .select("alert_sent_at, recovery_sent_at, status_code, error_message")
          .single();

        // Catch-up: if outage met threshold but alert was never sent (brief flap
        // between two cron ticks), send a combined outage+recovery email now.
        if (inc && !inc.alert_sent_at && durationSec >= DOWNTIME_ALERT_THRESHOLD_SECONDS) {
          try {
            await resend.emails.send({
              from: "Uptime Monitor <orders@zomical.com>",
              to: ALERT_RECIPIENTS,
              subject: `⚠️ ${url} had an outage (${fmtDuration(durationSec)}) — now recovered`,
              html: downEmailHtml(url, downSince, inc.status_code, inc.error_message, durationSec)
                + recoveryEmailHtml(url, downSince, now, durationSec),
            });
            await supabase.from("uptime_incidents")
              .update({ alert_sent_at: now.toISOString(), recovery_sent_at: now.toISOString() })
              .eq("id", state.current_incident_id);
          } catch (e) {
            console.error("Failed to send catch-up alert:", e);
          }
        } else if (inc?.alert_sent_at && !inc.recovery_sent_at) {
          try {
            await resend.emails.send({
              from: "Uptime Monitor <orders@zomical.com>",
              to: ALERT_RECIPIENTS,
              subject: `✅ ${url} is back UP (downtime ${fmtDuration(durationSec)})`,
              html: recoveryEmailHtml(url, downSince, now, durationSec),
            });
            await supabase.from("uptime_incidents")
              .update({ recovery_sent_at: now.toISOString() })
              .eq("id", state.current_incident_id);
          } catch (e) {
            console.error("Failed to send recovery email:", e);
          }
        }
      }

      await supabase.from("uptime_monitor_state").update({
        is_down: false,
        down_since: null,
        current_incident_id: null,
        last_status_code: result.status,
        last_error: null,
        last_checked_at: now.toISOString(),
        updated_at: now.toISOString(),
      }).eq("id", 1);

      return new Response(JSON.stringify({ status: "up", code: result.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("uptime-monitor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
