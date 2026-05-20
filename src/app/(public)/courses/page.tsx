import {
  Book,
  CalendarDays,
  Clock,
  InfinityIcon,
  Info,
  MapPin,
  ShoppingBag,
  Sparkles,
  Sparkles as SparklesIcon,
  Star,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { PaginationBar } from "@/components/PaginationBar";
import JsonLd from "@/components/seo/JsonLd";
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Prisma } from "@/generated/prisma/client";
import { addToCart } from "@/lib/actions/cart";
import { getProductStats } from "@/lib/actions/purchase-actions";
import { getStyles } from "@/lib/actions/style-actions";
import { formatDateToInputStr } from "@/lib/date-utils";
import { pick } from "@/lib/i18n/pick";
import { formatPrice } from "@/lib/money";
import prisma from "@/lib/prisma";
import { dbToFormTime } from "@/lib/time-convert";
import { getCourseName, getVeckodag } from "@/lib/tools";
import { getDictionary } from "@/locales/get-dictionary";
import { CourseInfoDialog } from "./components/CourseInfoDialog";
import { CoursesFilter } from "./components/CoursesFilter";
import { StudioInfoDialog } from "./components/StudioInfoDialog";
import { StyleInfoDialog } from "./components/StyleInfoDialog";

const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";

interface Props {
  searchParams: Promise<{
    page?: string;
    q?: string;
    adult?: string;
    style?: string;
    type?: string;
    sort?: string;
  }>;
}

