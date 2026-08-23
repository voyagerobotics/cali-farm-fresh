import { useEffect, useState } from "react";
import { Plus, Trash2, Save, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { NavLink } from "@/hooks/useNavLinks";

const EMPTY = {
  label: "",
  link_type: "scroll",
  link_value: "",
  display_order: 10,
  is_visible: true,
  open_in_new_tab: false,
};

const AdminNavLinks = () => {
  const [links, setLinks] = useState<NavLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [draft, setDraft] = useState({ ...EMPTY });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("nav_links")
      .select("*")
      .order("display_order", { ascending: true });
    if (error) toast.error("Could not load navigation links");
    setLinks((data as NavLink[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (id: string, patch: Partial<NavLink>) =>
    setLinks((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const save = async (link: NavLink) => {
    setSaving(link.id);
    const { error } = await supabase
      .from("nav_links")
      .update({
        label: link.label,
        link_type: link.link_type,
        link_value: link.link_value,
        display_order: link.display_order,
        is_visible: link.is_visible,
        open_in_new_tab: link.open_in_new_tab,
      })
      .eq("id", link.id);
    setSaving(null);
    error ? toast.error("Save failed") : toast.success("Link updated");
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("nav_links").delete().eq("id", id);
    if (error) return toast.error("Delete failed");
    setLinks((ls) => ls.filter((l) => l.id !== id));
    toast.success("Link removed");
  };

  const add = async () => {
    if (!draft.label.trim() || !draft.link_value.trim()) {
      return toast.error("Label and link value are required");
    }
    const { data, error } = await supabase.from("nav_links").insert(draft).select("*").single();
    if (error) return toast.error("Could not add link");
    setLinks((ls) => [...ls, data as NavLink].sort((a, b) => a.display_order - b.display_order));
    setDraft({ ...EMPTY });
    toast.success("Link added");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold">Navigation Menu</h2>
        <p className="text-sm text-muted-foreground">
          Edit the website's main menu. Links with order below 4 appear before the Farmers menu, order 4 and above appear after it.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Add a new link</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-5 gap-3 items-end">
          <div className="space-y-1.5">
            <Label>Label</Label>
            <Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="e.g. Farm Visits" />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={draft.link_type} onValueChange={(v) => setDraft({ ...draft, link_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="scroll">Scroll to homepage section</SelectItem>
                <SelectItem value="route">Internal page</SelectItem>
                <SelectItem value="external">External URL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{draft.link_type === "scroll" ? "Section id" : draft.link_type === "route" ? "Path (/school-visits)" : "URL"}</Label>
            <Input value={draft.link_value} onChange={(e) => setDraft({ ...draft, link_value: e.target.value })} placeholder={draft.link_type === "scroll" ? "about" : "/farmers"} />
          </div>
          <div className="space-y-1.5">
            <Label>Order</Label>
            <Input type="number" value={draft.display_order} onChange={(e) => setDraft({ ...draft, display_order: Number(e.target.value) })} />
          </div>
          <Button onClick={add}><Plus className="w-4 h-4 mr-1" /> Add</Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-3">
          {links.map((l) => (
            <Card key={l.id}>
              <CardContent className="p-4 grid md:grid-cols-[1fr_1fr_1fr_90px_auto] gap-3 items-end">
                <div className="space-y-1.5">
                  <Label>Label</Label>
                  <Input value={l.label} onChange={(e) => update(l.id, { label: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={l.link_type} onValueChange={(v) => update(l.id, { link_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="scroll">Scroll to section</SelectItem>
                      <SelectItem value="route">Internal page</SelectItem>
                      <SelectItem value="external">External URL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Target</Label>
                  <Input value={l.link_value} onChange={(e) => update(l.id, { link_value: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Order</Label>
                  <Input type="number" value={l.display_order} onChange={(e) => update(l.id, { display_order: Number(e.target.value) })} />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 mr-2">
                    {l.is_visible ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                    <Switch checked={l.is_visible} onCheckedChange={(v) => update(l.id, { is_visible: v })} />
                  </div>
                  <Button size="sm" onClick={() => save(l)} disabled={saving === l.id}>
                    {saving === l.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => remove(l.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminNavLinks;
