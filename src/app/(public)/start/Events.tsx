"use client";

import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { Event } from "@/generated/prisma/client";
import { pick } from "@/lib/i18n/pick";
import type { AppLang } from "@/locales/config-lang";
import { normalizeLang } from "@/locales/config-lang";

interface EventsProps {
  events: Event[];
}

const accentGradients = [
  {
    gradient: "from-violet-600 via-brand to-brand-secondary",
    accentVar: "var(--color-brand)",
  },
  {
    gradient: "from-cyan-500 via-brand-secondary to-blue-600",
    accentVar: "var(--color-brand-secondary)",
  },
  {
    gradient: "from-brand-secondary via-purple-500 to-brand",
    accentVar: "var(--color-brand)",
  },
];

export default function Events({ events }: EventsProps) {
  const { t, i18n } = useTranslation();
  const lang: AppLang = normalizeLang(i18n.language);
  const dateLocale = lang === "en" ? "en-GB" : "sv-SE";
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const nextEvent = () => {
    setCurrentEventIndex((prev) => (prev + 1) % events.length);
  };

  const prevEvent = () => {
    setCurrentEventIndex((prev) => (prev - 1 + events.length) % events.length);
  };

  if (!events || events.length === 0) {
    return (
      <section
        id="events"
        className="py-20 md:py-32 relative overflow-hidden"
        style={{ background: "var(--background)" }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-black mb-4 text-foreground tracking-tight">
            {t("home.eventsTitle")}
          </h2>
          <p className="text-muted-foreground">{t("home.eventsEmpty")}</p>
        </div>
      </section>
    );
  }

  const currentEvent = events[currentEventIndex];
  const accent = accentGradients[currentEventIndex % accentGradients.length];

  return (
    <section
      id="events"
      className="py-20 md:py-32 relative overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-brand/5 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-brand-secondary/5 blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black mb-4 text-foreground tracking-tight">
            {t("home.eventsTitle")}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-lg">
            {t("home.eventsSubtitle")}
          </p>
        </div>

        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={prevEvent}
              aria-label={t("home.eventsPrev")}
              className="p-2 rounded-full backdrop-blur-xl bg-card/60 border border-white/10 text-foreground hover:scale-110 transition-all duration-300 shadow-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="group relative flex-1">
              <div
                className={`absolute -inset-1 bg-linear-to-r ${accent.gradient} rounded-2xl blur-lg opacity-20 group-hover:opacity-50 transition duration-500`}
              />

              <div className="relative h-full backdrop-blur-xl bg-card/60 border border-white/10 rounded-2xl shadow-2xl transform transition-all duration-500 group-hover:scale-[1.02] group-hover:-translate-y-1 flex flex-col overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent z-10" />

                {currentEvent.imageURL && (
                  <div className="relative overflow-hidden h-52">
                    <Image
                      src={currentEvent.imageURL}
                      alt={pick(currentEvent, "headline", lang) as string}
                      width={500}
                      height={300}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-slate-900/80 via-transparent to-transparent opacity-60" />
                  </div>
                )}

                <div className="p-6 relative space-y-4">
                  <div
                    className="h-1 rounded-full transition-all duration-500 w-12 group-hover:w-24"
                    style={{ background: accent.accentVar }}
                  />

                  <h3 className="text-xl font-bold text-foreground">
                    {pick(currentEvent, "headline", lang) as string}
                  </h3>

                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {pick(currentEvent, "description", lang) as string}
                  </p>

                  <div className="space-y-2 pt-4 border-t border-white/10">
                    <div className="flex items-center gap-3 text-sm text-foreground">
                      <Calendar
                        className="w-4 h-4"
                        style={{ color: accent.accentVar }}
                      />
                      {currentEvent.startDate.toLocaleDateString(dateLocale)}
                      {currentEvent.endDate &&
                      !isSameDay(currentEvent.endDate, currentEvent.startDate)
                        ? ` - ${currentEvent.endDate.toLocaleDateString(dateLocale)}`
                        : ""}
                    </div>
                  </div>

                  {currentEvent.link && (
                    <Button
                      asChild
                      className="w-full mt-2 bg-brand hover:bg-brand-light text-white"
                    >
                      <Link href={currentEvent.link}>
                        {t("home.eventsBuyTicket")}
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={nextEvent}
              aria-label={t("home.eventsNext")}
              className="p-2 rounded-full backdrop-blur-xl bg-card/60 border border-white/10 text-foreground hover:scale-110 transition-all duration-300 shadow-lg"
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
                  aria-label={t("home.eventsGoTo", { number: index + 1 })}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentEventIndex
                      ? "w-6 bg-brand"
                      : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
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
