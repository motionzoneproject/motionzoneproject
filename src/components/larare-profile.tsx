const teachers = [
  {
    name: "Sophie Bretoneche",
    specialty:
      "dansare, koreograf, regissör och pedagog med internationell utbildning och bred erfarenhet inom scenkonst",
    description:
      "Hon är utbildad vid New World School of the Arts i Miami och har sedan dess dansat, undervisat och skapat i bland annat Spanien, Peru, New York och Los Angeles.Med en bakgrund i flera olika dansstilar brinner Sophie för att skapa inkluderande och kreativa rum där alla får chans att utvecklas, oavsett nivå. Utöver sitt arbete som danslärare och regissör skriver hon egna teaterpjäser och syr kostymer till Motion Zone Växjös föreställningar. Hennes passion för helheten – från scen till söm – gör varje produktion unik och full av hjärta. Med värme, professionalitet och engagemang inspirerar Sophie sina elever att våga, växa och uttrycka sig genom scenkonst.",

    image: "/sophie.jpg",
  },
  {
    name: "Cesar Hugo",
    specialty: "Balett & Modern dans",
    description:
      "Cesar kombinerar teknik och konstnärligt uttryck för att hjälpa varje elev att utvecklas i sin egen takt.",
    image: "/cesar.jpg",
  },
];

import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const LarareProfile = () => {
  return (
    <section className="py-10 bg-muted/50">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-2xl font-bold mb-10 mt-10 text-center text-foreground">
          Våra lärare
        </h2>

        <div className="grid gap-6 md:grid-cols-2 max-w-2xl mx-auto">
          {teachers.map((teacher) => (
            <Dialog key={teacher.name}>
              <DialogTrigger>
                <div className="border-2 max-w-full border-border rounded-lg p-6 flex flex-col items-center text-center b hover:bg-accent/50 cursor-pointer transition">
                  <Image
                    src={teacher.image}
                    alt={teacher.name}
                    height={50}
                    width={50}
                    className="min-w-full rounded-full bg-brand/20 shrink-0 flex items-center justify-center mb-2 object-cover"
                  />
                  {teacher.name}
                </div>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{teacher.name}</DialogTitle>
                  <DialogDescription className="text-2xl">
                    {teacher.specialty}
                    <br />
                    {teacher.description}
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
            // <Card key={teacher.name} className="bg-card border-border">
            //   <CardContent className="p-6 flex gap-4 items-start">
            //     <div className="w-14 h-14 rounded-full bg-brand/20 shrink-0 flex items-center justify-center">
            //       <span className="text-xl font-bold text-brand">
            //         {teacher.name.charAt(0)}
            //       </span>
            //     </div>
            //     <div>
            //       <h3 className="font-bold text-foreground">{teacher.name}</h3>
            //       <p className="text-brand text-sm mb-2">{teacher.specialty}</p>
            //       <p className="text-muted-foreground text-sm">
            //         {teacher.description}
            //       </p>
            //     </div>
            //   </CardContent>
            // </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
export default LarareProfile;
