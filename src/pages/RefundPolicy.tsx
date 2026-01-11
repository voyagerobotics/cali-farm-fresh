import { ArrowLeft, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const RefundPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-heading text-xl font-bold">Refund & Cancellation Policy</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <p className="text-sm text-muted-foreground mb-8">
          Last updated: {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        </p>

        {/* Quick Summary */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-foreground">Order Cancellation</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">100% Refund</strong> if you cancel your order at least 
              <strong className="text-primary"> 1 day before</strong> the scheduled delivery date.
            </p>
          </div>

          <div className="bg-secondary/5 border border-secondary/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-secondary" />
              </div>
              <h3 className="font-heading font-semibold text-foreground">Quality Issues</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">100% Refund</strong> within 
              <strong className="text-secondary"> 5 business days</strong> if you're not satisfied with product quality.
            </p>
          </div>
        </div>

        <div className="prose prose-sm md:prose-base prose-headings:font-heading prose-headings:text-foreground prose-p:text-muted-foreground max-w-none">
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Order Cancellation Policy</h2>
            
            <h3 className="text-lg font-medium text-foreground mb-3">Cancellation Before Delivery</h3>
            <div className="bg-muted/50 p-4 rounded-lg border border-border mb-4">
              <ul className="list-none space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span><strong className="text-foreground">100% Refund:</strong> Cancel at least 1 day (24 hours) before your scheduled delivery date.</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-secondary mt-0.5 flex-shrink-0" />
                  <span><strong className="text-foreground">No Refund:</strong> Cancellations made less than 24 hours before delivery cannot be processed as products are already prepared for dispatch.</span>
                </li>
              </ul>
            </div>

            <h3 className="text-lg font-medium text-foreground mb-3">How to Cancel an Order</h3>
            <ol className="list-decimal pl-6 text-muted-foreground space-y-2 mb-4">
              <li>Log in to your account on our website.</li>
              <li>Go to "My Orders" section.</li>
              <li>Select the order you wish to cancel.</li>
              <li>Click on "Cancel Order" button (available only if cancellation is allowed).</li>
              <li>Alternatively, contact us via phone or WhatsApp at +91 8149712801.</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">2. Refund for Quality Issues</h2>
            
            <p className="text-muted-foreground mb-4">
              We take pride in delivering fresh, high-quality, chemical-free vegetables. If you receive products 
              that do not meet our quality standards, we offer a full refund.
            </p>

            <h3 className="text-lg font-medium text-foreground mb-3">Eligibility for Quality Refund</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>Products are visibly damaged, spoiled, or rotten upon delivery.</li>
              <li>Products do not match the description or order placed.</li>
              <li>You are genuinely unsatisfied with the quality of the produce.</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mb-3">Process for Quality Refund</h3>
            <div className="bg-muted/50 p-4 rounded-lg border border-border mb-4">
              <ol className="list-decimal pl-4 text-muted-foreground space-y-2">
                <li><strong className="text-foreground">Report Immediately:</strong> Contact us within 2 hours of delivery via phone (+91 8149712801) or WhatsApp.</li>
                <li><strong className="text-foreground">Provide Evidence:</strong> Share clear photographs of the products showing the quality issue.</li>
                <li><strong className="text-foreground">Verification:</strong> Our team will verify the complaint within 24 hours.</li>
                <li><strong className="text-foreground">Refund Processing:</strong> Upon verification, 100% refund will be initiated.</li>
                <li><strong className="text-foreground">Refund Timeline:</strong> Refund will be credited within <strong className="text-primary">5 business days</strong> to your original payment method.</li>
              </ol>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">3. Refund Timeline Summary</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border border-border px-4 py-3 text-left text-foreground font-medium">Scenario</th>
                    <th className="border border-border px-4 py-3 text-left text-foreground font-medium">Refund Amount</th>
                    <th className="border border-border px-4 py-3 text-left text-foreground font-medium">Timeline</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-border px-4 py-3 text-muted-foreground">Cancellation 1+ day before delivery</td>
                    <td className="border border-border px-4 py-3 text-primary font-medium">100%</td>
                    <td className="border border-border px-4 py-3 text-muted-foreground">3-5 business days</td>
                  </tr>
                  <tr className="bg-muted/30">
                    <td className="border border-border px-4 py-3 text-muted-foreground">Cancellation less than 24 hours</td>
                    <td className="border border-border px-4 py-3 text-muted-foreground">Not applicable</td>
                    <td className="border border-border px-4 py-3 text-muted-foreground">-</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-4 py-3 text-muted-foreground">Quality issue with products</td>
                    <td className="border border-border px-4 py-3 text-primary font-medium">100%</td>
                    <td className="border border-border px-4 py-3 text-muted-foreground">5 business days after verification</td>
                  </tr>
                  <tr className="bg-muted/30">
                    <td className="border border-border px-4 py-3 text-muted-foreground">Wrong items delivered</td>
                    <td className="border border-border px-4 py-3 text-primary font-medium">100% or Replacement</td>
                    <td className="border border-border px-4 py-3 text-muted-foreground">Next delivery day</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">4. Non-Refundable Cases</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Orders cancelled less than 24 hours before scheduled delivery.</li>
              <li>Products damaged due to customer's improper storage after delivery.</li>
              <li>Natural variations in produce size, color, or shape (these are normal for organic products).</li>
              <li>Quality complaints raised after 24 hours of delivery without photographic evidence.</li>
              <li>Refund requests without valid order details or proof of purchase.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Refund Methods</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong className="text-foreground">Online Payments:</strong> Refund will be credited to the original payment source (bank account, UPI, or card).</li>
              <li><strong className="text-foreground">Processing Time:</strong> While we initiate refunds within 24-48 hours, bank processing may take 3-7 business days.</li>
              <li><strong className="text-foreground">Store Credit:</strong> You may opt for store credit instead of refund, which can be used for future orders.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">6. Contact for Refunds</h2>
            <div className="bg-muted/50 p-4 rounded-lg border border-border">
              <p className="text-muted-foreground mb-2">
                For any refund or cancellation requests, please contact us:
              </p>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Phone/WhatsApp:</strong> +91 8149712801, +91 7559421334<br />
                <strong className="text-foreground">Email:</strong> californiafarmsindia@gmail.com<br />
                <strong className="text-foreground">Working Hours:</strong> 9 AM - 6 PM, Monday to Saturday
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">7. Policy Updates</h2>
            <p className="text-muted-foreground">
              California Farms India (owned by Voyage Robotics Private Limited) reserves the right to modify 
              this refund and cancellation policy at any time. Any changes will be effective immediately upon 
              posting on our website. We encourage you to review this policy periodically.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default RefundPolicy;
