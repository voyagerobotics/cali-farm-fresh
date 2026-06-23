import { GraduationCap, ArrowRight, CalendarDays, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
const visitHero = { url: "/school-visits/school-visit-2.jpg" };
import { useFarmVisitSettings } from "@/hooks/useFarmVisitSettings";

const SchoolVisitCTA = () => {
  const navigate = useNavigate();
  const { settings } = useFarmVisitSettings();

  if (!settings.farm_visit_enabled) return null;

  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-secondary/15 to-background">
          <div className="grid lg:grid-cols-2 gap-8 items-stretch">
            {/* Text */}
            <div className="p-8 md:p-12 flex flex-col justify-center">
              <span className="inline-flex w-fit items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold mb-4">
                <GraduationCap className="w-3.5 h-3.5" /> School & College Visits
              </span>
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground leading-tight mb-3">
                Bring your students to a{" "}
                <span className="text-primary">real working farm</span>
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Guided tours, live farmer talks, dragon fruit orchards, greenhouses
                and solar dryers — open to Grade 1 right through Engineering 4th year.
              </p>

              <ul className="grid sm:grid-cols-3 gap-3 mb-6">
                <Mini icon={<CalendarDays className="w-4 h-4" />} label={settings.farm_visit_period} />
                <Mini icon={<Clock className="w-4 h-4" />} label={`${settings.farm_visit_days.split(" ")[0]}–${settings.farm_visit_days.split(" ").slice(-1)[0]}`} />
                <Mini icon={<Users className="w-4 h-4" />} label={`Up to ${settings.farm_visit_max_college} students`} />
              </ul>

              <Button size="lg" className="w-fit" onClick={() => navigate("/school-visits")}>
                Plan a Farm Visit <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Image — single full-bleed clean photo, no awkward cropping */}
            <div className="relative min-h-[260px] md:min-h-[400px]">
              <img
                src={visitHero.url}
                alt="Students visiting California Farms"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ objectPosition: "center 70%" }}
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-background/40 via-transparent to-transparent lg:bg-gradient-to-l lg:from-transparent lg:to-background/30 pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 lg:right-6 lg:left-auto lg:max-w-xs">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur text-xs font-semibold text-foreground shadow">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  Photos from our last school visit
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Mini = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <li className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/70 border border-border/60 text-sm text-foreground">
    <span className="text-primary flex-shrink-0">{icon}</span>
    <span className="truncate">{label}</span>
  </li>
);

export default SchoolVisitCTA;
