import { beforeAll, describe, expect, it } from "vitest";
import { createCheckout } from "@/lib/actions/checkout";
import { cancelOrder, getUserOrder } from "@/lib/actions/orders";
import prisma from "@/lib/prisma";
import {
  createCourse,
  createParticipant,
  createProduct,
  createUser,
} from "../helpers/factories";
import { as, invoiceOther } from "../helpers/orders";

type User = Awaited<ReturnType<typeof createUser>>;

let admin: User;
let teacher: User;

beforeAll(async () => {
  admin = await createUser({ role: "admin" });
  teacher = await createUser({ role: "teacher" });
});

async function product(
  opts: { price?: number; maxCustomer?: number; active?: boolean } = {},
) {
  const course = await createCourse({ teacher, future: 2 });
  const p = await createProduct({
    type: "COURSE",
    courses: [course],
    price: opts.price ?? 100_00,
  });
  if (opts.maxCustomer != null || opts.active === false) {
    return prisma.product.update({
      where: { id: p.id },
      data: {
        ...(opts.maxCustomer != null
          ? { maxCustomer: opts.maxCustomer, unlimitedCustomers: false }
          : {}),
        ...(opts.active === false ? { active: false } : {}),
      },
    });
  }
  return p;
}

async function pack(maxCourses: number) {
  const courses = [];
  for (let i = 0; i < 3; i++) {
    courses.push(await createCourse({ teacher, future: 2 }));
  }
  const p = await createProduct({
    type: "PACK",
    courses,
    maxCourses,
    lessonsIncluded: 2,
  });
  return { product: p, courses };
}

