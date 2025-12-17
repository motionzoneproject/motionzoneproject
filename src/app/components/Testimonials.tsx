"use client";

import { Quote } from "lucide-react";

interface TestimonialsProps {
  isDark?: boolean;
}

export default function Testimonials({ isDark = false }: TestimonialsProps) {
  return (
    <section
      id="testimonials"
      className={`py-16 md:py-24 transition-colors duration-300 ${
        isDark ? "bg-slate-900" : "bg-gray-50"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <SectionHeader
          isDark={isDark}
          title="Vad Våra Elever Säger"
          subtitle="Läs om upplevelser från våra nöjda dansdeltagare"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <TestimonialCard
            isDark={isDark}
            quote="Motion Zone förändrade mitt liv! Jag har aldrig känt mig så självförtroende och glad."
            name="Anna Andersson"
            subtitle="Elev, 6 månader"
          />
          <TestimonialCard
            isDark={isDark}
            quote="De bästa instruktörerna i Växjö! Professionella, vänliga och väldigt inspirerande."
            name="Erik Svensson"
            subtitle="Elev, 1 år"
          />
          <TestimonialCard
            isDark={isDark}
            quote="Perfekt miljö för att lära sig dans. Jag rekommenderar Motion Zone till alla!"
            name="Sofia Karlsson"
            subtitle="Elev, 3 månader"
          />
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({
  isDark,
  quote,
  name,
  subtitle,
}: {
  isDark: boolean;
  quote: string;
  name: string;
  subtitle: string;
}) {
  return (
    <div
      className={`group rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-10 border ${
        isDark
          ? "bg-slate-800/50 backdrop-blur-sm border-slate-700 hover:border-pink-500/50 hover:shadow-pink-500/20"
          : "bg-white border-gray-200 hover:border-pink-300 hover:shadow-pink-300/20"
      }`}
    >
      <Quote
        className={`w-8 h-8 mb-6 group-hover:scale-125 transition-transform duration-300 ${
          isDark ? "text-pink-400" : "text-pink-600"
        }`}
      />
      <p
        className={`italic mb-8 text-lg font-light leading-relaxed group-hover:text-white transition-colors duration-300 ${
          isDark ? "text-gray-300" : "text-gray-700"
        }`}
      >
        "{quote}"
      </p>
      <div
        className={`pt-6 ${
          isDark ? "border-t border-slate-700" : "border-t border-gray-200"
        }`}
      >
        <p
          className={`font-bold text-lg ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          {name}
        </p>
        <p
          className={`text-sm font-light ${
            isDark ? "text-gray-500" : "text-gray-600"
          }`}
        >
          {subtitle}
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
