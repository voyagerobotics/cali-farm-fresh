import { ArrowLeft, CheckCircle, Clock, AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const RefundPolicy = () => {
  const navigate = useNavigate();

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
                <RefreshCcw className="w-7 h-7 text-primary" />
              </div>
              <div>
                <span className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold mb-1">
                  Customer Support
                </span>
                <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                  Refund & Cancellation Policy
                </h1>
              </div>
            </div>
            <p className="text-lg text-muted-foreground mt-4">
              We believe in complete customer satisfaction. Here's everything you need to know about our hassle-free refund process.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Last updated: {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Quick Summary Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-foreground">Order Cancellation</h3>
              </div>
              <p className="text-muted-foreground">
                <span className="text-2xl font-bold text-primary block mb-1">100% Refund</span>
                Cancel at least <strong className="text-foreground">1 day before</strong> delivery
              </p>
            </div>

            <div className="bg-gradient-to-br from-secondary/5 to-secondary/10 border border-secondary/20 rounded-2xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-secondary" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-foreground">Quality Issues</h3>
              </div>
              <p className="text-muted-foreground">
                <span className="text-2xl font-bold text-secondary block mb-1">100% Refund</span>
                Processed within <strong className="text-foreground">5 business days</strong>
              </p>
            </div>
          </div>

          <div className="space-y-8">
            {/* Section 1 */}
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
              <h2 className="font-heading text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">1</span>
                Order Cancellation Policy
              </h2>
              
              <h3 className="text-lg font-medium text-foreground mb-4">Cancellation Before Delivery</h3>
              <div className="bg-muted/50 rounded-xl p-5 mb-6">
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground"><strong className="text-foreground">100% Refund:</strong> Cancel at least 1 day (24 hours) before your scheduled delivery date.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground"><strong className="text-foreground">No Refund:</strong> Cancellations made less than 24 hours before delivery cannot be processed as products are already prepared for dispatch.</span>
                  </li>
                </ul>
              </div>

              <h3 className="text-lg font-medium text-foreground mb-4">How to Cancel an Order</h3>
              <ol className="list-decimal pl-6 text-muted-foreground space-y-2">
                <li>Log in to your account on our website.</li>
                <li>Go to "My Orders" section.</li>
                <li>Select the order you wish to cancel.</li>
                <li>Click on "Cancel Order" button (available only if cancellation is allowed).</li>
                <li>Alternatively, contact us via phone or WhatsApp at +91 8149712801.</li>
              </ol>
            </div>

            {/* Section 2 */}
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
              <h2 className="font-heading text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">2</span>
                Refund for Quality Issues
              </h2>
              
              <p className="text-muted-foreground mb-6">
                We take pride in delivering fresh, high-quality, chemical-free vegetables. If you receive products 
                that do not meet our quality standards, we offer a full refund.
              </p>

              <h3 className="text-lg font-medium text-foreground mb-4">Eligibility for Quality Refund</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
                <li>Products are visibly damaged, spoiled, or rotten upon delivery.</li>
                <li>Products do not match the description or order placed.</li>
                <li>You are genuinely unsatisfied with the quality of the produce.</li>
              </ul>

              <h3 className="text-lg font-medium text-foreground mb-4">Process for Quality Refund</h3>
              <div className="grid gap-3">
                {[
                  { step: "1", title: "Report Immediately", desc: "Contact us within 2 hours of delivery via phone (+91 8149712801) or WhatsApp." },
                  { step: "2", title: "Provide Evidence", desc: "Share clear photographs of the products showing the quality issue." },
                  { step: "3", title: "Verification", desc: "Our team will verify the complaint within 24 hours." },
                  { step: "4", title: "Refund Processing", desc: "Upon verification, 100% refund will be initiated." },
                  { step: "5", title: "Refund Timeline", desc: "Refund will be credited within 5 business days to your original payment method." },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-4 bg-muted/30 rounded-lg p-4">
                    <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">{item.step}</span>
                    <div>
                      <p className="font-medium text-foreground">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3 */}
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
              <h2 className="font-heading text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">3</span>
                Refund Timeline Summary
              </h2>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-primary/10">
                      <th className="px-4 py-3 text-left text-foreground font-medium">Scenario</th>
                      <th className="px-4 py-3 text-left text-foreground font-medium">Refund</th>
                      <th className="px-4 py-3 text-left text-foreground font-medium">Timeline</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr className="bg-card hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4 text-muted-foreground">Cancellation 1+ day before delivery</td>
                      <td className="px-4 py-4"><span className="bg-primary/10 text-primary px-2 py-1 rounded font-medium">100%</span></td>
                      <td className="px-4 py-4 text-muted-foreground">3-5 business days</td>
                    </tr>
                    <tr className="bg-muted/20 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4 text-muted-foreground">Cancellation less than 24 hours</td>
                      <td className="px-4 py-4 text-muted-foreground">Not applicable</td>
                      <td className="px-4 py-4 text-muted-foreground">-</td>
                    </tr>
                    <tr className="bg-card hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4 text-muted-foreground">Quality issue with products</td>
                      <td className="px-4 py-4"><span className="bg-primary/10 text-primary px-2 py-1 rounded font-medium">100%</span></td>
                      <td className="px-4 py-4 text-muted-foreground">5 business days after verification</td>
                    </tr>
                    <tr className="bg-muted/20 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4 text-muted-foreground">Wrong items delivered</td>
                      <td className="px-4 py-4"><span className="bg-secondary/10 text-secondary px-2 py-1 rounded font-medium">100% / Replacement</span></td>
                      <td className="px-4 py-4 text-muted-foreground">Next delivery day</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 4 */}
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
              <h2 className="font-heading text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">4</span>
                Non-Refundable Cases
              </h2>
              <ul className="space-y-3">
                {[
                  "Orders cancelled less than 24 hours before scheduled delivery.",
                  "Products damaged due to customer's improper storage after delivery.",
                  "Natural variations in produce size, color, or shape (these are normal for organic products).",
                  "Quality complaints raised after 24 hours of delivery without photographic evidence.",
                  "Refund requests without valid order details or proof of purchase.",
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3 text-muted-foreground">
                    <AlertCircle className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Section 5 */}
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
              <h2 className="font-heading text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">5</span>
                Refund Methods
              </h2>
              <ul className="space-y-3 text-muted-foreground">
                <li><strong className="text-foreground">Online Payments:</strong> Refund will be credited to the original payment source (bank account, UPI, or card).</li>
                <li><strong className="text-foreground">Processing Time:</strong> While we initiate refunds within 24-48 hours, bank processing may take 3-7 business days.</li>
                <li><strong className="text-foreground">Store Credit:</strong> You may opt for store credit instead of refund, which can be used for future orders.</li>
              </ul>
            </div>

            {/* Contact Section */}
            <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-6 md:p-8 text-primary-foreground">
              <h2 className="font-heading text-xl font-semibold mb-4">Need Help with Refunds?</h2>
              <p className="text-primary-foreground/80 mb-4">
                For any refund or cancellation requests, our team is here to help.
              </p>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold">Phone/WhatsApp</p>
                  <p className="text-primary-foreground/80">+91 8149712801, +91 7559421334</p>
                </div>
                <div>
                  <p className="font-semibold">Email</p>
                  <p className="text-primary-foreground/80">californiafarmsindia@gmail.com</p>
                </div>
              </div>
              <p className="text-xs text-primary-foreground/60 mt-4">Working Hours: 9 AM - 6 PM, Monday to Saturday</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default RefundPolicy;
