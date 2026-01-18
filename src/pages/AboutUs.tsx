import { ArrowLeft, Leaf, Heart, Users, Award, Truck, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const AboutUs = () => {
  const navigate = useNavigate();

  const values = [
    {
      icon: Leaf,
      title: "100% Chemical Free",
      description: "We grow all our produce without any synthetic chemicals, pesticides, or fertilizers.",
    },
    {
      icon: Heart,
      title: "Farm to Table",
      description: "Fresh harvest delivered directly to your doorstep within hours of picking.",
    },
    {
      icon: Users,
      title: "Community First",
      description: "Supporting local farmers and building a healthier community together.",
    },
    {
      icon: Award,
      title: "Quality Assured",
      description: "Every product undergoes strict quality checks before delivery.",
    },
    {
      icon: Truck,
      title: "Fast Delivery",
      description: "Same-day delivery ensuring maximum freshness of your vegetables.",
    },
    {
      icon: Shield,
      title: "Trusted & Safe",
      description: "Transparent practices and secure transactions for your peace of mind.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
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
            <span className="inline-block bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
              Our Story
            </span>
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              Growing Freshness,<br />
              <span className="text-primary">Nurturing Health</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              California Farms India is more than just a farm — we're a family committed to bringing 
              you the freshest, most nutritious vegetables grown with love and care, completely free 
              from harmful chemicals.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block text-secondary font-semibold mb-2 tracking-wide uppercase text-sm">
                Our Mission
              </span>
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-6">
                Making Healthy Living Accessible
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                Founded with a vision to revolutionize how people consume vegetables, California Farms 
                India is dedicated to providing 100% chemical-free produce straight from our farms in 
                Ramgiri, Nagpur to your table.
              </p>
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                We believe that everyone deserves access to fresh, healthy, and safe food. Our farming 
                practices prioritize soil health, water conservation, and biodiversity, ensuring that 
                every vegetable we grow is not just good for you, but also good for the planet.
              </p>
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
                <p className="text-foreground font-medium mb-2">Owned & Operated by</p>
                <p className="text-muted-foreground">
                  Voyage Robotics Private Limited<br />
                  Ramgiri, Nagpur, Maharashtra
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-primary flex items-center justify-center">
                  <Leaf className="w-16 h-16 text-primary-foreground" />
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 bg-card border border-border rounded-2xl p-6 shadow-lg">
                <p className="text-4xl font-bold text-primary mb-1">100%</p>
                <p className="text-muted-foreground">Chemical Free</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="inline-block text-secondary font-semibold mb-2 tracking-wide uppercase text-sm">
              Our Values
            </span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
              What Sets Us Apart
            </h2>
            <p className="text-muted-foreground text-lg">
              We're committed to excellence in every aspect of our farm-to-table journey.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((value, index) => (
              <div
                key={index}
                className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <value.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                  {value.title}
                </h3>
                <p className="text-muted-foreground">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-8 md:p-12 text-center">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Ready to Taste the Difference?
            </h2>
            <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of happy customers who have made the switch to fresh, 
              chemical-free vegetables from California Farms India.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                variant="secondary"
                onClick={() => navigate("/")}
                className="font-semibold"
              >
                Shop Now
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/contact")}
                className="font-semibold bg-transparent text-primary-foreground border-primary-foreground hover:bg-primary-foreground hover:text-primary"
              >
                Contact Us
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutUs;
