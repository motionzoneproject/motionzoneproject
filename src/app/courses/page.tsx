import { Book, Calendar, CalendarDays, Clock, MapPin } from "lucide-react";
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
import { addToCart } from "@/lib/actions/cart";
import {
  getAllCoursesInProduct,
  getAllProducts,
  getCourseCountInProduct,
  getFullCourseNameFromId,
  getProductSchema,
  getProductTermin,
} from "@/lib/actions/server-actions";
import { getVeckodag } from "../admin/termin/SchemaDay";

export default async function Page() {
  const products = await getAllProducts(); // Hämtaa alla produkter.. ? fixed (no user cehck.)

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-8">
      <div className="flex flex-col gap-1 border-b pb-4">
        <h1 className="font-black text-4xl tracking-tight italic uppercase text-primary">
          Köp våra kurser
        </h1>
        <p className="text-muted-foreground">
          (paket och klippkort kommer inom kort)
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map(async (p) => {
          // Hämta all data parallellt för varje produkt
          const [terminer, schemaItems] = await Promise.all([
            getProductTermin(p.id),
            getProductSchema(p.id),
          ]);

          const courses = await getAllCoursesInProduct(p.id);

          const spotsLeft =
            p.maxCustomer > 0 ? p.maxCustomer - (p.totalCount ?? 0) : null;

          return (
            <Card
              key={p.id}
              className="flex flex-col h-full hover:shadow-lg transition-shadow border-2"
            >
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="default" className="font-bold text-xl">
                    {p.price} kr
                  </Badge>
                  {spotsLeft !== null && (
                    <Badge
                      variant={spotsLeft <= 3 ? "destructive" : "outline"}
                      className="animate-pulse"
                    >
                      {spotsLeft} platser kvar
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-xl font-bold leading-none">
                  {p.name}
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  Typ: {p.type === "CLIP" ? "Klippkort" : "Kurs/paket"}
                  <br />
                  {p.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 space-y-6">
                {/* Terminer */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                    <CalendarDays className="w-3 h-3" />
                    Giltig under
                  </div>
                  {terminer.map((t) => (
                    <div
                      key={t.id}
                      className="text-sm bg-muted/50 p-2 rounded-md border border-dashed"
                    >
                      <p className="font-semibold">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">
                        {t.startDate.toLocaleDateString("sv-SE")} -{" "}
                        {t.endDate.toLocaleDateString("sv-SE")}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Schema / Kurser */}
                <Accordion type="single" collapsible>
                  <AccordionItem value="item-1">
                    <AccordionTrigger>Innehåll och schema</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground"></div>
                        <div className="grid gap-2">
                          <div>
                            <span className="font-bold">
                              <Book className="inline-block" /> Kurser:{" "}
                            </span>
                            {courses.map(async (c) => (
                              <div key={c.id} className="p-1">
                                <Badge variant={"outline"}>
                                  {" "}
                                  {c.name} - Tillfällen:{" "}
                                  {await getCourseCountInProduct(p.id, c.id)}st
                                </Badge>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-1 mt-2">
                            <Calendar className="inline-block" />
                            <span className="font-bold">Schema:</span>
                          </div>
                          {schemaItems.map(async (s) => {
                            const courseName = await getFullCourseNameFromId(
                              s.courseId,
                            );

                            return (
                              <div
                                key={s.id}
                                className="text-[11px] p-2 bg-zinc-50 dark:bg-zinc-900 rounded border flex flex-col gap-1"
                              >
                                <div className="font-bold text-foreground leading-tight">
                                  {courseName}
                                </div>
                                <div className="flex items-center gap-1 ">
                                  <span>{getVeckodag(s.weekday)}</span>
                                  <span> </span>
                                  <span>
                                    <Clock className="inline-block w-3 h-3" />
                                    {s.timeStart.toLocaleTimeString("sv-SE", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                    -
                                    {s.timeEnd.toLocaleTimeString("sv-SE", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                                {s.place && (
                                  <div className="flex items-center gap-1 text-[10px] text-primary/70">
                                    <MapPin className="w-2 h-2" />
                                    {s.place}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>

              <CardFooter className="pt-4 border-t bg-zinc-50/50 dark:bg-zinc-900/50">
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
                    className="w-full font-bold uppercase tracking-wider group cursor-pointer"
                  >
                    Köp nu
                    <span className="ml-2 group-hover:translate-x-1 transition-transform">
                      →
                    </span>
                  </Button>
                </form>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
