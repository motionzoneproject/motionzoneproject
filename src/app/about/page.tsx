export default function About() {
  return (
    <main className="bg-gradient-to-br from-blue-200 to-purple-200-50 text-black-800">
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl font-bold tracking-tight mb-6">
          Om vår dansstudio
        </h1>
        <p className="max-w-2xl mx-auto text-lg font-extrabold text-blue-600">
          En plats där rörelse möter gemenskap, kreativitet och passion.
        </p>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-extrabold mb-12 text-center">
          Våra lärare
        </h2>

        <div className="grid gap-10 md:grid-cols-2">
          <div className="bg-white rounded-2xl shadow-sm p-8 flex gap-6 items-center">
            <div className="w-28 h-28 rounded-full bg-green-100 flex-shrink-0" />
            <div>
              <h3 className="text-2xl font-extrabold">Maria Johansson</h3>
              <p className="text-green-600 font-medium mb-6">
                Hip Hop & Street
              </p>
              <p className="text-blue-600">
                Med över 10 års erfarenhet skapar Maria energifyllda klasser där
                uttryck och självförtroende står i fokus.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-8 flex gap-6 items-center">
            <div className="w-28 h-28 rounded-full bg-green-100 flex-shrink-0" />
            <div>
              <h3 className="text-2xl font-extrabold">Erik Svensson</h3>
              <p className="text-green-600 font-medium mb-6">
                Balett & Modern dans
              </p>
              <p className="text-blue-600">
                Erik kombinerar teknik och konstnärligt uttryck för att hjälpa
                varje elev att utvecklas i sin egen takt.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <h2 className="text-3xl font-extrabold mb-10 text-center">
            Dansstilar
          </h2>

          <div className="grid gap-6 sm:grid-cols md:grid-cols-2 font-bold">
            {[
              "Hip Hop",
              "Balett",
              "Salsa",
              "Jazz",
              "Latin rhythms",
              "Contemporary",
              "Reggaeton",
              "Pointe Mellannivå",
              "Heels",
              "Barre",
              "Stretch & relaxation",
              "Art Lab Zone",
            ].map((style) => (
              <div
                key={style}
                className="rounded-3xl border border-gray-200 p-6 text-center hover:border-slate-400 transition"
              >
                <p className="text-lg font-medium">{style}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex flex-col items-center justify-center">
          <div>
            <h2 className="text-3xl  text-green-600 font-extrabold mb-6">
              Vår studio
            </h2>
            <p className="text-gray-600 mb-6">
              Vår studio är designad för att kännas inspirerande, trygg och
              professionell. Ljusa salar, speglar och högkvalitativa golv skapar
              den perfekta miljön för dans.
            </p>
          </div>

          <div className="h-24 rounded-2xl bg-gradient-to-br from-blue-200 to-purple-200">
            <p className="text-blue-800 text-3xl font-bold mt-8 text-center">
              Här är alla välkomna – oavsett nivå.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
