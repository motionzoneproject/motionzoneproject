/**
 * Testdata för admin/studenter och kundsidan i din LOKALA databas.
 *
 *   npm run seed:students            # lägg in (städar sin egen data först)
 *   npm run seed:students -- --clean # ta bort allt igen
 *
 * Innehåll:
 *  - 4 kurser i 2 terminer. Testadmin (admin@zztest.example.invalid) är lärare
 *    på Balett och Hiphop, [TEST] Lina Lärare på Jazz och Tango.
 *  - Produkter: kursprodukter, ett terminskort (PACK) och ett klippkort (CLIP).
 *  - Kunder som köpt, med och utan deltagare (barn), samt väntande ordrar.
 *  - Elever som lagts till manuellt i kurser (användare och deltagare), och en
 *    som tagits bort trots köp.
 *  - Ett inloggningsbart kundkonto: student@zztest.example.invalid / zztest-student-1234
 *
 * Allt nytt får id:n som börjar med "zztest-stu-". Testadmin skapas om den
 * saknas (och rörs aldrig annars). Kör `--clean` här INNAN `seed:admin --clean`,
 * annars blockerar kurserna att läraren raderas.
 *
 * VÄGRAR köra mot något annat än localhost.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
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
        "Det här skriptet får bara köras mot en lokal utvecklingsdatabas.",
    );
    process.exit(1);
  }
}

assertLocalDatabase();

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});

const P = "zztest-stu-";
const id = (name: string) => `${P}${name}`;
const DAY = 24 * 60 * 60 * 1000;

const ADMIN_ID = "zztest-admin-user";
const ADMIN_EMAIL = "admin@zztest.example.invalid";
const ADMIN_PASSWORD = "zztest-admin-1234";

const STUDENT_ID = id("student");
const STUDENT_EMAIL = "student@zztest.example.invalid";
const STUDENT_PASSWORD = "zztest-student-1234";

const startsWith = { startsWith: P };

/** Omvänd beroendeordning, så FK:er inte blockerar. */
async function clean() {
  await prisma.courseRosterEntry.deleteMany({ where: { id: startsWith } });
  await prisma.booking.deleteMany({ where: { id: startsWith } });
  await prisma.purchaseItem.deleteMany({ where: { id: startsWith } });
  await prisma.purchase.deleteMany({ where: { id: startsWith } });
  await prisma.orderItemCourseSelection.deleteMany({
    where: { id: startsWith },
  });
  await prisma.orderItem.deleteMany({ where: { id: startsWith } });
  await prisma.order.deleteMany({ where: { id: startsWith } });
  await prisma.productOnCourse.deleteMany({
    where: { productId: startsWith },
  });
  await prisma.product.deleteMany({ where: { id: startsWith } });
  await prisma.lesson.deleteMany({ where: { id: startsWith } });
  await prisma.schemaItem.deleteMany({ where: { id: startsWith } });
  await prisma.course.deleteMany({ where: { id: startsWith } });
  await prisma.termin.deleteMany({ where: { id: startsWith } });
  await prisma.participant.deleteMany({ where: { id: startsWith } });
  await prisma.user.deleteMany({ where: { id: startsWith } });
}

async function ensureAdmin() {
  const existing = await prisma.user.findUnique({ where: { id: ADMIN_ID } });
  if (existing) return;
  await prisma.user.create({
    data: {
      id: ADMIN_ID,
      name: "[TEST] Admin Adminsson",
      email: ADMIN_EMAIL,
      emailVerified: true,
      role: "admin",
      accounts: {
        create: {
          id: `${ADMIN_ID}-account`,
          accountId: ADMIN_ID,
          providerId: "credential",
          password: await hashPassword(ADMIN_PASSWORD),
        },
      },
    },
  });
}

type Buyer = { userId: string; participantId?: string };

let seq = 0;

