import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const TermsAndConditions = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-heading text-xl font-bold">Terms and Conditions</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="prose prose-sm md:prose-base prose-headings:font-heading prose-headings:text-foreground prose-p:text-muted-foreground max-w-none">
          <p className="text-sm text-muted-foreground mb-8">
            Last updated: {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Introduction</h2>
            <p className="text-muted-foreground mb-4">
              Welcome to California Farms India. These Terms and Conditions govern your use of our website and services.
              By accessing or using our services, you agree to be bound by these terms. California Farms India is owned
              and operated by Voyage Robotics Private Limited.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">2. Definitions</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>"Company", "We", "Us", "Our"</strong> refers to California Farms India, owned by Voyage Robotics Private Limited.</li>
              <li><strong>"Customer", "You", "Your"</strong> refers to the individual or entity using our services.</li>
              <li><strong>"Products"</strong> refers to vegetables and other farm produce available for purchase.</li>
              <li><strong>"Services"</strong> refers to our website, ordering system, and delivery services.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">3. Eligibility</h2>
            <p className="text-muted-foreground mb-4">
              To use our services, you must be at least 18 years of age or have parental/guardian consent.
              By using our services, you represent that you have the legal capacity to enter into this agreement.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">4. Account Registration</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You agree to provide accurate and complete information during registration.</li>
              <li>You are responsible for all activities that occur under your account.</li>
              <li>You must notify us immediately of any unauthorized use of your account.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Orders and Payments</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>All orders are subject to availability and confirmation.</li>
              <li>Prices are listed in Indian Rupees (INR) and are subject to change without notice.</li>
              <li>Payment must be made in full at the time of order placement.</li>
              <li>We accept online payments through Razorpay and other supported payment methods.</li>
              <li>Delivery charges are calculated based on distance from our store location.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">6. Delivery Terms</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Delivery is available within our service area as determined by pincode.</li>
              <li>Delivery times are estimates and may vary based on circumstances beyond our control.</li>
              <li>You must ensure someone is available to receive the delivery at the specified address.</li>
              <li>If delivery cannot be completed due to incorrect address or unavailability, additional charges may apply.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">7. Product Quality</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>We guarantee that all products are 100% chemical-free and organically grown.</li>
              <li>Products are freshly harvested and delivered within the shortest possible time.</li>
              <li>Due to the natural nature of farm produce, slight variations in size, color, and appearance are normal.</li>
              <li>If you receive products that do not meet quality standards, please contact us immediately.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">8. User Responsibilities</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>You agree to use our services only for lawful purposes.</li>
              <li>You will not misuse our website or attempt to gain unauthorized access.</li>
              <li>You will provide accurate delivery information.</li>
              <li>You will inspect products upon delivery and report any issues immediately.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">9. Intellectual Property</h2>
            <p className="text-muted-foreground mb-4">
              All content on this website, including text, graphics, logos, and images, is the property of
              California Farms India / Voyage Robotics Private Limited and is protected by applicable intellectual
              property laws. You may not reproduce, distribute, or use our content without written permission.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">10. Limitation of Liability</h2>
            <p className="text-muted-foreground mb-4">
              To the maximum extent permitted by law, California Farms India and Voyage Robotics Private Limited
              shall not be liable for any indirect, incidental, special, or consequential damages arising from
              the use of our services or products.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">11. Privacy Policy</h2>
            <p className="text-muted-foreground mb-4">
              Your use of our services is also governed by our Privacy Policy. We collect and process your
              personal information in accordance with applicable data protection laws to provide our services,
              process orders, and improve customer experience.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">12. Changes to Terms</h2>
            <p className="text-muted-foreground mb-4">
              We reserve the right to modify these Terms and Conditions at any time. Changes will be effective
              upon posting on our website. Your continued use of our services after changes constitutes
              acceptance of the modified terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">13. Governing Law</h2>
            <p className="text-muted-foreground mb-4">
              These Terms and Conditions are governed by the laws of India. Any disputes arising from these
              terms shall be subject to the exclusive jurisdiction of the courts in Nagpur, Maharashtra.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">14. Contact Information</h2>
            <div className="bg-muted/50 p-4 rounded-lg border border-border">
              <p className="text-muted-foreground mb-2">
                <strong className="text-foreground">California Farms India</strong><br />
                Owned by Voyage Robotics Private Limited
              </p>
              <p className="text-muted-foreground">
                Email: californiafarmsindia@gmail.com<br />
                Phone: +91 8149712801, +91 7559421334<br />
                Address: Ramgiri, Nagpur, Maharashtra
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;
