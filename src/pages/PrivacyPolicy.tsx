import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <section className="pt-24 pb-8 md:pt-32 md:pb-12 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
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

          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
              Privacy Policy
            </h1>
          </div>
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="prose prose-sm md:prose-base prose-headings:font-heading prose-headings:text-foreground prose-p:text-muted-foreground max-w-none">
            
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">1. Introduction</h2>
              <p className="text-muted-foreground mb-4">
                California Farms India ("we", "our", or "us"), owned and operated by Voyage Robotics Private Limited, 
                is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, 
                and safeguard your information when you visit our website and use our services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">2. Information We Collect</h2>
              
              <h3 className="text-lg font-medium text-foreground mb-3">Personal Information</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                <li>Name and contact information (email, phone number)</li>
                <li>Delivery address and location details</li>
                <li>Payment information (processed securely through our payment partners)</li>
                <li>Order history and preferences</li>
                <li>Account credentials</li>
              </ul>

              <h3 className="text-lg font-medium text-foreground mb-3">Automatically Collected Information</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Device information and browser type</li>
                <li>IP address and location data</li>
                <li>Usage patterns and browsing behavior</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">3. How We Use Your Information</h2>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Process and fulfill your orders</li>
                <li>Communicate order updates and delivery information</li>
                <li>Provide customer support</li>
                <li>Send promotional offers and updates (with your consent)</li>
                <li>Improve our products and services</li>
                <li>Ensure security and prevent fraud</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">4. Information Sharing</h2>
              <p className="text-muted-foreground mb-4">
                We do not sell, trade, or rent your personal information to third parties. We may share your 
                information only in the following circumstances:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Service Providers:</strong> With trusted partners who assist in operating our business (payment processors, delivery partners)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfers:</strong> In case of merger, acquisition, or sale of assets</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">5. Data Security</h2>
              <p className="text-muted-foreground mb-4">
                We implement appropriate technical and organizational measures to protect your personal information, including:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>SSL encryption for data transmission</li>
                <li>Secure payment processing through certified partners</li>
                <li>Regular security audits and updates</li>
                <li>Limited access to personal information by authorized personnel only</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">6. Cookies</h2>
              <p className="text-muted-foreground mb-4">
                We use cookies and similar technologies to enhance your browsing experience, analyze site traffic, 
                and personalize content. You can control cookie preferences through your browser settings.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">7. Your Rights</h2>
              <p className="text-muted-foreground mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Access your personal information</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Opt-out of marketing communications</li>
                <li>Withdraw consent at any time</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">8. Data Retention</h2>
              <p className="text-muted-foreground">
                We retain your personal information only for as long as necessary to fulfill the purposes 
                outlined in this policy, comply with legal obligations, resolve disputes, and enforce our agreements.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">9. Children's Privacy</h2>
              <p className="text-muted-foreground">
                Our services are not directed to individuals under the age of 18. We do not knowingly collect 
                personal information from children. If you believe we have collected information from a child, 
                please contact us immediately.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">10. Changes to This Policy</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. Any changes will be posted on this page 
                with an updated revision date. We encourage you to review this policy periodically.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">11. Contact Us</h2>
              <div className="bg-muted/50 p-4 rounded-lg border border-border">
                <p className="text-muted-foreground mb-2">
                  If you have any questions about this Privacy Policy, please contact us:
                </p>
                <p className="text-muted-foreground">
                  <strong className="text-foreground">California Farms India</strong><br />
                  Owned by Voyage Robotics Private Limited<br /><br />
                  Email: californiafarmsindia@gmail.com<br />
                  Phone: +91 8149712801, +91 7559421334<br />
                  Address: Ramgiri, Nagpur, Maharashtra
                </p>
              </div>
            </section>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
