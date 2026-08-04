import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export const WA_STATUSES: { id: string; label: string }[] = [
  { id: "confirmed", label: "Order confirmed" },
  { id: "preparing", label: "Order packed" },
  { id: "out_for_delivery", label: "Out for delivery" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
  { id: "payment_failed", label: "Payment failed" },
  { id: "payment_pending", label: "Payment pending" },
  { id: "refund_requested", label: "Refund requested" },
  { id: "refund_processed", label: "Refund processed" },
];

export const WA_LANGUAGES: { id: string; label: string }[] = [
  { id: "en", label: "English" },
  { id: "hi", label: "हिन्दी (Hindi)" },
  { id: "mr", label: "मराठी (Marathi)" },
];

interface TemplateRow {
  id: string;
  status_key: string;
  language: string;
  template_name: string;
  is_active: boolean;
  is_approved: boolean;
  notes: string | null;
}

const AdminWhatsAppTemplates = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    status_key: "confirmed",
    language: "en",
    template_name: "",
    notes: "",
    is_approved: true,
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("whatsapp_templates")
      .select("*")
      .order("status_key")
      .order("language");
    if (error) toast({ title: "Couldn't load templates", description: error.message, variant: "destructive" });
    setRows((data as TemplateRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addTemplate = async () => {
    if (!form.template_name.trim()) {
      toast({ title: "Enter the approved template name", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("whatsapp_templates").upsert(
      {
        status_key: form.status_key,
        language: form.language,
        template_name: form.template_name.trim(),
        notes: form.notes.trim() || null,
        is_approved: form.is_approved,
        is_active: true,
      },
      { onConflict: "status_key,language" },
    );
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Template saved" });
    setForm({ ...form, template_name: "", notes: "" });
    load();
  };

  const patch = async (id: string, values: Partial<TemplateRow>) => {
    setRows((r) => r.map((t) => (t.id === id ? { ...t, ...values } : t)));
    const { error } = await supabase.from("whatsapp_templates").update(values).eq("id", id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      load();
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("whatsapp_templates").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setRows((r) => r.filter((t) => t.id !== id));
  };

  const missing = WA_STATUSES.flatMap((s) =>
    WA_LANGUAGES.filter((l) => !rows.some((r) => r.status_key === s.id && r.language === l.id && r.is_active && r.is_approved))
      .map((l) => ({ status: s, lang: l })),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-heading text-lg font-bold">Approved templates</h3>
          <p className="text-sm text-muted-foreground">
            Map each order status and language to the template name approved in your WhatsApp Business account. Statuses
            without an approved template automatically fall back to free-form text inside the 24-hour window.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </div>

      {/* Add / update */}
      <div className="bg-card border border-border rounded-xl p-4 grid md:grid-cols-5 gap-3 items-end">
        <div className="space-y-1">
          <Label>Status</Label>
          <select
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={form.status_key}
            onChange={(e) => setForm({ ...form, status_key: e.target.value })}
          >
            {WA_STATUSES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Language</Label>
          <select
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={form.language}
            onChange={(e) => setForm({ ...form, language: e.target.value })}
          >
            {WA_LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Template name</Label>
          <Input
            value={form.template_name}
            onChange={(e) => setForm({ ...form, template_name: e.target.value })}
            placeholder="order_confirmed"
          />
        </div>
        <div className="space-y-1">
          <Label>Notes (optional)</Label>
          <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Meta approval ref" />
        </div>
        <Button onClick={addTemplate} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Save
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Language</th>
              <th className="px-4 py-3 font-medium">Template</th>
              <th className="px-4 py-3 font-medium">Approved</th>
              <th className="px-4 py-3 font-medium">Active</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No templates configured yet.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-3">{WA_STATUSES.find((s) => s.id === r.status_key)?.label || r.status_key}</td>
                <td className="px-4 py-3">{WA_LANGUAGES.find((l) => l.id === r.language)?.label || r.language}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.template_name}</td>
                <td className="px-4 py-3">
                  <Switch checked={r.is_approved} onCheckedChange={(v) => patch(r.id, { is_approved: v })} />
                </td>
                <td className="px-4 py-3">
                  <Switch checked={r.is_active} onCheckedChange={(v) => patch(r.id, { is_active: v })} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="icon" onClick={() => remove(r.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Missing templates */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h4 className="font-medium flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-yellow-600" /> Missing approved templates ({missing.length})
        </h4>
        {missing.length === 0 ? (
          <p className="text-sm text-muted-foreground">Every status has an approved template in all languages.</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-3">
              These combinations fall back to free-form text (only deliverable within 24 hours of the customer's last
              message). Use the Preview tab to read the exact fallback wording.
            </p>
            <div className="flex flex-wrap gap-2">
              {missing.map((m) => (
                <span key={`${m.status.id}-${m.lang.id}`} className="text-xs px-2 py-1 rounded-md bg-muted">
                  {m.status.label} · {m.lang.label}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminWhatsAppTemplates;
