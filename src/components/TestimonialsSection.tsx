import { Star, Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const testimonials = [
  {
    name: "Priya Sharma",
    location: "Dharampeth, Nagpur",
    rating: 5,
    text: "Received my vegetables within 2 hours! The freshness is unmatched. You can actually taste the difference compared to supermarket produce.",
    highlight: "2 hours delivery",
  },
  {
    name: "Rajesh Patel",
    location: "Sadar, Nagpur",
    rating: 5,
    text: "Being a restaurant owner, quality matters most. California Farms delivers the freshest organic vegetables every single time. My customers love the taste!",
    highlight: "Restaurant Owner",
  },
  {
    name: "Anita Deshmukh",
    location: "Sitabuldi, Nagpur",
    rating: 5,
    text: "The 3-hour delivery promise is real! I ordered at 9 AM and had fresh tomatoes and spinach on my kitchen counter by 11:30 AM. Incredible service!",
    highlight: "3-hour delivery",
  },
  {
    name: "Vikram Singh",
    location: "Civil Lines, Nagpur",
    rating: 5,
    text: "My kids finally enjoy eating vegetables! The organic produce from California Farms tastes so much better. Worth every rupee.",
    highlight: "Family Favorite",
  },
  {
    name: "Meera Joshi",
    location: "Manish Nagar, Nagpur",
    rating: 5,
    text: "I've been ordering for 6 months now. Never disappointed with the quality or delivery time. The vegetables stay fresh for days longer than others.",
    highlight: "Loyal Customer",
  },
  {
    name: "Suresh Agrawal",
    location: "Gandhibagh, Nagpur",
    rating: 5,
    text: "Chemical-free, fresh, and delivered fast. What more can you ask for? Switched completely from local vendors to California Farms.",
    highlight: "100% Switched",
  },
];

const TestimonialsSection = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
            Customer Love
          </span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            What Our Customers Say
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Don't just take our word for it — hear from families across Nagpur who've made the switch to fresh, organic produce.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card
              key={index}
              className="bg-background border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            >
              <CardContent className="p-6">
                {/* Quote Icon */}
                <Quote className="w-8 h-8 text-primary/20 mb-4" />

                {/* Rating */}
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-secondary text-secondary"
                    />
                  ))}
                </div>

                {/* Testimonial Text */}
                <p className="text-foreground/80 mb-6 leading-relaxed">
                  "{testimonial.text}"
                </p>

                {/* Customer Info */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.location}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                    {testimonial.highlight}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats Bar */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 p-8 bg-primary/5 rounded-2xl">
          <div className="text-center">
            <p className="font-heading text-3xl md:text-4xl font-bold text-primary">
              4.9/5
            </p>
            <p className="text-sm text-muted-foreground mt-1">Average Rating</p>
          </div>
          <div className="text-center">
            <p className="font-heading text-3xl md:text-4xl font-bold text-primary">
              1000+
            </p>
            <p className="text-sm text-muted-foreground mt-1">Happy Customers</p>
          </div>
          <div className="text-center">
            <p className="font-heading text-3xl md:text-4xl font-bold text-primary">
              98%
            </p>
            <p className="text-sm text-muted-foreground mt-1">On-Time Delivery</p>
          </div>
          <div className="text-center">
            <p className="font-heading text-3xl md:text-4xl font-bold text-primary">
              3 hrs
            </p>
            <p className="text-sm text-muted-foreground mt-1">Avg. Delivery Time</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