/** Ett godkänt köp: order + orderItem + purchase + purchaseItems. */
async function buy(
  key: string,
  buyer: Buyer,
  productKey: string,
  type: "COURSE" | "PACK" | "CLIP",
  courseKeys: string[],
  opts: { approved?: boolean } = {},
) {
  const approved = opts.approved ?? true;
  const n = ++seq;
  const orderId = id(`order-${key}`);
  const orderItemId = id(`oi-${key}`);

  await prisma.order.create({
    data: {
      id: orderId,
      userId: buyer.userId,
      totalPrice: 100000,
      status: approved ? "APPROVED" : "AWAITING_APPROVAL",
      createdAt: new Date(Date.now() - n * DAY),
    },
  });
  await prisma.orderItem.create({
    data: {
      id: orderItemId,
      orderId,
      productId: id(productKey),
      count: 1,
      price: 100000,
      participantId: buyer.participantId ?? null,
    },
  });
  if (type !== "COURSE") {
    await prisma.orderItemCourseSelection.createMany({
      data: courseKeys.map((c) => ({
        id: id(`sel-${key}-${c}`),
        orderItemId,
        courseId: id(`course-${c}`),
      })),
    });
  }
  if (!approved) return null;

  const purchaseId = id(`purchase-${key}`);
  await prisma.purchase.create({
    data: {
      id: purchaseId,
      userId: buyer.userId,
      productId: id(productKey),
      orderId,
      participantId: buyer.participantId ?? null,
      type,
      totalCount: type === "CLIP" ? 10 : null,
      remainingCount: type === "CLIP" ? 10 : null,
    },
  });
  await prisma.purchaseItem.createMany({
    data: courseKeys.map((c) => ({
      id: id(`pi-${key}-${c}`),
      purchaseId,
      orderItemId,
      courseId: id(`course-${c}`),
      type,
      lessonsIncluded: type === "CLIP" ? 0 : 10,
      remainingCount: type === "CLIP" ? 10 : 10,
    })),
  });
  return purchaseId;
}

async function addToRoster(
  key: string,
  courseKey: string,
  who: { userId: string } | { participantId: string },
  status: "ADDED" | "REMOVED" = "ADDED",
) {
  const userId = "userId" in who ? who.userId : null;
  const participantId = "participantId" in who ? who.participantId : null;
  await prisma.courseRosterEntry.create({
    data: {
      id: id(`roster-${key}`),
      courseId: id(`course-${courseKey}`),
      studentKey: userId ? `user:${userId}` : `participant:${participantId}`,
      userId,
      participantId,
      status,
      changedByUserId: ADMIN_ID,
    },
  });
}

