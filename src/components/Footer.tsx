import { Leaf, Instagram, Facebook, Phone, Mail, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer className="bg-foreground text-background py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
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
              Growing fresh, chemical free vegetables with zero chemicals. From our farm to your table, 
              pure and natural goodness.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-heading font-semibold text-lg mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <button 
                  onClick={() => scrollToSection("about")} 
                  className="text-background/70 hover:text-secondary transition-colors text-sm"
                >
                  About Us
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection("products")} 
                  className="text-background/70 hover:text-secondary transition-colors text-sm"
                >
                  Our Products
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection("benefits")} 
                  className="text-background/70 hover:text-secondary transition-colors text-sm"
                >
                  Why Choose Us
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection("contact")} 
                  className="text-background/70 hover:text-secondary transition-colors text-sm"
                >
                  Contact & Order
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate("/orders")} 
                  className="text-background/70 hover:text-secondary transition-colors text-sm"
                >
                  My Orders
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-heading font-semibold text-lg mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-background/70">
                <Phone className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <a href="tel:+918149712801" className="hover:text-secondary transition-colors block">
                    +91 8149712801
                  </a>
                  <a href="tel:+917559421334" className="hover:text-secondary transition-colors block">
                    +91 7559421334
                  </a>
                </div>
              </li>
              <li className="flex items-center gap-2 text-sm text-background/70">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <a href="mailto:californiafarmsindia@gmail.com" className="hover:text-secondary transition-colors">
                  californiafarmsindia@gmail.com
                </a>
              </li>
              <li className="flex items-start gap-2 text-sm text-background/70">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Ramgiri, Nagpur, Maharashtra</span>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="font-heading font-semibold text-lg mb-4">Connect With Us</h4>
            <div className="flex items-center gap-4 mb-4">
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-secondary hover:text-foreground transition-all"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-secondary hover:text-foreground transition-all"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://wa.me/918149712801"
                className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-secondary hover:text-foreground transition-all"
                aria-label="WhatsApp"
              >
                <Phone className="w-5 h-5" />
              </a>
            </div>
            <p className="text-background/70 text-sm">
              Follow us for farm updates, seasonal recipes, and special offers!
            </p>
            <div className="mt-4 p-3 bg-background/10 rounded-lg">
              <p className="text-xs text-background/70">
                <strong className="text-background">Delivery Hours:</strong><br />
                Monday & Thursday<br />
                12:00 PM - 3:00 PM
              </p>
            </div>
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
