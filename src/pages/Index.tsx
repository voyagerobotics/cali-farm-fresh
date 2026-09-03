import { lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import { usePageTracking } from "@/hooks/useAnalytics";
import { useSeo } from "@/hooks/useSeo";

// Defer below-the-fold sections so they don't block LCP / INP
const PromotionalBanners = lazy(() => import("@/components/PromotionalBanners"));
const AboutSection = lazy(() => import("@/components/AboutSection"));
const ProductsSection = lazy(() => import("@/components/ProductsSection"));
const BenefitsSection = lazy(() => import("@/components/BenefitsSection"));
const TestimonialsSection = lazy(() => import("@/components/TestimonialsSection"));
const SchoolVisitCTA = lazy(() => import("@/components/SchoolVisitCTA"));
const ContactSection = lazy(() => import("@/components/ContactSection"));
const Footer = lazy(() => import("@/components/Footer"));

const SectionFallback = () => <div className="min-h-[200px]" aria-hidden="true" />;

const Index = () => {
  usePageTracking();
  useSeo({
    title: "California Farms India | Fresh Farm Vegetables & Fruits in Nagpur",
    description:
      "Order chemical-free vegetables, fruits, herbs and seeds harvested fresh from our Nagpur farm. Home delivery twice a week, free above ₹399.",
    path: "/",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "California Farms India",
      url: "https://zomical.com",
      email: "californiafarmsindia@gmail.com",
      areaServed: "Nagpur, India",
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <Suspense fallback={<SectionFallback />}>
          <SchoolVisitCTA />
          <PromotionalBanners />
          <AboutSection />
          <ProductsSection />
          <BenefitsSection />
          <TestimonialsSection />
          <ContactSection />
        </Suspense>
      </main>
      <Suspense fallback={<SectionFallback />}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default Index;
