export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCheckoutAndRedirect } from "@/lib/actions/checkout";
import { getSessionData } from "@/lib/actions/sessiondata";
import { readCart } from "@/lib/cart";
import prisma from "@/lib/prisma";
import CartSummary from "./CartSummary";

export default async function Page() {
  const session = await getSessionData();
  const cart = await readCart();
  const hasItems = cart.items.length > 0;

  async function action(formData: FormData) {
    "use server";
    const session = await getSessionData();
    if (!session) throw new Error("Unauthorized");

    const postalcode = session.user.postalCode;
    const note = formData.get("note")?.toString();
    const currentCart = await readCart();
    if (!currentCart.items.length) throw new Error("Varukorgen är tom");
    const ids = currentCart.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, price: true },
    });
    const byId = new Map(
      products.map((p) => [p.id, parseFloat(String(p.price))]),
    );
    const items = currentCart.items.map((it) => ({
      productId: it.productId,
      count: it.qty,
      price: byId.get(it.productId) ?? 0,
    }));
    await createCheckoutAndRedirect({ items, postalcode, note });
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
          (session ? (
            <Card>
              <CardHeader>
                <CardTitle>Slutför köp</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={action} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="note">Notering till beställningen</Label>
                    <Textarea
                      id="note"
                      name="note"
                      rows={3}
                      placeholder="t.ex. Swish-referens eller speciella önskemål"
                      className="resize-none"
                    />
                  </div>

                  <div className="pt-4 border-t">
                    <Button
                      type="submit"
                      className="w-full bg-brand hover:bg-brand-light text-white font-medium"
                    >
                      Slutför beställning (Faktura)
                    </Button>
                    <p className="mt-4 text-center text-xs text-muted-foreground">
                      Genom att slutföra köpet godkänner du våra köpvillkor.
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
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
                        "/checkout",
                      )}`}
                    >
                      Logga in
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="flex-1">
                    <Link
                      href={`/signup?callbackUrl=${encodeURIComponent(
                        "/checkout",
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
