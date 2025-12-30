import { Card, CardContent } from "@/components/ui/card";

const teachers = [
  {
    name: "Maria Johansson",
    specialty: "Hip Hop & Street",
    description:
      "Med över 10 års erfarenhet skapar Maria energifyllda klasser där uttryck och självförtroende står i fokus.",
  },
  {
    name: "Erik Svensson",
    specialty: "Balett & Modern dans",
    description:
      "Erik kombinerar teknik och konstnärligt uttryck för att hjälpa varje elev att utvecklas i sin egen takt.",
  },
];

const danceStyles = [
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
];

export default function About() {
  return (
    <main className="bg-background">
      {/* Hero */}
      <section className="py-16 md:py-20 text-center border-b border-border">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
            Om vår dansstudio
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            En plats där rörelse möter gemenskap, kreativitet och passion.
          </p>
        </div>
      </section>

      {/* Teachers */}
      <section className="py-16 bg-muted/50">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl font-bold mb-8 text-center text-foreground">
            Våra lärare
          </h2>

          <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
            {teachers.map((teacher) => (
              <Card key={teacher.name} className="bg-card border-border">
                <CardContent className="p-6 flex gap-4 items-start">
                  <div className="w-14 h-14 rounded-full bg-brand/20 shrink-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-brand">
                      {teacher.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">
                      {teacher.name}
                    </h3>
                    <p className="text-brand text-sm mb-2">
                      {teacher.specialty}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {teacher.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Dance Styles */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl font-bold mb-8 text-center text-foreground">
            Dansstilar
          </h2>

          <div className="grid gap-3 grid-cols-2 md:grid-cols-4 max-w-3xl mx-auto">
            {danceStyles.map((style) => (
              <div
                key={style}
                className="bg-card border border-border rounded-lg p-3 text-center text-foreground text-sm hover:border-brand/50 transition-colors"
              >
                {style}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Studio */}
      <section className="py-16 bg-muted/50">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold mb-4 text-foreground">
            Vår studio
          </h2>
          <p className="text-muted-foreground mb-8">
            Vår studio är designad för att kännas inspirerande, trygg och
            professionell. Ljusa salar, speglar och högkvalitativa golv skapar
            den perfekta miljön för dans.
          </p>
          <div className="bg-brand rounded-lg p-6">
            <p className="text-white text-lg font-semibold">
              Här är alla välkomna – oavsett nivå.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
