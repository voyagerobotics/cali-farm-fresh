import { GraduationCap, ArrowRight, CalendarDays, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import visitHero from "@/assets/school-visit-1.jpg.asset.json";
import visitSide from "@/assets/school-visit-3.jpg.asset.json";

const SchoolVisitCTA = () => {
  const navigate = useNavigate();

  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-secondary/15 to-background">
          <div className="grid lg:grid-cols-2 gap-8 items-center p-8 md:p-12">
            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold mb-4">
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
                <Mini icon={<CalendarDays className="w-4 h-4" />} label="15 Jul – 15 Feb" />
                <Mini icon={<Clock className="w-4 h-4" />} label="Mon–Fri, 8–11 AM" />
                <Mini icon={<Users className="w-4 h-4" />} label="Up to 200 students" />
              </ul>

              <Button size="lg" onClick={() => navigate("/school-visits")}>
                Plan a Farm Visit <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <div className="relative grid grid-cols-5 gap-3">
              <img
                src={visitHero.url}
                alt="Students visiting California Farms"
                className="col-span-3 rounded-2xl shadow-lg object-cover w-full h-64 md:h-80"
                loading="lazy"
              />
              <img
                src={visitSide.url}
                alt="Kids exploring the farm"
                className="col-span-2 rounded-2xl shadow-lg object-cover w-full h-64 md:h-80"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Mini = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <li className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/70 border border-border/60 text-sm text-foreground">
    <span className="text-primary">{icon}</span>
    {label}
  </li>
);

export default SchoolVisitCTA;
