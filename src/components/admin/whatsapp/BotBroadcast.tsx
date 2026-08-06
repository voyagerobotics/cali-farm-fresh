import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useImageUpload } from "@/hooks/useImageUpload";
import { Megaphone, Send, Users, Loader2, Plus, Trash2, ImagePlus } from "lucide-react";

const SEGMENTS = [
  { value: "all", label: "Everyone who chatted" },
  { value: "vip", label: "VIP (high spenders)" },
  { value: "new", label: "New — never ordered" },
  { value: "returning", label: "Returning customers" },
  { value: "abandoned_cart", label: "Abandoned carts" },
  { value: "city", label: "By city" },
  { value: "product", label: "Bought a product" },
  { value: "inactive", label: "Inactive since…" },
];

const BotBroadcast = () => {
  const { toast } = useToast();
  const { uploadImage, isUploading } = useImageUpload();
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<any>({
    name: "",
    message_text: "",
    media_url: "",
    media_type: "image",
    coupon_code: "",
    product_ids: [] as string[],
    buttons: [] as Array<{ id: string; title: string }>,
    scheduled_at: "",
    audience: { segment: "all", city: "", productId: "", minSpend: 2000, days: 30 },
  });

  const load = async () => {
    const [{ data: b }, { data: p }] = await Promise.all([
      supabase.from("whatsapp_broadcasts").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("id,name,price,unit").order("name"),
    ]);
    setBroadcasts(b || []);
    setProducts(p || []);
  };

  useEffect(() => { load(); }, []);

  const checkAudience = async () => {
    setChecking(true);
    const { data, error } = await supabase.functions.invoke("whatsapp-admin-send", {
      body: { action: "preview_audience", audience: form.audience },
    });
    setChecking(false);
    if (error || (data as any)?.error) {
      toast({ title: "Could not size audience", description: (data as any)?.error || error?.message, variant: "destructive" });
      return;
    }
    setAudienceCount((data as any).count);
  };

  const onUpload = async (file: File) => {
    const url = await uploadImage(file);
    if (url) setForm((f: any) => ({ ...f, media_url: url }));
  };

  const saveDraft = async () => {
    if (!form.name.trim() || !form.message_text.trim()) {
      toast({ title: "Name and message are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("whatsapp_broadcasts").insert({
      name: form.name,
      message_text: form.message_text,
      media_url: form.media_url || null,
      media_type: form.media_url ? form.media_type : null,
      coupon_code: form.coupon_code || null,
      product_ids: form.product_ids,
      buttons: form.buttons,
      audience: form.audience,
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      status: form.scheduled_at ? "scheduled" : "draft",
      created_by: u.user?.id,
    } as any);
    setSaving(false);
    if (error) { toast({ title: "Could not save campaign", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Campaign saved" });
    setForm({ ...form, name: "", message_text: "", media_url: "", coupon_code: "", product_ids: [], buttons: [], scheduled_at: "" });
    load();
  };

  const sendNow = async (id: string) => {
    setSendingId(id);
    const { data, error } = await supabase.functions.invoke("whatsapp-admin-send", {
      body: { action: "send_broadcast", broadcastId: id },
    });
    setSendingId(null);
    if (error || (data as any)?.error) {
      toast({ title: "Broadcast failed", description: (data as any)?.error || error?.message, variant: "destructive" });
      return;
    }
    const r = data as any;
    toast({ title: "Broadcast sent", description: `${r.sent} delivered, ${r.failed} failed out of ${r.total}.` });
    load();
  };

  const removeBroadcast = async (id: string) => {
    await supabase.from("whatsapp_broadcasts").delete().eq("id", id);
    load();
  };

  const toggleProduct = (id: string) => {
    setForm((f: any) => ({
      ...f,
      product_ids: f.product_ids.includes(id) ? f.product_ids.filter((x: string) => x !== id) : [...f.product_ids, id],
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Megaphone className="w-5 h-5 text-primary" /> New campaign</CardTitle>
          <p className="text-sm text-muted-foreground">
            Customers who opted out are always excluded. Numbers outside the 24-hour window need an approved marketing template.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Campaign name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Weekend fresh drop" />
            </div>
            <div>
              <Label>Coupon code (optional)</Label>
              <Input value={form.coupon_code} onChange={(e) => setForm({ ...form, coupon_code: e.target.value })} placeholder="FRESH10" />
            </div>
          </div>

          <div>
            <Label>Message</Label>
            <Textarea rows={4} value={form.message_text} onChange={(e) => setForm({ ...form, message_text: e.target.value })}
              placeholder="🌿 Fresh harvest is in! Farm-picked greens delivered today…" />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Media</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
                {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
              </div>
              {form.media_url && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={form.media_url} alt="Campaign media preview" className="w-16 h-16 object-cover rounded-lg" />
                  <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, media_url: "" })}>Remove</Button>
                </div>
              )}
            </div>
            <div>
              <Label>Schedule (optional)</Label>
              <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Buttons (max 3)</Label>
            <div className="space-y-2">
              {form.buttons.map((b: any, i: number) => (
                <div key={i} className="flex gap-2">
                  <Input value={b.title} placeholder="Button label"
                    onChange={(e) => { const nb = [...form.buttons]; nb[i] = { ...nb[i], title: e.target.value }; setForm({ ...form, buttons: nb }); }} />
                  <Input value={b.id} placeholder="Reply id (e.g. cat:vegetables)"
                    onChange={(e) => { const nb = [...form.buttons]; nb[i] = { ...nb[i], id: e.target.value }; setForm({ ...form, buttons: nb }); }} />
                  <Button size="icon" variant="ghost" onClick={() => setForm({ ...form, buttons: form.buttons.filter((_: any, x: number) => x !== i) })}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {form.buttons.length < 3 && (
                <Button size="sm" variant="outline" onClick={() => setForm({ ...form, buttons: [...form.buttons, { id: "menu", title: "Shop now" }] })}>
                  <Plus className="w-4 h-4 mr-1" /> Add button
                </Button>
              )}
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Product cards</Label>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {products.map((p) => (
                <Badge key={p.id} variant={form.product_ids.includes(p.id) ? "default" : "secondary"}
                  className="cursor-pointer" onClick={() => toggleProduct(p.id)}>
                  {p.name}
                </Badge>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border p-4 space-y-3">
            <Label className="flex items-center gap-2"><Users className="w-4 h-4" /> Audience</Label>
            <div className="grid md:grid-cols-3 gap-3">
              <Select value={form.audience.segment} onValueChange={(v) => { setForm({ ...form, audience: { ...form.audience, segment: v } }); setAudienceCount(null); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SEGMENTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
              {form.audience.segment === "city" && (
                <Input placeholder="City" value={form.audience.city} onChange={(e) => setForm({ ...form, audience: { ...form.audience, city: e.target.value } })} />
              )}
              {form.audience.segment === "product" && (
                <Select value={form.audience.productId} onValueChange={(v) => setForm({ ...form, audience: { ...form.audience, productId: v } })}>
                  <SelectTrigger><SelectValue placeholder="Pick product" /></SelectTrigger>
                  <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              )}
              {form.audience.segment === "vip" && (
                <Input type="number" placeholder="Min lifetime spend" value={form.audience.minSpend}
                  onChange={(e) => setForm({ ...form, audience: { ...form.audience, minSpend: Number(e.target.value) } })} />
              )}
              {form.audience.segment === "inactive" && (
                <Input type="number" placeholder="Days inactive" value={form.audience.days}
                  onChange={(e) => setForm({ ...form, audience: { ...form.audience, days: Number(e.target.value) } })} />
              )}
              <Button variant="outline" onClick={checkAudience} disabled={checking}>
                {checking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Users className="w-4 h-4 mr-2" />}
                Check reach
              </Button>
            </div>
            {audienceCount !== null && <p className="text-sm text-muted-foreground">This campaign will reach <strong>{audienceCount}</strong> customers.</p>}
          </div>

          <Button onClick={saveDraft} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImagePlus className="w-4 h-4 mr-2" />} Save campaign
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Campaigns</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {broadcasts.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div className="min-w-[180px]">
                <p className="font-medium">{b.name}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{b.message_text}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {b.status === "sent"
                    ? `Sent ${b.sent_count}/${b.total_recipients} • ${b.failed_count} failed`
                    : b.scheduled_at ? `Scheduled ${new Date(b.scheduled_at).toLocaleString("en-IN")}` : "Draft"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={b.status === "sent" ? "default" : "secondary"}>{b.status}</Badge>
                {b.status !== "sent" && (
                  <Button size="sm" onClick={() => sendNow(b.id)} disabled={sendingId === b.id}>
                    {sendingId === b.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />} Send now
                  </Button>
                )}
                <Button size="icon" variant="ghost" onClick={() => removeBroadcast(b.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
          {!broadcasts.length && <p className="text-sm text-muted-foreground">No campaigns yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default BotBroadcast;
