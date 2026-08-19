export const dynamic = "force-dynamic";
export const revalidate = 0;

import { SearchIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getMyParticipants } from "@/lib/actions/participants";
import { getSessionData } from "@/lib/actions/sessiondata";
import { readCart } from "@/lib/cart";
import { formatDateToInputStr } from "@/lib/date-utils";
import { pick } from "@/lib/i18n/pick";
import prisma from "@/lib/prisma";
import { getDictionary } from "@/locales/get-dictionary";
import CartSummary from "./CartSummary";
import CheckoutForm from "./CheckoutForm";

export const metadata: Metadata = {
  title: "Varukorg & Köp",
  description: "Granska din beställning och slutför köpet.",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const { lang, t } = await getDictionary();
  const session = await getSessionData();
  const cart = await readCart();
  const hasItems = cart.items.length > 0;

  let checkoutData = null;

  if (hasItems && session) {
    const ids = cart.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: ids }, active: true },
      include: {
        courses: {
          include: { course: true },
        },
      },
    });

    const byId = new Map(products.map((p) => [p.id, p]));

    const items = cart.items.flatMap((it) => {
      const p = byId.get(it.productId);

      if (!p) {
        return [];
      }

      return [
        {
          product: p,
          productId: it.productId,
          name: pick(p, "name", lang) as string,
          qty: it.qty,
          price: p.price,
          // Courses available for SelectPack (only relevant when maxCourses is set)
          courses: p.courses.map((c) => c.course),
        },
      ];
    });

    const userDetails = await prisma.userDetails.findUnique({
      where: { userId: session.user.id },
    });

    const existingParticipants = await getMyParticipants();

    checkoutData = {
      items,
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      },
      userDetails,
      existingParticipants: existingParticipants.map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        dateOfBirth: p.dateOfBirth ? formatDateToInputStr(p.dateOfBirth) : null,
        allowPhotoVideo: p.allowPhotoVideo,
        userId: p.userId,
      })),
    };
  }

  return (
    <div className="bg-background">
      <section className="border-b border-border py-8 text-center">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-3xl md:text-4xl font-light text-foreground leading-[1.1] tracking-tight mb-2 animate-fade-in-left [animation-delay:200ms]">
            {t.checkout.title}
          </h1>
          <p className="text-muted-foreground">
            {hasItems ? t.checkout.subtitleHasItems : t.checkout.subtitleEmpty}
          </p>
        </div>
      </section>

      <section className="py-8">
        <div className="max-w-2xl mx-auto px-4 space-y-6">
          {/* Cart Summary - Always visible */}
          <Card>
            <CardHeader>
              <CardTitle>{t.checkout.yourProducts}</CardTitle>
            </CardHeader>
            <CardContent>
              <CartSummary />
            </CardContent>
            <CardFooter className="pt-4 justify-center">
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto gap-2 shadow-sm transition-all hover:shadow-md"
              >
                <Link href="/courses">
                  <SearchIcon className="h-4 w-4" />
                  <span>{t.checkout.searchCourses}</span>
                </Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Checkout Form - Only if has items */}
          {hasItems &&
            (checkoutData ? (
              <CheckoutForm {...checkoutData} />
            ) : (
              <Card>
                <CardHeader className="text-center">
                  <CardTitle>{t.checkout.loginRequiredTitle}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground text-center text-sm">
                    {t.checkout.loginRequiredBody}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      asChild
                      className="flex-1 bg-brand hover:bg-brand-light text-white"
                    >
                      <Link
                        href={`/signin?callbackUrl=${encodeURIComponent(
                          "/checkout",
                        )}`}
                      >
                        {t.checkout.signIn}
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="flex-1">
                      <Link
                        href={`/signup?callbackUrl=${encodeURIComponent(
                          "/checkout",
                        )}`}
                      >
                        {t.checkout.signUp}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      </section>
    </div>
  );
}
