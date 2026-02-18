import { ArrowUpRight, Book, CalendarDays, Clock, MapPin } from "lucide-react";
import Image from "next/image";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { addToCart } from "@/lib/actions/cart";
import {
  getAllProductsWithDetails,
  getRemainingSlotsForCourse,
} from "@/lib/actions/server-actions";
import { getVeckodag } from "@/lib/tools";

export default async function Page() {
  const products = await getAllProductsWithDetails();

  return (
    <main className="bg-background">
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        <div className="text-center py-8 border-b border-border mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
            Köp våra kurser
          </h1>
          <p className="text-muted-foreground">
            Paket och klippkort kommer inom kort
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {products.map(async (p) => {
            // Extract all schema items from the courses
            const schemaItems = p.courses.flatMap(
              (pc) => pc.course.schemaItems,
            );

            // Extract unique termins from schema items
            const terminMap = new Map();
            schemaItems.forEach((s) => {
              if (s.termin) {
                terminMap.set(s.termin.id, s.termin);
              }
            });
            const terminer = Array.from(terminMap.values());

            // Extract courses from the product
            const courses = p.courses.map((pc) => pc.course);

            // Calculate spots left
            const spotsLeft = p.unlimitedCustomers
              ? null
              : await getRemainingSlotsForCourse(p.id, p.maxCustomer);

            return (
              <Card
                key={p.id}
                className="flex flex-col h-full hover:border-brand/50 transition-colors"
              >
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <Badge className="font-bold text-lg bg-brand text-white border-0">
                      {p.price} kr
                    </Badge>
                    {spotsLeft !== null && (
                      <Badge
                        variant={spotsLeft <= 3 ? "destructive" : "outline"}
                      >
                        {spotsLeft} platser kvar
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg">{p.name}</CardTitle>
                  <CardDescription className="whitespace-pre-line">
                    Produkttyp: {p.type === "CLIP" ? "Klippkort" : "Kurs/paket"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1 space-y-4">
                  {/* Note: Attempting to use images sizes to help next/image optimize 
                      Unclear what the best aspect ratio is, has to be tested with customer images */}
                  {p.imageURL && (
                    <div className="relative w-full aspect-video bg-muted rounded-md overflow-hidden">
                      <Image
                        src={p.imageURL}
                        alt={p.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <CalendarDays className="w-3 h-3" />
                      Giltig under
                    </div>
                    {terminer.map((t) => (
                      <div
                        key={t.id}
                        className="text-sm bg-muted p-2 rounded border border-border"
                      >
                        <p className="font-medium">{t.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.startDate.toLocaleDateString("sv-SE")} –{" "}
                          {t.endDate.toLocaleDateString("sv-SE")}
                        </p>
                      </div>
                    ))}
                  </div>

                  <Accordion type="single" collapsible>
                    <AccordionItem value="description">
                      <AccordionTrigger className="text-sm hover:text-brand">
                        Om Produkten
                      </AccordionTrigger>
                      <AccordionContent className="whitespace-pre-line">
                        {p.description && ` – ${p.description}`}
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-1">
                      <AccordionTrigger className="text-sm hover:text-brand">
                        Innehåll och Schema
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 text-sm">
                          <div>
                            <span className="font-medium text-sm flex items-center gap-1 mb-2">
                              <Book className="w-3 h-3" /> Kurser som ingår:
                            </span>
                            {courses.map(async (c) => (
                              <div
                                key={c.id}
                                className="bg-muted rounded mb-2 p-2 border border-border"
                              >
                                <div className="flex justify-between gap-2 mb-1 items-center">
                                  <div className="font-medium">
                                    {`${c.name} ${c.minAge}+ år - ${c.level}`}
                                  </div>
                                  {/* DIALOG FOR COURSE DETAILS */}
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <span className="flex min-w-20 gap-1 items-center text-xs text-brand hover:underline cursor-pointer">
                                        Läs mer om kursen
                                        <ArrowUpRight className="w-3 h-3 shrink-0" />
                                      </span>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>{`${c.name} ${c.minAge}+ år - ${c.level}`}</DialogTitle>
                                        <DialogDescription>
                                          {c.description}
                                        </DialogDescription>
                                      </DialogHeader>
                                      {/* Bunch of dialog content that is hard to format without rawdogging divs */}
                                      <div className="space-y-3 text-sm">
                                        <div className="space-y-1">
                                          <p>{`Lärare: ${c.teacher.name}`}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {`Email: ${c.teacher.email}`}
                                          </p>
                                        </div>
                                        <p>
                                          {`Målgrupp: ${c.adult ? "Vuxna" : "Barn/Ungdom"}`}
                                        </p>
                                        <p>
                                          {`Åldersgrupp: ${c.minAge}-${c.maxAge} år`}
                                        </p>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                </div>
                                <p className="text-muted-foreground text-xs">
                                  Antal Tillfällen: {c.maxBookings}
                                </p>
                                <div className="mt-2">
                                  {schemaItems
                                    .filter((s) => s.courseId === c.id)
                                    .map(async (s) => {
                                      return (
                                        <div
                                          key={s.id}
                                          className="text-xs p-2 bg-card text-muted-foreground rounded border border-border mb-2"
                                        >
                                          <p className="font-medium">
                                            {s.termin.name}
                                          </p>
                                          <p className="flex items-center text-muted-foreground">
                                            {getVeckodag(s.weekday)}{" "}
                                            <Clock className="inline w-3 h-3 mx-1" />
                                            {s.timeStart.toLocaleTimeString(
                                              "sv-SE",
                                              {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                              },
                                            )}
                                            –
                                            {s.timeEnd.toLocaleTimeString(
                                              "sv-SE",
                                              {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                              },
                                            )}
                                          </p>
                                          {s.place && (
                                            <p className="text-brand flex items-center gap-1 mt-1">
                                              <MapPin className="w-3 h-3" />
                                              {s.place}
                                            </p>
                                          )}
                                          <div className="mt-2">
                                            {" "}
                                            {`Giltig: ${s.termin.startDate.toLocaleDateString("sv-SE")} - ${s.termin.endDate.toLocaleDateString("sv-SE")}`}{" "}
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>

                <CardFooter className="pt-4 border-t">
                  <form
                    action={async () => {
                      "use server";
                      await addToCart({
                        productId: p.id,
                        redirectTo: "/checkout",
                      });
                    }}
                    className="w-full"
                  >
                    <Button
                      type="submit"
                      className="w-full bg-brand hover:bg-brand-light text-white font-medium"
                    >
                      Köp nu →
                    </Button>
                  </form>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </main>
  );
}
