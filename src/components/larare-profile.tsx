const teachers = [
  {
    name: "Maria Johansson",
    specialty: "Hip Hop & Street",
    description:
      "Med över 10 års erfarenhet skapar Maria energifyllda klasser där uttryck och självförtroende står i fokus.",
    image: "/moh.jpg",
  },
  {
    name: "Erik Svensson",
    specialty: "Balett & Modern dans",
    description:
      "Erik kombinerar teknik och konstnärligt uttryck för att hjälpa varje elev att utvecklas i sin egen takt.",
    image: "/moh.jpg",
  },
];

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
                  <img
                    src={teacher.image}
                    alt={teacher.name}
                    height={50}
                    width={50}
                    className="min-w-full min-h-full rounded-full bg-brand/20 shrink-0 flex items-center justify-center"
                  />
                  {teacher.name}
                </div>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{teacher.name}</DialogTitle>
                  <DialogDescription>
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
