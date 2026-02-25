"use client";
import Link from "next/link";

export default function Hero() {
  return (
 
    <section className="relative w-full h-[550px] md:h-[650px] flex items-center overflow-hidden bg-black pt-20">

      <div className="absolute inset-0 z-0">
        <div
          className="absolute bg-top inset-0 bg-cover bg-no-repeat scale-105"
          style={{
            backgroundImage: "url('/hero.png')",
            animation: "subtlePan 20s ease-in-out infinite alternate",
          }}
        />
        <div className="absolute inset-0 bg-linear-to-r from-black via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12">
        <div className="max-w-2xl">
      
          <div className="flex items-center gap-3 mb-6 animate-fade-in-left">
            <span className="h-2px w-8 bg-brand" />
            <p className="text-brand-secondary animate-pulse font-semibold tracking-[0.2em] uppercase text-lg">
              Välkommen till Motion Zone
            </p>
          </div>

          <h1 className="text-5xl md:text-7xl font-light text-white leading-[1.1] tracking-tight mb-6 animate-fade-in-left [animation-delay:200ms]">
            Dans är
            <span className="font-serif italic text-brand-light">Passion</span>
            <br />
            <span className="text-3xl md:text-5xl opacity-90">
              Och Livet i Rörelse
            </span>
          </h1>

        
          <p className="text-base md:text-lg text-zinc-300 leading-relaxed max-w-lg mb-10 font-light animate-fade-in-left [animation-delay:400ms]">
            Upplev dansen på ett helt nytt sätt. Vår studio erbjuder kurser för
            alla åldrar och nivåer med professionella instruktörer.
          </p>


          <div className="flex flex-wrap gap-5 items-center animate-fade-in-left [animation-delay:600ms]">
            <Link
              href="/courses"
              className="px-8 py-3.5 bg-brand text-white font-bold uppercase tracking-widest text-[10px] rounded-full hover:bg-white hover:text-black transition-all duration-300 shadow-lg shadow-brand/20"
            >
              Se Våra Kurser
            </Link>

            <Link
              href="/about"
              className="group flex items-center gap-2 text-white/80 font-medium text-sm hover:text-white transition-colors"
            >
              <span className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center group-hover:border-brand transition-all">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <title>Pil höger</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </span>
              Om Oss
            </Link>
          </div>
        </div>
      </div>

      
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-linear-to-t from-black to-transparent" />

      <style jsx>{`
        @keyframes subtlePan {
          0% { transform: scale(1); }
          100% { transform: scale(1.1); }
        }
        @keyframes fade-in-left {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fade-in-left {
          animation: fade-in-left 0.8s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </section>
  );
}
