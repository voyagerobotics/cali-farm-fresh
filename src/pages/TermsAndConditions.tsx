import { ArrowLeft, FileText, Shield, Truck, CreditCard, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const TermsAndConditions = () => {
  const navigate = useNavigate();

  const highlights = [
    { icon: Shield, title: "Account Security", desc: "Your credentials, your responsibility" },
    { icon: CreditCard, title: "Secure Payments", desc: "All transactions are encrypted" },
    { icon: Truck, title: "Delivery Terms", desc: "Clear delivery guidelines" },
    { icon: Scale, title: "Fair Practices", desc: "Governed by Indian law" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-20 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="container mx-auto px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          <div className="max-w-3xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-7 h-7 text-primary" />
              </div>
              <div>
                <span className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold mb-1">
                  Legal
                </span>
                <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                  Terms & Conditions
                </h1>
              </div>
            </div>
            <p className="text-lg text-muted-foreground mt-4">
              Please read these terms carefully before using our services. By accessing California Farms India, you agree to these terms.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Last updated: {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-8 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {highlights.map((item, index) => (
              <div key={index} className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="space-y-6">
            {/* Introduction */}
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
              <h2 className="font-heading text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">1</span>
                Introduction
              </h2>
              <p className="text-muted-foreground">
                Welcome to California Farms India. These Terms and Conditions govern your use of our website and services.
                By accessing or using our services, you agree to be bound by these terms. California Farms India is owned
                and operated by <strong className="text-foreground">Voyage Robotics Private Limited</strong>.
              </p>
            </div>

            {/* Definitions */}
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
              <h2 className="font-heading text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">2</span>
                Definitions
              </h2>
              <div className="grid gap-3">
                {[
                  { term: '"Company", "We", "Us", "Our"', def: "refers to California Farms India, owned by Voyage Robotics Private Limited." },
                  { term: '"Customer", "You", "Your"', def: "refers to the individual or entity using our services." },
                  { term: '"Products"', def: "refers to vegetables and other farm produce available for purchase." },
                  { term: '"Services"', def: "refers to our website, ordering system, and delivery services." },
                ].map((item, index) => (
                  <div key={index} className="bg-muted/30 rounded-lg p-4">
                    <p className="font-medium text-foreground">{item.term}</p>
                    <p className="text-sm text-muted-foreground">{item.def}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Eligibility */}
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
              <h2 className="font-heading text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">3</span>
                Eligibility
              </h2>
              <p className="text-muted-foreground">
                To use our services, you must be at least <strong className="text-foreground">18 years of age</strong> or have parental/guardian consent.
                By using our services, you represent that you have the legal capacity to enter into this agreement.
              </p>
            </div>

            {/* Account Registration */}
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
              <h2 className="font-heading text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">4</span>
                Account Registration
              </h2>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  You are responsible for maintaining the confidentiality of your account credentials.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  You agree to provide accurate and complete information during registration.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  You are responsible for all activities that occur under your account.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  You must notify us immediately of any unauthorized use of your account.
                </li>
              </ul>
            </div>

            {/* Orders and Payments */}
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
              <h2 className="font-heading text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">5</span>
                Orders and Payments
              </h2>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  All orders are subject to availability and confirmation.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Prices are listed in <strong className="text-foreground">Indian Rupees (INR)</strong> and are subject to change without notice.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Payment must be made in full at the time of order placement.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  We accept online payments through Razorpay and other supported payment methods.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Delivery charges are calculated based on distance from our store location.
                </li>
              </ul>
            </div>

            {/* Delivery Terms */}
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
              <h2 className="font-heading text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">6</span>
                Delivery Terms
              </h2>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Delivery is available within our service area as determined by pincode.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Delivery times are estimates and may vary based on circumstances beyond our control.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  You must ensure someone is available to receive the delivery at the specified address.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  If delivery cannot be completed due to incorrect address or unavailability, additional charges may apply.
                </li>
              </ul>
            </div>

            {/* Product Quality */}
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-6 md:p-8">
              <h2 className="font-heading text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">7</span>
                Product Quality Guarantee
              </h2>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  We guarantee that all products are <strong className="text-foreground">100% chemical-free</strong> and organically grown.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  Products are freshly harvested and delivered within the shortest possible time.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  Due to the natural nature of farm produce, slight variations in size, color, and appearance are normal.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  If you receive products that do not meet quality standards, please contact us immediately.
                </li>
              </ul>
            </div>

            {/* More sections in compact format */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-heading text-lg font-semibold text-foreground mb-3">8. User Responsibilities</h2>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Use services only for lawful purposes</li>
                  <li>• Do not misuse or attempt unauthorized access</li>
                  <li>• Provide accurate delivery information</li>
                  <li>• Inspect products upon delivery</li>
                </ul>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-heading text-lg font-semibold text-foreground mb-3">9. Intellectual Property</h2>
                <p className="text-sm text-muted-foreground">
                  All content including text, graphics, logos, and images is property of California Farms India / Voyage Robotics Private Limited and is protected by applicable laws.
                </p>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-heading text-lg font-semibold text-foreground mb-3">10. Limitation of Liability</h2>
                <p className="text-sm text-muted-foreground">
                  To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, or consequential damages arising from the use of our services.
                </p>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-heading text-lg font-semibold text-foreground mb-3">11. Governing Law</h2>
                <p className="text-sm text-muted-foreground">
                  These terms are governed by the laws of India. Disputes shall be subject to the exclusive jurisdiction of courts in <strong className="text-foreground">Nagpur, Maharashtra</strong>.
                </p>
              </div>
            </div>

            {/* Contact Section */}
            <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-6 md:p-8 text-primary-foreground">
              <h2 className="font-heading text-xl font-semibold mb-2">Questions About Our Terms?</h2>
              <p className="text-primary-foreground/80 mb-4 text-sm">Contact us for any clarifications.</p>
              <div className="bg-primary-foreground/10 rounded-xl p-4">
                <p className="font-semibold">California Farms India</p>
                <p className="text-sm text-primary-foreground/80">Owned by Voyage Robotics Private Limited</p>
                <div className="mt-3 grid sm:grid-cols-2 gap-2 text-sm text-primary-foreground/80">
                  <p>📧 californiafarmsindia@gmail.com</p>
                  <p>📞 +91 8149712801, +91 7559421334</p>
                  <p className="sm:col-span-2">📍 Ramgiri, Nagpur, Maharashtra</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default TermsAndConditions;
