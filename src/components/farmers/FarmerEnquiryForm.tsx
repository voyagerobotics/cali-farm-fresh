import { useEffect, useRef, useState } from "react";
import { Loader2, Send, CheckCircle2, AlertCircle, Phone } from "lucide-react";
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
import { FARMER_SOLUTIONS, FARMERS_PHONE, FARMERS_PHONE_DISPLAY } from "@/data/farmerSolutions";
import { trackConversion, trackFormError, trackFormSubmit, trackFormView } from "@/lib/analytics";

const FORM_NAME = "farmer_enquiry";

type Field = "full_name" | "phone" | "email" | "location" | "interest" | "message";

const digits = (v: string) => v.replace(/\D/g, "");

const validators: Record<Field, (value: string) => string | null> = {
  full_name: (v) => {
    const name = v.trim();
    if (!name) return "Please enter your full name.";
    if (name.length < 3) return "Name looks too short — please enter at least 3 characters.";
    if (!/^[a-zA-Z\u0900-\u097F .'-]+$/.test(name)) return "Use letters only (no numbers or symbols).";
    return null;
  },
  phone: (v) => {
    const d = digits(v);
    const local = d.length > 10 && d.startsWith("91") ? d.slice(2) : d;
    if (!local) return "Please enter your mobile number.";
    if (local.length !== 10) return "Mobile number must be exactly 10 digits.";
    if (!/^[6-9]/.test(local)) return "Indian mobile numbers start with 6, 7, 8 or 9.";
    return null;
  },
  email: (v) => {
    const email = v.trim();
    if (!email) return null; // optional
    if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email)) return "Enter a valid email like you@example.com.";
    return null;
  },
  location: (v) => {
    const loc = v.trim();
    if (loc && loc.length < 3) return "Please add at least the village or district name.";
    return null;
  },
  interest: (v) => (v ? null : "Please choose what you are interested in."),
  message: (v) => {
    const msg = v.trim();
    if (msg && msg.length < 10) return "Add a little more detail (at least 10 characters).";
    if (msg.length > 1000) return "Please keep your message under 1000 characters.";
    return null;
  },
};

const FieldError = ({ msg }: { msg?: string }) =>
  msg ? (
    <p className="flex items-center gap-1.5 text-xs text-destructive" role="alert">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
      {msg}
    </p>
  ) : null;

const Hint = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs text-muted-foreground">{children}</p>
);

