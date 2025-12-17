"use client";

// import { Event } from "@/generated/prisma/client"; såhär ska det vara sen (hämtas från prisma)
import { Calendar, Clock, DollarSign, MapPin, Music } from "lucide-react";
import { useState } from "react";
import type { EventTempType } from "@/lib/events(tabort)";

interface EventsProps {
  isDark?: boolean;
  // events: Event[]; såhär ska det vara sen (hämtas från prisma)
  events: EventTempType[];
}

export default function Events({ isDark = false, events }: EventsProps) {
  const [currentEventIndex, setCurrentEventIndex] = useState(0);

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
        className={`py-16 md:py-24 transition-colors duration-300 ${
          isDark ? "bg-slate-900" : "bg-gray-50"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <SectionHeader
            isDark={isDark}
            title="Kommande Event"
            subtitle="Inga events tillgängliga för närvarande"
          />
        </div>
      </section>
    );
  }

  return (
    <section
      id="events"
      className={`py-16 md:py-24 transition-colors duration-300 ${
        isDark ? "bg-slate-900" : "bg-gray-50"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <SectionHeader
          isDark={isDark}
          title="Kommande Event"
          subtitle="Köp biljetter och delta i våra spektakulära danshöjdpunkter"
        />

        <div className="relative">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={prevEvent}
              aria-label="Previous event"
              className={`p-2 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 shrink-0 ${
                isDark
                  ? "bg-white/10 hover:bg-white/20 text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-900"
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <div className="flex-1 min-w-0">
              <EventCard
                isDark={isDark}
                number={events[currentEventIndex].number}
                title={events[currentEventIndex].title}
                description={events[currentEventIndex].description}
                date={events[currentEventIndex].date}
                time={events[currentEventIndex].time}
                price={events[currentEventIndex].price}
                location={events[currentEventIndex].location}
              />
            </div>

            <button
              type="button"
              onClick={nextEvent}
              aria-label="Next event"
              className={`p-2 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 shrink-0 ${
                isDark
                  ? "bg-white/10 hover:bg-white/20 text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-900"
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          <div className="flex justify-center gap-3 mt-8">
            {events.map((event, index) => (
              <button
                key={event.id}
                type="button"
                onClick={() => setCurrentEventIndex(index)}
                aria-label={`Go to event ${index + 1}`}
                className={`h-3 rounded-full transition-all duration-300 ${
                  index === currentEventIndex
                    ? "w-8 bg-linear-to-r from-pink-500 to-orange-400"
                    : isDark
                      ? "w-3 bg-gray-600 hover:bg-gray-500"
                      : "w-3 bg-gray-400 hover:bg-gray-500"
                }`}
              ></button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function EventCard({
  isDark,
  number,
  title,
  description,
  date,
  time,
  price,
  location,
}: {
  isDark: boolean;
  number: string;
  title: string;
  description: string;
  date: string;
  time: string;
  price: string;
  location: string;
}) {
  return (
    <div
      className={`group rounded-2xl shadow-lg transition-all duration-300 overflow-hidden border ${
        isDark
          ? "bg-slate-800/50 backdrop-blur-sm border-slate-700 hover:shadow-2xl hover:shadow-pink-500/20 hover:border-pink-500/50"
          : "bg-white border-gray-200 hover:shadow-2xl hover:border-pink-300"
      }`}
    >
      <div
        className={`relative h-40 overflow-hidden group-hover:scale-105 transition-transform duration-500 ${
          isDark
            ? "bg-linear-to-br from-pink-500/30 to-purple-600/30"
            : "bg-linear-to-br from-pink-200 to-purple-300"
        }`}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <Music
            className={`w-16 h-16 ${
              isDark ? "text-white/30" : "text-white/50"
            }`}
          />
        </div>
        <span className="absolute top-5 right-5 text-sm bg-linear-to-r from-pink-500 to-orange-400 text-white px-4 py-2 rounded-full font-semibold">
          {number}/3
        </span>
      </div>

      <div className="p-6 space-y-4">
        <h3
          className={`text-2xl font-bold group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-linear-to-r group-hover:from-pink-400 group-hover:to-orange-300 transition-all duration-300 ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          {title}
        </h3>
        <p
          className={`font-light text-base leading-relaxed ${
            isDark ? "text-gray-400" : "text-gray-700"
          }`}
        >
          {description}
        </p>

        <div
          className={`space-y-3 pt-4 ${
            isDark ? "border-t border-slate-700" : "border-t border-gray-200"
          }`}
        >
          <DetailItem
            isDark={isDark}
            icon={<Calendar size={18} />}
            label="Datum"
            value={date}
          />
          <DetailItem
            isDark={isDark}
            icon={<Clock size={18} />}
            label="Tid"
            value={time}
          />
          <DetailItem
            isDark={isDark}
            icon={<DollarSign size={18} />}
            label="Pris"
            value={price}
          />
          <DetailItem
            isDark={isDark}
            icon={<MapPin size={18} />}
            label="Plats"
            value={location}
          />
        </div>

        <button
          type="button"
          className="w-full mt-6 px-6 py-4 bg-linear-to-r from-pink-500 to-orange-400 text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/50 hover:scale-105 active:scale-95 text-lg"
        >
          Köp Biljett
        </button>
      </div>
    </div>
  );
}

function DetailItem({
  isDark,
  icon,
  label,
  value,
}: {
  isDark: boolean;
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-4 items-center">
      <span className="text-pink-400">{icon}</span>
      <div>
        <p
          className={`text-xs uppercase font-semibold tracking-widest ${
            isDark ? "text-gray-500" : "text-gray-600"
          }`}
        >
          {label}
        </p>
        <p
          className={`font-light text-lg ${
            isDark ? "text-gray-200" : "text-gray-900"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function SectionHeader({
  isDark,
  title,
  subtitle,
}: {
  isDark: boolean;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="text-center mb-16">
      <h2
        className={`text-5xl md:text-6xl font-bold mb-6 ${
          isDark
            ? "bg-linear-to-r from-white via-pink-200 to-pink-400 bg-clip-text text-transparent"
            : "text-gray-900"
        }`}
      >
        {title}
      </h2>
      <p
        className={`text-xl max-w-2xl mx-auto leading-relaxed font-light ${
          isDark ? "text-gray-300" : "text-gray-700"
        }`}
      >
        {subtitle}
      </p>
    </div>
  );
}
