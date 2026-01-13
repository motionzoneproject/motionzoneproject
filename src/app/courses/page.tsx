import { Book, Calendar, CalendarDays, Clock, MapPin } from "lucide-react";
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
import { addToCart } from "@/lib/actions/cart";
import { getAllProductsWithData } from "@/lib/actions/server-actions";
import { getSessionData } from "@/lib/actions/sessiondata";
import { getCourseName } from "@/lib/tools";
import { getVeckodag } from "../admin/termin/SchemaDay";
import CourseFilters from "./CourseFilters";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    adult?: string;
    sort?: string;
  }>;
}) {
  const params = await searchParams;
  const typeFilter = params.type ?? "all";
  const adultFilter = params.adult ?? "all";
  const sortFilter = params.sort ?? "price-asc";

  const session = await getSessionData();
  const isAdmin = session?.user?.role === "admin";
  const products = await getAllProductsWithData(); // Gör om här så all data hämtas här istället. fix.
  // Vi behöver: produkterna, deras termin, deras kurser, och schema.

  const filteredProducts = products
    .filter((p) => (typeFilter === "all" ? true : p.type === typeFilter))
    .filter((p) => {
      if (adultFilter === "all") return true;
      const wantsAdult = adultFilter === "adult";
      return p.courses.some((c) => Boolean(c.course.adult) === wantsAdult);
    })
    .sort((a, b) => {
      switch (sortFilter) {
        case "price-desc":
          return b.price - a.price;
        case "name-asc":
          return a.name.localeCompare(b.name, "sv-SE");
        case "name-desc":
          return b.name.localeCompare(a.name, "sv-SE");
        default:
          return a.price - b.price;
      }
    });

  return (
    <main className="bg-background">
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        <div className="text-center py-8 border-b border-border mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Här hittar du våra kurser, paket och klippkort!
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <CourseFilters
              type={typeFilter}
              adult={adultFilter}
              sort={sortFilter}
            />
          </aside>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2">
            {filteredProducts.map((p) => {
              const allSchemaItems = p.courses.flatMap(
                (pc) => pc.course.schemaItems,
              );
              const terminer = Array.from(
                new Map(
                  allSchemaItems.flatMap((s) =>
                    s.termin ? [[s.termin.id, s.termin]] : [],
                  ),
                ).values(),
              ).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

              const purchasesCount = p._count?.purchases ?? 0;
              const typeLabel =
                p.type === "CLIP"
                  ? "Klippkort"
                  : p.type === "PACK"
                    ? "Paket"
                    : "Kurs";

              // Om maxCustomer är > 0 räknar vi ut diffen, annars är det null (obegränsat)
              const spotsLeft =
                p.maxCustomer > 0 ? p.maxCustomer - purchasesCount : null;

              // Man kan bara bli "full" om det faktiskt finns ett tak satt (spotsLeft !== null)
              const isFull = spotsLeft !== null && spotsLeft <= 0;
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
                      {spotsLeft === null ? (
                        <div>Obegränsat antal platser</div>
                      ) : (
                        <div>Platser kvar: {Math.max(spotsLeft, 0)}</div>
                      )}
                    </div>
                    <CardTitle className="text-lg">{p.name}</CardTitle>
                    <CardDescription>
                      Produkt-typ: {typeLabel}
                      <br />
                      <div className="relative w-full min-h-48 border rounded p-1">
                        {p.imageURL && (
                          <Image
                            src={p.imageURL}
                            alt={`${p.name} produktbild.`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                          ></Image>
                        )}
                      </div>
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-2">
                    <Accordion type="single" collapsible>
                      <AccordionItem value="item-1">
                        <AccordionTrigger className="text-sm hover:text-brand">
                          Beskrivning
                        </AccordionTrigger>
                        <AccordionContent>{p.description}</AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    <div className="space-y-1">
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
                              {p.type === "CLIP" && (
                                <div className="text-xs mb-2">
                                  Antal klipp: {p.totalCount ?? 0}
                                </div>
                              )}
                              {p.courses.map((c) => (
                                <Badge
                                  key={c.course.id}
                                  variant="outline"
                                  className="mr-1 mb-1"
                                >
                                  {c.course.name} –{" "}
                                  {p.type === "CLIP"
                                    ? "Bokas med klippkort"
                                    : c.unlimited
                                      ? "Obegränsat antal platser"
                                      : `Antal tillfällen: ${c.lessonsIncluded}`}
                                </Badge>
                              ))}
                            </div>
                            <div>
                              <span className="font-medium flex items-center gap-1 mb-2">
                                <Calendar className="w-4 h-4" /> Schema:
                              </span>
                              {allSchemaItems.map((s) => {
                                const courseName = getCourseName(s.course);
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
                        disabled={isFull || isAdmin}
                        className={`w-full ${
                          isFull || isAdmin
                            ? "bg-gray-400"
                            : "bg-brand hover:bg-brand-light"
                        } text-white font-medium`}
                      >
                        {isAdmin
                          ? "Admin kan inte köpa"
                          : isFull
                            ? "Fullbokat"
                            : "Köp nu →"}
                      </Button>
                    </form>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
