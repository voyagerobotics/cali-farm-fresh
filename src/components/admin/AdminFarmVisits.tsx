import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, GraduationCap, Phone, Mail, Calendar, Trash2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFarmVisitSettings, FarmVisitSettings } from "@/hooks/useFarmVisitSettings";
import { useToast } from "@/hooks/use-toast";

interface Booking {
  id: string;
  school_name: string;
  contact_person: string;
  phone: string;
  email: string | null;
  grade_level: string;
  student_count: number;
  preferred_date: string;
  notes: string | null;
  estimated_charge: number;
  per_student_charge: number;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

const STATUS_OPTIONS = ["new", "contacted", "confirmed", "cancelled", "completed"];

const statusColor = (s: string) =>
  s === "confirmed" ? "bg-primary text-primary-foreground"
  : s === "contacted" ? "bg-blue-500 text-white"
  : s === "completed" ? "bg-green-600 text-white"
  : s === "cancelled" ? "bg-destructive text-destructive-foreground"
  : "bg-yellow-500 text-white";

const AdminFarmVisits = () => {
  const { settings, isLoading, update } = useFarmVisitSettings();
  const { toast } = useToast();
  const [form, setForm] = useState<FarmVisitSettings>(settings);
  const [saving, setSaving] = useState(false);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  useEffect(() => setForm(settings), [settings]);

  const set = <K extends keyof FarmVisitSettings>(k: K, v: FarmVisitSettings[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const loadBookings = async () => {
    setLoadingBookings(true);
    const { data, error } = await supabase
      .from("farm_visit_bookings")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setBookings(data as any);
    setLoadingBookings(false);
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const ok = await update(form);
    setSaving(false);
    toast({
      title: ok ? "Settings saved" : "Save failed",
      description: ok ? "Farm visit details updated." : "Please try again.",
      variant: ok ? "default" : "destructive",
    });
  };

  const updateBookingStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("farm_visit_bookings")
      .update({ status })
      .eq("id", id);
    if (!error) {
      setBookings((p) => p.map((b) => (b.id === id ? { ...b, status } : b)));
      toast({ title: "Status updated" });
    }
  };

  const deleteBooking = async (id: string) => {
    if (!confirm("Delete this booking?")) return;
    const { error } = await supabase.from("farm_visit_bookings").delete().eq("id", id);
    if (!error) setBookings((p) => p.filter((b) => b.id !== id));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" /> Farm Visit Settings
              </CardTitle>
              <CardDescription>
                Customize what visitors see on the School Farm Visits page. Changes are live immediately.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="enabled" className="text-sm">Enabled</Label>
              <Switch
                id="enabled"
                checked={form.farm_visit_enabled}
                onCheckedChange={(v) => set("farm_visit_enabled", v)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Visit Period">
              <Input value={form.farm_visit_period} onChange={(e) => set("farm_visit_period", e.target.value)} placeholder="e.g. 15 July to 15 February" />
            </Field>
            <Field label="Visit Hours">
              <Input value={form.farm_visit_hours} onChange={(e) => set("farm_visit_hours", e.target.value)} placeholder="e.g. 8:00 AM to 11:00 AM" />
            </Field>
            <Field label="Visit Days">
              <Input value={form.farm_visit_days} onChange={(e) => set("farm_visit_days", e.target.value)} placeholder="e.g. Monday to Friday" />
            </Field>
            <Field label="Notes shown on page (optional)">
              <Input value={form.farm_visit_notes || ""} onChange={(e) => set("farm_visit_notes", e.target.value || null)} placeholder="e.g. Closed on public holidays" />
            </Field>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-sm text-foreground">Per-Visit Student Limit</h4>
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Up to Grade 6 (max students)">
                <Input type="number" min={1} value={form.farm_visit_max_primary} onChange={(e) => set("farm_visit_max_primary", Number(e.target.value))} />
              </Field>
              <Field label="Up to Grade 10 (max students)">
                <Input type="number" min={1} value={form.farm_visit_max_secondary} onChange={(e) => set("farm_visit_max_secondary", Number(e.target.value))} />
              </Field>
              <Field label="Engineering / College (max students)">
                <Input type="number" min={1} value={form.farm_visit_max_college} onChange={(e) => set("farm_visit_max_college", Number(e.target.value))} />
              </Field>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-sm text-foreground">Cover Charges (₹ per student)</h4>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="School students (up to Grade 10)">
                <Input type="number" min={0} value={form.farm_visit_price_school} onChange={(e) => set("farm_visit_price_school", Number(e.target.value))} />
              </Field>
              <Field label="College / Engineering students">
                <Input type="number" min={0} value={form.farm_visit_price_college} onChange={(e) => set("farm_visit_price_college", Number(e.target.value))} />
              </Field>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Settings
          </Button>
        </CardContent>
      </Card>

      {/* Bookings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Booking Requests</CardTitle>
            <CardDescription>All school/college farm visit submissions.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadBookings}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loadingBookings ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : bookings.length === 0 ? (
            <p className="text-center text-muted-foreground py-12 text-sm">No booking requests yet.</p>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => (
                <div key={b.id} className="border border-border rounded-xl p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-heading font-bold text-foreground">{b.school_name}</h3>
                        <Badge className={statusColor(b.status)}>{b.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Submitted {new Date(b.created_at).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={b.status} onValueChange={(v) => updateBookingStatus(b.id, v)}>
                        <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                        </SelectContent>
                      </Select>
                      <Button size="icon" variant="ghost" onClick={() => deleteBooking(b.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                    <Detail label="Contact" value={b.contact_person} />
                    <Detail label="Phone" value={<a href={`tel:+91${b.phone}`} className="text-primary hover:underline flex items-center gap-1"><Phone className="w-3 h-3" />+91 {b.phone}</a>} />
                    {b.email && <Detail label="Email" value={<a href={`mailto:${b.email}`} className="text-primary hover:underline flex items-center gap-1"><Mail className="w-3 h-3" />{b.email}</a>} />}
                    <Detail label="Grade" value={b.grade_level} />
                    <Detail label="Students" value={`${b.student_count}`} />
                    <Detail label="Preferred Date" value={<span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(b.preferred_date).toLocaleDateString("en-IN")}</span>} />
                    <Detail label="Estimated" value={`₹${b.estimated_charge.toLocaleString("en-IN")}`} />
                  </div>

                  {b.notes && (
                    <div className="mt-3 p-3 rounded-lg bg-muted/50 text-sm">
                      <p className="text-xs text-muted-foreground mb-1">Notes</p>
                      <p className="whitespace-pre-wrap">{b.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <Label className="text-xs font-semibold mb-1.5 block">{label}</Label>
    {children}
  </div>
);

const Detail = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">{label}</p>
    <div className="text-foreground">{value}</div>
  </div>
);

export default AdminFarmVisits;
