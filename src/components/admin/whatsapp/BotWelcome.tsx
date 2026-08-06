import { useEffect, useState } from "react";
import { Save, Plus, X, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useBotContent, BotContent } from "@/hooks/useBotSettings";
import { useImageUpload } from "@/hooks/useImageUpload";

type Pair = { name: string; message: string };

const StringList = ({
  label, items, onChange, placeholder,
}: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder: string }) => (
  <div>
    <Label>{label}</Label>
    <div className="space-y-2 mt-1">
      {items.map((v, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={v}
            placeholder={placeholder}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
          />
          <Button variant="ghost" size="icon" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...items, ""])}>
        <Plus className="w-4 h-4 mr-1" /> Add
      </Button>
    </div>
  </div>
);

const PairList = ({
  label, items, onChange,
}: { label: string; items: Pair[]; onChange: (v: Pair[]) => void }) => (
  <div>
    <Label>{label}</Label>
    <div className="space-y-2 mt-1">
      {items.map((p, i) => (
        <div key={i} className="flex flex-col sm:flex-row gap-2">
          <Input
            className="sm:max-w-[180px]"
            placeholder="Occasion (e.g. Diwali)"
            value={p.name}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...p, name: e.target.value };
              onChange(next);
            }}
          />
          <Input
            placeholder="Greeting message"
            value={p.message}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...p, message: e.target.value };
              onChange(next);
            }}
          />
          <Button variant="ghost" size="icon" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...items, { name: "", message: "" }])}>
        <Plus className="w-4 h-4 mr-1" /> Add
      </Button>
    </div>
  </div>
);

const BotWelcome = () => {
  const { content, isLoading, isSaving, save } = useBotContent();
  const { uploadImage, isUploading } = useImageUpload();
  const [form, setForm] = useState<BotContent | null>(null);

  useEffect(() => { if (content) setForm(content); }, [content]);

  if (isLoading || !form) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const set = (patch: Partial<BotContent>) => setForm({ ...form, ...patch });

  const handleBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file);
    if (url) set({ banner_image_url: url });
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-heading font-semibold">Welcome message</h3>
          <div>
            <Label>Greeting</Label>
            <Input value={form.welcome_greeting} onChange={(e) => set({ welcome_greeting: e.target.value })} />
          </div>
          <div>
            <Label>Welcome text</Label>
            <Textarea rows={4} value={form.welcome_text} onChange={(e) => set({ welcome_text: e.target.value })} />
          </div>
          <div>
            <Label>Banner image</Label>
            <div className="flex items-center gap-3 mt-1">
              <div className="w-28 h-16 rounded-lg bg-muted overflow-hidden flex items-center justify-center border border-border shrink-0">
                {form.banner_image_url
                  ? <img src={form.banner_image_url} alt="Welcome banner" className="w-full h-full object-cover" />
                  : <Upload className="w-5 h-5 text-muted-foreground" />}
              </div>
              <Input type="file" accept="image/*" onChange={handleBanner} className="max-w-xs" />
              {form.banner_image_url && (
                <Button variant="ghost" size="icon" onClick={() => set({ banner_image_url: null })}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            {isUploading && <p className="text-xs text-muted-foreground mt-1">Uploading…</p>}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-5">
          <h3 className="font-heading font-semibold">Quick replies & suggestions</h3>
          <StringList label="Quick replies" items={form.quick_replies} placeholder="e.g. Show today's offers"
            onChange={(quick_replies) => set({ quick_replies })} />
          <StringList label="Suggested questions" items={form.suggested_questions} placeholder="e.g. What is the delivery charge?"
            onChange={(suggested_questions) => set({ suggested_questions })} />
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-5">
          <h3 className="font-heading font-semibold">Festival & seasonal greetings</h3>
          <PairList label="Festival greetings" items={form.festival_greetings}
            onChange={(festival_greetings) => set({ festival_greetings })} />
          <PairList label="Seasonal greetings" items={form.seasonal_greetings}
            onChange={(seasonal_greetings) => set({ seasonal_greetings })} />
        </div>

        <Button onClick={() => save(form)} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save changes
        </Button>
      </div>

      <div className="space-y-3">
        <h3 className="font-heading font-semibold text-sm">Preview</h3>
        <div className="rounded-2xl border border-border overflow-hidden bg-muted/40 p-4 space-y-2 text-sm">
          {form.banner_image_url && (
            <img src={form.banner_image_url} alt="Bot welcome banner preview" className="rounded-xl w-full object-cover max-h-32" />
          )}
          <div className="bg-card rounded-xl rounded-tl-sm p-3 border border-border whitespace-pre-wrap">
            <span className="font-medium">{form.welcome_greeting}</span>
            {"\n"}{form.welcome_text}
          </div>
          <div className="flex flex-wrap gap-2">
            {form.quick_replies.filter(Boolean).map((q, i) => (
              <span key={i} className="px-3 py-1.5 rounded-full border border-border bg-card text-xs">{q}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BotWelcome;
