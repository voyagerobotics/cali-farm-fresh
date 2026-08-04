import { useEffect, useState } from "react";
import { BellOff, Loader2, RefreshCw, Trash2, Search, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface OptOutRow {
  id: string;
  phone_number: string;
  opted_out: boolean;
  reason: string | null;
  updated_at: string;
}

interface OrderRow {
  id: string;
  order_number: string;
  delivery_name: string;
  delivery_phone: string;
  status: string;
  whatsapp_opt_out: boolean;
}

const AdminWhatsAppOptOuts = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<OptOutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const [orderQuery, setOrderQuery] = useState("");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [orderLoading, setOrderLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("whatsapp_opt_outs")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) toast({ title: "Couldn't load opt-outs", description: error.message, variant: "destructive" });
    setRows((data as OptOutRow[]) || []);
    setLoading(false);
  };

  const loadOrders = async () => {
    setOrderLoading(true);
    let req = supabase
      .from("orders")
      .select("id, order_number, delivery_name, delivery_phone, status, whatsapp_opt_out")
      .order("created_at", { ascending: false })
      .limit(25);
    const term = orderQuery.trim();
    if (term) req = req.or(`order_number.ilike.%${term}%,delivery_phone.ilike.%${term}%,delivery_name.ilike.%${term}%`);
    const { data, error } = await req;
    if (error) toast({ title: "Couldn't load orders", description: error.message, variant: "destructive" });
    setOrders((data as unknown as OrderRow[]) || []);
    setOrderLoading(false);
  };

  useEffect(() => {
    load();
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addOptOut = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      toast({ title: "Enter a valid phone number", variant: "destructive" });
      return;
    }
    const normalized = digits.length === 10 ? `91${digits}` : digits;
    setSaving(true);
    const { error } = await supabase
      .from("whatsapp_opt_outs")
      .upsert({ phone_number: normalized, reason: reason.trim() || null, opted_out: true }, { onConflict: "phone_number" });
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "WhatsApp notifications stopped", description: `+${normalized}` });
    setPhone("");
    setReason("");
    load();
  };

  const toggleNumber = async (row: OptOutRow, value: boolean) => {
    setRows((r) => r.map((x) => (x.id === row.id ? { ...x, opted_out: value } : x)));
    const { error } = await supabase.from("whatsapp_opt_outs").update({ opted_out: value }).eq("id", row.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      load();
    }
  };

  const removeNumber = async (id: string) => {
    const { error } = await supabase.from("whatsapp_opt_outs").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setRows((r) => r.filter((x) => x.id !== id));
  };

  const toggleOrder = async (order: OrderRow, value: boolean) => {
    setOrders((o) => o.map((x) => (x.id === order.id ? { ...x, whatsapp_opt_out: value } : x)));
    const { error } = await supabase.from("orders").update({ whatsapp_opt_out: value } as any).eq("id", order.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      loadOrders();
    }
  };

  return (
    <div className="space-y-8">
      {/* Numbers */}
      <div className="space-y-4">
        <div>
          <h3 className="font-heading text-lg font-bold flex items-center gap-2">
            <BellOff className="w-4 h-4" /> Opted-out numbers
          </h3>
          <p className="text-sm text-muted-foreground">
            These numbers never receive WhatsApp order notifications. They can still chat with the shopping bot.
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 grid md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div className="space-y-1">
            <Label>Phone number</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" />
          </div>
          <div className="space-y-1">
            <Label>Reason (optional)</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Customer requested" />
          </div>
          <Button onClick={addOptOut} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Add
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Number</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Notifications off</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No opted-out numbers.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono">+{r.phone_number}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.reason || "—"}</td>
                  <td className="px-4 py-3">
                    <Switch checked={r.opted_out} onCheckedChange={(v) => toggleNumber(r, v)} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => removeNumber(r.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Orders */}
      <div className="space-y-4">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-heading text-lg font-bold">Per-order opt-out</h3>
            <p className="text-sm text-muted-foreground">Turn off WhatsApp updates for a single order only.</p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={orderQuery}
                onChange={(e) => setOrderQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadOrders()}
                placeholder="Order number, name or phone"
              />
            </div>
            <Button variant="outline" onClick={loadOrders} disabled={orderLoading}>
              {orderLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">WhatsApp off</th>
              </tr>
            </thead>
            <tbody>
              {!orderLoading && orders.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No orders found.</td></tr>
              )}
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono text-xs">#{o.order_number}</td>
                  <td className="px-4 py-3">
                    {o.delivery_name}
                    <span className="block text-xs text-muted-foreground">{o.delivery_phone}</span>
                  </td>
                  <td className="px-4 py-3">{String(o.status).replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">
                    <Switch checked={!!o.whatsapp_opt_out} onCheckedChange={(v) => toggleOrder(o, v)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminWhatsAppOptOuts;
