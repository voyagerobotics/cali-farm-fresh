import { Leaf, Truck, Clock, BadgeCheck, Recycle, Heart } from "lucide-react";

const benefits = [
  {
    icon: Leaf,
    title: "100% Chemical Free",
    description: "No synthetic pesticides, herbicides, or fertilizers. Pure, natural goodness.",
  },
  {
    icon: Truck,
    title: "Farm Fresh Delivery",
    description: "Vegetables harvested and delivered within 24 hours for maximum freshness.",
  },
  {
    icon: Clock,
    title: "Same-Day Harvest",
    description: "We pick your order fresh on the day of delivery, not days before.",
  },
  {
    icon: BadgeCheck,
    title: "Quality Guaranteed",
    description: "Not satisfied? We'll replace or refund your order, no questions asked.",
  },
  {
    icon: Recycle,
    title: "Eco-Friendly Packaging",
    description: "All our packaging is biodegradable or recyclable. Zero plastic promise.",
  },
  {
    icon: Heart,
    title: "Support Local",
    description: "By buying from us, you support local farmers and sustainable agriculture.",
  },
];

const BenefitsSection = () => {
  return (
    <section id="benefits" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-secondary font-medium mb-2">Why Choose Us</p>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
            The California Farms Difference
          </h2>
          <p className="text-muted-foreground">
            We're not just selling vegetables — we're delivering health, freshness, and 
            peace of mind to your doorstep.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="group p-6 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-elevated transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <benefit.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-xl text-foreground mb-2">
                {benefit.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
