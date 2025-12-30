"use client";

import { Building2, Calendar, GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: GraduationCap,
    title: "Professionella instruktörer",
    description:
      "Våra erfarna lärare har lång erfarenhet och brinner för att dela sin passion för dans.",
  },
  {
    icon: Calendar,
    title: "Flexibla Kurstider",
    description:
      "Vi erbjuder kurser på olika tider för att passa ditt schema. Från morgon till kväll, alla dagar.",
  },
  {
    icon: Building2,
    title: "Moderna Lokaler",
    description:
      "Vår studio är utrustad med det senaste ljudsystemet och stora speglar för optimal träning.",
  },
];

export default function Features() {
  return (
    <section id="varfor" className="py-16 md:py-24 bg-muted/50">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Varför Motion Zone?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Vi erbjuder en unik dansupplevelse med instruktörer i världsklass
            och moderna faciliteter
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="bg-card border-border hover:border-brand/50 transition-colors"
            >
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-brand/10 flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-brand" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
