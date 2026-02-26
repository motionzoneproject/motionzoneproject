import Image from "next/image";
import DansStilar from "@/components/dans-stilar";
import LarareProfile from "@/components/larare-profile";
import { getStudios } from "@/lib/actions/studio-actions";

export default async function About() {
  const studios = await getStudios();
  const activeStudios = studios.filter((studio) => studio.active);

  return (
    <main className="bg-background">
      {/* Hero */}
      <section className="py-16 md:py-20 text-center border-b border-border">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-5xl md:text-7xl font-light text-foreground leading-[1.1] tracking-tight mb-6 animate-fade-in-left [animation-delay:200ms]">
            Om vår
            <span className="font-serif italic text-brand-light">
              {" "}
              Dansstudio
            </span>
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
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold mb-4 text-foreground">
            Våra lokaler
          </h2>
          {activeStudios.length === 0 ? (
            <p className="text-muted-foreground mb-8">
              Information om våra studios kommer snart.
            </p>
          ) : (
            <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-6">
              {activeStudios.map((studio) => (
                <div
                  key={studio.id}
                  className="flex w-[500px] max-w-full flex-col items-center rounded-lg border-2 border-border p-6 text-center"
                >
                  {studio.imageUrl && (
                    <Image
                      src={studio.imageUrl}
                      alt={studio.name}
                      height={220}
                      width={420}
                      className="mb-4 h-[220px] w-full rounded-lg object-cover"
                    />
                  )}
                  <h3 className="font-semibold text-lg">{studio.name}</h3>
                  <p className="mt-2 text-muted-foreground">
                    {studio.description}
                  </p>
                </div>
              ))}
            </div>
          )}
          <div className="bg-brand rounded-lg p-6 mb-10 mt-8">
            <p className="text-white text-lg font-semibold">
              Här är alla välkomna - oavsett nivå.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
