import { useEffect, useState, useCallback } from "react";
import {
  MessageCircle, Users, UserPlus, Repeat, ShoppingBag, IndianRupee,
  Clock, ShoppingCart, Eye, TrendingUp, Inbox, RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Stats = {
  totalConversations: number;
  activeToday: number;
  newCustomers: number;
  returningCustomers: number;
  ordersToday: number;
  revenue: number;
  pendingOrders: number;
  abandonedCarts: number;
  unread: number;
  topViewed: { name: string; count: number }[];
  topSelling: { name: string; qty: number }[];
  dailyChats: { date: string; chats: number }[];
  dailyOrders: { date: string; orders: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
  customerGrowth: { date: string; customers: number }[];
};

const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const label = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

const BotDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const today = dayKey(new Date());
    const since = new Date(Date.now() - 29 * 86400000).toISOString();

    const [convRes, msgRes, ordersRes, itemsRes, viewsRes] = await Promise.all([
      supabase.from("whatsapp_conversations").select("phone_number, cart, created_at, updated_at"),
      supabase.from("whatsapp_messages").select("phone_number, direction, created_at").gte("created_at", since),
      supabase.from("orders").select("id, total, status, created_at, order_source, delivery_phone").eq("order_source", "whatsapp"),
      supabase.from("order_items").select("product_name, quantity, order_id"),
      supabase.from("product_views").select("product_id, created_at").gte("created_at", since),
    ]);

    const convs = convRes.data ?? [];
    const msgs = msgRes.data ?? [];
    const orders = ordersRes.data ?? [];
    const items = itemsRes.data ?? [];

    const viewCounts: Record<string, number> = {};
    (viewsRes.data ?? []).forEach((v: any) => {
      viewCounts[v.product_id] = (viewCounts[v.product_id] ?? 0) + 1;
    });
    const topIds = Object.entries(viewCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
    let topViewed: { name: string; count: number }[] = [];
    if (topIds.length) {
      const { data: prods } = await supabase.from("products").select("id, name").in("id", topIds);
      topViewed = topIds.map((id) => ({
        name: (prods as any[])?.find((p) => p.id === id)?.name ?? "Unknown",
        count: viewCounts[id],
      }));
    }

    const orderIds = new Set(orders.map((o: any) => o.id));
    const sellCounts: Record<string, number> = {};
    items.forEach((it: any) => {
      if (!orderIds.has(it.order_id)) return;
      sellCounts[it.product_name] = (sellCounts[it.product_name] ?? 0) + Number(it.quantity || 0);
    });
    const topSelling = Object.entries(sellCounts)
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([name, qty]) => ({ name, qty }));

    const activePhones = new Set(
      msgs.filter((m: any) => (m.created_at ?? "").startsWith(today)).map((m: any) => m.phone_number)
    );
    const orderPhoneCounts: Record<string, number> = {};
    orders.forEach((o: any) => {
      const p = (o.delivery_phone || "").replace(/\D/g, "").slice(-10);
      if (p) orderPhoneCounts[p] = (orderPhoneCounts[p] ?? 0) + 1;
    });
    const returningCustomers = Object.values(orderPhoneCounts).filter((c) => c > 1).length;
    const newCustomers = convs.filter((c: any) => (c.created_at ?? "").startsWith(today)).length;

    const abandonedCarts = convs.filter((c: any) => {
      const cart = Array.isArray(c.cart) ? c.cart : [];
      return cart.length > 0 && new Date(c.updated_at ?? 0).getTime() < Date.now() - 6 * 3600000;
    }).length;

    const lastByPhone: Record<string, any> = {};
    msgs.forEach((m: any) => {
      const prev = lastByPhone[m.phone_number];
      if (!prev || new Date(m.created_at) > new Date(prev.created_at)) lastByPhone[m.phone_number] = m;
    });
    const unread = Object.values(lastByPhone).filter((m: any) => m.direction === "inbound").length;

    const days = Array.from({ length: 14 }, (_, i) =>
      dayKey(new Date(Date.now() - (13 - i) * 86400000))
    );
    const dailyChats = days.map((d) => ({
      date: label(d),
      chats: msgs.filter((m: any) => (m.created_at ?? "").startsWith(d)).length,
    }));
    const dailyOrders = days.map((d) => ({
      date: label(d),
      orders: orders.filter((o: any) => o.created_at.startsWith(d)).length,
    }));
    let running = 0;
    const customerGrowth = days.map((d) => {
      running += convs.filter((c: any) => (c.created_at ?? "").startsWith(d)).length;
      return { date: label(d), customers: running };
    });

    const monthMap: Record<string, number> = {};
    orders.forEach((o: any) => {
      const m = o.created_at.slice(0, 7);
      monthMap[m] = (monthMap[m] ?? 0) + Number(o.total || 0);
    });
    const monthlyRevenue = Object.entries(monthMap)
      .sort()
      .slice(-6)
      .map(([m, revenue]) => ({
        month: new Date(`${m}-01`).toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
        revenue,
      }));

    setStats({
      totalConversations: convs.length,
      activeToday: activePhones.size,
      newCustomers,
      returningCustomers,
      ordersToday: orders.filter((o: any) => o.created_at.startsWith(today)).length,
      revenue: orders.reduce((s: number, o: any) => s + Number(o.total || 0), 0),
      pendingOrders: orders.filter((o: any) => o.status === "pending").length,
      abandonedCarts,
      unread,
      topViewed,
      topSelling,
      dailyChats,
      dailyOrders,
      monthlyRevenue,
      customerGrowth,
    });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const cards = [
    { label: "Conversations", value: stats.totalConversations, icon: MessageCircle },
    { label: "Active Today", value: stats.activeToday, icon: Users },
    { label: "New Customers", value: stats.newCustomers, icon: UserPlus },
    { label: "Returning", value: stats.returningCustomers, icon: Repeat },
    { label: "Orders Today", value: stats.ordersToday, icon: ShoppingBag },
    { label: "WhatsApp Revenue", value: `₹${stats.revenue.toLocaleString("en-IN")}`, icon: IndianRupee },
    { label: "Pending Orders", value: stats.pendingOrders, icon: Clock },
    { label: "Abandoned Carts", value: stats.abandonedCarts, icon: ShoppingCart },
    { label: "Unread Chats", value: stats.unread, icon: Inbox },
  ];

  const tipStyle = {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "0.5rem",
    color: "hsl(var(--foreground))",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold text-lg">Bot Overview</h3>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-4">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
              <c.icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <h4 className="font-medium mb-4 text-sm">Daily Chats</h4>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={stats.dailyChats}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" fontSize={11} stroke="hsl(var(--muted-foreground))" />
              <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <Tooltip contentStyle={tipStyle} />
              <Line type="monotone" dataKey="chats" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <h4 className="font-medium mb-4 text-sm">Daily Orders</h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.dailyOrders}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" fontSize={11} stroke="hsl(var(--muted-foreground))" />
              <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <Tooltip contentStyle={tipStyle} />
              <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <h4 className="font-medium mb-4 text-sm">Monthly Revenue</h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" fontSize={11} stroke="hsl(var(--muted-foreground))" />
              <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={tipStyle} />
              <Bar dataKey="revenue" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <h4 className="font-medium mb-4 text-sm">Customer Growth</h4>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats.customerGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" fontSize={11} stroke="hsl(var(--muted-foreground))" />
              <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <Tooltip contentStyle={tipStyle} />
              <Area type="monotone" dataKey="customers" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
            <Eye className="w-4 h-4 text-muted-foreground" /> Most Viewed Products
          </h4>
          {stats.topViewed.length === 0 ? (
            <p className="text-sm text-muted-foreground">No views recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {stats.topViewed.map((p) => (
                <li key={p.name} className="flex justify-between text-sm border-b border-border last:border-0 py-1.5">
                  <span>{p.name}</span>
                  <span className="text-muted-foreground">{p.count} views</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" /> Top Selling on WhatsApp
          </h4>
          {stats.topSelling.length === 0 ? (
            <p className="text-sm text-muted-foreground">No WhatsApp orders yet.</p>
          ) : (
            <ul className="space-y-2">
              {stats.topSelling.map((p) => (
                <li key={p.name} className="flex justify-between text-sm border-b border-border last:border-0 py-1.5">
                  <span>{p.name}</span>
                  <span className="text-muted-foreground">{p.qty} sold</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default BotDashboard;
