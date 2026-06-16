import { lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import { usePageTracking } from "@/hooks/useAnalytics";

// Defer below-the-fold sections so they don't block LCP / INP
const PromotionalBanners = lazy(() => import("@/components/PromotionalBanners"));
const AboutSection = lazy(() => import("@/components/AboutSection"));
const ProductsSection = lazy(() => import("@/components/ProductsSection"));
const BenefitsSection = lazy(() => import("@/components/BenefitsSection"));
const TestimonialsSection = lazy(() => import("@/components/TestimonialsSection"));
const ContactSection = lazy(() => import("@/components/ContactSection"));
const Footer = lazy(() => import("@/components/Footer"));

const SectionFallback = () => <div className="min-h-[200px]" aria-hidden="true" />;

const Index = () => {
  usePageTracking();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <Suspense fallback={<SectionFallback />}>
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
