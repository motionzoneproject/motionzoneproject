import DansStilar from "@/components/dans-stilar";
import LarareProfile from "@/components/larare-profile";

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

      <LarareProfile />
      <DansStilar />

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
          <div className="bg-brand rounded-lg p-6 mb-10">
            <p className="text-white text-lg font-semibold">
              Här är alla välkomna – oavsett nivå.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
