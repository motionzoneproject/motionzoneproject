export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMyParticipants } from "@/lib/actions/participants";
import { getSessionData } from "@/lib/actions/sessiondata";
import { readCart } from "@/lib/cart";
import prisma from "@/lib/prisma";
import CartSummary from "./CartSummary";
import CheckoutForm from "./CheckoutForm";

export default async function Page() {
  const session = await getSessionData();
  const cart = await readCart();
  const hasItems = cart.items.length > 0;

  let checkoutData = null;

  if (hasItems && session) {
    const ids = cart.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, price: true },
    });

    const byId = new Map(products.map((p) => [p.id, p]));

    const items = cart.items.map((it) => {
      const p = byId.get(it.productId);
      return {
        productId: it.productId,
        name: p?.name ?? "Okänd",
        qty: it.qty,
        price: p ? parseFloat(String(p.price)) : 0,
      };
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
      existingParticipants,
    };
  }

  return (
    <main className="flex-1 bg-background py-12">
      <div className="max-w-2xl mx-auto px-4 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Varukorg</h1>
          <p className="text-muted-foreground mt-1">
            {hasItems ? "Granska din beställning" : "Din varukorg är tom"}
          </p>
        </div>

        {/* Cart Summary - Always visible */}
        <Card>
          <CardHeader>
            <CardTitle>Dina produkter</CardTitle>
          </CardHeader>
          <CardContent>
            <CartSummary />
          </CardContent>
        </Card>

        {/* Checkout Form - Only if has items */}
        {hasItems &&
          (checkoutData ? (
            <CheckoutForm {...checkoutData} />
          ) : (
            <Card>
              <CardHeader className="text-center">
                <CardTitle>Logga in för att slutföra köpet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-center text-sm">
                  Du måste vara inloggad för att slutföra ett köp.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    asChild
                    className="flex-1 bg-brand hover:bg-brand-light text-white"
                  >
                    <Link
                      href={`/signin?callbackUrl=${encodeURIComponent(
                        "/checkout"
                      )}`}
                    >
                      Logga in
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="flex-1">
                    <Link
                      href={`/signup?callbackUrl=${encodeURIComponent(
                        "/checkout"
                      )}`}
                    >
                      Skapa konto
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </main>
  );
}
