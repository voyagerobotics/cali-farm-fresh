import { Leaf, Heart, Shield } from "lucide-react";
import organicFarmingImage from "@/assets/organic-farming.jpg";
const AboutSection = () => {
  return <section id="about" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Image */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-elevated">
              <img src={organicFarmingImage} alt="Organic farming at California Farms India" className="w-full h-[400px] object-cover" />
            </div>
            {/* Floating Card */}
            <div className="absolute -bottom-6 -right-6 bg-card p-6 rounded-xl shadow-elevated border border-border max-w-[200px]">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Leaf className="w-5 h-5 text-primary" />
                </div>
                <p className="font-heading font-bold text-2xl text-foreground">Zero</p>
              </div>
              <p className="text-sm text-muted-foreground">Chemicals used in our farming</p>
            </div>
          </div>

          {/* Content */}
          <div>
            <p className="text-secondary font-medium mb-2">Our Story</p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-6">
              Nurturing Nature,
              <br />
              Nourishing Lives
            </h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              California Farms India was born from a simple belief: food should be as pure as nature 
              created it. Located in the heart of India, our farm spans acres of rich, fertile land 
              where we cultivate vegetables using traditional organic methods passed down through generations.
            </p>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              We don't use any synthetic pesticides, herbicides, or chemical fertilizers. Instead, 
              we rely on natural composting, crop rotation, and beneficial insects to maintain soil 
              health and keep pests at bay. The result? Vegetables that taste better, are richer in 
              nutrients, and are safer for you and your family.
            </p>

            {/* Features */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 bg-accent rounded-lg">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">100% Chemical Free</h4>
                  <p className="text-sm text-muted-foreground">No chemicals, ever</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-accent rounded-lg">
                <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                  <Heart className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">Farm Fresh</h4>
                  <p className="text-sm text-muted-foreground">Harvested daily</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>;
};
export default AboutSection;