import { useEffect, useState } from "react";
import { Upload, Save, Plus, X, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useBotSettings, BotSettings } from "@/hooks/useBotSettings";
import { useImageUpload } from "@/hooks/useImageUpload";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const SOCIALS = ["instagram", "facebook", "youtube", "x", "linkedin"];

const BotBusinessProfile = () => {
  const { settings, isLoading, isSaving, save } = useBotSettings();
  const { uploadImage, isUploading } = useImageUpload();
  const [form, setForm] = useState<BotSettings | null>(null);

  useEffect(() => { if (settings) setForm(settings); }, [settings]);

  if (isLoading || !form) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const set = (patch: Partial<BotSettings>) => setForm({ ...form, ...patch });

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file);
    if (url) set({ business_logo_url: url });
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-heading font-semibold">Business Profile</h3>

          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-muted overflow-hidden flex items-center justify-center border border-border shrink-0">
              {form.business_logo_url ? (
                <img src={form.business_logo_url} alt="Business logo" className="w-full h-full object-cover" />
              ) : (
                <Upload className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo" className="text-sm">Profile picture</Label>
              <div className="flex gap-2">
                <Input id="logo" type="file" accept="image/*" onChange={handleLogo} className="max-w-xs" />
                {form.business_logo_url && (
                  <Button variant="ghost" size="icon" onClick={() => set({ business_logo_url: null })}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {isUploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Business name</Label>
              <Input value={form.business_name} onChange={(e) => set({ business_name: e.target.value })} />
            </div>
            <div>
              <Label>Website</Label>
              <Input value={form.business_website ?? ""} onChange={(e) => set({ business_website: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.business_email ?? ""} onChange={(e) => set({ business_email: e.target.value })} />
            </div>
            <div>
              <Label>Support number</Label>
              <Input value={form.support_number ?? ""} onChange={(e) => set({ support_number: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Textarea rows={2} value={form.business_description ?? ""} onChange={(e) => set({ business_description: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Address</Label>
              <Textarea rows={2} value={form.business_address ?? ""} onChange={(e) => set({ business_address: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Business hours</Label>
              <Input value={form.business_hours ?? ""} onChange={(e) => set({ business_hours: e.target.value })} />
            </div>
          </div>

          <div>
            <Label>Phone numbers</Label>
            <div className="space-y-2 mt-1">
              {form.business_phones.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={p}
                    onChange={(e) => {
                      const next = [...form.business_phones];
                      next[i] = e.target.value;
                      set({ business_phones: next });
                    }}
                  />
                  <Button variant="ghost" size="icon" onClick={() => set({ business_phones: form.business_phones.filter((_, j) => j !== i) })}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => set({ business_phones: [...form.business_phones, ""] })}>
                <Plus className="w-4 h-4 mr-1" /> Add number
              </Button>
            </div>
          </div>

          <div>
            <Label>Social links</Label>
            <div className="grid md:grid-cols-2 gap-3 mt-1">
              {SOCIALS.map((s) => (
                <div key={s}>
                  <p className="text-xs text-muted-foreground capitalize mb-1">{s}</p>
                  <Input
                    value={form.social_links?.[s] ?? ""}
                    placeholder="https://…"
                    onChange={(e) => set({ social_links: { ...form.social_links, [s]: e.target.value } })}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-heading font-semibold">Automatic messages</h3>
          <div>
            <Label>WhatsApp greeting</Label>
            <Textarea rows={2} value={form.greeting_message ?? ""} onChange={(e) => set({ greeting_message: e.target.value })} />
          </div>
          <div>
            <Label>Away message</Label>
            <Textarea rows={2} value={form.away_message ?? ""} onChange={(e) => set({ away_message: e.target.value })} />
          </div>
          <div>
            <Label>Working hours message</Label>
            <Textarea rows={2} value={form.working_hours_message ?? ""} onChange={(e) => set({ working_hours_message: e.target.value })} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => save(form)} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save profile
          </Button>
          <Button variant="outline" onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Sync to WhatsApp
          </Button>
        </div>
      </div>

      {/* Live bot preview */}
      <div className="space-y-3">
        <h3 className="font-heading font-semibold text-sm">Bot profile preview</h3>
        <div className="rounded-2xl border border-border overflow-hidden bg-muted/40">
          <div className="bg-[#075E54] text-primary-foreground p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-background/20 overflow-hidden flex items-center justify-center">
              {form.business_logo_url ? (
                <img src={form.business_logo_url} alt="Bot avatar preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs">Logo</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">{form.business_name}</p>
              <p className="text-xs opacity-80">Business account</p>
            </div>
          </div>
          <div className="p-4 space-y-2 text-sm">
            <div className="bg-card rounded-xl rounded-tl-sm p-3 border border-border">
              {form.greeting_message}
            </div>
            <div className="bg-card rounded-xl rounded-tl-sm p-3 border border-border text-muted-foreground text-xs space-y-1">
              <p>{form.business_description}</p>
              {form.business_address && <p>📍 {form.business_address}</p>}
              {form.business_hours && <p>🕑 {form.business_hours}</p>}
              {form.support_number && <p>📞 {form.support_number}</p>}
              {form.business_website && <p>🌐 {form.business_website}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BotBusinessProfile;
