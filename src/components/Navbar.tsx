import { Leaf, Phone, Menu, X, ShoppingCart, User, LogOut, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import CartDrawer from "./CartDrawer";
import NotificationBell from "./NotificationBell";
import FreeDeliveryBanner from "./FreeDeliveryBanner";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const isHomePage = location.pathname === "/";

  const scrollToSection = (id: string) => {
    if (!isHomePage) {
      navigate("/");
      setTimeout(() => {
        const element = document.getElementById(id);
        element?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      const element = document.getElementById(id);
      element?.scrollIntoView({ behavior: "smooth" });
    }
    setIsMenuOpen(false);
  };

  const handleAuthClick = () => {
    if (user) {
      signOut();
    } else {
      navigate("/auth");
    }
  };

  return (
    <>
      <FreeDeliveryBanner />
      <nav className="fixed top-8 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div 
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => navigate("/")}
            >
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <Leaf className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-heading text-lg font-bold text-foreground leading-tight">
                  California Farms
                </h1>
                <p className="text-xs text-muted-foreground">India</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <button
                onClick={() => scrollToSection("about")}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                About
              </button>
              <button
                onClick={() => scrollToSection("products")}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                Products
              </button>
              <button
                onClick={() => scrollToSection("benefits")}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                Why Us
              </button>
              <button
                onClick={() => scrollToSection("contact")}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                Contact
              </button>
            </div>

            {/* Right Side Actions */}
            <div className="hidden md:flex items-center gap-3">
              <a href="tel:+918149712801" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                <Phone className="w-4 h-4" />
                <span>+91 81497 12801</span>
              </a>

              {/* Notification Bell */}
              {user && <NotificationBell />}

              {/* Cart Button */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <ShoppingCart className="w-5 h-5 text-muted-foreground" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-medium">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
              </button>

              {/* Orders Button */}
              {user && (
                <button
                  onClick={() => navigate("/orders")}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="My Orders"
                >
                  <Package className="w-5 h-5 text-muted-foreground" />
                </button>
              )}

              {/* Admin Link */}
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
                  Admin
                </Button>
              )}

              {/* Auth Button */}
              <Button
                variant={user ? "outline" : "default"}
                size="sm"
                onClick={handleAuthClick}
              >
                {user ? (
                  <>
                    <LogOut className="w-4 h-4 mr-1" />
                    Logout
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4 mr-1" />
                    Login
                  </>
                )}
              </Button>
            </div>

            {/* Mobile Right Side */}
            <div className="flex md:hidden items-center gap-2">
              {/* Cart Button Mobile */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2"
              >
                <ShoppingCart className="w-5 h-5 text-foreground" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-medium">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
              </button>

              {/* Mobile Menu Button */}
              <button
                className="p-2"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? (
                  <X className="w-6 h-6 text-foreground" />
                ) : (
                  <Menu className="w-6 h-6 text-foreground" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-border pt-4 animate-fade-in">
              <div className="flex flex-col gap-4">
                <button
                  onClick={() => scrollToSection("about")}
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors text-left"
                >
                  About
                </button>
                <button
                  onClick={() => scrollToSection("products")}
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors text-left"
                >
                  Products
                </button>
                <button
                  onClick={() => scrollToSection("benefits")}
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors text-left"
                >
                  Why Us
                </button>
                <button
                  onClick={() => scrollToSection("contact")}
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors text-left"
                >
                  Contact
                </button>

                {user && (
                  <button
                    onClick={() => { navigate("/orders"); setIsMenuOpen(false); }}
                    className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors text-left"
                  >
                    My Orders
                  </button>
                )}

                {isAdmin && (
                  <button
                    onClick={() => { navigate("/admin"); setIsMenuOpen(false); }}
                    className="text-sm font-medium text-primary transition-colors text-left"
                  >
                    Admin Dashboard
                  </button>
                )}

                <a href="tel:+918149712801" className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>+91 81497 12801</span>
                </a>

                <Button
                  variant={user ? "outline" : "default"}
                  onClick={() => { handleAuthClick(); setIsMenuOpen(false); }}
                  className="w-full"
                >
                  {user ? (
                    <>
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </>
                  ) : (
                    <>
                      <User className="w-4 h-4 mr-2" />
                      Login / Sign Up
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Cart Drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
};

export default Navbar;
