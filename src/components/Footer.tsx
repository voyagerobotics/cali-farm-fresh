import { Leaf, Instagram, Facebook, Phone, Mail, MapPin, Youtube, MessageCircle, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useSocialLinks } from "@/hooks/useSocialLinks";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();
  const { settings } = useSiteSettings();
  const { socialLinks } = useSocialLinks();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: "smooth" });
  };

  // Format order days for display
  const formatOrderDays = () => {
    const days = settings.order_days;
    if (days.length === 0) return "Contact us for schedule";
    
    return days.map(day => day.charAt(0).toUpperCase() + day.slice(1)).join(" & ");
  };

  const getIconComponent = (icon: string) => {
    switch (icon.toLowerCase()) {
      case "instagram":
        return Instagram;
      case "facebook":
        return Facebook;
      case "youtube":
        return Youtube;
      case "whatsapp":
        return MessageCircle;
      default:
        return ExternalLink;
    }
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
            <p className="text-background/70 text-sm leading-relaxed mb-3">
              Growing fresh, chemical free vegetables with zero chemicals. From our farm to your table, 
              pure and natural goodness.
            </p>
            <p className="text-background/50 text-xs">
              Owned by Voyage Robotics Private Limited
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-heading font-semibold text-lg mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <button 
                  onClick={() => navigate("/about")} 
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
                  onClick={() => navigate("/contact")} 
                  className="text-background/70 hover:text-secondary transition-colors text-sm"
                >
                  Contact Us
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

          {/* Useful Links */}
          <div>
            <h4 className="font-heading font-semibold text-lg mb-4">Useful Links</h4>
            <ul className="space-y-2">
              <li>
                <button 
                  onClick={() => navigate("/privacy-policy")} 
                  className="text-background/70 hover:text-secondary transition-colors text-sm"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate("/terms-and-conditions")} 
                  className="text-background/70 hover:text-secondary transition-colors text-sm"
                >
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate("/refund-policy")} 
                  className="text-background/70 hover:text-secondary transition-colors text-sm"
                >
                  Refund Policy
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate("/auth")} 
                  className="text-background/70 hover:text-secondary transition-colors text-sm"
                >
                  My Account
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
                <div>
                  <span>Ramgiri, Nagpur, Maharashtra</span>
                  {settings.map_url && (
                    <a
                      href={settings.map_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-secondary hover:underline mt-1"
                    >
                      View on Google Maps →
                    </a>
                  )}
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Connect With Us & Delivery Info */}
        <div className="grid md:grid-cols-2 gap-6 py-6 border-t border-background/20 mb-6">
          {/* Connect With Us */}
          <div>
            <h4 className="font-heading font-semibold text-lg mb-4">Connect With Us</h4>
            <div className="flex items-center gap-3 mb-4">
              {socialLinks.length > 0 ? (
                socialLinks.map((link) => {
                  const IconComponent = getIconComponent(link.icon);
                  return (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-secondary hover:text-foreground transition-all"
                      aria-label={link.platform}
                    >
                      <IconComponent className="w-5 h-5" />
                    </a>
                  );
                })
              ) : (
                <>
                  <a
                    href="https://instagram.com/californiafarmsindia"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-secondary hover:text-foreground transition-all"
                    aria-label="Instagram"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                  <a
                    href="https://facebook.com/californiafarmsindia"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-secondary hover:text-foreground transition-all"
                    aria-label="Facebook"
                  >
                    <Facebook className="w-5 h-5" />
                  </a>
                  <a
                    href="https://wa.me/918149712801"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-secondary hover:text-foreground transition-all"
                    aria-label="WhatsApp"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </a>
                </>
              )}
            </div>
            <p className="text-background/70 text-sm">
              Follow us for farm updates, seasonal recipes, and special offers!
            </p>
          </div>

          {/* Delivery Schedule */}
          <div className="p-4 bg-background/10 rounded-lg">
            <p className="text-sm text-background/70">
              <strong className="text-background">Delivery Schedule:</strong><br />
              {formatOrderDays()}<br />
              {settings.delivery_time_slot}
            </p>
          </div>
        </div>

        {/* Map Embed */}
        {settings.map_url && (
          <div className="py-6 border-t border-background/20 mb-6">
            <h4 className="font-heading font-semibold text-lg mb-4">Find Us</h4>
            <div className="rounded-xl overflow-hidden h-64 bg-background/10">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3721.0431611661584!2d79.04936!3d21.14995!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bd4c0e8f8c7e8d5%3A0x1c2b3c4d5e6f7a8b!2sRamgiri%2C%20Nagpur%2C%20Maharashtra!5e0!3m2!1sen!2sin!4v1234567890"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="California Farms India Location"
              />
            </div>
            <a
              href={settings.map_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-3 text-secondary hover:underline text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Open in Google Maps
            </a>
          </div>
        )}

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-background/10 text-center">
          <p className="text-background/50 text-sm">
            © {currentYear} California Farms India. All rights reserved. Grown with love 🌱
          </p>
          <p className="text-background/30 text-xs mt-2">
            A Voyage Robotics Private Limited Company
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
