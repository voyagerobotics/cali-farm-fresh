import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import vegetablesImage from "@/assets/vegetables-display.jpg";

interface Product {
  id: number;
  name: string;
  price: string;
  unit: string;
  category: string;
}

const products: Product[] = [
  { id: 1, name: "Fresh Spinach", price: "₹40", unit: "per bunch", category: "Leafy Greens" },
  { id: 2, name: "Organic Tomatoes", price: "₹60", unit: "per kg", category: "Fruits" },
  { id: 3, name: "Farm Carrots", price: "₹50", unit: "per kg", category: "Root Vegetables" },
  { id: 4, name: "Green Cabbage", price: "₹35", unit: "per piece", category: "Leafy Greens" },
  { id: 5, name: "Bell Peppers Mix", price: "₹80", unit: "per kg", category: "Fruits" },
  { id: 6, name: "Fresh Coriander", price: "₹20", unit: "per bunch", category: "Herbs" },
  { id: 7, name: "Organic Potatoes", price: "₹45", unit: "per kg", category: "Root Vegetables" },
  { id: 8, name: "Green Beans", price: "₹70", unit: "per kg", category: "Beans" },
];

const ProductsSection = () => {
  const scrollToContact = () => {
    const element = document.getElementById("contact");
    element?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="products" className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-secondary font-medium mb-2">Our Produce</p>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
            Fresh From the Farm
          </h2>
          <p className="text-muted-foreground">
            Browse our selection of organic vegetables, harvested fresh daily from our farm. 
            All prices are approximate and may vary based on season.
          </p>
        </div>

        {/* Featured Image */}
        <div className="relative rounded-2xl overflow-hidden mb-12 shadow-elevated">
          <img
            src={vegetablesImage}
            alt="Fresh organic vegetables from California Farms India"
            className="w-full h-[300px] object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            <h3 className="font-heading text-2xl font-bold text-background mb-2">
              Seasonal Vegetable Box
            </h3>
            <p className="text-background/80 mb-4">
              A curated mix of 5-6 seasonal vegetables, perfect for a week's cooking
            </p>
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold text-background">₹299</span>
              <span className="text-background/70">per box</span>
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-card rounded-xl p-5 border border-border hover:shadow-elevated transition-all duration-300 hover:-translate-y-1"
            >
              <span className="inline-block text-xs font-medium text-secondary bg-secondary/10 px-2 py-1 rounded-full mb-3">
                {product.category}
              </span>
              <h3 className="font-heading font-semibold text-lg text-foreground mb-2">
                {product.name}
              </h3>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-xl font-bold text-primary">{product.price}</span>
                <span className="text-sm text-muted-foreground">{product.unit}</span>
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={scrollToContact}>
                <ShoppingCart className="w-4 h-4" />
                Add to Order
              </Button>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            Want something specific? We grow over 50 varieties of vegetables!
          </p>
          <Button size="lg" onClick={scrollToContact}>
            Contact Us for Custom Orders
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ProductsSection;
