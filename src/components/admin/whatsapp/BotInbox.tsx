import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Star, Archive, CheckCheck, Send, Loader2, Inbox, UserCheck, RefreshCw,
} from "lucide-react";

interface Conv {
  phone_number: string;
  customer_name: string | null;
  delivery_name: string | null;
  last_message_at: string | null;
  last_message_text: string | null;
  unread_count: number | null;
  is_starred: boolean | null;
  is_archived: boolean | null;
  inbox_status: string | null;
  assigned_to: string | null;
  language: string | null;
}

type Filter = "open" | "unread" | "starred" | "resolved" | "archived" | "all";

const BotInbox = () => {
  const { toast } = useToast();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [active, setActive] = useState<Conv | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const [filter, setFilter] = useState<Filter>("open");
  const [q, setQ] = useState("");
  const [admins, setAdmins] = useState<{ user_id: string; name: string }[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConvs = async () => {
    const [{ data }, { data: msgRows }] = await Promise.all([
      supabase
        .from("whatsapp_conversations")
        .select("*")
        .order("last_message_at", { ascending: false, nullsFirst: false }),
      supabase
        .from("whatsapp_messages")
        .select("phone_number, message_text, created_at")
        .order("created_at", { ascending: false })
        .limit(2000),
    ]);

    const list = ((data as any[]) || []).map((c) => ({ ...c }));
    const byPhone = new Map<string, any>(list.map((c) => [c.phone_number, c]));

    // Backfill conversations that only exist in the message history,
    // and fill in missing last-message info so nothing is hidden.
    for (const m of (msgRows as any[]) || []) {
      const existing = byPhone.get(m.phone_number);
      if (!existing) {
        const created = { phone_number: m.phone_number, last_message_at: m.created_at, last_message_text: m.message_text, unread_count: 0, inbox_status: "open" };
        byPhone.set(m.phone_number, created);
        list.push(created);
      } else if (!existing.last_message_at) {
        existing.last_message_at = m.created_at;
        existing.last_message_text = existing.last_message_text || m.message_text;
      }
    }

    list.sort((a, b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime());
    setConvs(list as Conv[]);
    setLoading(false);
  };


  const loadAdmins = async () => {
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
    const ids = (roles || []).map((r: any) => r.user_id);
    if (!ids.length) return;
    const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
    setAdmins((profs || []).map((p: any) => ({ user_id: p.user_id, name: p.full_name || "Teammate" })));
  };

  useEffect(() => {
    loadConvs();
    loadAdmins();
    const channel = supabase
      .channel("bot-inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_conversations" }, loadConvs)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "whatsapp_messages" }, (payload: any) => {
        setActive((cur) => {
          if (cur && payload.new?.phone_number === cur.phone_number) {
            setMsgs((m) => [...m, payload.new]);
          }
          return cur;
        });
        loadConvs();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const openConv = async (c: Conv) => {
    setActive(c);
    setMsgs([]);
    setLoadingMsgs(true);
    // Page through the whole history so nothing is cut off
    const all: any[] = [];
    const PAGE = 500;
    for (let from = 0; from < 10000; from += PAGE) {
      const { data, error } = await supabase.from("whatsapp_messages").select("*")
        .eq("phone_number", c.phone_number)
        .order("created_at", { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) break;
      all.push(...(data || []));
      if (!data || data.length < PAGE) break;
    }
    setMsgs(all);
    setLoadingMsgs(false);
    if (c.unread_count) {
      await supabase.from("whatsapp_conversations").update({ unread_count: 0 } as any).eq("phone_number", c.phone_number);
      loadConvs();
    }
  };


  const patch = async (phone: string, updates: Record<string, any>) => {
    await supabase.from("whatsapp_conversations").update(updates as any).eq("phone_number", phone);
    setConvs((prev) => prev.map((c) => (c.phone_number === phone ? { ...c, ...updates } : c)));
    setActive((cur) => (cur && cur.phone_number === phone ? { ...cur, ...updates } : cur));
  };

  const send = async () => {
    if (!active || !reply.trim()) return;
    setSending(true);
    const { data, error } = await supabase.functions.invoke("whatsapp-admin-send", {
      body: { action: "reply", phone: active.phone_number, text: reply.trim() },
    });
    setSending(false);
    if (error || (data as any)?.error) {
      toast({ title: "Could not send", description: (data as any)?.error || error?.message, variant: "destructive" });
      return;
    }
    setMsgs((m) => [...m, { id: crypto.randomUUID(), direction: "outbound", message_text: reply.trim(), created_at: new Date().toISOString() }]);
    setReply("");
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return convs.filter((c) => {
      if (filter === "open" && (c.is_archived || c.inbox_status === "resolved")) return false;
      if (filter === "unread" && !(c.unread_count && c.unread_count > 0)) return false;
      if (filter === "starred" && !c.is_starred) return false;
      if (filter === "resolved" && c.inbox_status !== "resolved") return false;
      if (filter === "archived" && !c.is_archived) return false;
      if (!s) return true;
      return (
        c.phone_number.includes(s) ||
        (c.customer_name || c.delivery_name || "").toLowerCase().includes(s) ||
        (c.last_message_text || "").toLowerCase().includes(s)
      );
    });
  }, [convs, filter, q]);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0 grid md:grid-cols-[320px_1fr] h-[70vh] min-h-[520px]">
        {/* Conversation list */}
        <div className={`border-r border-border flex-col min-h-0 ${active ? "hidden md:flex" : "flex"}`}>
          <div className="p-3 space-y-2 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">

                <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input className="pl-9 h-9" placeholder="Search chats…" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <Button size="icon" variant="ghost" className="h-9 w-9" onClick={loadConvs}><RefreshCw className="w-4 h-4" /></Button>
            </div>
            <div className="flex gap-1 flex-wrap">
              {(["open", "unread", "starred", "resolved", "archived", "all"] as Filter[]).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 rounded-full text-xs capitalize transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            {loading && <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>}
            {filtered.map((c) => (
              <button key={c.phone_number} onClick={() => openConv(c)}
                className={`w-full text-left p-3 border-b border-border hover:bg-muted/50 transition-colors ${active?.phone_number === c.phone_number ? "bg-muted" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm truncate flex items-center gap-1">
                    {c.is_starred && <Star className="w-3 h-3 fill-primary text-primary" />}
                    {c.customer_name || c.delivery_name || `+${c.phone_number}`}
                  </span>
                  {!!c.unread_count && <Badge className="h-5 min-w-5 px-1.5 justify-center">{c.unread_count}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{c.last_message_text || "—"}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {c.last_message_at ? new Date(c.last_message_at).toLocaleString("en-IN") : ""}
                </p>
              </button>
            ))}
            {!loading && !filtered.length && (
              <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
                <Inbox className="w-6 h-6" /> No conversations here
              </div>
            )}
          </div>
        </div>

        {/* Thread */}
        <div className={`flex-col min-h-0 ${active ? "flex" : "hidden md:flex"}`}>
          {active ? (
            <>
              <div className="p-3 border-b border-border flex flex-wrap items-center gap-2">
                <Button size="sm" variant="ghost" className="px-2" onClick={() => { setActive(null); setMsgs([]); }}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <div className="flex-1 min-w-[140px]">
                  <p className="font-medium text-sm">{active.customer_name || active.delivery_name || `+${active.phone_number}`}</p>
                  <p className="text-xs text-muted-foreground">+{active.phone_number} • {(active.language || "en").toUpperCase()}</p>
                </div>

                <Select value={active.assigned_to || "unassigned"} onValueChange={(v) => patch(active.phone_number, { assigned_to: v === "unassigned" ? null : v })}>
                  <SelectTrigger className="h-8 w-[150px] text-xs"><UserCheck className="w-3.5 h-3.5 mr-1" /><SelectValue placeholder="Assign" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {admins.map((a) => <SelectItem key={a.user_id} value={a.user_id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="ghost" onClick={() => patch(active.phone_number, { is_starred: !active.is_starred })}>
                  <Star className={`w-4 h-4 ${active.is_starred ? "fill-primary text-primary" : ""}`} />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => patch(active.phone_number, { inbox_status: active.inbox_status === "resolved" ? "open" : "resolved" })}>
                  <CheckCheck className={`w-4 h-4 ${active.inbox_status === "resolved" ? "text-primary" : ""}`} />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => patch(active.phone_number, { is_archived: !active.is_archived })}>
                  <Archive className={`w-4 h-4 ${active.is_archived ? "text-primary" : ""}`} />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-muted/20">
                {loadingMsgs && (
                  <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                )}
                {!loadingMsgs && !msgs.length && (
                  <p className="text-center text-sm text-muted-foreground py-6">No messages in this conversation yet.</p>
                )}
                {!loadingMsgs && !!msgs.length && (
                  <p className="text-center text-[11px] text-muted-foreground pb-2">
                    Showing all {msgs.length} messages · from {new Date(msgs[0].created_at).toLocaleString("en-IN")}
                  </p>
                )}
                {msgs.map((m) => (
                  <div key={m.id} className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.direction === "inbound" ? "bg-card border border-border" : "bg-primary text-primary-foreground ml-auto"}`}>
                    <p className="whitespace-pre-wrap break-words">{m.message_text}</p>
                    <p className={`text-[10px] mt-1 ${m.direction === "inbound" ? "text-muted-foreground" : "text-primary-foreground/70"}`}>
                      {new Date(m.created_at).toLocaleString("en-IN")}
                    </p>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>


              <div className="p-3 border-t border-border flex gap-2">
                <Textarea rows={2} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type your reply…"
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
                <Button onClick={send} disabled={sending || !reply.trim()}>
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Inbox className="w-8 h-8" />
              <p className="text-sm">Select a conversation to reply</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BotInbox;
