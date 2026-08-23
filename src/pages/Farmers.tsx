import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Phone, MessageCircle, ArrowRight, CheckCircle2, Info, Leaf, Droplets,
  Timer, Gauge, Cpu, Waves, Sprout, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  FARMER_SOLUTIONS, FARMERS_PHONE, FARMERS_PHONE_DISPLAY, FARMERS_WHATSAPP,
} from "@/data/farmerSolutions";

const PAGE_TITLE = "Farmers Solutions | Zomical | California Farms India";
const PAGE_DESC =
  "Explore Zomical's farming solutions including quality saplings, biological weed management, vermicompost, biofertilizers, pond plants, farm automation, mulching, weedmat and ultrasonic crop-protection systems.";

const useHead = () => {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = PAGE_TITLE;
    const meta = document.querySelector('meta[name="description"]');
    const prevDesc = meta?.getAttribute("content") ?? "";
    meta?.setAttribute("content", PAGE_DESC);
    return () => {
      document.title = prevTitle;
      meta?.setAttribute("content", prevDesc);
    };
  }, []);
};

const SaplingChips = [
  "Dragon Fruit", "Strawberry", "Moringa", "Melia Dubia", "Mahogany", "Custard Apple", "Fig",
];

const BulletList = ({ items }: { items: string[] }) => (
  <ul className="space-y-2.5">
    {items.map((item) => (
      <li key={item} className="flex items-start gap-2.5 text-sm md:text-base text-muted-foreground">
        <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-primary mt-0.5 flex-shrink-0" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const NoticeBox = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-start gap-3 rounded-xl border border-secondary/40 bg-secondary/10 p-4 md:p-5">
    <Info className="w-5 h-5 text-secondary mt-0.5 flex-shrink-0" />
    <p className="text-sm md:text-base text-foreground/80 leading-relaxed">{children}</p>
  </div>
);

const SectionHeader = ({
  number, title, headline, Icon,
}: { number: string; title: string; headline: string; Icon: typeof Leaf }) => (
  <div className="mb-8">
    <div className="flex items-center gap-3 mb-3">
      <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary">
        <Icon className="w-5 h-5" />
      </span>
      <span className="font-heading text-3xl md:text-4xl font-bold text-primary/25 leading-none">{number}</span>
    </div>
    <p className="text-xs md:text-sm font-semibold uppercase tracking-widest text-primary mb-2">{title}</p>
    <h2 className="font-heading text-2xl md:text-3xl lg:text-4xl font-bold text-foreground max-w-3xl">
      {headline}
    </h2>
  </div>
);

const EnquireButton = ({ label }: { label: string }) => (
  <Button asChild size="lg" className="mt-2">
    <a href={`tel:${FARMERS_PHONE}`}>
      {label}
      <ArrowRight className="w-4 h-4" />
    </a>
  </Button>
);

const Farmers = () => {
  useHead();
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.hash]);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />

      {/* HERO */}
      <section className="relative pt-40 pb-20 md:pt-48 md:pb-28 overflow-hidden">
        <img
          src="/farmers/farmers-hero.jpg"
          alt="Aerial view of an irrigated farm with crop rows and a farm pond"
          width={1920}
          height={1080}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/85 via-foreground/65 to-foreground/25" />

        <div className="relative z-10 container mx-auto px-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-background/10 backdrop-blur-sm border border-background/20 rounded-full px-4 py-2 mb-6">
              <Leaf className="w-4 h-4 text-secondary" />
              <span className="text-sm font-medium text-background">Farmers Solutions</span>
            </div>

            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-background mb-5 leading-tight">
              Smart Solutions for<br className="hidden sm:block" /> Modern Farming
            </h1>

            <p className="text-base md:text-lg text-background/90 mb-4 max-w-2xl">
              Practical, sustainable and technology-driven solutions for better farming.
            </p>
            <p className="text-sm md:text-base text-background/75 mb-3 max-w-2xl leading-relaxed">
              At Zomical, we bring together practical, sustainable and technology-driven solutions
              designed to help farmers improve productivity, manage resources efficiently and reduce
              unnecessary input costs.
            </p>
            <p className="text-sm md:text-base text-background/75 mb-6 max-w-2xl leading-relaxed">
              From quality saplings and biological solutions to farm automation, water management and
              advanced crop-protection systems — Zomical supports farmers across different stages of
              cultivation.
            </p>

            <p className="font-heading text-lg md:text-xl font-semibold text-secondary mb-8">
              Grow Better. Protect Better. Farm Smarter.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button variant="hero" size="lg" asChild>
                <a href="#solutions">
                  Explore Farmer Solutions
                  <ArrowRight className="w-5 h-5" />
                </a>
              </Button>
              <Button variant="heroOutline" size="lg" asChild>
                <a href={`tel:${FARMERS_PHONE}`}>
                  <Phone className="w-5 h-5" />
                  Call Farmers Support
                </a>
              </Button>
            </div>

            <p className="text-sm text-background/70 mt-5">
              Farmers Enquiries:{" "}
              <a href={`tel:${FARMERS_PHONE}`} className="text-secondary font-medium hover:underline">
                {FARMERS_PHONE_DISPLAY}
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* SOLUTION INDEX */}
      <section id="solutions" className="py-14 md:py-20 bg-card/60 scroll-mt-32">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mb-10">
            <h2 className="font-heading text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3">
              Six Solution Areas for Your Farm
            </h2>
            <p className="text-muted-foreground">
              Choose the area that matches your current farming requirement.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {FARMER_SOLUTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="group">
                <Card className="h-full rounded-2xl border-border/70 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/40">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <s.icon className="w-6 h-6" />
                      </span>
                      <span className="font-heading text-2xl font-bold text-primary/20">{s.number}</span>
                    </div>
                    <h3 className="font-heading text-lg font-semibold text-foreground mb-2">{s.title}</h3>
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                      Learn more
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* 01 SAPLINGS */}
      <section id="saplings" className="py-14 md:py-20 scroll-mt-32">
        <div className="container mx-auto px-4">
          <SectionHeader
            number="01"
            title="Quality Saplings"
            headline="Start Your Farm with the Right Planting Material"
            Icon={Sprout}
          />
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            <div>
              <p className="text-muted-foreground leading-relaxed mb-6">
                A successful farm begins with healthy and suitable planting material. Zomical provides a
                range of carefully selected saplings for fruit, medicinal, timber and high-value
                plantation crops.
              </p>
              <h3 className="font-heading text-lg font-semibold text-foreground mb-3">Saplings Available</h3>
              <div className="flex flex-wrap gap-2.5 mb-4">
                {SaplingChips.map((chip) => (
                  <span
                    key={chip}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    <Leaf className="w-3.5 h-3.5 text-primary" />
                    {chip}
                  </span>
                ))}
              </div>
              <p className="text-sm text-muted-foreground italic">
                And other selected fruit, plantation and horticultural varieties.
              </p>
            </div>

            <Card className="rounded-2xl border-border/70 shadow-sm">
              <CardContent className="p-6 md:p-8">
                <h3 className="font-heading text-lg font-semibold text-foreground mb-4">
                  Why Choose Quality Saplings?
                </h3>
                <BulletList
                  items={[
                    "Healthy and vigorous planting material",
                    "Suitable varieties for different farming requirements",
                    "Better establishment after transplantation",
                    "Support for orchard and plantation development",
                    "Suitable options for commercial and diversified farming",
                  ]}
                />
                <p className="font-heading text-base font-semibold text-foreground mt-6">
                  Build your plantation with a strong foundation.
                </p>
                <EnquireButton label="Enquire for Saplings" />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 02 BIOLOGICAL WEED MANAGEMENT */}
      <section id="biological-weed-management" className="py-14 md:py-20 bg-card/60 scroll-mt-32">
        <div className="container mx-auto px-4">
          <SectionHeader
            number="02"
            title="Biological Weed Management"
            headline="Nature-Based Weed Control with Mexican Beetle"
            Icon={FARMER_SOLUTIONS[1].icon}
          />
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="space-y-5">
              <p className="text-muted-foreground leading-relaxed">
                Parthenium, commonly known as Congress grass, can become a serious weed problem in
                agricultural and non-agricultural areas. Biological control using Mexican beetle
                (Zygogramma bicolorata) offers a nature-based approach specifically targeted at
                Parthenium.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                The beetle feeds on Parthenium foliage and helps suppress its growth and spread.
              </p>
              <NoticeBox>
                Biological control should be used as part of an appropriate Integrated Weed Management
                (IWM) strategy and according to local agricultural guidance.
              </NoticeBox>
            </div>

            <Card className="rounded-2xl border-border/70 shadow-sm">
              <CardContent className="p-6 md:p-8">
                <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Key Benefits</h3>
                <BulletList
                  items={[
                    "Biological approach to Parthenium management",
                    "Targets Parthenium rather than acting as a general weed killer",
                    "Can complement integrated weed-management practices",
                    "Helps reduce dependence on repeated chemical weed-control measures",
                  ]}
                />
                <EnquireButton label="Enquire About Biological Weed Control" />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 03 VERMICOMPOST */}
      <section id="vermicompost-biofertilizer" className="py-14 md:py-20 scroll-mt-32">
        <div className="container mx-auto px-4">
          <SectionHeader
            number="03"
            title="Vermicompost & Liquid Biofertilizer"
            headline="Feed the Soil. Support the Crop."
            Icon={FARMER_SOLUTIONS[2].icon}
          />
          <p className="text-muted-foreground leading-relaxed max-w-3xl mb-8">
            Healthy soil is the foundation of productive farming. Zomical provides organic and
            biological inputs that can be incorporated into a balanced nutrient-management program.
          </p>

          <div className="grid md:grid-cols-2 gap-5 md:gap-6 mb-8">
            <Card className="rounded-2xl border-border/70 shadow-sm transition-shadow hover:shadow-lg">
              <CardContent className="p-6 md:p-8">
                <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary mb-4">
                  <Leaf className="w-5 h-5" />
                </span>
                <h3 className="font-heading text-xl font-semibold text-foreground mb-3">Vermicompost</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Rich organic manure produced through the action of earthworms, vermicompost helps add
                  organic matter to the soil and supports better soil structure and biological activity.
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-border/70 shadow-sm transition-shadow hover:shadow-lg">
              <CardContent className="p-6 md:p-8">
                <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary mb-4">
                  <Droplets className="w-5 h-5" />
                </span>
                <h3 className="font-heading text-xl font-semibold text-foreground mb-3">
                  Liquid Biofertilizer
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Liquid biofertilizers contain beneficial microorganisms that can support nutrient
                  availability and plant growth when used appropriately as part of an integrated
                  nutrient-management program.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-2xl bg-card/70 border border-border/70 p-6 md:p-8">
            <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Benefits</h3>
            <div className="grid sm:grid-cols-2 gap-x-8">
              <BulletList
                items={[
                  "Supports soil health",
                  "Adds organic matter",
                  "Encourages beneficial microbial activity",
                ]}
              />
              <div className="mt-2.5 sm:mt-0">
                <BulletList
                  items={[
                    "Complements conventional nutrient-management practices",
                    "Suitable for sustainable and integrated farming systems",
                  ]}
                />
              </div>
            </div>
            <EnquireButton label="Get Organic & Biological Inputs" />
          </div>
        </div>
      </section>

      {/* 04 POND PLANTS */}
      <section id="pond-plants" className="py-14 md:py-20 bg-card/60 scroll-mt-32">
        <div className="container mx-auto px-4">
          <SectionHeader
            number="04"
            title="Pond Covering Ferns & Floating Plants"
            headline="Make Better Use of Your Farm Pond"
            Icon={Waves}
          />
          <p className="text-muted-foreground leading-relaxed max-w-3xl mb-8">
            Farm ponds can provide more than just water storage. Selected aquatic plants can be
            integrated into appropriate farm systems for nutrient management, biomass production and
            other agricultural applications.
          </p>

          <div className="grid md:grid-cols-3 gap-5 md:gap-6 mb-8">
            {[
              {
                name: "Azolla",
                text: "A fast-growing floating fern with nitrogen-fixing symbiosis. Azolla is widely studied and used in agricultural systems as a bioresource, including as green manure/biofertilizer and as a feed supplement in suitable livestock and integrated farming systems.",
              },
              {
                name: "Duckweed",
                text: "Small floating aquatic plants that multiply rapidly under suitable conditions. They require proper management because excessive coverage can reduce sunlight penetration and oxygen availability in ponds.",
              },
              {
                name: "Red Root Floater",
                text: "Attractive floating aquatic plants suitable for selected water-management and pond applications.",
              },
            ].map((p) => (
              <Card key={p.name} className="rounded-2xl border-border/70 shadow-sm transition-shadow hover:shadow-lg">
                <CardContent className="p-6">
                  <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary mb-4">
                    <Waves className="w-5 h-5" />
                  </span>
                  <h3 className="font-heading text-lg font-semibold text-foreground mb-2">{p.name}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6 items-start">
            <div className="rounded-2xl bg-background border border-border/70 p-6 md:p-8">
              <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Potential Benefits</h3>
              <BulletList
                items={[
                  "Efficient use of suitable pond space",
                  "Biomass production",
                  "Support for integrated farming systems",
                  "Potential nutrient-management applications",
                  "Adds biological diversity to suitable water systems",
                ]}
              />
            </div>
            <div className="space-y-5">
              <NoticeBox>
                Aquatic plants should be introduced only into suitable ponds and managed carefully to
                prevent excessive surface coverage.
              </NoticeBox>
              <EnquireButton label="Enquire for Pond Plants" />
            </div>
          </div>
        </div>
      </section>

      {/* 05 AUTOMATION */}
      <section id="farm-automation" className="py-14 md:py-20 scroll-mt-32">
        <div className="container mx-auto px-4">
          <SectionHeader
            number="05"
            title="Farm Automation, Mulching & Weedmat"
            headline="Reduce Manual Work. Improve Farm Efficiency."
            Icon={Cpu}
          />
          <p className="text-muted-foreground leading-relaxed max-w-3xl mb-8">
            Modern farming is not only about growing more — it is about using water, labour, time and
            inputs more efficiently.
          </p>

          <div className="grid md:grid-cols-3 gap-5 md:gap-6 mb-8">
            <Card className="rounded-2xl border-border/70 shadow-sm transition-shadow hover:shadow-lg md:col-span-1">
              <CardContent className="p-6">
                <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary mb-4">
                  <Cpu className="w-5 h-5" />
                </span>
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2">Farm Automation</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Automation solutions can help farmers monitor and control selected farm operations,
                  reducing repetitive manual work and improving consistency.
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Irrigation automation",
                    "Pump control",
                    "Sensor-based monitoring",
                    "Timer-based systems",
                    "Automated farm equipment",
                    "Smart control systems",
                  ].map((e) => (
                    <span
                      key={e}
                      className="rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground"
                    >
                      {e}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/70 shadow-sm transition-shadow hover:shadow-lg">
              <CardContent className="p-6">
                <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary mb-4">
                  <Droplets className="w-5 h-5" />
                </span>
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2">Mulching</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Mulching helps cover the soil around crops and can assist with moisture conservation,
                  temperature moderation and weed suppression.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/70 shadow-sm transition-shadow hover:shadow-lg">
              <CardContent className="p-6">
                <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary mb-4">
                  <Gauge className="w-5 h-5" />
                </span>
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2">Weedmat</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Weedmat provides a physical barrier against weed growth around crops, particularly
                  useful in orchards, nurseries, plantations and other managed cultivation areas.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-2xl bg-card/70 border border-border/70 p-6 md:p-8">
            <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Benefits</h3>
            <div className="grid sm:grid-cols-2 gap-x-8">
              <BulletList
                items={[
                  "Reduced manual weeding",
                  "Better moisture management",
                  "Improved farm-management efficiency",
                ]}
              />
              <div className="mt-2.5 sm:mt-0">
                <BulletList
                  items={[
                    "Reduced repetitive labour",
                    "Cleaner orchard and plantation areas",
                    "Better control over the crop-growing environment",
                  ]}
                />
              </div>
            </div>
            <EnquireButton label="Find the Right Farm Solution" />
          </div>
        </div>
      </section>

      {/* 06 ULTRASONIC */}
      <section id="ultrasonic-repellent" className="py-14 md:py-20 bg-card/60 scroll-mt-32">
        <div className="container mx-auto px-4">
          <SectionHeader
            number="06"
            title="Advanced Ultrasonic Repellent System"
            headline="Protect Your Farm from Unwanted Intruders"
            Icon={ShieldCheck}
          />
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="space-y-5">
              <p className="text-muted-foreground leading-relaxed">
                Birds, rodents and wild animals can cause significant crop damage. Zomical's advanced
                ultrasonic repellent systems are designed to provide a non-contact deterrent solution for
                selected agricultural applications.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                The system uses ultrasonic sound and programmed deterrent patterns to discourage unwanted
                animals from entering protected areas.
              </p>

              <div>
                <h3 className="font-heading text-lg font-semibold text-foreground mb-3">Designed For</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Bird deterrence",
                    "Rodent deterrence",
                    "Selected animal deterrence",
                    "Orchards",
                    "Vegetable farms",
                    "Fruit farms",
                    "Nurseries",
                    "Storage and farm premises",
                  ].map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-border bg-background px-3.5 py-1.5 text-xs md:text-sm font-medium text-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-background border border-border/70 p-5">
                <h3 className="font-heading text-base font-semibold text-foreground mb-2">
                  Why Ultrasonic Repellent?
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Instead of physically removing animals after they enter the crop area, deterrent systems
                  are intended to discourage unwanted activity in the protected zone.
                </p>
              </div>
            </div>

            <Card className="rounded-2xl border-border/70 shadow-sm h-fit">
              <CardContent className="p-6 md:p-8">
                <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Key Features</h3>
                <BulletList
                  items={[
                    "Non-contact deterrence",
                    "No trapping or physical handling",
                    "Suitable for selected outdoor farm applications",
                    "Automated operation",
                    "Designed for continuous crop-protection support",
                  ]}
                />
                <EnquireButton label="Protect Your Farm" />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-16 md:py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <Timer className="w-10 h-10 mx-auto mb-5 opacity-80" />
          <h2 className="font-heading text-2xl md:text-4xl font-bold mb-4">
            One Platform. Multiple Farming Solutions.
          </h2>
          <p className="text-primary-foreground/85 leading-relaxed mb-8">
            Whether you are establishing a new plantation, improving an existing farm or looking for
            smarter ways to manage weeds, water, labour and crop protection, Zomical brings practical
            solutions together in one place.
          </p>
          <h3 className="font-heading text-xl md:text-2xl font-bold mb-3">Grow Smarter with Zomical.</h3>
          <p className="text-primary-foreground/85 mb-8">Contact us to discuss your farm requirement.</p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <a href={`tel:${FARMERS_PHONE}`}>
                Enquire Now
                <ArrowRight className="w-4 h-4" />
              </a>
            </Button>
            <Button size="lg" variant="heroOutline" asChild>
              <a href={`tel:${FARMERS_PHONE}`}>
                <Phone className="w-4 h-4" />
                Call Farmers Support
              </a>
            </Button>
            <Button size="lg" variant="heroOutline" asChild>
              <a href={FARMERS_WHATSAPP} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-4 h-4" />
                WhatsApp Us
              </a>
            </Button>
          </div>

          <p className="text-sm text-primary-foreground/80 mt-6">
            Farmers Enquiries:{" "}
            <a href={`tel:${FARMERS_PHONE}`} className="font-semibold underline underline-offset-4">
              {FARMERS_PHONE_DISPLAY}
            </a>
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Farmers;
