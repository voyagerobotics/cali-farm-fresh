import { useState } from "react";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FARMER_SOLUTIONS, FARMERS_PHONE_DISPLAY } from "@/data/farmerSolutions";

const FarmerEnquiryForm = ({ defaultInterest }: { defaultInterest?: string }) => {
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    location: "",
    interest: defaultInterest || "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !/^\d{10}$/.test(form.phone.replace(/\D/g, "").slice(-10))) {
      toast.error("Please enter your name and a valid 10-digit phone number.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("farmer_enquiries")
      .insert({
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        location: form.location.trim() || null,
        interest: form.interest || null,
        message: form.message.trim() || null,
      })
      .select("id")
      .single();
    setLoading(false);

    if (error) {
      toast.error("Could not submit your enquiry. Please call us instead.");
      return;
    }
    setReference(`FRM-${(data?.id ?? "").slice(0, 8).toUpperCase()}`);
    toast.success("Enquiry submitted. Our farm team will call you shortly.");
  };

  if (reference) {
    return (
      <Card className="rounded-2xl border-primary/30">
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
          <h3 className="font-heading text-xl font-bold mb-2">Enquiry Received</h3>
          <p className="text-muted-foreground mb-4">
            Thank you! Our farm solutions team will contact you within 24 hours.
          </p>
          <p className="text-sm font-medium">
            Your reference number: <span className="text-primary">{reference}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-3">
            For anything urgent, call {FARMERS_PHONE_DISPLAY}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-border/70 shadow-sm">
      <CardContent className="p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fe-name">Full Name *</Label>
              <Input id="fe-name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Your name" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fe-phone">Phone Number *</Label>
              <Input id="fe-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="10-digit mobile number" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fe-email">Email</Label>
              <Input id="fe-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fe-location">Farm Location</Label>
              <Input id="fe-location" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Village / District / State" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Area of Interest</Label>
            <Select value={form.interest} onValueChange={(v) => set("interest", v)}>
              <SelectTrigger><SelectValue placeholder="Select a solution" /></SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {FARMER_SOLUTIONS.map((s) => (
                  <SelectItem key={s.id} value={s.title}>{s.title}</SelectItem>
                ))}
                <SelectItem value="Other / General Enquiry">Other / General Enquiry</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fe-msg">Tell us about your requirement</Label>
            <Textarea id="fe-msg" rows={4} value={form.message} onChange={(e) => set("message", e.target.value)} placeholder="Crop, acreage, quantity or the problem you want to solve" />
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Submit Enquiry
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Prefer to talk? Call our farmers support line {FARMERS_PHONE_DISPLAY}
          </p>
        </form>
      </CardContent>
    </Card>
  );
};

export default FarmerEnquiryForm;
