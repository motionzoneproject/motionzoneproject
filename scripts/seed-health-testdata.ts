/**
 * Lägger in testdata som återskapar de fel felsökningen letar efter, så
 * åtgärdsdialogerna går att prova utan att röra riktiga kunder.
 *
 *   npm run seed:health          # lägg in
 *   npm run seed:health -- --clean   # ta bort allt igen
 *
 * Allt får id:n som börjar med "zztest-" och namn som börjar med "[TEST]", så
 * det är trivialt att känna igen och städa bort.
 *
 * VÄGRAR köra mot något annat än localhost. Skriptet skapar ordrar, köp och
 * bokningar — det ska aldrig kunna hamna i produktionsdatan.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const url = process.env.DATABASE_URL ?? "";

function assertLocalDatabase() {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    console.error("FEL: DATABASE_URL saknas eller går inte att tolka.");
    process.exit(1);
  }

  if (host !== "localhost" && host !== "127.0.0.1" && host !== "::1") {
    console.error(
      `FEL: DATABASE_URL pekar på "${host}", inte localhost.\n` +
        "Det här skriptet skapar ordrar, köp och bokningar och får bara köras\n" +
        "mot en lokal utvecklingsdatabas.",
    );
    process.exit(1);
  }
}

assertLocalDatabase();

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});

const P = "zztest-";
const id = (name: string) => `${P}${name}`;

const days = (n: number) => n * 24 * 60 * 60 * 1000;
const from = (offsetDays: number) => new Date(Date.now() + days(offsetDays));

/** Ordningen är omvänd beroendeordning, så FK:er inte blockerar. */
async function clean() {
  await prisma.booking.deleteMany({ where: { id: { startsWith: P } } });
  await prisma.purchaseItem.deleteMany({ where: { id: { startsWith: P } } });
  await prisma.purchase.deleteMany({ where: { id: { startsWith: P } } });
  await prisma.orderItem.deleteMany({ where: { id: { startsWith: P } } });
  await prisma.orderStatusEvent.deleteMany({
    where: { id: { startsWith: P } },
  });
  await prisma.order.deleteMany({ where: { id: { startsWith: P } } });
  await prisma.lesson.deleteMany({ where: { id: { startsWith: P } } });
  await prisma.schemaItem.deleteMany({ where: { id: { startsWith: P } } });
  await prisma.productOnCourse.deleteMany({
    where: { productId: { startsWith: P } },
  });
  await prisma.product.deleteMany({ where: { id: { startsWith: P } } });
  await prisma.course.deleteMany({ where: { id: { startsWith: P } } });
  await prisma.termin.deleteMany({ where: { id: { startsWith: P } } });
  await prisma.participant.deleteMany({ where: { id: { startsWith: P } } });
  await prisma.teacherProfile.deleteMany({ where: { id: { startsWith: P } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: P } } });
}

