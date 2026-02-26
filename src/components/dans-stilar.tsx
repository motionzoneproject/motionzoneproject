"use client";

import Image from "next/image";

const danceStyles = [
  {
    name: "Hip Hop",
    image: "/hiphop.jpg",
    accentGradient: "from-violet-600 via-brand to-brand-secondary",
  },
  {
    name: "Salsa",
    image: "/salsa.jpg",
    accentGradient: "from-cyan-500 via-brand-secondary to-blue-600",
  },
  {
    name: "Heel",
    image: "/heel.jpg",
    accentGradient: "from-brand-secondary via-purple-500 to-brand",
  },
  {
    name: "Jazz",
    image: "/jazz.jpg",
    accentGradient: "from-violet-600 via-brand to-brand-secondary",
  },
  {
    name: "Bachata",
    image: "/bachata.jpg",
    accentGradient: "from-cyan-500 via-brand-secondary to-blue-600",
  },
  {
    name: "Latinrhythms",
    image: "/latinrhythms19+.jpg",
    accentGradient: "from-brand-secondary via-purple-500 to-brand",
  },
  {
    name: "Contemporary",
    image: "/contemporary.jpg",
    accentGradient: "from-violet-600 via-brand to-brand-secondary",
  },
  {
    name: "Barre",
    image: "/barre.jpg",
    accentGradient: "from-cyan-500 via-brand-secondary to-blue-600",
  },
];

const DansStilar = () => {
  return (
    <section
      className="py-10 relative overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-brand/5 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-brand-secondary/5 blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <h2 className="text-2xl font-bold mb-8 text-center text-foreground">
          Dansstilar
        </h2>

        <div className="grid gap-6 grid-cols-2 md:grid-cols-4 max-w-4xl mx-auto">
          {danceStyles.map((style) => (
            <div key={style.name} className="group relative">
              <div
                className={`absolute -inset-1 bg-linear-to-r ${style.accentGradient} rounded-2xl blur-lg opacity-20 group-hover:opacity-50 transition duration-500`}
              />

              <div className="relative h-full backdrop-blur-xl bg-card/60 border border-white/10 rounded-2xl shadow-2xl transform transition-all duration-500 group-hover:scale-[1.03] group-hover:-translate-y-2 flex flex-col overflow-hidden">
                {style.image && (
                  <div className="relative overflow-hidden h-36 flex items-center justify-center">
                    <Image
                      src={style.image}
                      alt={style.name}
                      width={300}
                      height={200}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-slate-900/80 via-transparent to-transparent opacity-60" />
                  </div>
                )}

                <div className="p-3 text-center">
                  <p className="text-foreground text-sm font-semibold">
                    {style.name}
                  </p>
                </div>

                <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DansStilar;