export const metadata: Metadata = {
  title: "Våra kurser",
  description:
    "Bläddra och boka MotionZone Växjös danskurser för barn, ungdomar och vuxna.",
  alternates: {
    canonical: `${SITE_URL}/courses`,
    languages: {
      sv: `${SITE_URL}/courses`,
      en: `${SITE_URL}/courses`,
      "x-default": `${SITE_URL}/courses`,
    },
  },
  openGraph: {
    type: "website",
    title: "Våra kurser — Motion Zone Växjö",
    description:
      "Bläddra och boka danskurser, klippkort och paket hos Motion Zone Växjö.",
    url: `${SITE_URL}/courses`,
    siteName: "MotionZone Växjö",
    locale: "sv_SE",
    alternateLocale: ["en_US"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Våra kurser — Motion Zone Växjö",
    description:
      "Bläddra och boka danskurser, klippkort och paket hos Motion Zone Växjö.",
  },
};

export default async function Page({ searchParams }: Props) {
  const sp = await searchParams;
  const { lang, t } = await getDictionary();
  const _dateLocale = lang === "en" ? "en-GB" : "sv-SE";
  const publicStyles = (await getStyles(lang)).filter((style) => style.active);

  const linkedCourseFilter: Prisma.CourseWhereInput = {
    ...(sp.adult
      ? {
          adult: sp.adult === "true",
        }
      : {}),
    ...(sp.style
      ? {
          styleId: sp.style,
        }
      : {}),
  };

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
    ...(Object.keys(linkedCourseFilter).length > 0
      ? {
          courses: {
            some: {
              course: linkedCourseFilter,
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
                  studio: true,
                },
              },
              teacher: {
                include: {
                  teacherProfile: true,
                },
              },
              style: true,
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

  // Collect unique course names for JSON-LD
  const seenCourseIds = new Set<string>();
  const courseListItems: Array<{ name: string; id: string }> = [];
  for (const product of productsWithData) {
    for (const pc of product.courses) {
      const course = pc.course;
      if (seenCourseIds.has(course.id)) continue;
      seenCourseIds.add(course.id);
      courseListItems.push({
        id: course.id,
        name: getCourseName(course, lang),
      });
    }
  }

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Hem", item: `${SITE_URL}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Kurser",
        item: `${SITE_URL}/courses`,
      },
    ],
  };

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Danskurser hos Motion Zone Växjö",
    itemListElement: courseListItems.map((c, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      item: {
        "@type": "Course",
        name: c.name,
        provider: {
          "@type": "Organization",
          name: "Motion Zone Växjö",
          sameAs: SITE_URL,
        },
      },
    })),
  };

  return (
    <div className="bg-background">
      <JsonLd data={[breadcrumbLd, itemListLd]} />

      <section className="border-b border-border py-8 text-center">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-3xl md:text-4xl font-light text-foreground leading-[1.1] tracking-tight mb-2 animate-fade-in-left [animation-delay:200ms]">
            {t.coursesPage.titleLine1}
            <span className="font-serif italic text-brand-light">
              {" "}
              {t.coursesPage.titleAccent}
            </span>
          </h1>
          <p className="text-muted-foreground mb-4">{t.coursesPage.intro}</p>
          <CoursesFilter styles={publicStyles} />
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 md:px-8 py-6 md:py-8">
        <div className="flex items-center gap-2 mb-4">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{ backgroundColor: "#8f5ccf26" }}
          >
            <ShoppingBag className="w-4 h-4" style={{ color: "#8f5ccf" }} />
          </div>
          <p className="font-bold text-foreground">
            {t.coursesPage.ourProducts}
          </p>
        </div>

        {totalProducts > 0 ? (
          <>
            {/* Results count */}
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
              <span>
                {t.coursesPage.showingRange
                  .replace("{{from}}", String(skip + 1))
                  .replace(
                    "{{to}}",
                    String(Math.min(skip + ITEMS_PER_PAGE, totalProducts)),
                  )
                  .replace("{{total}}", String(totalProducts))}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {productsWithData.map((p) => {
                const productCourses = p.courses;

                return (
                  <Card
                    key={p.id}
                    className="py-0 pb-4 gap-0 group flex flex-col h-full rounded-2xl border border-border/50 overflow-hidden hover:border-brand/40 hover:shadow-xl hover:shadow-brand/10 hover:-translate-y-1 transition-all duration-300 [backface-hidden-true]"
                  >
                    {/* Image header with overlay */}
                    <div className="relative h-48 overflow-hidden shrink-0">
                      {p.imageURL ? (
                        <Image
                          src={p.imageURL}
                          alt={pick(p, "name", lang) as string}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-linear-to-br from-brand/20 via-brand-secondary/10 to-brand/5" />
                      )}
                      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
                      {/* Price */}
                      <div className="absolute bottom-3 left-4">
                        <span className="text-white text-2xl font-bold drop-shadow-sm">
                          {formatPrice(p.price, lang)}
                        </span>
                      </div>
                      {/* Spots badge */}
                      <div className="absolute top-3 right-3">
                        {typeof p.spotsLeft === "number" &&
                        Number.isFinite(p.spotsLeft) ? (
                          <Badge
                            variant={
                              p.spotsLeft <= 4 ? "destructive" : "outline"
                            }
                            className={
                              p.spotsLeft <= 4
                                ? "text-white backdrop-blur-sm"
                                : "backdrop-blur-sm bg-black/40 text-green-400 border-green-500/50"
                            }
                          >
                            {t.coursesPage.spotsLeft.replace(
                              "{{count}}",
                              String(p.spotsLeft),
                            )}
                          </Badge>
                        ) : p.spotsLeft === Infinity ? (
                          <Badge
                            variant="outline"
                            className="backdrop-blur-sm bg-black/40 border-green-500/50"
                          >
                            <InfinityIcon className="text-green-400 w-4 h-4" />
                          </Badge>
                        ) : (
                          <Badge variant={"destructive"}>
                            <Info /> {t.coursesPage.spotsUncertain}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <CardHeader className="pb-2 pt-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge
                          variant="secondary"
                          className="text-xs font-medium"
                        >
                          {t.coursesPage.productTypeLabel.replace(
                            "{{type}}",
                            p.type === "CLIP"
                              ? t.coursesPage.productTypeClip
                              : t.coursesPage.productTypeCourse,
                          )}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl leading-tight font-semibold">
                        {pick(p, "name", lang) as string}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="flex-1 space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <CalendarDays className="w-3 h-3" />
                          {t.coursesPage.validDuring}
                        </div>
                        {p.terminer.map((termin) => (
                          <div
                            key={termin.id}
                            className="text-sm bg-muted/60 px-3 py-1.5 rounded-lg border border-border/60"
                          >
                            <p className="font-medium">
                              {pick(termin, "name", lang) as string}
                            </p>
                          </div>
                        ))}
                      </div>

                      <Accordion type="single" collapsible>
                        <AccordionItem value="description">
                          <AccordionTrigger className="text-sm hover:text-brand">
                            {t.coursesPage.aboutProduct}
                          </AccordionTrigger>
                          <AccordionContent className="whitespace-pre-line">
                            {(() => {
                              const desc = pick(
                                p,
                                "description",
                                lang,
                              ) as string;
                              return desc ? ` – ${desc}` : "";
                            })()}
                          </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-1">
                          <AccordionTrigger className="text-sm hover:text-brand">
                            {t.coursesPage.contentSchedule}
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-3 text-sm">
                              <div>
                                <span className="font-medium text-sm flex items-center gap-1 mb-2">
                                  <Book className="w-3 h-3" />{" "}
                                  {t.coursesPage.coursesIncluded}
                                </span>
                                {productCourses.map((pc) => {
                                  const c = pc.course;

                                  const lessonCount =
                                    p.type === "CLIP"
                                      ? t.coursesPage.lessonCountClip.replace(
                                          "{{count}}",
                                          String(p.totalCount ?? 0),
                                        )
                                      : pc.unlimited
                                        ? t.coursesPage.lessonCountUnlimited
                                        : String(pc.lessonsIncluded);

                                  return (
                                    <div
                                      key={c.id}
                                      className="bg-muted rounded-lg mb-2 p-2 border border-border"
                                    >
                                      <div className="flex justify-between gap-2 mb-1 items-center">
                                        <div className="font-medium">
                                          {`${getCourseName(c, lang)}`}
                                        </div>

                                        <CourseInfoDialog course={c} />
                                      </div>
                                      <p className="text-muted-foreground text-xs">
                                        {t.coursesPage.lessonCountLabel.replace(
                                          "{{count}}",
                                          lessonCount,
                                        )}
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
                                                {
                                                  pick(
                                                    s.termin,
                                                    "name",
                                                    lang,
                                                  ) as string
                                                }
                                              </p>
                                              <p className="flex items-center text-muted-foreground">
                                                {getVeckodag(s.weekday, lang)}{" "}
                                                <Clock className="inline w-3 h-3 mx-1" />
                                                {dbToFormTime(s.timeStart)} -{" "}
                                                {dbToFormTime(s.timeEnd)}
                                              </p>
                                              {s.studio && (
                                                <div className="text-brand flex items-center gap-1 mt-1">
                                                  <MapPin className="w-3 h-3 shrink-0" />
                                                  <span className="text-xs font-medium">
                                                    {
                                                      pick(
                                                        s.studio,
                                                        "name",
                                                        lang,
                                                      ) as string
                                                    }
                                                  </span>
                                                  <br />
                                                  <StudioInfoDialog
                                                    studio={s.studio}
                                                  />
                                                  <br />
                                                  <br />
                                                </div>
                                              )}
                                              {c.style && (
                                                <div className="text-brand flex items-center gap-1 mt-1">
                                                  <SparklesIcon className="w-3 h-3 shrink-0" />
                                                  <span className="text-xs font-medium">
                                                    {
                                                      pick(
                                                        c.style,
                                                        "name",
                                                        lang,
                                                      ) as string
                                                    }
                                                  </span>
                                                  <br />
                                                  <StyleInfoDialog
                                                    style={c.style}
                                                  />
                                                  <br />
                                                </div>
                                              )}
                                              <div className="mt-2">
                                                {t.coursesPage.period
                                                  .replace(
                                                    "{{from}}",
                                                    formatDateToInputStr(
                                                      s.customStartDate ??
                                                        s.termin.startDate,
                                                    ),
                                                  )
                                                  .replace(
                                                    "{{to}}",
                                                    formatDateToInputStr(
                                                      s.customEndDate ??
                                                        s.termin.endDate,
                                                    ),
                                                  )}
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
                          className="w-full bg-brand hover:bg-brand-light text-white font-medium transition-colors duration-200"
                        >
                          {t.coursesPage.buyNow}
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
          <div className="mt-4 rounded-2xl border border-dashed border-border bg-muted/20 py-16 px-6 flex flex-col items-center justify-center text-center">
            <div className="relative mb-6 flex items-center justify-center">
              <div
                className="absolute w-24 h-24 rounded-full blur-2xl opacity-25"
                style={{ backgroundColor: "#8f5ccf" }}
              />
              <Sparkles
                className="absolute -top-4 -right-4 w-5 h-5 opacity-80"
                style={{ color: "#e8a04d" }}
              />
              <Star
                className="absolute -bottom-2 -left-5 w-4 h-4 opacity-70"
                style={{ color: "#e87ea1" }}
              />
              <Star
                className="absolute top-0 -left-4 w-3 h-3 opacity-60"
                style={{ color: "#8f5ccf" }}
              />
              <ShoppingBag
                className="relative w-16 h-16"
                style={{ color: "#8f5ccf" }}
              />
            </div>
            <p className="font-bold text-foreground text-lg mb-1">
              {t.coursesPage.noProducts}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
