import { useEffect, useState } from "react";
import { MessageSquare, Send, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { WA_STATUSES as STATUSES, WA_LANGUAGES } from "@/components/admin/AdminWhatsAppTemplates";

interface PreviewData {
  supported: boolean;
  body?: string;
  buttons?: string[];
  template?: string | null;
  templateLanguage?: string | null;
  language?: string;
  hasTranslation?: boolean;
  footer?: string | null;
  reason?: string;
}


/** Renders WhatsApp-style bold/italic markup as HTML-ish React nodes */
const renderWhatsAppText = (text: string) =>
  text.split("\n").map((line, i) => {
    const parts = line.split(/(\*[^*]+\*|_[^_]+_|~[^~]+~)/g).filter(Boolean);
    return (
      <span key={i} className="block min-h-[0.6rem]">
        {parts.map((p, j) => {
          if (p.startsWith("*") && p.endsWith("*")) return <strong key={j}>{p.slice(1, -1)}</strong>;
          if (p.startsWith("_") && p.endsWith("_")) return <em key={j}>{p.slice(1, -1)}</em>;
          if (p.startsWith("~") && p.endsWith("~")) return <s key={j}>{p.slice(1, -1)}</s>;
          return <span key={j}>{p}</span>;
        })}
      </span>
    );
  });

const AdminWhatsAppPreview = () => {
  const { toast } = useToast();
  const [status, setStatus] = useState("out_for_delivery");
  const [orderNumber, setOrderNumber] = useState("");
  const [customerName, setCustomerName] = useState("Rahul Sharma");
  const [testPhone, setTestPhone] = useState("");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const loadPreview = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp-order-update", {
        body: {
          preview: true,
          status,
          orderNumber: orderNumber.trim() || undefined,
          customerName: customerName.trim() || undefined,
        },
      });
      if (error) throw error;
      setPreview(data as PreviewData);
    } catch (e: any) {
      toast({ title: "Preview failed", description: e.message ?? "Try again", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const sendTest = async () => {
    const phone = testPhone.replace(/\D/g, "");
    if (phone.length < 10) {
      toast({ title: "Enter a valid WhatsApp number", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp-order-update", {
        body: {
          status,
          phone,
          orderNumber: orderNumber.trim() || "CFI-TEST-0001",
          customerName: customerName.trim() || "Customer",
          total: 499,
        },
      });
      if (error) throw error;
      if (data?.sent) {
        toast({ title: "Test message sent", description: `Delivered via ${data.via}` });
      } else {
        toast({
          title: "Not sent",
          description: data?.reason ?? "WhatsApp rejected the message",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({ title: "Send failed", description: e.message ?? "Try again", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" /> WhatsApp Message Preview
        </h2>
        <p className="text-sm text-muted-foreground">
          Check the exact text and buttons a customer receives for each order status, then send a test to yourself.
        </p>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        {/* Controls */}
        <div className="space-y-4 bg-card border border-border rounded-xl p-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="grid grid-cols-1 gap-1">
              {STATUSES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStatus(s.id)}
                  className={`text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                    status === s.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wa-order">Order number (optional)</Label>
            <Input
              id="wa-order"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="CFI-20260804-0001"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wa-name">Customer name</Label>
            <Input id="wa-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </div>

          <Button variant="outline" className="w-full" onClick={loadPreview} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Refresh preview
          </Button>

          <div className="pt-2 border-t border-border space-y-2">
            <Label htmlFor="wa-phone">Send test to WhatsApp number</Label>
            <Input
              id="wa-phone"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="9876543210"
            />
            <Button className="w-full" onClick={sendTest} disabled={sending}>
              {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send test message
            </Button>
            <p className="text-xs text-muted-foreground">
              Interactive buttons only deliver if the number messaged us in the last 24 hours; otherwise the approved
              template is used.
            </p>
          </div>
        </div>

        {/* Phone preview */}
        <div className="bg-muted/40 border border-border rounded-xl p-6 flex justify-center">
          <div className="w-full max-w-sm">
            <div className="rounded-2xl bg-background border border-border shadow-sm overflow-hidden">
              <div className="bg-primary/10 px-4 py-3 border-b border-border">
                <p className="font-medium text-sm">California Farms India</p>
                <p className="text-xs text-muted-foreground">+91 86000 11641 • WhatsApp Business</p>
              </div>
              <div className="p-4 space-y-2">
                {loading && (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!loading && preview && !preview.supported && (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No WhatsApp message is configured for this status.
                  </p>
                )}
                {!loading && preview?.supported && (
                  <>
                    <div className="bg-primary/5 border border-primary/20 rounded-xl rounded-tl-sm px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {renderWhatsAppText(preview.body || "")}
                      {preview.footer && (
                        <span className="block mt-2 text-[11px] text-muted-foreground">{preview.footer}</span>
                      )}
                    </div>
                    {(preview.buttons || []).map((b) => (
                      <div
                        key={b}
                        className="text-center text-sm text-primary border border-primary/30 rounded-lg py-2 bg-background"
                      >
                        {b}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
            {preview?.template && (
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Outside the 24h window this falls back to approved template{" "}
                <code className="font-mono">{preview.template}</code>.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminWhatsAppPreview;