const FarmerEnquiryForm = ({ defaultInterest }: { defaultInterest?: string }) => {
  const [form, setForm] = useState<Record<Field, string>>({
    full_name: "",
    phone: "",
    email: "",
    location: "",
    interest: defaultInterest || "",
    message: "",
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const viewTracked = useRef(false);

  // Track a form view once the form is actually seen by the visitor
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || viewTracked.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !viewTracked.current) {
          viewTracked.current = true;
          trackFormView(FORM_NAME, { page_path: window.location.pathname });
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const set = (k: Field, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (touched[k]) setErrors((e) => ({ ...e, [k]: validators[k](v) ?? undefined }));
  };

  const blur = (k: Field) => {
    setTouched((t) => ({ ...t, [k]: true }));
    setErrors((e) => ({ ...e, [k]: validators[k](form[k]) ?? undefined }));
  };

  const validateAll = () => {
    const next: Partial<Record<Field, string>> = {};
    (Object.keys(validators) as Field[]).forEach((k) => {
      const msg = validators[k](form[k]);
      if (msg) next[k] = msg;
    });
    setErrors(next);
    setTouched({ full_name: true, phone: true, email: true, location: true, interest: true, message: true });
    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    trackFormSubmit(FORM_NAME, { interest: form.interest || "unspecified" });

    const invalid = validateAll();
    const firstInvalid = (Object.keys(invalid) as Field[])[0];
    if (firstInvalid) {
      trackFormError(FORM_NAME, `validation:${firstInvalid}`);
      toast.error("Please fix the highlighted fields and try again.");
      document.getElementById(`fe-${firstInvalid}`)?.focus();
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
      trackFormError(FORM_NAME, "server_error");
      setSubmitError(
        `We couldn't submit your enquiry right now. Please check your internet connection and try again, or call us on ${FARMERS_PHONE_DISPLAY}.`,
      );
      toast.error("Submission failed — please try again or call us.");
      return;
    }

    const newId = data?.id ?? "";
    supabase.functions
      .invoke("send-farmer-enquiry", {
        body: {
          enquiryId: newId,
          fullName: form.full_name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || undefined,
          location: form.location.trim() || undefined,
          interest: form.interest || undefined,
          message: form.message.trim() || undefined,
        },
      })
      .catch((err) => console.error("Enquiry notification failed:", err));

    const ref = `FRM-${newId.slice(0, 8).toUpperCase()}`;
    setReference(ref);
    trackConversion(FORM_NAME, {
      transaction_id: ref,
      interest: form.interest || "unspecified",
      has_email: Boolean(form.email.trim()),
    });
    toast.success("Enquiry submitted. Our farm team will call you shortly.");
  };

  if (reference) {
    return (
      <Card className="rounded-2xl border-primary/30 bg-primary/5">
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
          <h3 className="font-heading text-xl font-bold mb-2">Enquiry received — thank you!</h3>
          <p className="text-muted-foreground mb-4">
            Our farm solutions team will call you on{" "}
            <span className="font-medium text-foreground">{form.phone.trim()}</span> within 24 working hours.
            {form.email.trim() ? " A confirmation email is on its way too." : ""}
          </p>
          <p className="text-sm font-medium">
            Your reference number: <span className="text-primary">{reference}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Please keep this handy when you speak with our team.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <Button asChild variant="outline">
              <a href={`tel:${FARMERS_PHONE}`}>
                <Phone className="w-4 h-4" /> Call {FARMERS_PHONE_DISPLAY}
              </a>
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setReference(null);
                setForm({ full_name: "", phone: "", email: "", location: "", interest: "", message: "" });
                setTouched({});
                setErrors({});
              }}
            >
              Submit another enquiry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div ref={wrapRef}>
      <Card className="rounded-2xl border-border/70 shadow-sm">
        <CardContent className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {submitError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fe-full_name">Full Name *</Label>
                <Input
                  id="fe-full_name"
                  value={form.full_name}
                  onChange={(e) => set("full_name", e.target.value)}
                  onBlur={() => blur("full_name")}
                  placeholder="e.g. Ramesh Patil"
                  autoComplete="name"
                  aria-invalid={Boolean(errors.full_name)}
                  className={errors.full_name ? "border-destructive" : ""}
                />
                {errors.full_name ? <FieldError msg={errors.full_name} /> : <Hint>As it should appear on your order.</Hint>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fe-phone">Phone Number *</Label>
                <Input
                  id="fe-phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={14}
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  onBlur={() => blur("phone")}
                  placeholder="9876543210"
                  autoComplete="tel"
                  aria-invalid={Boolean(errors.phone)}
                  className={errors.phone ? "border-destructive" : ""}
                />
                {errors.phone ? <FieldError msg={errors.phone} /> : <Hint>10-digit Indian mobile — we call or WhatsApp you here.</Hint>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fe-email">Email (optional)</Label>
                <Input
                  id="fe-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  onBlur={() => blur("email")}
                  placeholder="you@example.com"
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email ? <FieldError msg={errors.email} /> : <Hint>Add it to receive a written quote and confirmation.</Hint>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fe-location">Farm Location (optional)</Label>
                <Input
                  id="fe-location"
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  onBlur={() => blur("location")}
                  placeholder="Village / District / State"
                  aria-invalid={Boolean(errors.location)}
                  className={errors.location ? "border-destructive" : ""}
                />
                {errors.location ? <FieldError msg={errors.location} /> : <Hint>Helps us plan delivery and site visits.</Hint>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fe-interest">Area of Interest *</Label>
              <Select
                value={form.interest}
                onValueChange={(v) => {
                  setTouched((t) => ({ ...t, interest: true }));
                  setForm((f) => ({ ...f, interest: v }));
                  setErrors((e) => ({ ...e, interest: validators.interest(v) ?? undefined }));
                }}
              >
                <SelectTrigger id="fe-interest" aria-invalid={Boolean(errors.interest)} className={errors.interest ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select a solution" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {FARMER_SOLUTIONS.map((s) => (
                    <SelectItem key={s.id} value={s.title}>{s.title}</SelectItem>
                  ))}
                  <SelectItem value="Other / General Enquiry">Other / General Enquiry</SelectItem>
                </SelectContent>
              </Select>
              {errors.interest ? <FieldError msg={errors.interest} /> : <Hint>Not sure? Pick “Other / General Enquiry”.</Hint>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fe-message">Tell us about your requirement (optional)</Label>
              <Textarea
                id="fe-message"
                rows={4}
                maxLength={1000}
                value={form.message}
                onChange={(e) => set("message", e.target.value)}
                onBlur={() => blur("message")}
                placeholder="Crop, acreage, quantity or the problem you want to solve"
                aria-invalid={Boolean(errors.message)}
                className={errors.message ? "border-destructive" : ""}
              />
              <div className="flex items-center justify-between gap-3">
                {errors.message ? <FieldError msg={errors.message} /> : <Hint>e.g. “2 acres dragon fruit, need saplings + drip”.</Hint>}
                <span className="text-xs text-muted-foreground shrink-0">{form.message.length}/1000</span>
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {loading ? "Submitting…" : "Submit Enquiry"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              We reply within 24 working hours. Prefer to talk? Call our farmers support line {FARMERS_PHONE_DISPLAY}
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default FarmerEnquiryForm;
