import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { Search, Star, Heart, Tag, User, MapPin, ShoppingBag, MessageSquare, Loader2, Plus } from "lucide-react";

interface Conv {
  phone_number: string;
  customer_name: string | null;
  delivery_name: string | null;
  delivery_address: string | null;
  delivery_city: string | null;
  delivery_pincode: string | null;
  language: string | null;
  cart: any;
  wishlist: any;
  tags: string[] | null;
  is_favorite: boolean | null;
  created_at: string | null;
  last_message_at: string | null;
}

interface OrderRow {
  id: string; order_number: string; total: number; status: string; created_at: string;
  delivery_phone: string; payment_status: string;
}

const last10 = (p?: string | null) => String(p || "").replace(/\D/g, "").slice(-10);

const BotCustomers = () => {
  const { toast } = useToast();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Conv | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    const [{ data: c }, { data: o }] = await Promise.all([
      supabase.from("whatsapp_conversations").select("*").order("last_message_at", { ascending: false, nullsFirst: false }),
      supabase.from("orders").select("id,order_number,total,status,created_at,delivery_phone,payment_status").order("created_at", { ascending: false }),
    ]);
    setConvs((c as any[]) || []);
    setOrders((o as OrderRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCustomer = async (c: Conv) => {
    setSelected(c);
    setMessages([]); setNotes([]); setItems([]);
    const [{ data: msgs }, { data: n }] = await Promise.all([
      supabase.from("whatsapp_messages").select("*").eq("phone_number", c.phone_number).order("created_at", { ascending: true }).limit(200),
      supabase.from("whatsapp_customer_notes").select("*").eq("phone_number", c.phone_number).order("created_at", { ascending: false }),
    ]);
    setMessages(msgs || []);
    setNotes(n || []);
    const custOrders = orders.filter((o) => last10(o.delivery_phone) === last10(c.phone_number));
    if (custOrders.length) {
      const { data: oi } = await supabase.from("order_items").select("*").in("order_id", custOrders.map((o) => o.id));
      setItems(oi || []);
    }
  };

  const stats = (phone: string) => {
    const mine = orders.filter((o) => last10(o.delivery_phone) === last10(phone));
    return {
      count: mine.length,
      spend: mine.reduce((s, o) => s + Number(o.total || 0), 0),
      last: mine[0]?.created_at || null,
      orders: mine,
    };
  };

  const favouriteProducts = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of items) map.set(i.product_name, (map.get(i.product_name) || 0) + Number(i.quantity || 0));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [items]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return convs;
    const matchedByProduct = new Set(
      items.filter((i) => String(i.product_name).toLowerCase().includes(s)).map((i) => i.order_id),
    );
    return convs.filter((c) => {
      const name = (c.customer_name || c.delivery_name || "").toLowerCase();
      const st = stats(c.phone_number);
      return (
        name.includes(s) ||
        c.phone_number.includes(s) ||
        (c.delivery_city || "").toLowerCase().includes(s) ||
        (c.delivery_pincode || "").includes(s) ||
        (c.tags || []).some((t) => t.toLowerCase().includes(s)) ||
        st.orders.some((o) => o.order_number.toLowerCase().includes(s) || matchedByProduct.has(o.id))
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, convs, orders, items]);

  const toggleFavorite = async (c: Conv) => {
    const next = !c.is_favorite;
    await supabase.from("whatsapp_conversations").update({ is_favorite: next } as any).eq("phone_number", c.phone_number);
    setConvs((prev) => prev.map((x) => (x.phone_number === c.phone_number ? { ...x, is_favorite: next } : x)));
    if (selected?.phone_number === c.phone_number) setSelected({ ...c, is_favorite: next });
  };

  const addTag = async () => {
    if (!selected || !tagDraft.trim()) return;
    const tags = [...new Set([...(selected.tags || []), tagDraft.trim()])];
    await supabase.from("whatsapp_conversations").update({ tags } as any).eq("phone_number", selected.phone_number);
    setSelected({ ...selected, tags });
    setConvs((prev) => prev.map((x) => (x.phone_number === selected.phone_number ? { ...x, tags } : x)));
    setTagDraft("");
  };

  const removeTag = async (tag: string) => {
    if (!selected) return;
    const tags = (selected.tags || []).filter((t) => t !== tag);
    await supabase.from("whatsapp_conversations").update({ tags } as any).eq("phone_number", selected.phone_number);
    setSelected({ ...selected, tags });
    setConvs((prev) => prev.map((x) => (x.phone_number === selected.phone_number ? { ...x, tags } : x)));
  };

  const addNote = async () => {
    if (!selected || !noteDraft.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("whatsapp_customer_notes")
      .insert({ phone_number: selected.phone_number, note: noteDraft.trim(), created_by: u.user?.id } as any)
      .select().single();
    if (error) { toast({ title: "Could not save note", description: error.message, variant: "destructive" }); return; }
    setNotes((prev) => [data, ...prev]);
    setNoteDraft("");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Customer management</CardTitle>
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search name, phone, city, product, tag or order number…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="overflow-auto max-h-[560px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/60">
                  <tr className="text-left">
                    <th className="p-3">Customer</th>
                    <th className="p-3">City</th>
                    <th className="p-3">Orders</th>
                    <th className="p-3">Lifetime spend</th>
                    <th className="p-3">Tags</th>
                    <th className="p-3">Last active</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const st = stats(c.phone_number);
                    return (
                      <tr key={c.phone_number} className="border-t border-border hover:bg-muted/40 cursor-pointer" onClick={() => openCustomer(c)}>
                        <td className="p-3">
                          <div className="font-medium flex items-center gap-1.5">
                            {c.is_favorite && <Heart className="w-3.5 h-3.5 fill-primary text-primary" />}
                            {c.customer_name || c.delivery_name || "Unknown"}
                          </div>
                          <div className="text-xs text-muted-foreground">+{c.phone_number}</div>
                        </td>
                        <td className="p-3">{c.delivery_city || c.delivery_pincode || "—"}</td>
                        <td className="p-3">{st.count}</td>
                        <td className="p-3">₹{st.spend.toFixed(0)}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {(c.tags || []).slice(0, 3).map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground text-xs">
                          {c.last_message_at ? new Date(c.last_message_at).toLocaleString("en-IN") : "—"}
                        </td>
                        <td className="p-3">
                          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); toggleFavorite(c); }}>
                            <Star className={`w-4 h-4 ${c.is_favorite ? "fill-primary text-primary" : ""}`} />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {!filtered.length && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No customers match your search.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selected && (() => {
            const st = stats(selected.phone_number);
            return (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    {selected.customer_name || selected.delivery_name || "Unknown customer"}
                  </SheetTitle>
                </SheetHeader>

                <div className="space-y-5 mt-4 text-sm">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Orders</div><div className="text-xl font-semibold">{st.count}</div></div>
                    <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Spend</div><div className="text-xl font-semibold">₹{st.spend.toFixed(0)}</div></div>
                    <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Language</div><div className="text-xl font-semibold uppercase">{selected.language || "en"}</div></div>
                  </div>

                  <div>
                    <div className="font-medium flex items-center gap-2 mb-1"><MapPin className="w-4 h-4" /> Address</div>
                    <p className="text-muted-foreground">{selected.delivery_address || "Not shared yet"}</p>
                    <p className="text-muted-foreground">{[selected.delivery_city, selected.delivery_pincode].filter(Boolean).join(" — ")}</p>
                    <p className="text-muted-foreground">📞 +{selected.phone_number}</p>
                  </div>

                  <div>
                    <div className="font-medium flex items-center gap-2 mb-2"><Tag className="w-4 h-4" /> Tags</div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {(selected.tags || []).map((t) => (
                        <Badge key={t} variant="secondary" className="cursor-pointer" onClick={() => removeTag(t)}>{t} ✕</Badge>
                      ))}
                      {!(selected.tags || []).length && <span className="text-muted-foreground text-xs">No tags yet</span>}
                    </div>
                    <div className="flex gap-2">
                      <Input value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} placeholder="Add a tag (VIP, wholesale…)" />
                      <Button onClick={addTag} size="sm"><Plus className="w-4 h-4" /></Button>
                    </div>
                  </div>

                  {favouriteProducts.length > 0 && (
                    <div>
                      <div className="font-medium mb-1">Favourite products</div>
                      <ul className="text-muted-foreground">
                        {favouriteProducts.map(([name, qty]) => <li key={name}>• {name} ×{qty}</li>)}
                      </ul>
                    </div>
                  )}

                  <div>
                    <div className="font-medium flex items-center gap-2 mb-1"><ShoppingBag className="w-4 h-4" /> Orders</div>
                    {st.orders.length ? st.orders.slice(0, 8).map((o) => (
                      <div key={o.id} className="flex justify-between border-b border-border py-1.5">
                        <span>#{o.order_number}</span>
                        <span className="text-muted-foreground">₹{o.total} • {o.status}</span>
                      </div>
                    )) : <p className="text-muted-foreground">No orders yet</p>}
                  </div>

                  <div>
                    <div className="font-medium mb-1">Current cart</div>
                    {Array.isArray(selected.cart) && selected.cart.length
                      ? selected.cart.map((c: any, i: number) => <div key={i} className="text-muted-foreground">• {c.name} ×{c.qty} — ₹{c.price * c.qty}</div>)
                      : <p className="text-muted-foreground">Empty</p>}
                  </div>

                  <div>
                    <div className="font-medium mb-1">Wishlist</div>
                    {Array.isArray(selected.wishlist) && selected.wishlist.length
                      ? selected.wishlist.map((w: any, i: number) => <div key={i} className="text-muted-foreground">• {w.name}</div>)
                      : <p className="text-muted-foreground">Empty</p>}
                  </div>

                  <div>
                    <div className="font-medium flex items-center gap-2 mb-2"><MessageSquare className="w-4 h-4" /> Chat history</div>
                    <div className="max-h-64 overflow-y-auto space-y-1.5 rounded-lg border p-3 bg-muted/30">
                      {messages.map((m) => (
                        <div key={m.id} className={`text-xs ${m.direction === "inbound" ? "text-foreground" : "text-primary"}`}>
                          <span className="font-medium">{m.direction === "inbound" ? "Customer" : "Bot"}:</span> {m.message_text}
                        </div>
                      ))}
                      {!messages.length && <p className="text-muted-foreground text-xs">No messages yet</p>}
                    </div>
                  </div>

                  <div>
                    <div className="font-medium mb-2">Internal notes (staff only)</div>
                    <Textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Add a private note…" rows={2} />
                    <Button size="sm" className="mt-2" onClick={addNote}>Save note</Button>
                    <div className="mt-3 space-y-2">
                      {notes.map((n) => (
                        <div key={n.id} className="rounded-lg border p-2 text-xs">
                          <p>{n.note}</p>
                          <p className="text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString("en-IN")}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default BotCustomers;
