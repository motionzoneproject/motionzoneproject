"use client";

import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Event } from "@/generated/prisma/client";

interface EventsProps {
  events: Event[];
}

export default function Events({ events }: EventsProps) {
  const [currentEventIndex, setCurrentEventIndex] = useState(0);

  const nextEvent = () => {
    setCurrentEventIndex((prev) => (prev + 1) % events.length);
  };

  const prevEvent = () => {
    setCurrentEventIndex((prev) => (prev - 1 + events.length) % events.length);
  };

  if (!events || events.length === 0) {
    return (
      <section id="events" className="py-16 md:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Kommande Event
          </h2>
          <p className="text-muted-foreground">
            Inga events tillgängliga för närvarande
          </p>
        </div>
      </section>
    );
  }

  const currentEvent = events[currentEventIndex];

  return (
    <section id="events" className="py-16 md:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Kommande Event
          </h2>
          <p className="text-muted-foreground">
            Köp biljetter och delta i våra danshöjdpunkter
          </p>
        </div>

        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={prevEvent}
              aria-label="Föregående event"
              className="p-2 rounded-full bg-muted hover:bg-muted/80 text-foreground transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <Card className="flex-1 bg-card border-border">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-xl font-bold text-foreground">
                  {currentEvent.headline}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {currentEvent.description}
                </p>

                <div className="space-y-2 pt-4 border-t border-border">
                  <div className="flex items-center gap-3 text-sm text-foreground">
                    <Calendar className="w-4 h-4 text-brand" />
                    {currentEvent.startDate.toLocaleDateString("sv-SE")}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-foreground">
                    <Clock className="w-4 h-4 text-brand" />
                    {currentEvent.startDate.toLocaleTimeString("sv-SE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-foreground">
                    <MapPin className="w-4 h-4 text-brand" />
                    {currentEvent.link}
                  </div>
                </div>

                <Button className="w-full mt-4 bg-brand hover:bg-brand-light text-white">
                  Köp Biljett
                </Button>
              </CardContent>
            </Card>

            <button
              type="button"
              onClick={nextEvent}
              aria-label="Nästa event"
              className="p-2 rounded-full bg-muted hover:bg-muted/80 text-foreground transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {events.length > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {events.map((event, index) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => setCurrentEventIndex(index)}
                  aria-label={`Gå till event ${index + 1}`}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentEventIndex
                      ? "w-6 bg-brand"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
