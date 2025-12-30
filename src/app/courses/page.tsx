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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map(async (p) => {
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
                className="flex flex-col h-full hover:border-brand/50 transition-colors"
              >
                <CardHeader className="pb-4">
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
                  <CardDescription>
                    {p.type === "CLIP" ? "Klippkort" : "Kurs/paket"}
                    {p.description && ` – ${p.description}`}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1 space-y-4">
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
                    <AccordionItem value="item-1">
                      <AccordionTrigger className="text-sm hover:text-brand">
                        Innehåll och schema
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 text-sm">
                          <div>
                            <span className="font-medium flex items-center gap-1 mb-2">
                              <Book className="w-4 h-4" /> Kurser:
                            </span>
                            {courses.map(async (c) => (
                              <Badge
                                key={c.id}
                                variant="outline"
                                className="mr-1 mb-1"
                              >
                                {c.name} –{" "}
                                {await getCourseCountInProduct(p.id, c.id)}st
                              </Badge>
                            ))}
                          </div>
                          <div>
                            <span className="font-medium flex items-center gap-1 mb-2">
                              <Calendar className="w-4 h-4" /> Schema:
                            </span>
                            {schemaItems.map(async (s) => {
                              const courseName = await getFullCourseNameFromId(
                                s.courseId,
                              );
                              return (
                                <div
                                  key={s.id}
                                  className="text-xs p-2 bg-muted rounded border border-border mb-2"
                                >
                                  <p className="font-medium">{courseName}</p>
                                  <p className="text-muted-foreground">
                                    {getVeckodag(s.weekday)}{" "}
                                    <Clock className="inline w-3 h-3 mx-1" />
                                    {s.timeStart.toLocaleTimeString("sv-SE", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                    –
                                    {s.timeEnd.toLocaleTimeString("sv-SE", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                  {s.place && (
                                    <p className="text-brand flex items-center gap-1 mt-1">
                                      <MapPin className="w-3 h-3" />
                                      {s.place}
                                    </p>
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