async function seed() {
  await ensureAdmin();

  // Användare: lärare, kunder och den inloggningsbara eleven.
  await prisma.user.create({
    data: {
      id: id("teacher"),
      name: "[TEST] Lina Lärare",
      email: "zztest-stu-teacher@example.invalid",
      role: "user",
    },
  });
  const customers = [
    ["anna", "[TEST] Anna Andersson"],
    ["bo", "[TEST] Bo Bengtsson"],
    ["cecilia", "[TEST] Cecilia Carlsson"],
    ["david", "[TEST] David Dahl"],
    ["eva", "[TEST] Eva Ek"],
    ["manual", "[TEST] Maja Manuell"], // har inga köp, läggs bara till manuellt
  ] as const;
  for (const [k, name] of customers) {
    await prisma.user.create({
      data: {
        id: id(k),
        name,
        email: `zztest-stu-${k}@example.invalid`,
        role: "user",
      },
    });
  }
  await prisma.user.create({
    data: {
      id: STUDENT_ID,
      name: "[TEST] Stina Student",
      email: STUDENT_EMAIL,
      emailVerified: true,
      role: "user",
      accounts: {
        create: {
          id: `${STUDENT_ID}-account`,
          accountId: STUDENT_ID,
          providerId: "credential",
          password: await hashPassword(STUDENT_PASSWORD),
        },
      },
    },
  });

  // Deltagare (barn m.fl.) som kunderna lagt till.
  const participants = [
    ["anna-kid1", "[TEST] Alma Andersson", "anna"],
    ["anna-kid2", "[TEST] Algot Andersson", "anna"],
    ["bo-kid", "[TEST] Bea Bengtsson", "bo"],
    ["stina-kid", "[TEST] Sixten Student", "student"],
    ["manual-kid", "[TEST] Mio Manuell", "manual"],
  ] as const;
  for (const [k, name, owner] of participants) {
    await prisma.participant.create({
      data: {
        id: id(k),
        name,
        addedByUserId: owner === "student" ? STUDENT_ID : id(owner),
      },
    });
  }

  // Terminer: en pågående och en kommande.
  await prisma.termin.createMany({
    data: [
      {
        id: id("termin-1"),
        name: "[TEST] Termin 1",
        startDate: new Date(Date.now() - 60 * DAY),
        endDate: new Date(Date.now() + 90 * DAY),
        active: true,
      },
      {
        id: id("termin-2"),
        name: "[TEST] Termin 2",
        startDate: new Date(Date.now() + 100 * DAY),
        endDate: new Date(Date.now() + 250 * DAY),
        active: true,
      },
    ],
  });

  // Kurser: [nyckel, namn, lärare, termin, veckodag]
  const courses = [
    ["balett", "[TEST] Balett", ADMIN_ID, "termin-1", "MONDAY"],
    ["jazz", "[TEST] Jazz", id("teacher"), "termin-1", "TUESDAY"],
    ["hiphop", "[TEST] Hiphop", ADMIN_ID, "termin-1", "WEDNESDAY"],
    ["tango", "[TEST] Tango", id("teacher"), "termin-2", "THURSDAY"],
  ] as const;
  await prisma.course.createMany({
    data: courses.map(([k, name, teacherId]) => ({
      id: id(`course-${k}`),
      name,
      description: "Testkurs",
      teacherId,
    })),
  });
  const timeStart = new Date("1970-01-01T17:00:00.000Z");
  const timeEnd = new Date("1970-01-01T18:00:00.000Z");
  await prisma.schemaItem.createMany({
    data: courses.map(([k, , , termin, weekday]) => ({
      id: id(`schema-${k}`),
      weekday,
      timeStart,
      timeEnd,
      terminId: id(termin),
      courseId: id(`course-${k}`),
    })),
  });

  // En lektion på Balett och en på Jazz, så terminskort kan bokas in.
  const lessonDefs = [
    ["balett", -3],
    ["jazz", -2],
  ] as const;
  for (const [k, offset] of lessonDefs) {
    const start = new Date(Date.now() + offset * DAY);
    start.setUTCHours(17, 0, 0, 0);
    await prisma.lesson.create({
      data: {
        id: id(`lesson-${k}`),
        startTime: start,
        endTime: new Date(start.getTime() + 60 * 60 * 1000),
        terminId: id("termin-1"),
        courseId: id(`course-${k}`),
        teacherId: k === "balett" ? ADMIN_ID : id("teacher"),
        schemaItemId: id(`schema-${k}`),
      },
    });
  }

  // Produkter.
  const products = [
    ["p-balett", "[TEST] Balett termin", "COURSE", ["balett"]],
    ["p-jazz", "[TEST] Jazz termin", "COURSE", ["jazz"]],
    ["p-hiphop", "[TEST] Hiphop termin", "COURSE", ["hiphop"]],
    ["p-tango", "[TEST] Tango termin", "COURSE", ["tango"]],
    ["p-pack", "[TEST] Terminskort", "PACK", ["balett", "jazz", "hiphop"]],
    ["p-clip", "[TEST] Klippkort", "CLIP", ["balett", "jazz", "hiphop"]],
  ] as const;
  for (const [k, name, type, cs] of products) {
    await prisma.product.create({
      data: {
        id: id(k),
        name,
        description: "Testprodukt",
        type,
        price: 100000,
        totalCount: type === "CLIP" ? 10 : null,
        maxCourses: type === "PACK" ? 2 : null,
        unlimitedCustomers: true,
        autobook: type === "COURSE",
        courses: {
          create: cs.map((c) => ({
            courseId: id(`course-${c}`),
            lessonsIncluded: type === "CLIP" ? 0 : 10,
            unlimited: false,
          })),
        },
      },
    });
  }

  // Köp.
  const anna = { userId: id("anna") };
  const annaKid1 = { userId: id("anna"), participantId: id("anna-kid1") };
  const annaKid2 = { userId: id("anna"), participantId: id("anna-kid2") };
  const bo = { userId: id("bo") };
  const boKid = { userId: id("bo"), participantId: id("bo-kid") };
  const cecilia = { userId: id("cecilia") };
  const david = { userId: id("david") };
  const eva = { userId: id("eva") };
  const stina = { userId: STUDENT_ID };
  const stinaKid = { userId: STUDENT_ID, participantId: id("stina-kid") };

  await buy("anna-balett", anna, "p-balett", "COURSE", ["balett"]);
  await buy("annakid1-balett", annaKid1, "p-balett", "COURSE", ["balett"]);
  await buy("annakid2-jazz", annaKid2, "p-jazz", "COURSE", ["jazz"]);
  await buy("bo-jazz", bo, "p-jazz", "COURSE", ["jazz"]);
  await buy("bokid-hiphop", boKid, "p-hiphop", "COURSE", ["hiphop"]);
  await buy("cecilia-tango", cecilia, "p-tango", "COURSE", ["tango"]);
  // Terminskort: Davids urval är Balett + Jazz, men han är bara bokad på Jazz.
  const davidPack = await buy("david-pack", david, "p-pack", "PACK", [
    "balett",
    "jazz",
  ]);
  // Klippkort: Eva, gäller alla tre kurserna.
  await buy("eva-clip", eva, "p-clip", "CLIP", ["balett", "jazz", "hiphop"]);
  // Stina (inloggningsbar) och hennes barn.
  await buy("stina-jazz", stina, "p-jazz", "COURSE", ["jazz"]);
  await buy("stina-hiphop", stina, "p-hiphop", "COURSE", ["hiphop"]);
  await buy("stinakid-balett", stinaKid, "p-balett", "COURSE", ["balett"]);

  if (davidPack) {
    await prisma.booking.create({
      data: {
        id: id("booking-david-jazz"),
        lessonId: id("lesson-jazz"),
        purchaseItemId: id("pi-david-pack-jazz"),
        userId: id("david"),
      },
    });
  }

  // Väntande ordrar (väntar på godkännande).
  await buy(
    "pending-cecilia-balett",
    cecilia,
    "p-balett",
    "COURSE",
    ["balett"],
    {
      approved: false,
    },
  );
  await buy("pending-bo-tango", bo, "p-tango", "COURSE", ["tango"], {
    approved: false,
  });
  await buy("pending-stina-tango", stina, "p-tango", "COURSE", ["tango"], {
    approved: false,
  });

  // Manuella tillägg och en borttagning.
  await addToRoster("maja-balett", "balett", { userId: id("manual") });
  await addToRoster("maja-tango", "tango", { userId: id("manual") });
  await addToRoster("mio-hiphop", "hiphop", {
    participantId: id("manual-kid"),
  });
  await addToRoster("mio-jazz", "jazz", { participantId: id("manual-kid") });
  // Anna har köpt Balett men är borttagen från kursen: borttagningen vinner.
  await addToRoster("anna-balett-removed", "balett", anna, "REMOVED");
  // Bo har köp på Jazz och läggs dessutom till manuellt på Hiphop.
  await addToRoster("bo-hiphop", "hiphop", bo);

  console.log("Klart. Testdata inlagd (prefix zztest-stu-).");
  console.log(
    `  Admin:   ${ADMIN_EMAIL} / ${ADMIN_PASSWORD} (lärare på Balett, Hiphop)`,
  );
  console.log(`  Elev:    ${STUDENT_EMAIL} / ${STUDENT_PASSWORD}`);
}

async function main() {
  await clean();
  if (process.argv.includes("--clean")) {
    console.log("Testdatan är borttagen.");
    return;
  }
  await seed();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
