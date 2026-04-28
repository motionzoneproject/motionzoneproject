import {
  Book,
  CalendarDays,
  Clock,
  InfinityIcon,
  Info,
  MapPin,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { PaginationBar } from "@/components/PaginationBar";
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
import { getProductStats } from "@/lib/actions/purchase-actions";
import { formatPrice } from "@/lib/money";
import prisma from "@/lib/prisma";
import { getCourseName, getVeckodag } from "@/lib/tools";
import { CourseInfoDialog } from "./components/CourseInfoDialog";
import { CoursesFilter } from "./components/CoursesFilter";

interface Props {
  searchParams: Promise<{
    page?: string;
    q?: string;
    adult?: string;
    type?: string;
    sort?: string;
  }>;
}

export const metadata: Metadata = {
  title: "Våra kurser",
  description:
    "Bläddra och boka MotionZone Växjös danskurser för barn, ungdomar och vuxna.",
};

export default async function Page({ searchParams }: Props) {
  const sp = await searchParams;

  // Build filters based on search params
  const filters = {
    active: true as const,
    ...(sp.q
      ? {
          name: {
            contains: sp.q,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...(sp.adult
      ? {
          courses: {
            some: {
              course: {
                adult: sp.adult === "true",
              },
            },
          },
        }
      : {}),
    ...(sp.type ? { type: sp.type as "CLIP" | "COURSE" | "PACK" } : {}),
  };

  // Determine sort order
  const getSortOrder = () => {
    switch (sp.sort) {
      case "name-desc":
        return { name: "desc" as const };
      case "price-asc":
        return { price: "asc" as const };
      case "price-desc":
        return { price: "desc" as const };
      default:
        return { name: "asc" as const };
    }
  };

  // Pagination
  const ITEMS_PER_PAGE = 6;
  const currentPage = Number(sp.page) || 1;
  const skip = (currentPage - 1) * ITEMS_PER_PAGE;
  const productSnapshots = await prisma.product.findMany({
    where: filters,
    select: {
      id: true,
      maxCustomer: true,
      unlimitedCustomers: true,
    },
    orderBy: getSortOrder(),
  });
  const productIds = productSnapshots.map((product) => product.id);

  const [soldCounts, reservedOrderItems] = await Promise.all([
    prisma.purchase.groupBy({
      by: ["productId"],
      where: {
        productId: { in: productIds },
        order: { status: { not: "CANCELLED" } },
      },
      _count: { productId: true },
    }),
    prisma.orderItem.findMany({
      where: {
        productId: { in: productIds },
        order: {
          status: {
            in: ["PENDING_PAYMENT", "PAID", "APPROVED"],
          },
        },
      },
      select: {
        productId: true,
        count: true,
        order: {
          select: {
            purchases: {
              select: {
                productId: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const soldMap = new Map(
    soldCounts.map((row) => [row.productId, row._count.productId]),
  );
  const reservedMap = new Map<string, number>();
  for (const item of reservedOrderItems) {
    const purchaseExistsForProduct = item.order.purchases.some(
      (purchase) => purchase.productId === item.productId,
    );

    if (purchaseExistsForProduct) continue;

    reservedMap.set(
      item.productId,
      (reservedMap.get(item.productId) ?? 0) + item.count,
    );
  }
  const visibleProductIds = productSnapshots
    .filter((product) => {
      if (product.unlimitedCustomers) return true;

      const sold = soldMap.get(product.id) ?? 0;
      const reserved = reservedMap.get(product.id) ?? 0;

      return sold + reserved < product.maxCustomer;
    })
    .map((product) => product.id);

  // Get total count for pagination
  const totalProducts = visibleProductIds.length;
  const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);
  const pagedProductIds = visibleProductIds.slice(skip, skip + ITEMS_PER_PAGE);

  // Fetch paginated products with all needed relations
  const products = await prisma.product.findMany({
    where: { id: { in: pagedProductIds } },
    include: {
      courses: {
        include: {
          course: {
            include: {
              schemaItems: {
                include: {
                  termin: true,
                },
              },
              teacher: {
                include: {
                  teacherProfile: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: getSortOrder(),
  });
  const productsById = new Map(
    products.map((product) => [product.id, product]),
  );
  const pagedProducts = pagedProductIds
    .map((id) => productsById.get(id))
    .filter((product) => product !== undefined);

  // Calculate all async data before rendering
  const productsWithData = await Promise.all(
    pagedProducts.map(async (p) => {
      const stats = await getProductStats(p.id);

      // Extract unique schemaItems and terminer from all courses in the product
      const schemaItems = p.courses.flatMap((pc) => pc.course.schemaItems);

      const terminMap = new Map();
      schemaItems.forEach((s) => {
        if (s.termin) {
          terminMap.set(s.termin.id, s.termin);
        }
      });
      const terminer = Array.from(terminMap.values());

      return {
        ...p,
        schemaItems,
        terminer,
        spotsLeft: stats.spotsLeft,
      };
    }),
  );

  return (
    <div className="bg-background">
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        <div className="py-8 border-b border-border mb-8">
          {/* <h1 className="text-2xl md:text-3xl font-light text-foreground leading-[1.1] tracking-tight mb-6 animate-fade-in-left [animation-delay:200ms]">
            Här köper du tillgång till våra
            <span className="font-serif italic text-brand-light"> Kurser</span>!
          </h1>
          <p>
            I samband med köpet blir du medlem. Du kan även köpa produkter till
            dina barn, lägg enkelt till deltagare i kundkorgen. Logga sedan
            enkelt in och boka våra lektioner!
          </p> */}

          <h1 className="text-5xl md:text-7xl font-light text-foreground leading-[1.1] tracking-tight mb-4 animate-fade-in-left [animation-delay:200ms]">
            Köp tillgång till våra
            <span className="font-serif italic text-brand-light"> kurser</span>
          </h1>
          <div className="w-full">
            <p className="text-muted-foreground">
              Vid köp blir du samtidigt medlem hos Motion Zone. Du kan även köpa
              kurser till exempelvis dina barn genom att enkelt lägga till
              deltagare i kundkorgen. När köpet är klart loggar du in och bokar
              de lektioner ni vill gå.
            </p>

            <CoursesFilter />
          </div>
        </div>
        {/* Filter component */}
        <p className="font-bold mt-4">Våra produkter</p>

        {totalProducts > 0 ? (
          <>
            {/* Results count */}
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
              <span>
                Visar {skip + 1}-
                {Math.min(skip + ITEMS_PER_PAGE, totalProducts)} av{" "}
                {totalProducts} produkter
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {productsWithData.map((p) => {
                const productCourses = p.courses;

                return (
                  <Card
                    key={p.id}
                    className="flex flex-col h-full rounded-xl border border-border/70 hover:border-brand/50 hover:shadow-lg hover:shadow-brand/5 hover:-translate-y-0.5 transition-all duration-300"
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start mb-2">
                        <Badge className="font-bold text-lg bg-brand text-white border-0">
                          {formatPrice(p.price)}
                        </Badge>
                        {typeof p.spotsLeft === "number" &&
                        Number.isFinite(p.spotsLeft) ? (
                          <Badge
                            variant={
                              p.spotsLeft <= 4 ? "destructive" : "outline"
                            }
                            className={
                              p.spotsLeft <= 4 ? "text-white" : "text-green-500"
                            }
                          >
                            {`${p.spotsLeft} platser kvar`}
                          </Badge>
                        ) : p.spotsLeft === Infinity ? (
                          <Badge variant={"outline"}>
                            <InfinityIcon className="text-green-500 w-6! h-6! " />
                          </Badge>
                        ) : (
                          <Badge variant={"destructive"}>
                            <Info /> Osäkert
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg">{p.name}</CardTitle>
                      <CardDescription className="whitespace-pre-line">
                        Produkttyp:{" "}
                        {p.type === "CLIP" ? "Klippkort" : "Kurs/paket"}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="flex-1 space-y-4">
                      {p.imageURL && (
                        <div className="overflow-hidden max-h-64 rounded-md">
                          <Image
                            src={p.imageURL}
                            alt={p.name}
                            width={800}
                            height={600}
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="w-full h-auto"
                          />
                        </div>
                      )}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <CalendarDays className="w-3 h-3" />
                          Giltig under
                        </div>
                        {p.terminer.map((t) => (
                          <div
                            key={t.id}
                            className="text-sm bg-muted p-2 rounded border border-border"
                          >
                            <p className="font-medium">{t.name}</p>
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
                                {productCourses.map((pc) => {
                                  const c = pc.course;

                                  const lessonCount =
                                    p.type === "CLIP"
                                      ? `${String(p.totalCount ?? 0)} (klipp)`
                                      : pc.unlimited
                                        ? "Obegränsat"
                                        : String(pc.lessonsIncluded);

                                  return (
                                    <div
                                      key={c.id}
                                      className="bg-muted rounded mb-2 p-2 border border-border"
                                    >
                                      <div className="flex justify-between gap-2 mb-1 items-center">
                                        <div className="font-medium">
                                          {`${getCourseName(c)}`}
                                        </div>

                                        <CourseInfoDialog course={c} />
                                      </div>
                                      <p className="text-muted-foreground text-xs">
                                        Antal Tillfällen: {lessonCount}
                                      </p>
                                      <div className="mt-2">
                                        {p.schemaItems
                                          .filter((s) => s.courseId === c.id)
                                          .map((s) => (
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
                                                {`Period: ${(s.customStartDate ?? s.termin.startDate).toLocaleDateString("sv-SE")} - ${(s.customEndDate ?? s.termin.endDate).toLocaleDateString("sv-SE")}`}
                                              </div>
                                            </div>
                                          ))}
                                      </div>
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
                          disabled={p.spotsLeft === 0}
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

            {/* Pagination */}
            <div className="mt-8">
              <PaginationBar
                currentPage={currentPage}
                totalPages={totalPages}
              />
            </div>
          </>
        ) : (
          <div className="text-center py-12 border rounded-lg bg-muted/20 mt-4">
            <p className="text-muted-foreground">
              Inga produkter hittades med nuvarande filter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
