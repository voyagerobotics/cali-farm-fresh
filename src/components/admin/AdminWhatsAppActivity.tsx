import { useEffect, useState } from "react";
import { RefreshCw, Loader2, ArrowDownLeft, ArrowUpRight, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface ActivityRow {
  id: string;
  order_number: string | null;
  phone_number: string;
  direction: string;
  event_type: string;
  status: string | null;
  channel: string | null;
  language: string | null;
  template_name: string | null;
  button_id: string | null;
  body: string | null;
  success: boolean;
  error: string | null;
  created_at: string;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });

const AdminWhatsAppActivity = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = async (q = query) => {
    setLoading(true);
    let req = supabase
      .from("whatsapp_activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    const term = q.trim();
    if (term) req = req.or(`order_number.ilike.%${term}%,phone_number.ilike.%${term}%`);
    const { data, error } = await req;
    if (error) toast({ title: "Couldn't load activity", description: error.message, variant: "destructive" });
    setRows((data as ActivityRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-heading text-lg font-bold">Order activity log</h3>
        <p className="text-sm text-muted-foreground">
          Every WhatsApp message sent for an order and every button the customer tapped, with timestamps (IST).
        </p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="Search order number or phone"
          />
        </div>
        <Button variant="outline" onClick={() => load()} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Refresh
        </Button>
      </div>

      <div className="space-y-2">
        {!loading && rows.length === 0 && (
          <p className="text-sm text-muted-foreground py-10 text-center">No WhatsApp activity recorded yet.</p>
        )}
        {rows.map((r) => (
          <div key={r.id} className="bg-card border border-border rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${
                  r.direction === "inbound" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                {r.direction === "inbound" ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                {r.direction === "inbound" ? "Customer reply" : "Sent"}
              </span>
              {r.order_number && <span className="font-mono">#{r.order_number}</span>}
              <span className="text-muted-foreground">{r.phone_number}</span>
              {r.status && <span className="px-2 py-0.5 rounded-md bg-muted">{r.status.replace(/_/g, " ")}</span>}
              {r.channel && <span className="px-2 py-0.5 rounded-md bg-muted">{r.channel}</span>}
              {r.template_name && <span className="font-mono px-2 py-0.5 rounded-md bg-muted">{r.template_name}</span>}
              {r.language && <span className="uppercase px-2 py-0.5 rounded-md bg-muted">{r.language}</span>}
              {!r.success && (
                <span className="px-2 py-0.5 rounded-md bg-destructive/10 text-destructive">
                  {r.error || "failed"}
                </span>
              )}
              <span className="ml-auto text-muted-foreground">{fmt(r.created_at)}</span>
            </div>
            {(r.button_id || r.body) && (
              <p className="mt-2 text-sm whitespace-pre-wrap break-words line-clamp-6">
                {r.button_id ? `[${r.button_id}] ` : ""}
                {r.body}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminWhatsAppActivity;
