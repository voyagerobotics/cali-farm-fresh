import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Clock, GraduationCap, IndianRupee, Users, MapPin, Sparkles, CheckCircle2, Sun, Phone, Mail, MessageCircle, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFarmVisitSettings } from "@/hooks/useFarmVisitSettings";

const GALLERY = [
  { src: "/school-visits/school-visit-1.jpg", caption: "Learning Beyond the Classroom" },
  { src: "/school-visits/school-visit-2.jpg", caption: "Inside the Dragon Fruit Orchard" },
  { src: "/school-visits/school-visit-3.jpg", caption: "Kids Exploring Nature & Farming" },
  { src: "/school-visits/school-visit-4.jpg", caption: "Hands-on with Crops & Flowers" },
  { src: "/school-visits/school-visit-5.jpg", caption: "Live Farm Talks with Experts" },
];


const GRADE_LABELS: Record<string, string> = {
  "1-6": "Grade 1 – Grade 6",
  "7-10": "Grade 7 – Grade 10",
  engineering: "Engineering College",
  college: "Other College",
};

const SchoolVisits = () => {
  const navigate = useNavigate();
  const { settings } = useFarmVisitSettings();

  const [form, setForm] = useState({
    schoolName: "",
    contactPerson: "",
    phone: "",
    email: "",
    gradeLevel: "",
    studentCount: "",
    preferredDate: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  // Always land at the top of the page (above the hero) when opening from CTAs
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const perStudent = useMemo(() => {
    if (!form.gradeLevel) return 0;
    return form.gradeLevel === "engineering" || form.gradeLevel === "college"
      ? settings.farm_visit_price_college
      : settings.farm_visit_price_school;
  }, [form.gradeLevel, settings]);

  const maxStudents = useMemo(() => {
    if (form.gradeLevel === "1-6") return settings.farm_visit_max_primary;
    if (form.gradeLevel === "7-10") return settings.farm_visit_max_secondary;
    if (form.gradeLevel === "engineering" || form.gradeLevel === "college")
      return settings.farm_visit_max_college;
    return 0;
  }, [form.gradeLevel, settings]);

  const estimate = (Number(form.studentCount) || 0) * perStudent;

  const validate = () => {
    if (!form.schoolName.trim()) return "Please enter your school / college name";
    if (!form.contactPerson.trim()) return "Please enter a contact person";
    if (!/^\d{10}$/.test(form.phone.trim())) return "Enter a valid 10-digit phone number";
    if (!form.gradeLevel) return "Please select a grade level";
    if (!form.studentCount || Number(form.studentCount) <= 0) return "Enter number of students";
    if (maxStudents && Number(form.studentCount) > maxStudents)
      return `Maximum ${maxStudents} students allowed for this grade level`;
    if (!form.preferredDate) return "Please select a preferred date";
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) return toast.error(err);

    setSubmitting(true);
    try {
      const bookingId = crypto.randomUUID();
      const { error } = await supabase
        .from("farm_visit_bookings")
        .insert({
          id: bookingId,
          school_name: form.schoolName.trim(),
          contact_person: form.contactPerson.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || null,
          grade_level: GRADE_LABELS[form.gradeLevel] || form.gradeLevel,
          student_count: Number(form.studentCount),
          preferred_date: form.preferredDate,
          notes: form.notes.trim() || null,
          estimated_charge: estimate,
          per_student_charge: perStudent,
          status: "new",
        });

      if (error) throw error;

      // Fire-and-forget email notification (don't block confirmation)
      supabase.functions
        .invoke("send-farm-visit-booking", {
          body: {
            bookingId,
            schoolName: form.schoolName.trim(),
            contactPerson: form.contactPerson.trim(),
            phone: form.phone.trim(),
            email: form.email.trim() || undefined,
            gradeLevel: form.gradeLevel,
            gradeLabel: GRADE_LABELS[form.gradeLevel] || form.gradeLevel,
            studentCount: Number(form.studentCount),
            preferredDate: form.preferredDate,
            notes: form.notes.trim() || undefined,
            estimatedCharge: estimate,
            perStudentCharge: perStudent,
          },
        })
        .catch((e) => console.error("Email dispatch failed:", e));

      setSubmittedRef(bookingId);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Could not submit your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* -------- Confirmation View -------- */
  if (submittedRef) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-32 pb-20">
          <div className="container mx-auto px-4 max-w-2xl">
            <Card className="border-primary/30 overflow-hidden">
              <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-primary-foreground/15 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h1 className="font-heading text-3xl font-bold mb-2">Request Received! 🌱</h1>
                <p className="text-primary-foreground/85">
                  Thank you, {form.contactPerson}. Your farm visit request is in.
                </p>
              </div>
              <CardContent className="p-8 space-y-5">
                <div className="rounded-xl bg-muted/50 p-5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
                    Reference ID
                  </p>
                  <p className="font-mono text-sm text-foreground">{submittedRef.slice(0, 8).toUpperCase()}</p>
                </div>

                <div className="space-y-3 text-sm text-foreground">
                  <Row label="School / College" value={form.schoolName} />
                  <Row label="Grade Level" value={GRADE_LABELS[form.gradeLevel]} />
                  <Row label="Students" value={form.studentCount} />
                  <Row
                    label="Preferred Date"
                    value={new Date(form.preferredDate).toLocaleDateString("en-IN", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  />
                  <Row label="Estimated Charges" value={`₹${estimate.toLocaleString("en-IN")}`} />
                </div>

                <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                  <p className="font-semibold text-foreground mb-2">What happens next?</p>
                  <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                    <li>Our team will review your request within <strong>1 working day</strong>.</li>
                    <li>We'll call or email you to confirm the date and arrival details.</li>
                    {form.email && (
                      <li>A confirmation copy has been sent to <strong>{form.email}</strong>.</li>
                    )}
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button className="flex-1" onClick={() => navigate("/")}>Back to Home</Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => window.open("https://wa.me/918149712801?text=Hi%2C%20I%20just%20submitted%20a%20farm%20visit%20request.", "_blank")}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" /> Reach us on WhatsApp
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-32 pb-16">
        <div className="container mx-auto px-4">
          <Button variant="ghost" onClick={() => navigate("/")} className="mb-6 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Button>

          {/* ===== Hero ===== */}
          <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-secondary/20 to-background p-8 md:p-14 mb-12">
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-secondary/20 blur-3xl" />
            <div className="relative grid md:grid-cols-2 gap-10 items-center">
              <div>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold mb-4">
                  <Sparkles className="w-3.5 h-3.5" /> Learning Beyond the Classroom
                </span>
                <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground leading-tight mb-4">
                  School & College Visits to{" "}
                  <span className="text-primary">California Farms</span>
                </h1>
                <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-6">
                  Bring your students to a real, working chemical-free farm in Nagpur.
                  A guided morning of greenhouses, dragon fruit orchards, vegetable beds,
                  solar dryers and live farmer talks — designed to spark curiosity about
                  food, nature and sustainability.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button size="lg" onClick={() => document.getElementById("book")?.scrollIntoView({ behavior: "smooth" })}>
                    Book a Farm Visit <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => window.open("https://wa.me/918149712801?text=Hi%2C%20I%20would%20like%20to%20enquire%20about%20a%20school%20farm%20visit.", "_blank")}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" /> Quick Enquiry
                  </Button>
                </div>
              </div>
              <div className="relative">
                <div className="grid grid-cols-2 gap-3">
                  <img
                    src={GALLERY[1].src}
                    alt="Farm tour at the dragon fruit orchard"
                    className="rounded-2xl shadow-xl object-cover w-full h-48 md:h-64 col-span-2"
                    loading="eager"
                  />
                  <img
                    src={GALLERY[2].src}
                    alt="Kids exploring the farm"
                    className="rounded-2xl shadow-md object-cover w-full h-32 md:h-40"
                  />
                  <img
                    src={GALLERY[4].src}
                    alt="Farm talk with expert"
                    className="rounded-2xl shadow-md object-cover w-full h-32 md:h-40"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ===== Quick Info Cards ===== */}
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
            <InfoCard
              icon={<CalendarDays className="w-5 h-5" />}
              title="Visit Season"
              value={settings.farm_visit_period}
              hint="Best of the harvest months"
            />
            <InfoCard
              icon={<Clock className="w-5 h-5" />}
              title="Visit Hours"
              value={settings.farm_visit_hours}
              hint={settings.farm_visit_days}
            />
            <InfoCard
              icon={<GraduationCap className="w-5 h-5" />}
              title="Grades Welcome"
              value="Grade 1 → Engineering 4th Year"
              hint="Schools & colleges"
            />
            <InfoCard
              icon={<MapPin className="w-5 h-5" />}
              title="Location"
              value="California Farms, Ramgiri, Nagpur"
              hint="Maharashtra, India"
            />
          </section>

          {/* ===== Capacity & Pricing ===== */}
          <section className="grid lg:grid-cols-2 gap-6 mb-14">
            <Card className="border-primary/20">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center gap-2 mb-5">
                  <Users className="w-5 h-5 text-primary" />
                  <h2 className="font-heading text-2xl font-bold">Per-Visit Student Limit</h2>
                </div>
                <ul className="space-y-4">
                  <CapacityRow grade="Up to Grade 6" count={`${settings.farm_visit_max_primary} students`} />
                  <CapacityRow grade="Up to Grade 10" count={`${settings.farm_visit_max_secondary} students`} />
                  <CapacityRow grade="Engineering Colleges" count={`${settings.farm_visit_max_college} students`} />
                </ul>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center gap-2 mb-5">
                  <IndianRupee className="w-5 h-5 text-primary" />
                  <h2 className="font-heading text-2xl font-bold">Cover Charges</h2>
                </div>
                <div className="space-y-4">
                  <PriceRow label="Students up to Grade 10" price={`₹${settings.farm_visit_price_school}`} suffix="per student" />
                  <PriceRow label="Higher / College / Engineering" price={`₹${settings.farm_visit_price_college}`} suffix="per student" highlight />
                </div>
                <p className="text-xs text-muted-foreground mt-5 leading-relaxed">
                  Includes guided farm tour, live farmer interaction and access to the
                  greenhouse, orchard and solar dryer demo zones.
                </p>
                {settings.farm_visit_notes && (
                  <p className="text-xs text-primary mt-3 font-medium">
                    ℹ️ {settings.farm_visit_notes}
                  </p>
                )}
              </CardContent>
            </Card>
          </section>

          {/* ===== Photo Gallery ===== */}
          <section className="mb-16">
            <div className="text-center mb-8">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/30 text-foreground text-xs font-semibold mb-3">
                <Sun className="w-3.5 h-3.5" /> Memories from Past Visits
              </span>
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-2">
                Moments from Our Last School Visit
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Real photos from students who walked our fields, tasted fresh produce
                and asked the best farming questions of the season.
              </p>
            </div>

            <div className="grid grid-cols-12 gap-3 md:gap-4">
              <GalleryTile className="col-span-12 md:col-span-8 h-64 md:h-96" item={GALLERY[0]} />
              <GalleryTile className="col-span-6 md:col-span-4 h-64 md:h-96" item={GALLERY[4]} />
              <GalleryTile className="col-span-6 md:col-span-4 h-48 md:h-64" item={GALLERY[1]} />
              <GalleryTile className="col-span-6 md:col-span-4 h-48 md:h-64" item={GALLERY[2]} />
              <GalleryTile className="col-span-12 md:col-span-4 h-48 md:h-64" item={GALLERY[3]} />
            </div>
          </section>

          {/* ===== Booking Form ===== */}
          <section id="book" className="scroll-mt-32">
            <Card className="border-primary/30 overflow-hidden">
              <div className="grid lg:grid-cols-5">
                <div className="lg:col-span-2 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-8 md:p-10">
                  <h2 className="font-heading text-3xl font-bold mb-3">Book Your Farm Visit</h2>
                  <p className="text-primary-foreground/85 mb-6 leading-relaxed">
                    Fill in the details and we'll confirm your visit slot within one
                    working day.
                  </p>

                  <div className="space-y-4 text-sm">
                    <BookingPoint icon={<Clock className="w-4 h-4" />} text={`${settings.farm_visit_days}, ${settings.farm_visit_hours}`} />
                    <BookingPoint icon={<CalendarDays className="w-4 h-4" />} text={settings.farm_visit_period} />
                    <BookingPoint icon={<CheckCircle2 className="w-4 h-4" />} text="Guided tour + farmer talk" />
                  </div>

                  <div className="mt-8 pt-6 border-t border-primary-foreground/20 space-y-2 text-sm">
                    <a href="tel:+918149712801" className="flex items-center gap-2 hover:underline">
                      <Phone className="w-4 h-4" /> +91 81497 12801
                    </a>
                    <a href="mailto:californiafarmsindia@gmail.com" className="flex items-center gap-2 hover:underline">
                      <Mail className="w-4 h-4" /> californiafarmsindia@gmail.com
                    </a>
                  </div>
                </div>

                <div className="lg:col-span-3 p-6 md:p-10">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="School / College Name *">
                      <Input value={form.schoolName} onChange={(e) => set("schoolName", e.target.value)} placeholder="e.g. CPSI School" />
                    </Field>
                    <Field label="Contact Person *">
                      <Input value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} placeholder="Teacher / Coordinator name" />
                    </Field>
                    <Field label="Phone (10 digits) *">
                      <Input
                        value={form.phone}
                        onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                        inputMode="numeric"
                        placeholder="9876543210"
                      />
                    </Field>
                    <Field label="Email (recommended)">
                      <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@school.edu" />
                    </Field>

                    <Field label="Grade Level *">
                      <Select value={form.gradeLevel} onValueChange={(v) => set("gradeLevel", v)}>
                        <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-6">Grade 1 – Grade 6 (max {settings.farm_visit_max_primary})</SelectItem>
                          <SelectItem value="7-10">Grade 7 – Grade 10 (max {settings.farm_visit_max_secondary})</SelectItem>
                          <SelectItem value="engineering">Engineering College (max {settings.farm_visit_max_college})</SelectItem>
                          <SelectItem value="college">Other College</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field label={`Number of Students *${maxStudents ? ` (max ${maxStudents})` : ""}`}>
                      <Input
                        type="number"
                        min={1}
                        max={maxStudents || undefined}
                        value={form.studentCount}
                        onChange={(e) => set("studentCount", e.target.value)}
                        placeholder="e.g. 40"
                      />
                    </Field>

                    <Field label="Preferred Date *">
                      <Input type="date" value={form.preferredDate} onChange={(e) => set("preferredDate", e.target.value)} min={new Date().toISOString().split("T")[0]} />
                    </Field>

                    <Field label="Notes (optional)" className="sm:col-span-2">
                      <Textarea
                        value={form.notes}
                        onChange={(e) => set("notes", e.target.value)}
                        placeholder="Any special requests, dietary needs, accessibility notes…"
                        rows={3}
                      />
                    </Field>
                  </div>

                  {estimate > 0 && (
                    <div className="mt-5 p-4 rounded-xl bg-secondary/30 border border-secondary flex items-center justify-between">
                      <div className="text-sm">
                        <p className="font-semibold text-foreground">Estimated Cover Charges</p>
                        <p className="text-muted-foreground text-xs">
                          {form.studentCount} students × ₹{perStudent}
                        </p>
                      </div>
                      <div className="font-heading text-2xl font-bold text-primary">
                        ₹{estimate.toLocaleString("en-IN")}
                      </div>
                    </div>
                  )}

                  <Button size="lg" className="w-full mt-6" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…
                      </>
                    ) : (
                      <>Submit Booking Request <ArrowRight className="w-4 h-4 ml-2" /></>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground mt-4">
                    By submitting you agree to be contacted by California Farms India
                    regarding your visit. Final confirmation is shared after we review
                    capacity for your preferred date.
                  </p>
                </div>
              </div>
            </Card>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

/* ---------- helpers ---------- */

const InfoCard = ({ icon, title, value, hint }: { icon: React.ReactNode; title: string; value: string; hint: string }) => (
  <Card className="border-border/60 hover:border-primary/40 transition-colors">
    <CardContent className="p-5">
      <div className="flex items-center gap-2 text-primary mb-2">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">{title}</span>
      </div>
      <p className="font-heading font-bold text-foreground leading-snug">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{hint}</p>
    </CardContent>
  </Card>
);

const CapacityRow = ({ grade, count }: { grade: string; count: string }) => (
  <li className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50">
    <span className="text-sm font-medium text-foreground">{grade}</span>
    <span className="text-sm font-bold text-primary">{count}</span>
  </li>
);

const PriceRow = ({ label, price, suffix, highlight }: { label: string; price: string; suffix: string; highlight?: boolean }) => (
  <div className={`flex items-center justify-between p-4 rounded-xl border ${highlight ? "border-primary bg-primary/5" : "border-border bg-muted/30"}`}>
    <span className="text-sm font-medium text-foreground">{label}</span>
    <div className="text-right">
      <div className="font-heading text-2xl font-bold text-foreground">{price}</div>
      <div className="text-[11px] text-muted-foreground -mt-1">{suffix}</div>
    </div>
  </div>
);

const GalleryTile = ({ item, className = "" }: { item: { src: string; caption: string }; className?: string }) => (
  <div className={`relative group overflow-hidden rounded-2xl border border-border/60 ${className}`}>
    <img
      src={item.src}
      alt={item.caption}
      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      loading="lazy"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/0 to-transparent" />
    <p className="absolute bottom-3 left-4 right-4 text-background text-sm font-semibold drop-shadow">
      {item.caption}
    </p>
  </div>
);

const BookingPoint = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <div className="flex items-center gap-3">
    <span className="w-8 h-8 rounded-full bg-primary-foreground/15 flex items-center justify-center">{icon}</span>
    <span>{text}</span>
  </div>
);

const Field = ({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) => (
  <div className={className}>
    <Label className="text-xs font-semibold text-foreground mb-1.5 block">{label}</Label>
    {children}
  </div>
);

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4 py-2 border-b border-border last:border-0">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-semibold text-right">{value}</span>
  </div>
);

export default SchoolVisits;
