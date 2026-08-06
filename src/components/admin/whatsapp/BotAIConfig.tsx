import { useCallback, useEffect, useState } from "react";
import { Save, Plus, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBotSettings, BotSettings } from "@/hooks/useBotSettings";

type Faq = { id: string; question: string; answer: string; display_order: number; is_active: boolean };

const BotAIConfig = () => {
  const { settings, isLoading, isSaving, save } = useBotSettings();
  const [form, setForm] = useState<BotSettings | null>(null);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const { toast } = useToast();

  useEffect(() => { if (settings) setForm(settings); }, [settings]);

  const loadFaqs = useCallback(async () => {
    const { data, error } = await supabase
      .from("whatsapp_faqs")
      .select("*")
      .order("display_order", { ascending: true });
    if (error) toast({ title: "Could not load FAQs", description: error.message, variant: "destructive" });
    setFaqs((data as Faq[]) ?? []);
  }, [toast]);

  useEffect(() => { loadFaqs(); }, [loadFaqs]);

  if (isLoading || !form) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const set = (patch: Partial<BotSettings>) => setForm({ ...form, ...patch });

  const addFaq = async () => {
    const { data, error } = await supabase
      .from("whatsapp_faqs")
      .insert({ question: "New question", answer: "", display_order: faqs.length })
      .select()
      .single();
    if (error) return toast({ title: "Could not add", description: error.message, variant: "destructive" });
    setFaqs((prev) => [...prev, data as Faq]);
  };

  const patchFaq = async (id: string, updates: Partial<Faq>) => {
    setFaqs((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
    await supabase.from("whatsapp_faqs").update(updates as any).eq("id", id);
  };

  const removeFaq = async (id: string) => {
    setFaqs((prev) => prev.filter((f) => f.id !== id));
    await supabase.from("whatsapp_faqs").delete().eq("id", id);
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-heading font-semibold">AI personality</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label>Reply tone</Label>
            <Select value={form.ai_tone ?? "friendly"} onValueChange={(v) => set({ ai_tone: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["friendly", "professional", "casual", "enthusiastic", "concise"].map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Greeting style</Label>
            <Select value={form.ai_greeting_style ?? "warm"} onValueChange={(v) => set({ ai_greeting_style: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["warm", "formal", "playful", "minimal"].map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Default language</Label>
            <Select value={form.default_language} onValueChange={(v) => set({ default_language: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">Hindi</SelectItem>
                <SelectItem value="mr">Marathi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Personality description</Label>
          <Textarea rows={3} value={form.ai_personality ?? ""} onChange={(e) => set({ ai_personality: e.target.value })} />
        </div>
        <div>
          <Label>Fallback message</Label>
          <Textarea rows={2} value={form.fallback_message ?? ""} onChange={(e) => set({ fallback_message: e.target.value })} />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-heading font-semibold">Selling rules</h3>
        <div>
          <Label>Recommendation rules</Label>
          <Textarea rows={3} placeholder="e.g. Always suggest seasonal vegetables first."
            value={form.recommendation_rules ?? ""} onChange={(e) => set({ recommendation_rules: e.target.value })} />
        </div>
        <div>
          <Label>Upselling rules</Label>
          <Textarea rows={3} placeholder="e.g. Suggest the 1 kg pack when a customer picks 500 g."
            value={form.upsell_rules ?? ""} onChange={(e) => set({ upsell_rules: e.target.value })} />
        </div>
        <div>
          <Label>Cross-selling rules</Label>
          <Textarea rows={3} placeholder="e.g. With leafy greens, suggest organic turmeric powder."
            value={form.cross_sell_rules ?? ""} onChange={(e) => set({ cross_sell_rules: e.target.value })} />
        </div>
        <Button onClick={() => save(form)} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save AI configuration
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading font-semibold">Knowledge base / FAQs</h3>
            <p className="text-sm text-muted-foreground">The bot answers using these before falling back to the AI.</p>
          </div>
          <Button variant="outline" size="sm" onClick={addFaq}><Plus className="w-4 h-4 mr-1" /> Add</Button>
        </div>
        {faqs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No FAQs yet.</p>
        ) : (
          <div className="space-y-3">
            {faqs.map((f) => (
              <div key={f.id} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Input value={f.question} onChange={(e) => patchFaq(f.id, { question: e.target.value })} placeholder="Question" />
                  <Switch checked={f.is_active} onCheckedChange={(v) => patchFaq(f.id, { is_active: v })} />
                  <Button variant="ghost" size="icon" onClick={() => removeFaq(f.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                <Textarea rows={2} value={f.answer} placeholder="Answer"
                  onChange={(e) => patchFaq(f.id, { answer: e.target.value })} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BotAIConfig;
