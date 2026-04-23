import Image from "next/image";
import DansStilar from "@/components/dans-stilar";
import LarareProfile from "@/components/larare-profile";
import { getStudios } from "@/lib/actions/studio-actions";
import { getStyles } from "@/lib/actions/style-actions";

export default async function About() {
  const [studios, styles] = await Promise.all([getStudios(), getStyles()]);
  const activeStudios = studios.filter((studio) => studio.active);
  const studioContentMaxWidth = Math.min(
    activeStudios.length * 500 + Math.max(activeStudios.length - 1, 0) * 24,
    1152,
  );

  return (
    <main className="bg-background">
      {/* Hero */}
      <section className="border-b border-border py-16 text-center md:py-20">
        <div className="mx-auto max-w-7xl px-6">
          <h1 className="mb-6 animate-fade-in-left text-5xl font-light leading-[1.1] tracking-tight text-foreground [animation-delay:200ms] md:text-7xl">
            Om vår
            <span className="font-serif italic text-brand-light">
              {" "}
              Dansstudio
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            En plats där rörelse möter gemenskap, kreativitet och passion.
          </p>
        </div>
      </section>

      <LarareProfile />
      <DansStilar styles={styles} />

      {/* Studio */}
      <section className="bg-muted/50 py-16">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="mb-4 text-2xl font-bold text-foreground">
            Våra lokaler
          </h2>
          {activeStudios.length === 0 ? (
            <p className="mb-8 text-muted-foreground">
              Information om våra studios kommer snart.
            </p>
          ) : (
            <div
              className="mx-auto w-full max-w-full"
              style={{ maxWidth: `${studioContentMaxWidth}px` }}
            >
              <div className="flex flex-wrap justify-center gap-6">
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
                    <h3 className="text-lg font-semibold">{studio.name}</h3>
                    <p className="mt-2 text-muted-foreground">
                      {studio.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="relative mt-6 overflow-hidden rounded-2xl border border-brand/30 bg-brand/10 p-7 backdrop-blur-sm">
            <div className="absolute top-0 left-0 h-full w-1 rounded-l-2xl bg-brand" />
            <p className="text-xl font-light leading-snug text-foreground">
              Här är alla välkomna –{" "}
              <span className="font-serif italic text-brand-light">
                oavsett nivå.
              </span>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
