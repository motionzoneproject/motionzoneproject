import Image from "next/image";

const danceStyles = [
  { name: "Hip Hop", image: "/hiphop.jpg" },
  { name: "Salsa", image: "/salsa.jpg" },
  { name: "Heel", image: "/heel.jpg" },
  { name: "Jazz", image: "/jazz.jpg" },
  { name: "Bachata", image: "/bachata.jpg" },
  { name: "Latinrhythms", image: "/latinrhythms19+.jpg" },
  { name: "Contemporary", image: "/contemporary.jpg" },
  { name: "Barre", image: "/barre.jpg" },
];

const DansStilar = () => {
  return (
    <section className="py-10">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-2xl font-bold mb-8 text-center text-foreground">
          Dansstilar
        </h2>

        <div className="grid gap-3 grid-cols-2 md:grid-cols-4 max-w-4xl mx-auto">
          {danceStyles.map((style) => (
            <div
              key={style.name}
              className=" border border-border rounded-xl p-3 text-center text-foreground text-lg font-semibold hover:border-brand/50 transition-colors"
            >
              {style.image && (
                <Image
                  src={style.image}
                  alt={style.name}
                  height={150}
                  width={150}
                  className="w-50 h-50 rounded-lg object-cover mt-2"
                />
              )}
              {style.name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
export default DansStilar;
