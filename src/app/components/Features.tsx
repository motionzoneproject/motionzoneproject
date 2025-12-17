"use client";

interface FeaturesProps {
  isDark?: boolean;
}

export default function Features({ isDark = true }: FeaturesProps) {
  return (
    <section
      id="varfor"
      className={`py-16 md:py-24 transition-colors duration-300 ${
        isDark
          ? "bg-linear-to-br from-slate-900 via-slate-800 to-slate-900"
          : "bg-white"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <SectionHeader
          isDark={isDark}
          title="Varför Motion Zone?"
          subtitle="Vi erbjuder en unik dansupplevelse med världsklass instruktörer och moderna faciliteter"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            isDark={isDark}
            icon="👨‍🏫"
            title="Professionella instruktörer"
            description="Våra erfarna lärare har årtionden av erfarenhet och brinner för att dela sin passion för dans."
          />
          <FeatureCard
            isDark={isDark}
            icon="📅"
            title="Flexibla Kursider"
            description="Vi erbjuder kurser på olika tider för att passa din schema. Från morgon till kväll, alla dagar."
          />
          <FeatureCard
            isDark={isDark}
            icon="🏢"
            title="Moderna Lokaler"
            description="Vår studio är utrustad med det senaste ljudsystemet och stora speglar för optimal träning."
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  isDark,
  icon,
  title,
  description,
}: {
  isDark: boolean;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div
      className={`group rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-10 text-center border ${
        isDark
          ? "bg-slate-800/50 backdrop-blur-sm border-slate-700 hover:border-pink-500/50 hover:shadow-pink-500/20"
          : "bg-white border-gray-200 hover:border-pink-300 hover:shadow-pink-300/20"
      }`}
    >
      <div className="text-6xl mb-6 group-hover:scale-125 transition-transform duration-300">
        {icon}
      </div>
      <h3
        className={`text-2xl font-bold mb-4 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-linear-to-r group-hover:from-pink-400 group-hover:to-orange-300 transition-all duration-300 ${
          isDark ? "text-white" : "text-gray-900"
        }`}
      >
        {title}
      </h3>
      <p
        className={`font-light text-lg leading-relaxed ${
          isDark ? "text-gray-400" : "text-gray-700"
        }`}
      >
        {description}
      </p>
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
