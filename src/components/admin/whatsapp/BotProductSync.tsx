import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Package, AlertTriangle, TrendingDown, CheckCircle2, Radio } from "lucide-react";

interface P {
  id: string;
  name: string;
  price: number;
  unit: string;
  stock_quantity: number | null;
  is_available: boolean | null;
  is_hidden: boolean | null;
  category: string | null;
  updated_at: string;
}

const BotProductSync = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<P[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [liveEvents, setLiveEvents] = useState<string[]>([]);

  const load = async (announce = false) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("id,name,price,unit,stock_quantity,is_available,is_hidden,category,updated_at")
      .order("updated_at", { ascending: false });
    if (error) toast({ title: "Could not load catalog", description: error.message, variant: "destructive" });
    setProducts((data as P[]) || []);
    setLastSync(new Date());
    setLoading(false);
    if (announce) toast({ title: "Catalog synced", description: "The bot is serving the latest products, prices and stock." });
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("bot-product-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, (payload: any) => {
        const name = payload.new?.name || payload.old?.name || "Product";
        const verb = payload.eventType === "INSERT" ? "added" : payload.eventType === "DELETE" ? "removed" : "updated";
        setLiveEvents((prev) => [`${new Date().toLocaleTimeString("en-IN")} — ${name} ${verb}`, ...prev].slice(0, 8));
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const live = products.filter((p) => !p.is_hidden && p.is_available !== false);
    return {
      total: products.length,
      live: live.length,
      out: products.filter((p) => (p.stock_quantity ?? 1) <= 0).length,
      low: products.filter((p) => p.stock_quantity != null && p.stock_quantity > 0 && p.stock_quantity <= 5).length,
      hidden: products.filter((p) => p.is_hidden).length,
    };
  }, [products]);

  const filtered = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2"><Radio className="w-5 h-5 text-primary" /> Automated product sync</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              The bot reads this catalog live on every message — adds, edits, deletes, price and stock changes reach WhatsApp instantly. No redeploy needed.
            </p>
          </div>
          <Button onClick={() => load(true)} disabled={loading} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Sync now
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Products", value: stats.total, icon: Package },
              { label: "Live in bot", value: stats.live, icon: CheckCircle2 },
              { label: "Low stock", value: stats.low, icon: TrendingDown },
              { label: "Out of stock", value: stats.out, icon: AlertTriangle },
              { label: "Hidden", value: stats.hidden, icon: Package },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs"><s.icon className="w-3.5 h-3.5" />{s.label}</div>
                <div className="text-2xl font-semibold mt-1">{s.value}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Last checked {lastSync.toLocaleTimeString("en-IN")} • realtime listener active
          </p>
        </CardContent>
      </Card>

      {liveEvents.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Live catalog activity</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            {liveEvents.map((e, i) => <div key={i}>• {e}</div>)}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="text-base">Catalog the bot is serving</CardTitle>
          <Input placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60">
                <tr className="text-left">
                  <th className="p-3">Product</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Stock</th>
                  <th className="p-3">Bot status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const outOfStock = (p.stock_quantity ?? 1) <= 0;
                  const hidden = p.is_hidden || p.is_available === false;
                  return (
                    <tr key={p.id} className="border-t border-border">
                      <td className="p-3 font-medium">{p.name}</td>
                      <td className="p-3">₹{p.price}/{p.unit}</td>
                      <td className="p-3">{p.stock_quantity ?? "—"}</td>
                      <td className="p-3">
                        {hidden ? <Badge variant="secondary">Hidden</Badge>
                          : outOfStock ? <Badge variant="destructive">Out of stock</Badge>
                          : <Badge className="bg-primary/10 text-primary hover:bg-primary/10">Live</Badge>}
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No products found.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BotProductSync;
