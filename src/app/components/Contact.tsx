"use client";

interface ContactProps {
  isDark: boolean;
}

export default function Contact({ isDark }: ContactProps) {
  return (
    <section
      id="kontakt"
      className={`py-16 md:py-24 transition-colors duration-300 ${
        isDark
          ? "bg-linear-to-br from-slate-900 to-purple-900 text-white"
          : "bg-linear-to-br from-gray-100 to-gray-50 text-gray-900"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-8">
            <div>
              <h2 className="text-5xl md:text-6xl font-bold mb-6">
                Kontakta Oss
              </h2>
              <p
                className={`text-lg leading-relaxed font-light ${
                  isDark ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Är du intresserad av att börja dansa med oss? Kontakta Motion
                Zone Växjö idag för mer information om våra kurser och events!
              </p>
            </div>

            <div className="space-y-5">
              <ContactItem
                isDark={isDark}
                icon="📧"
                label="Email"
                value="info@motionzone.se"
                href="mailto:info@motionzone.se"
              />
              <ContactItem
                isDark={isDark}
                icon="📞"
                label="Telefon"
                value="070-123 45 67"
                href="tel:+46701234567"
              />
              <ContactItem
                isDark={isDark}
                icon="📍"
                label="Adress"
                value="Dansvägen 42, 352 33 Växjö"
              />
              <div className="flex gap-4 items-start pt-4">
                <span className="text-2xl">⏰</span>
                <div>
                  <p className="font-semibold mb-3">Öppettider</p>
                  <p
                    className={`mb-1 ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Mån-Fre: 16:00-21:00
                  </p>
                  <p
                    className={`mb-1 ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Lör: 10:00-18:00
                  </p>
                  <p className={isDark ? "text-gray-400" : "text-gray-600"}>
                    Sön: Stängt
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center items-center md:items-start">
            <div className="space-y-6 w-full">
              <div>
                <h3 className="text-3xl font-bold mb-4">Följ Oss</h3>
                <p
                  className={`text-lg font-light mb-6 ${
                    isDark ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Håll dig uppdaterad med våra senaste nyheter och events
                </p>
              </div>
              <div className="flex gap-4 flex-wrap">
                <SocialButton isDark={isDark} label="f" href="#" />
                <SocialButton isDark={isDark} label="📸" href="#" />
                <SocialButton isDark={isDark} label="▶" href="#" />
                <SocialButton isDark={isDark} label="𝕏" href="#" />
              </div>

              <div className="pt-8 border-t border-white/20">
                <button
                  type="button"
                  className={`w-full px-10 py-5 bg-linear-to-r from-pink-500 to-orange-400 text-white font-semibold rounded-xl transition-all duration-300 text-lg hover:shadow-2xl hover:shadow-pink-500/50 hover:scale-105 active:scale-95`}
                >
                  Boka En Gratis Provsession
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactItem({
  isDark,
  icon,
  label,
  value,
  href,
}: {
  isDark: boolean;
  icon: string;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <div className="flex gap-4 items-start group">
      <span className="text-2xl group-hover:scale-125 transition-transform duration-300">
        {icon}
      </span>
      <div>
        <p
          className={`font-semibold mb-2 ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          {label}
        </p>
        <p
          className={`group-hover:opacity-100 transition-colors duration-300 font-light text-lg ${
            isDark
              ? "text-gray-400 group-hover:text-white"
              : "text-gray-700 group-hover:text-gray-900"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );

  return href ? <a href={href}>{content}</a> : <div>{content}</div>;
}

function SocialButton({
  isDark,
  label,
  href,
}: {
  isDark: boolean;
  label: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className={`w-16 h-16 flex items-center justify-center border rounded-xl text-2xl transition-all duration-300 hover:scale-125 hover:shadow-xl active:scale-95 ${
        isDark
          ? "bg-linear-to-br from-pink-500/30 to-purple-600/30 border-pink-500/50 hover:from-pink-500 hover:to-orange-400 hover:border-pink-400 hover:shadow-pink-500/50"
          : "bg-white border-gray-300 hover:bg-gray-100 hover:border-gray-400 hover:shadow-gray-300"
      }`}
    >
      {label}
    </a>
  );
}
