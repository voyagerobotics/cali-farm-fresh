import { Leaf, Instagram, Facebook, Phone } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-foreground text-background py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <Leaf className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold leading-tight">California Farms</h3>
                <p className="text-xs text-background/70">India</p>
              </div>
            </div>
            <p className="text-background/70 text-sm leading-relaxed">
              Growing fresh, organic vegetables with zero chemicals. From our farm to your table, 
              pure and natural goodness.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-heading font-semibold text-lg mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a href="#about" className="text-background/70 hover:text-secondary transition-colors text-sm">
                  About Us
                </a>
              </li>
              <li>
                <a href="#products" className="text-background/70 hover:text-secondary transition-colors text-sm">
                  Our Products
                </a>
              </li>
              <li>
                <a href="#benefits" className="text-background/70 hover:text-secondary transition-colors text-sm">
                  Why Choose Us
                </a>
              </li>
              <li>
                <a href="#contact" className="text-background/70 hover:text-secondary transition-colors text-sm">
                  Contact & Order
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-heading font-semibold text-lg mb-4">Connect With Us</h4>
            <div className="flex items-center gap-4 mb-4">
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-secondary hover:text-foreground transition-all"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-secondary hover:text-foreground transition-all"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="tel:+919876543210"
                className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-secondary hover:text-foreground transition-all"
              >
                <Phone className="w-5 h-5" />
              </a>
            </div>
            <p className="text-background/70 text-sm">
              Follow us for farm updates, seasonal recipes, and special offers!
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-background/20 text-center">
          <p className="text-background/50 text-sm">
            © {currentYear} California Farms India. All rights reserved. Grown with love 🌱
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
