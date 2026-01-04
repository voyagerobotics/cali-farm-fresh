import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import heroImage from "@/assets/hero-farm.jpg";
const HeroSection = () => {
  const scrollToContact = () => {
    const element = document.getElementById("contact");
    element?.scrollIntoView({
      behavior: "smooth"
    });
  };
  const scrollToProducts = () => {
    const element = document.getElementById("products");
    element?.scrollIntoView({
      behavior: "smooth"
    });
  };
  return <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{
      backgroundImage: `url(${heroImage})`
    }}>
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/60 to-foreground/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-32">
        <div className="max-w-3xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-background/10 backdrop-blur-sm border border-background/20 rounded-full px-4 py-2 mb-6 animate-fade-in">
            <Sparkles className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium text-background">100% Chemical Free</span>
          </div>

          {/* Heading */}
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-background mb-6 animate-slide-up" style={{
          animationDelay: "0.1s"
        }}>
            Fresh from Our Farm,
            <br />
            <span className="text-secondary">Pure to Your Table</span>
            <br />
            in Just 3 Hours
          </h1>

          {/* Description */}
          <p className="text-lg md:text-xl text-background/80 mb-8 max-w-2xl animate-slide-up" style={{
          animationDelay: "0.2s"
        }}>
            At California Farms India, we grow vegetables the way nature intended — with zero chemicals, 
            pure chemical free methods, and a commitment to your health and wellbeing.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 animate-slide-up" style={{
          animationDelay: "0.3s"
        }}>
            <Button variant="hero" size="lg" onClick={scrollToContact}>
              Order Fresh Veggies
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button variant="heroOutline" size="lg" onClick={scrollToProducts}>
              Explore Products
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-background/20 animate-fade-in" style={{
          animationDelay: "0.5s"
        }}>
            <div>
              <p className="font-heading text-3xl md:text-4xl font-bold text-background">50+</p>
              <p className="text-sm text-background/70">Vegetable Varieties</p>
            </div>
            <div>
              <p className="font-heading text-3xl md:text-4xl font-bold text-background">Many</p>
              <p className="text-sm text-background/70">Happy Customers</p>
            </div>
            <div>
              <p className="font-heading text-3xl md:text-4xl font-bold text-background">3+</p>
              <p className="text-sm text-background/70">Years of Farming</p>
            </div>
          </div>
        </div>
      </div>
    </section>;
};
export default HeroSection;