async function seed() {
  // --- Användare ---------------------------------------------------------
  // Läraren har rollen "user" trots att hon undervisar: det är fallet
  // "lärare utan lärarbehörighet", som åtgärdsdialogen kan laga.
  await prisma.user.createMany({
    data: [
      {
        id: id("parent"),
        name: "[TEST] Elin Förälder",
        email: "zztest-parent@example.invalid",
        role: "user",
      },
      {
        id: id("teacher"),
        name: "[TEST] Lina Lärare",
        email: "zztest-teacher@example.invalid",
        role: "user",
      },
      {
        id: id("student"),
        name: "[TEST] Sara Elev",
        email: "zztest-student@example.invalid",
        role: "user",
      },
    ],
  });

  // --- Dubblettdeltagare -------------------------------------------------
  // Fyra kopior av samma barn, med skiftande skiftläge och blanksteg precis
  // som i produktionsdatan. Bara den första får kopplingar, så det syns i
  // dialogen vilken som bär datan.
  await prisma.participant.createMany({
    data: [
      {
        id: id("part-1"),
        name: "[TEST] Esther Persson",
        email: "zztest-esther@example.invalid",
        addedByUserId: id("parent"),
        allowPhotoVideo: true,
        dateOfBirth: new Date("2012-04-18"),
      },
      {
        id: id("part-2"),
        name: " [test] esther persson ",
        addedByUserId: id("parent"),
        allowPhotoVideo: false,
      },
      {
        id: id("part-3"),
        name: "[TEST] ESTHER PERSSON",
        email: "zztest-esther-alt@example.invalid",
        addedByUserId: id("parent"),
        allowPhotoVideo: false,
      },
      {
        id: id("part-4"),
        name: "[TEST] Esther Persson",
        phone: "070-1234567",
        addedByUserId: id("parent"),
        allowPhotoVideo: false,
      },
    ],
  });

  // --- Termin som gått ut men fortfarande är aktiv ------------------------
  await prisma.termin.create({
    data: {
      id: id("termin"),
      name: "[TEST] Utgången termin",
      startDate: from(-120),
      endDate: from(-10),
      active: true,
    },
  });

  // --- Kurser ------------------------------------------------------------
  await prisma.course.createMany({
    data: [
      {
        id: id("course-a"),
        name: "[TEST] Balett",
        description: "Testkurs A",
        teacherId: id("teacher"),
        active: true,
      },
      {
        id: id("course-b"),
        name: "[TEST] Jazz",
        description: "Testkurs B",
        teacherId: id("teacher"),
        active: true,
      },
      // Utan schemapost och utan produkt: två egna kontroller.
      {
        id: id("course-orphan"),
        name: "[TEST] Kurs utan schema och produkt",
        description: "Testkurs C",
        teacherId: id("teacher"),
        active: true,
      },
    ],
  });

  // --- Produkter ---------------------------------------------------------
  await prisma.product.createMany({
    data: [
      // Går att köpa men ger ingenting — huvudfallet från produktionsdatan.
      {
        id: id("prod-courseless"),
        name: "[TEST] Dansprogram utan kurser",
        description: "Produkt helt utan kopplade kurser",
        price: 560000,
        maxCustomer: 20,
        active: true,
      },
      // maxCustomer 0 utan unlimited: alltid slutsåld.
      {
        id: id("prod-nocapacity"),
        name: "[TEST] Produkt utan platser",
        description: "maxCustomer 0 och inte obegränsad",
        price: 45000,
        maxCustomer: 0,
        unlimitedCustomers: false,
        active: true,
      },
      // Aktiv men passerat sista datum.
      {
        id: id("prod-expired"),
        name: "[TEST] Utgången produkt",
        description: "expireFixedDate har passerat",
        price: 30000,
        maxCustomer: 10,
        expireFixedDate: from(-5),
        active: true,
      },
      // Fungerande produkt, används för köp och bokningar nedan.
      {
        id: id("prod-ok"),
        name: "[TEST] Fungerande kursprodukt",
        description: "Kopplad till en kurs",
        price: 120000,
        maxCustomer: 30,
        active: true,
      },
    ],
  });

  // Alla utom "prod-courseless" får en kurs, så varje produkt bara utlöser
  // den kontroll den är till för. Annars skulle produkten utan platser och
  // den utgångna också dyka upp som "utan kurser" och göra demot grumligt.
  await prisma.productOnCourse.createMany({
    data: [
      {
        productId: id("prod-ok"),
        courseId: id("course-a"),
        lessonsIncluded: 10,
      },
      {
        productId: id("prod-nocapacity"),
        courseId: id("course-a"),
        lessonsIncluded: 5,
      },
      {
        productId: id("prod-expired"),
        courseId: id("course-b"),
        lessonsIncluded: 5,
      },
    ],
  });

  // --- Schema och lektioner ----------------------------------------------
  await prisma.schemaItem.createMany({
    data: [
      {
        id: id("schema-a"),
        weekday: "MONDAY",
        timeStart: new Date("1970-01-01T17:00:00Z"),
        timeEnd: new Date("1970-01-01T18:00:00Z"),
        terminId: id("termin"),
        courseId: id("course-a"),
        // Ingen studioId: kontrollen "schemapost saknar sal".
      },
      {
        id: id("schema-b"),
        weekday: "TUESDAY",
        timeStart: new Date("1970-01-01T18:00:00Z"),
        timeEnd: new Date("1970-01-01T19:00:00Z"),
        terminId: id("termin"),
        courseId: id("course-b"),
      },
    ],
  });

  await prisma.lesson.createMany({
    data: [
      // Inställd lektion som fortfarande har en bokning kvar.
      {
        id: id("lesson-cancelled"),
        startTime: from(3),
        endTime: from(3),
        courseId: id("course-a"),
        teacherId: id("teacher"),
        schemaItemId: id("schema-a"),
        terminId: id("termin"),
        cancelled: true,
        message: "[TEST] Inställd",
      },
      // Normal lektion, används för dubbelbokning.
      {
        id: id("lesson-normal"),
        startTime: from(5),
        endTime: from(5),
        courseId: id("course-a"),
        teacherId: id("teacher"),
        schemaItemId: id("schema-a"),
        terminId: id("termin"),
      },
      // Lektion i kurs B, används för kursmissmatch.
      {
        id: id("lesson-other-course"),
        startTime: from(6),
        endTime: from(6),
        courseId: id("course-b"),
        teacherId: id("teacher"),
        schemaItemId: id("schema-b"),
        terminId: id("termin"),
      },
      // Utan termin.
      {
        id: id("lesson-no-termin"),
        startTime: from(7),
        endTime: from(7),
        courseId: id("course-a"),
        teacherId: id("teacher"),
        schemaItemId: id("schema-a"),
        terminId: null,
      },
    ],
  });

  // --- Ordrar och köp ----------------------------------------------------
  // 1. Order på produkten utan kurser, godkänd, köp utan purchaseItems:
  //    kunden har betalat och fått noll tillgång.
  await prisma.order.create({
    data: {
      id: id("order-courseless"),
      userId: id("parent"),
      totalPrice: 560000,
      status: "APPROVED",
      isPaid: false,
    },
  });
  await prisma.orderItem.create({
    data: {
      id: id("oi-courseless"),
      orderId: id("order-courseless"),
      productId: id("prod-courseless"),
      count: 1,
      price: 560000,
      participantId: id("part-1"),
    },
  });
  await prisma.purchase.create({
    data: {
      id: id("purchase-empty"),
      userId: id("parent"),
      productId: id("prod-courseless"),
      orderId: id("order-courseless"),
      participantId: id("part-1"),
    },
  });

  // 2. Godkänd order helt utan köp — createPurchaseFromOrder hann aldrig köra.
  await prisma.order.create({
    data: {
      id: id("order-nopurchase"),
      userId: id("student"),
      totalPrice: 120000,
      status: "APPROVED",
      isPaid: true,
      paidAt: from(-20),
    },
  });
  await prisma.orderItem.create({
    data: {
      id: id("oi-nopurchase"),
      orderId: id("order-nopurchase"),
      productId: id("prod-ok"),
      count: 1,
      price: 120000,
    },
  });

  // 3. Order som väntat länge på godkännande.
  await prisma.order.create({
    data: {
      id: id("order-stale"),
      userId: id("student"),
      totalPrice: 45000,
      status: "AWAITING_APPROVAL",
      createdAt: from(-40),
    },
  });
  await prisma.orderItem.create({
    data: {
      id: id("oi-stale"),
      orderId: id("order-stale"),
      productId: id("prod-ok"),
      count: 1,
      price: 45000,
    },
  });

  // 4. Fungerande köp — grunden för bokningsfelen och negativt saldo.
  await prisma.order.create({
    data: {
      id: id("order-ok"),
      userId: id("student"),
      totalPrice: 120000,
      status: "APPROVED",
      isPaid: true,
    },
  });
  await prisma.orderItem.create({
    data: {
      id: id("oi-ok"),
      orderId: id("order-ok"),
      productId: id("prod-ok"),
      count: 1,
      price: 120000,
    },
  });
  await prisma.purchase.create({
    data: {
      id: id("purchase-ok"),
      userId: id("student"),
      productId: id("prod-ok"),
      orderId: id("order-ok"),
    },
  });
  await prisma.purchaseItem.createMany({
    data: [
      {
        id: id("pi-ok"),
        purchaseId: id("purchase-ok"),
        orderItemId: id("oi-ok"),
        courseId: id("course-a"),
        lessonsIncluded: 10,
        remainingCount: 8,
      },
      // Negativt saldo: fler tillfällen dragna än som fanns.
      {
        id: id("pi-negative"),
        purchaseId: id("purchase-ok"),
        orderItemId: id("oi-ok"),
        courseId: id("course-b"),
        lessonsIncluded: 5,
        remainingCount: -2,
      },
    ],
  });

  // --- Bokningar ---------------------------------------------------------
  await prisma.booking.createMany({
    data: [
      // Kvar på en inställd lektion: eleven har blivit av med ett klipp.
      {
        id: id("booking-cancelled-lesson"),
        lessonId: id("lesson-cancelled"),
        purchaseItemId: id("pi-ok"),
        userId: id("student"),
        cancelled: false,
      },
      // Samma purchaseItem bokat två gånger på samma lektion.
      {
        id: id("booking-dup-1"),
        lessonId: id("lesson-normal"),
        purchaseItemId: id("pi-ok"),
        userId: id("student"),
        cancelled: false,
      },
      {
        id: id("booking-dup-2"),
        lessonId: id("lesson-normal"),
        purchaseItemId: id("pi-ok"),
        userId: id("student"),
        cancelled: false,
      },
      // Bokad på kurs B med ett klipp som gäller kurs A.
      {
        id: id("booking-mismatch"),
        lessonId: id("lesson-other-course"),
        purchaseItemId: id("pi-ok"),
        userId: id("student"),
        cancelled: false,
      },
    ],
  });
}

async function main() {
  const shouldClean = process.argv.includes("--clean");

  // Alltid städa först, så skriptet går att köra om utan dubbletter av
  // testdatan i sig.
  await clean();

  if (shouldClean) {
    console.log("Testdatan borttagen.");
    return;
  }

  await seed();

  const { getHealthIssues } = await import("../src/lib/admin-health");
  const issues = await getHealthIssues();

  console.log("Testdata inlagd. Felsökningen hittar nu:\n");
  for (const issue of issues) {
    console.log(`  [${issue.severity}] ${issue.count} ${issue.label}`);
  }
  console.log(
    "\nÖppna /admin, kör felsökningen och prova Åtgärda-knapparna.\n" +
      "Kör 'npm run seed:health -- --clean' när du är klar.",
  );
}

main()
  .catch((e) => {
    console.error("FEL:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
