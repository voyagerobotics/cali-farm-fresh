import { Leaf, Phone, Menu, X, ShoppingCart, User, LogOut, Package, ShoppingBag, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import CartDrawer from "./CartDrawer";
import NotificationBell from "./NotificationBell";
import FreeDeliveryBanner from "./FreeDeliveryBanner";
import FarmersPromoBanner from "./FarmersPromoBanner";
import { FARMER_SOLUTIONS, FARMERS_PHONE, FARMERS_PHONE_DISPLAY } from "@/data/farmerSolutions";
import { useNavLinks, type NavLink } from "@/hooks/useNavLinks";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isFarmersOpen, setIsFarmersOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const navLinks = useNavLinks();

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

  const handleNavLink = (link: NavLink) => {
    setIsMenuOpen(false);
    if (link.link_type === "external") {
      window.open(link.link_value, link.open_in_new_tab ? "_blank" : "_self", "noopener,noreferrer");
      return;
    }
    if (link.link_type === "route") {
      navigate(link.link_value.startsWith("/") ? link.link_value : `/${link.link_value}`);
      window.scrollTo({ top: 0 });
      return;
    }
    scrollToSection(link.link_value);
  };

  const beforeFarmers = navLinks.filter((l) => l.display_order < 4);
  const afterFarmers = navLinks.filter((l) => l.display_order >= 4);

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
      <FarmersPromoBanner />
      <nav className="fixed top-16 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
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
              {beforeFarmers.map((l) => (
                <button
                  key={l.id}
                  onClick={() => handleNavLink(l)}
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  {l.label}
                </button>
              ))}

              {/* Farmers dropdown */}
              <div className="relative group">
                <button
                  onClick={() => navigate("/farmers")}
                  className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  Farmers
                  <ChevronDown className="w-3.5 h-3.5 transition-transform group-hover:rotate-180" />
                </button>
                <div className="invisible opacity-0 translate-y-1 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 absolute left-1/2 -translate-x-1/2 top-full pt-4 z-50">
                  <div className="w-[340px] rounded-2xl border border-border bg-popover shadow-lg p-2">
                    <button
                      onClick={() => navigate("/farmers")}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-accent transition-colors"
                    >
                      <span className="block text-sm font-semibold text-foreground">Farmers Solutions</span>
                      <span className="block text-xs text-muted-foreground">
                        Grow Better. Protect Better. Farm Smarter.
                      </span>
                    </button>
                    <div className="h-px bg-border my-1.5" />
                    {FARMER_SOLUTIONS.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => navigate(`/farmers#${s.id}`)}
                        className="w-full flex items-start gap-3 px-3 py-2 rounded-xl hover:bg-accent transition-colors text-left"
                      >
                        <span className="mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                          <s.icon className="w-4 h-4" />
                        </span>
                        <span className="text-sm text-foreground leading-snug">{s.title}</span>
                      </button>
                    ))}
                    <div className="h-px bg-border my-1.5" />
                    <a
                      href={`tel:${FARMERS_PHONE}`}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Farmers Enquiries: {FARMERS_PHONE_DISPLAY}
                    </a>
                  </div>
                </div>
              </div>

              {afterFarmers.map((l) => (
                <button
                  key={l.id}
                  onClick={() => handleNavLink(l)}
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  {l.label}
                </button>
              ))}
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

              {/* Pre-Orders Button */}
              {user && (
                <button
                  onClick={() => navigate("/my-pre-orders")}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="My Pre-Orders"
                >
                  <ShoppingBag className="w-5 h-5 text-muted-foreground" />
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
                {beforeFarmers.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => handleNavLink(l)}
                    className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors text-left"
                  >
                    {l.label}
                  </button>
                ))}
                {/* Farmers accordion */}
                <div className="border-y border-border/60 py-2">
                  <button
                    onClick={() => setIsFarmersOpen((o) => !o)}
                    className="w-full flex items-center justify-between text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                    aria-expanded={isFarmersOpen}
                  >
                    Farmers
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${isFarmersOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isFarmersOpen && (
                    <div className="mt-3 flex flex-col gap-1 animate-fade-in">
                      <button
                        onClick={() => { navigate("/farmers"); setIsMenuOpen(false); setIsFarmersOpen(false); }}
                        className="text-left text-sm font-semibold text-primary py-1.5"
                      >
                        Farmers Solutions
                      </button>
                      {FARMER_SOLUTIONS.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => { navigate(`/farmers#${s.id}`); setIsMenuOpen(false); setIsFarmersOpen(false); }}
                          className="flex items-start gap-2.5 text-left text-sm text-muted-foreground hover:text-primary transition-colors py-1.5"
                        >
                          <s.icon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span className="leading-snug">{s.title}</span>
                        </button>
                      ))}
                      <a
                        href={`tel:${FARMERS_PHONE}`}
                        className="flex items-center gap-2 text-xs text-muted-foreground py-1.5"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        Farmers Enquiries: {FARMERS_PHONE_DISPLAY}
                      </a>
                    </div>
                  )}
                </div>

                {afterFarmers.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => handleNavLink(l)}
                    className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors text-left"
                  >
                    {l.label}
                  </button>
                ))}

                {user && (
                  <button
                    onClick={() => { navigate("/orders"); setIsMenuOpen(false); }}
                    className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors text-left"
                  >
                    My Orders
                  </button>
                )}
                {user && (
                  <button
                    onClick={() => { navigate("/my-pre-orders"); setIsMenuOpen(false); }}
                    className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors text-left"
                  >
                    My Pre-Orders
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