describe("createCheckout", () => {
  it("kräver inloggning, varor och fakturamottagare", async () => {
    const p = await product();
    await expect(
      as(null, () =>
        createCheckout({
          items: [{ productId: p.id, count: 1 }],
          invoice: invoiceOther(),
        }),
      ),
    ).rejects.toThrow("Unauthorized");

    const buyer = await createUser();
    await expect(
      as(buyer, () => createCheckout({ items: [], invoice: invoiceOther() })),
    ).rejects.toThrow("No items provided");

    await expect(
      as(buyer, () =>
        createCheckout({
          items: [{ productId: p.id, count: 1 }],
          invoice: invoiceOther({ invoiceEmail: "inte-en-adress" }),
        }),
      ),
    ).rejects.toThrow("Ogiltig e-postadress");

    await expect(
      as(buyer, () =>
        createCheckout({
          items: [{ productId: p.id, count: 1 }],
          invoice: invoiceOther({ adultConfirmed: false }),
        }),
      ),
    ).rejects.toThrow(/Bekräfta att hen är över 18 år/);

    expect(await prisma.order.count({ where: { userId: buyer.id } })).toBe(0);
  });

  it("totalpriset räknas i öre från serverns priser", async () => {
    const a = await product({ price: 1234_50 });
    const b = await product({ price: 99_90 });
    const buyer = await createUser();
    const child = await createParticipant(buyer);

    const res = await as(buyer, () =>
      createCheckout({
        items: [
          { productId: a.id, count: 1 },
          { productId: b.id, count: 1, participantId: child.id },
          { productId: b.id, count: 1 },
        ],
        invoice: invoiceOther(),
        // En klient som försöker skicka med ett eget pris har inget fält för det.
      }),
    );
    expect(res.status).toBe("AWAITING_APPROVAL");
    expect(res.successRedirect).toBe(
      `/checkout/success?orderId=${res.orderId}`,
    );

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: res.orderId },
      include: { orderItems: true },
    });
    expect(order.userId).toBe(buyer.id);
    expect(order.totalPrice).toBe(1234_50 + 99_90 + 99_90);
    expect(Number.isInteger(order.totalPrice)).toBe(true);
    expect(order.orderItems.map((i) => i.price).sort((x, y) => x - y)).toEqual([
      99_90, 99_90, 1234_50,
    ]);
    expect(order.invoiceName).toBe("Förälder Testsson");
    expect(order.invoiceAdultConfirmedAt).toBeInstanceOf(Date);

    // Fakturamottagaren sparas som förifyllning till nästa gång.
    const details = await prisma.userDetails.findUniqueOrThrow({
      where: { userId: buyer.id },
    });
    expect(details.invoiceEmail).toBe("faktura@test.local");
  });

  it("samma deltagare kan inte anmälas två gånger till samma produkt", async () => {
    const p = await product();
    const buyer = await createUser();
    await expect(
      as(buyer, () =>
        createCheckout({
          items: [
            { productId: p.id, count: 1 },
            { productId: p.id, count: 1 },
          ],
          invoice: invoiceOther(),
        }),
      ),
    ).rejects.toThrow(/Samma deltagare/);
  });

  it("okänd produkt ger ett begripligt fel", async () => {
    const buyer = await createUser();
    await expect(
      as(buyer, () =>
        createCheckout({
          items: [{ productId: "finns-inte", count: 1 }],
          invoice: invoiceOther(),
        }),
      ),
    ).rejects.toThrow("En produkt i varukorgen är inte längre tillgänglig.");
  });

  describe("paket med maxCourses", () => {
    it("nekar inget val, för många, dubbletter och främmande kurser", async () => {
      const { product: p, courses } = await pack(2);
      const stranger = await createCourse({ teacher, future: 1 });
      const buyer = await createUser();
      const attempt = (selectedCourseIds?: string[]) =>
        as(buyer, () =>
          createCheckout({
            items: [{ productId: p.id, count: 1, selectedCourseIds }],
            invoice: invoiceOther(),
          }),
        );

      await expect(attempt(undefined)).rejects.toThrow(
        /minst 1 kurs och max 2/,
      );
      await expect(attempt([])).rejects.toThrow(/minst 1 kurs och max 2/);
      await expect(attempt(courses.map((c) => c.id))).rejects.toThrow(
        /minst 1 kurs och max 2/,
      );
      await expect(attempt([courses[0].id, courses[0].id])).rejects.toThrow(
        /samma kurs flera gånger/,
      );
      await expect(attempt([courses[0].id, stranger.id])).rejects.toThrow(
        /tillhör inte produkten/,
      );
      expect(await prisma.order.count({ where: { userId: buyer.id } })).toBe(0);
    });

    it("sparar ett giltigt val på orderraden", async () => {
      const { product: p, courses } = await pack(2);
      const buyer = await createUser();
      const res = await as(buyer, () =>
        createCheckout({
          items: [
            {
              productId: p.id,
              count: 1,
              selectedCourseIds: [courses[0].id, courses[2].id],
            },
          ],
          invoice: invoiceOther(),
        }),
      );
      const selections = await prisma.orderItemCourseSelection.findMany({
        where: { orderItem: { orderId: res.orderId } },
      });
      expect(selections.map((s) => s.courseId).sort()).toEqual(
        [courses[0].id, courses[2].id].sort(),
      );
    });
  });

  describe("platser", () => {
    it("en produkt med en plats kan inte säljas två gånger, men en avbruten order släpper platsen", async () => {
      const p = await product({ maxCustomer: 1 });
      const first = await createUser();
      const second = await createUser();

      const res = await as(first, () =>
        createCheckout({
          items: [{ productId: p.id, count: 1 }],
          invoice: invoiceOther(),
        }),
      );
      await expect(
        as(second, () =>
          createCheckout({
            items: [{ productId: p.id, count: 1 }],
            invoice: invoiceOther(),
          }),
        ),
      ).rejects.toThrow(/inte tillräckligt med platser/);

      await as(admin, () => cancelOrder(res.orderId));

      const again = await as(second, () =>
        createCheckout({
          items: [{ productId: p.id, count: 1 }],
          invoice: invoiceOther(),
        }),
      );
      expect(again.orderId).toBeTruthy();
    });

    it("två kunder samtidigt om sista platsen: bara en order skapas", async () => {
      const p = await product({ maxCustomer: 1 });
      const buyers = [await createUser(), await createUser()];
      await Promise.allSettled(
        buyers.map((b) =>
          as(b, () =>
            createCheckout({
              items: [{ productId: p.id, count: 1 }],
              invoice: invoiceOther(),
            }),
          ),
        ),
      );
      expect(
        await prisma.orderItem.count({
          where: { productId: p.id, order: { status: { not: "CANCELLED" } } },
        }),
      ).toBe(1);
    });
  });

  it("antalet måste vara ett positivt heltal (annars blir totalpriset negativt)", async () => {
    const p = await product({ price: 500_00 });
    const buyer = await createUser();
    // En i taget: kassan kör Serializable, och parallella anrop kan nekas
    // av serialiseringsfel i stället för av valideringen.
    const outcome: Record<string, string> = {};
    for (const count of [-1, 0, 1.5]) {
      try {
        await as(buyer, () =>
          createCheckout({
            items: [{ productId: p.id, count }],
            invoice: invoiceOther(),
          }),
        );
        outcome[count] = "skapad";
      } catch {
        outcome[count] = "nekad";
      }
    }
    expect(outcome).toEqual({ "-1": "nekad", "0": "nekad", "1.5": "nekad" });
    const orders = await prisma.order.findMany({ where: { userId: buyer.id } });
    expect(orders.filter((o) => o.totalPrice <= 0)).toEqual([]);
  });

  it("en inaktiv produkt kan inte beställas", async () => {
    // addToCart och getAllProducts släpper inte igenom inaktiva produkter;
    // kassan ska inte heller göra det, server actions går att anropa direkt.
    const p = await product({ active: false });
    const buyer = await createUser();
    await expect(
      as(buyer, () =>
        createCheckout({
          items: [{ productId: p.id, count: 1 }],
          invoice: invoiceOther(),
        }),
      ),
    ).rejects.toThrow();
    expect(await prisma.order.count({ where: { userId: buyer.id } })).toBe(0);
  });

  it("en kund kan inte beställa åt någon annans deltagare (och därmed läsa ut hens uppgifter)", async () => {
    const p = await product();
    const victim = await createUser();
    const victimChild = await prisma.participant.create({
      data: {
        name: "Annans Barn",
        email: "annans.barn@test.local",
        phone: "0701234567",
        dateOfBirth: new Date("2015-05-05"),
        addedByUserId: victim.id,
      },
    });
    const attacker = await createUser();

    let orderId: string | null = null;
    try {
      const res = await as(attacker, () =>
        createCheckout({
          items: [{ productId: p.id, count: 1, participantId: victimChild.id }],
          invoice: invoiceOther(),
        }),
      );
      orderId = res.orderId;
    } catch {}

    if (orderId) {
      const id = orderId;
      // Om ordern ändå skapats: visa vad angriparen får tillbaka.
      const leaked = await as(attacker, () => getUserOrder(id));
      expect(leaked.orderItems[0].participant?.email).not.toBe(
        "annans.barn@test.local",
      );
    }
    expect(orderId).toBeNull();
  });
});
