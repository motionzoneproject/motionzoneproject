//hero
"use client";

import Image from "next/image";
import Link from "next/link";

interface HeroProps {
  isDark?: boolean;
}

export default function Hero({ isDark = true }: HeroProps) {
  return (
    <section
      className={`text-white py-24 md:py-36 relative overflow-hidden transition-colors duration-300 ${
        isDark
          ? "bg-linear-to-br from-slate-900 via-purple-900 to-slate-900"
          : "bg-linear-to-br from-blue-50 via-indigo-50 to-white"
      }`}
    >
      <div className="absolute inset-0 overflow-hidden">
        {isDark ? (
          <>
            <div className="absolute top-40 right-10 w-96 h-96 bg-linear-to-br from-pink-500/20 to-purple-500/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 left-10 w-80 h-80 bg-linear-to-tr from-purple-600/20 to-blue-500/10 rounded-full blur-3xl"></div>
          </>
        ) : (
          <>
            <div className="absolute top-40 right-10 w-96 h-96 bg-linear-to-br from-pink-200/40 to-purple-200/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 left-10 w-80 h-80 bg-linear-to-tr from-blue-200/30 to-indigo-200/20 rounded-full blur-3xl"></div>
          </>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 order-2 lg:order-1">
            <div className="space-y-4">
              <p
                className={`font-medium text-lg tracking-widest uppercase ${
                  isDark ? "text-pink-400" : "text-pink-600"
                }`}
              >
                Welcome to Motion Zone
              </p>
              <h1
                className={`text-6xl md:text-7xl font-bold leading-tight bg-clip-text text-transparent ${
                  isDark
                    ? "bg-linear-to-r from-white via-pink-200 to-pink-400"
                    : "bg-linear-to-r from-gray-900 via-pink-600 to-red-600"
                }`}
              >
                Dans är
                <br />
                Passion
                <br />
                Och Livet i
                <br />
                Rörelse
              </h1>
            </div>
            <p
              className={`text-xl md:text-2xl max-w-2xl leading-relaxed font-light ${
                isDark ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Upplev dansen på ett helt nytt sätt. Vår studio erbjuder kurser
              för alla åldrar och nivåer med professionella instruktörer.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 pt-8">
              <Link href="/courses">
                <button
                  type="button"
                  className="px-10 py-4 bg-linear-to-r from-pink-500 to-orange-400 text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-2xl hover:shadow-pink-500/50 hover:scale-105 active:scale-95 text-lg"
                >
                  Se Våra Kurser
                </button>
              </Link>
              {/* <button
                type="button"
                className={`px-10 py-4 font-semibold rounded-xl transition-all duration-300 text-lg ${
                  isDark
                    ? "border-2 border-white/30 text-white hover:bg-white/10 hover:border-white"
                    : "border-2 border-gray-700 text-gray-900 hover:bg-gray-100 hover:border-gray-900"
                }`}
              >
                Kontakta Oss
              </button> */}
            </div>
          </div>

          <div className="flex justify-center order-1 lg:order-2">
            <div className="w-full max-w-md aspect-square rounded-3xl border-2 overflow-hidden">
              <Image
                src="/LOGO.jpg"
                alt="Motion Zone Hero"
                width={500}
                height={500}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
