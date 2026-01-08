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

const DansStilar = () => {
  return (
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
  );
};
export default DansStilar;
