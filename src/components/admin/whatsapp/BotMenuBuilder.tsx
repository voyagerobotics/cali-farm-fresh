import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, GripVertical, Eye, EyeOff, Loader2, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type MenuItem = {
  id: string;
  parent_id: string | null;
  label: string;
  icon: string;
  action_type: string;
  action_value: string | null;
  display_order: number;
  is_visible: boolean;
};

const ACTIONS = [
  { value: "category", label: "Show category products" },
  { value: "bestsellers", label: "Show best sellers" },
  { value: "offers", label: "Show today's offers" },
  { value: "search", label: "Search products" },
  { value: "cart", label: "Open cart" },
  { value: "orders", label: "My orders" },
  { value: "support", label: "Talk to support" },
  { value: "text", label: "Send custom text" },
  { value: "submenu", label: "Open submenu" },
];

const BotMenuBuilder = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("whatsapp_menu_items")
      .select("*")
      .order("display_order", { ascending: true });
    if (error) toast({ title: "Could not load menu", description: error.message, variant: "destructive" });
    setItems((data as MenuItem[]) ?? []);
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const addItem = async (parentId: string | null) => {
    const siblings = items.filter((i) => i.parent_id === parentId);
    const { data, error } = await supabase
      .from("whatsapp_menu_items")
      .insert({
        label: parentId ? "New submenu item" : "New menu item",
        icon: "🌿",
        parent_id: parentId,
        display_order: siblings.length,
      })
      .select()
      .single();
    if (error) return toast({ title: "Could not add item", description: error.message, variant: "destructive" });
    setItems((prev) => [...prev, data as MenuItem]);
  };

  const patch = async (id: string, updates: Partial<MenuItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
    const { error } = await supabase.from("whatsapp_menu_items").update(updates as any).eq("id", id);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
  };

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id && i.parent_id !== id));
    const { error } = await supabase.from("whatsapp_menu_items").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
  };

  const persistOrder = async (list: MenuItem[]) => {
    await Promise.all(
      list.map((item, index) =>
        supabase.from("whatsapp_menu_items").update({ display_order: index }).eq("id", item.id)
      )
    );
  };

  const onDrop = async (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const dragged = items.find((i) => i.id === dragId);
    const target = items.find((i) => i.id === targetId);
    if (!dragged || !target || dragged.parent_id !== target.parent_id) return;

    const siblings = items
      .filter((i) => i.parent_id === dragged.parent_id)
      .sort((a, b) => a.display_order - b.display_order);
    const from = siblings.findIndex((i) => i.id === dragId);
    const to = siblings.findIndex((i) => i.id === targetId);
    siblings.splice(to, 0, siblings.splice(from, 1)[0]);
    const reordered = siblings.map((s, idx) => ({ ...s, display_order: idx }));
    setItems((prev) => prev.map((i) => reordered.find((r) => r.id === i.id) ?? i));
    setDragId(null);
    await persistOrder(reordered);
  };

  const Row = ({ item, depth }: { item: MenuItem; depth: number }) => (
    <div>
      <div
        draggable
        onDragStart={() => setDragId(item.id)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => onDrop(item.id)}
        className={`flex flex-wrap items-center gap-2 p-3 rounded-lg border border-border bg-card ${
          dragId === item.id ? "opacity-50" : ""
        }`}
        style={{ marginLeft: depth * 24 }}
      >
        <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab shrink-0" />
        <Input
          className="w-16 text-center"
          value={item.icon}
          onChange={(e) => patch(item.id, { icon: e.target.value })}
        />
        <Input
          className="flex-1 min-w-[140px]"
          value={item.label}
          onChange={(e) => patch(item.id, { label: e.target.value })}
        />
        <Select value={item.action_type} onValueChange={(v) => patch(item.id, { action_type: v })}>
          <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ACTIONS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {["category", "text"].includes(item.action_type) && (
          <Input
            className="w-[180px]"
            placeholder={item.action_type === "category" ? "category slug" : "message text"}
            value={item.action_value ?? ""}
            onChange={(e) => patch(item.id, { action_value: e.target.value })}
          />
        )}
        <Button
          variant="ghost"
          size="icon"
          title={item.is_visible ? "Hide from menu" : "Show in menu"}
          onClick={() => patch(item.id, { is_visible: !item.is_visible })}
        >
          {item.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
        </Button>
        {depth === 0 && (
          <Button variant="ghost" size="icon" title="Add submenu item" onClick={() => addItem(item.id)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={() => remove(item.id)}>
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
      <div className="space-y-2 mt-2">
        {items
          .filter((c) => c.parent_id === item.id)
          .sort((a, b) => a.display_order - b.display_order)
          .map((c) => <Row key={c.id} item={c} depth={depth + 1} />)}
      </div>
    </div>
  );

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const roots = items.filter((i) => !i.parent_id).sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-heading font-semibold">Menu Builder</h3>
          <p className="text-sm text-muted-foreground">
            Drag to reorder. Changes apply to the bot on the next customer message.
          </p>
        </div>
        <Button onClick={() => addItem(null)}>
          <Plus className="w-4 h-4 mr-2" /> Add menu item
        </Button>
      </div>

      {roots.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            No custom menu yet — the bot is using its automatic category menu.
          </p>
          <Button variant="outline" onClick={() => addItem(null)}>
            <Plus className="w-4 h-4 mr-2" /> Create the first item
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {roots.map((item) => <Row key={item.id} item={item} depth={0} />)}
        </div>
      )}
    </div>
  );
};

export default BotMenuBuilder;
