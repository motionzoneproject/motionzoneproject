// Behörighetssvep över alla server actions.
//
// Varje export i en fil som börjar med "use server" blir en publik
// HTTP-endpoint (se node_modules/next/dist/docs/01-app/02-guides/
// data-security.md): vem som helst kan POST:a till den med egna argument,
// oavsett om knappen som anropar den bara visas för admin. Svepet hittar
// filerna själv, så en ny actionfil kommer med automatiskt.
//
// För varje funktion anropas den som (a) utloggad och (b) vanlig kund, med
// id:n som tillhör en annan kund eller admindata. Efter varje anrop
// kontrolleras att
//   - databasen är orörd (rad för rad, alla tabeller) — en kund får bara
//     ändra rader som är hens egna, och bara i funktioner som är till för det,
//   - returvärdet inte innehåller någon annans personuppgifter (markören
//     SECRET finns i allt som är privat),
//   - inga mejl har skickats.

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { sendMail } from "@/lib/mail";
import prisma from "@/lib/prisma";
import {
  describeChange,
  diffSnapshots,
  findUseServerFiles,
  ownedIds,
  relativeToRepo,
  revert,
  rowReferences,
  snapshot,
  stringifyResult,
} from "../helpers/authz";
import {
  buy,
  createCourse,
  createParticipant,
  createProduct,
  createUser,
  placeOrder,
} from "../helpers/factories";
import { actAs } from "../helpers/session";

type AnyFn = (...args: unknown[]) => unknown;

// --- Allowlist -------------------------------------------------------------

/**
 * Funktioner som avsiktligt är publika (utloggad får anropa dem). De
 * kontrolleras ändå: de får inte ändra databasen eller lämna ut någons
 * personuppgifter.
 */
const PUBLIC: Record<string, string> = {
  // Kassan och varukorgen bor i en cookie, inte i databasen.
  addToCart: "varukorgen är en cookie, ingen inloggning krävs för att handla",
  updateCart: "varukorgen är en cookie",
  removeFromCart: "varukorgen är en cookie",
  clearCartAndRedirect: "varukorgen är en cookie",
  getCart: "varukorgen är en cookie",
  // Publika sidor: kurser, produkter, schema, lärare, galleri, startsida.
  getCategories: "kategorierna visas i den publika produktlistan",
  getActiveGalleryItems: "det publika galleriet",
  getLegalPages: "villkor och integritetspolicy är publika",
  getLegalPageBySlug: "villkor och integritetspolicy är publika",
  getProductStats: "platser kvar visas på produktkorten och används av kassan",
  getFullCourseNameFromId: "kursnamn visas publikt",
  getAllCoursesInProduct: "produktsidan visar vilka kurser som ingår",
  getAllProducts: "aktiva produkter visas publikt (server-actions.ts)",
  getRemainingSlotsForCourse: "platser kvar visas på kurskorten",
  getStartPageContent: "startsidans innehåll",
  getStudios: "studiorna visas publikt",
  getStyles: "dansstilarna visas publikt",
  getPublicTeachers: "lärarsidan; väljer bara publika fält",
  sanitizeRichText:
    "ren funktion utan databas, råkar ligga i en use server-fil",
  // Rollkontroller som bara svarar om den egna sessionen.
  isAdminRole: "svarar bara om den egna sessionen",
  isTeacherRole: "svarar bara om den egna sessionen",
  isAdminOrTeacherRole: "svarar bara om den egna sessionen",
  requireAdmin: "sidvakt; kastar notFound för andra än admin",
  requireAdminOrTeacher: "sidvakt; kastar notFound för andra än admin/lärare",
  getRole: "den egna sessionens roll",
  getSessionData: "den egna sessionen",
  // Registrering.
  signUpWithDetails: "registrering av nytt konto",
};

/**
 * Publika funktioner som skapar data i sig (registrering). Anropas inte i
 * svepet — de skapar per definition rader — men listas för fullständighet.
 */
const SKIP: Record<string, string> = {
  signUpWithDetails:
    "skapar ett konto via better-auth; publik per design, testas inte här",
};

/**
 * Funktioner där en inloggad kund får ändra sina EGNA rader. Svepet anropar
 * dem med andras id:n; en ändring godtas bara om varje berörd rad pekar på
 * kundens egna id:n och ingen pekar på någon annans.
 */
const SELF_SERVICE = new Set([
  "createCheckout",
  "createCheckoutAndRedirect",
  "saveInvoiceRecipient",
  "setOwnOrdersInvoiceRecipient",
  "getOrCreateParticipant",
  "updateParticipant",
  "bookMyCourse",
  "delBooking",
  "autobook",
  "addUserInLesson",
  "changeDetails",
  "changePassword",
  "changeMail",
]);

// --- Testdata --------------------------------------------------------------

/** Finns i allt som är någon annans personuppgifter eller interna anteckningar. */
const SECRET = `HEMLIG${randomUUID().slice(0, 8)}`;

type Seed = Awaited<ReturnType<typeof seed>>;

async function seed() {
  const admin = await createUser({ role: "admin", name: `${SECRET} Admin` });
  const teacher = await createUser({ role: "teacher", name: "Lärare Larsson" });
  const victim = await createUser({ name: `${SECRET} Kund` });
  const attacker = await createUser({ name: "Angripare Andersson" });

  await prisma.user.update({
    where: { id: victim.id },
    data: { email: `${SECRET.toLowerCase()}.kund@test.local` },
  });
  await prisma.user.update({
    where: { id: admin.id },
    data: { email: `${SECRET.toLowerCase()}.admin@test.local` },
  });
  await prisma.user.update({
    where: { id: teacher.id },
    data: { email: `${SECRET.toLowerCase()}.larare@test.local` },
  });
  const victimEmail = `${SECRET.toLowerCase()}.kund@test.local`;

  await prisma.userDetails.create({
    data: {
      userId: victim.id,
      firstName: SECRET,
      lastName: "Kund",
      phoneNumber: `070${SECRET}`,
      address: `${SECRET}gatan 1`,
      invoiceName: `${SECRET} Betalare`,
      invoiceEmail: `${SECRET.toLowerCase()}.faktura@test.local`,
      dateOfBirth: new Date("1980-01-01T00:00:00Z"),
    },
  });

  const victimParticipant = await createParticipant(victim, `${SECRET} Barn`);
  await prisma.participant.update({
    where: { id: victimParticipant.id },
    data: {
      email: `${SECRET.toLowerCase()}.barn@test.local`,
      phone: `071${SECRET}`,
      dateOfBirth: new Date("2015-05-05T00:00:00Z"),
    },
  });
  const victimParticipant2 = await createParticipant(
    victim,
    `${SECRET} Barn två`,
  );
  const attackerParticipant = await prisma.participant.create({
    data: {
      name: "Angriparens barn",
      addedByUserId: attacker.id,
      dateOfBirth: new Date("2014-01-01T00:00:00Z"),
    },
  });

  const courseA = await createCourse({ teacher, past: 1, future: 4 });
  const courseB = await createCourse({ teacher, past: 0, future: 4 });

  const prodCourse = await createProduct({
    type: "COURSE",
    courses: [courseA],
    lessonsIncluded: 10,
    autobook: true,
  });
  const prodPack = await createProduct({
    type: "PACK",
    courses: [courseA, courseB],
    lessonsIncluded: 10,
    maxCourses: 1,
  });
  const prodClip = await createProduct({
    type: "CLIP",
    courses: [courseA, courseB],
    totalCount: 10,
  });

  // Offrets köp: en godkänd kurs för barnet (autobokad), ett klippkort och
  // en order som väntar på godkännande.
  const victimCourse = await buy({
    admin,
    buyer: victim,
    product: prodCourse,
    participant: victimParticipant,
  });
  const victimClip = await buy({ admin, buyer: victim, product: prodClip });
  const victimPending = await placeOrder({
    buyer: victim,
    product: prodPack,
    selectedCourseIds: [courseA.id],
  });
  await prisma.order.update({
    where: { id: victimPending.id },
    data: {
      note: `${SECRET} intern anteckning`,
      invoiceName: `${SECRET} Betalare`,
      invoiceEmail: `${SECRET.toLowerCase()}.faktura@test.local`,
    },
  });
  await prisma.order.update({
    where: { id: victimCourse.order.id },
    data: { note: `${SECRET} anteckning` },
  });
  const victimPendingItem = await prisma.orderItem.findFirstOrThrow({
    where: { orderId: victimPending.id },
  });

  // Angriparens egen order, för att blanda egna och andras id:n.
  const attackerPending = await placeOrder({
    buyer: attacker,
    product: prodClip,
  });

  // Beviljad order där köpet saknas — det health-verktygen reparerar.
  const victimApprovedNoPurchase = await placeOrder({
    buyer: victim,
    product: prodClip,
  });
  await prisma.order.update({
    where: { id: victimApprovedNoPurchase.id },
    data: { status: "APPROVED" },
  });

  // Kurs och produkt utan köp, som går att ta bort.
  const spareCourse = await createCourse({ teacher, future: 1 });
  const spareProduct = await createProduct({ type: "COURSE", courses: [] });

  const lessons = await prisma.lesson.findMany({
    where: { courseId: courseA.id },
    orderBy: { startTime: "asc" },
  });
  const futureLesson = lessons.find((l) => l.startTime > new Date());
  if (!futureLesson) throw new Error("ingen kommande lektion");
  const pastLesson = lessons[0];
  // Sista lektionen ställs in men bokningen ligger kvar: en "stale booking".
  const cancelledLesson = lessons[lessons.length - 1];
  await prisma.lesson.update({
    where: { id: cancelledLesson.id },
    data: { cancelled: true },
  });

  const termin = await prisma.termin.findFirstOrThrow();
  const schemaItem = await prisma.schemaItem.findFirstOrThrow({
    where: { courseId: courseA.id },
  });

  const category = await prisma.category.create({ data: { name: "Kategori" } });
  await prisma.product.update({
    where: { id: prodCourse.id },
    data: { categoryId: category.id },
  });
  const event = await prisma.event.create({
    data: {
      headline: "Uppvisning",
      description: "Vår",
      link: "",
      imageURL: "",
      startDate: new Date(Date.now() + 30 * 86_400_000),
    },
  });
  const studio = await prisma.studio.create({
    data: { name: "Sal 1", name_en: "Room 1", description: "Stor sal" },
  });
  const style = await prisma.style.create({
    data: { name: "Jazz", description: "Jazzdans" },
  });
  const gallery = await prisma.galleryItem.create({
    data: { title: "Bild", url: "https://example.invalid/bild.jpg" },
  });
  const teacherProfile = await prisma.teacherProfile.create({
    data: {
      userId: teacher.id,
      name: "Lärare Larsson",
      specialty: "Jazz",
      description: "Lärare",
    },
  });
  const legal = await prisma.legalPage.create({
    data: { slug: "villkor", title: "Villkor", content: "<p>Villkor</p>" },
  });
  await prisma.courseRosterEntry.create({
    data: {
      courseId: courseB.id,
      studentKey: `participant:${victimParticipant.id}`,
      participantId: victimParticipant.id,
      status: "REMOVED",
      changedByUserId: admin.id,
    },
  });

  return {
    admin,
    teacher,
    victim,
    victimEmail,
    attacker,
    victimParticipant,
    victimParticipant2,
    attackerParticipant,
    courseA,
    courseB,
    prodCourse,
    prodPack,
    prodClip,
    victimCourse,
    victimItem: victimCourse.items[0],
    victimClip,
    victimClipItem: victimClip.items[0],
    victimPending,
    victimPendingItem,
    attackerPending,
    victimApprovedNoPurchase,
    spareCourse,
    spareProduct,
    cancelledLesson,
    futureLesson,
    pastLesson,
    termin,
    schemaItem,
    category,
    event,
    studio,
    style,
    gallery,
    teacherProfile,
    legal,
  };
}

// --- Argument per funktion ----------------------------------------------------

type ArgsFor = (s: Seed) => unknown[][];

const invoiceChoice = (s: Seed) => ({
  kind: "participant" as const,
  participantId: s.victimParticipant.id,
  invoiceEmail: "angripare@test.local",
  invoicePhone: "",
  adultConfirmed: true,
});
const otherInvoice = {
  kind: "other" as const,
  invoiceName: "Hacker Hackersson",
  invoiceEmail: "angripare@test.local",
  invoicePhone: "",
  adultConfirmed: true,
};
const scheduleForm = (s: Seed) => ({
  courseId: s.courseB.id,
  timeStart: "10:00",
  timeEnd: "11:00",
  day: "TUESDAY",
});
const terminForm = {
  name: "Hackad termin",
  startDate: "2020-01-01",
  endDate: "2030-01-01",
};
const courseForm = (s: Seed) => ({
  name: "Hackad kurs",
  description: "x",
  minAge: 0,
  maxAge: 0,
  adult: true,
  teacherid: s.teacher.id,
});
const productForm = {
  name: "Hackad produkt",
  description: "x",
  unlimitedCustomers: true,
  maxCustomers: 0,
  price: 0,
  clipcard: false,
  clipCount: 0,
  autobook: true,
  maxCourses: null,
};
const eventForm = {
  headline: "Hackat",
  description: "x",
  showOnStartpage: true,
  startDate: "2030-01-01",
};
const eventFormData = () => {
  const fd = new FormData();
  fd.set("headline", "Hackat");
  fd.set("startDate", "2030-01-01");
  fd.set("description", "x");
  return fd;
};
const userDetailsForm = {
  firstName: "Hack",
  lastName: "Hackersson",
  phoneNumber: "",
  address: "",
  postalCode: "",
  city: "",
  dateOfBirth: "1990-01-01",
  bio: "",
  allowPhotoVideo: true,
};
const startPageForm = {
  heroImage: "/hack.png",
  heroLabel: "Hackad",
  heroTitleLine1: "H",
  heroTitleAccent: "H",
  heroTitleLine2: "H",
  heroSubtext: "H",
  featuresTitle: "H",
  featuresSubtext: "H",
  feature1Image: "H",
  feature1Title: "H",
  feature1Description: "H",
  feature2Image: "H",
  feature2Title: "H",
  feature2Description: "H",
  feature3Image: "H",
  feature3Title: "H",
  feature3Description: "H",
  heroLabel_en: "H",
  heroTitleLine1_en: "H",
  heroTitleAccent_en: "H",
  heroTitleLine2_en: "H",
  heroSubtext_en: "H",
  featuresTitle_en: "H",
  featuresSubtext_en: "H",
  feature1Title_en: "H",
  feature1Description_en: "H",
  feature2Title_en: "H",
  feature2Description_en: "H",
  feature3Title_en: "H",
  feature3Description_en: "H",
};

const ARGS: Record<string, ArgsFor> = {
  // admin-stats.ts
  getTerminsStats: (s) => [[s.termin.id, null, null]],
  // admin-students.ts
  getAdminStudentDetails: (s) => [
    [{ id: s.victimParticipant.id, isParticipant: true }],
    [{ id: s.victim.id, isParticipant: false }],
  ],
  adminUpdatePurchaseRemainingCount: (s) => [
    [
      {
        purchaseId: s.victimCourse.purchase.id,
        purchaseItemId: s.victimItem.id,
        nextTotalCount: 99,
      },
    ],
  ],
  // admin-terminer.ts
  addCoursetoSchema: (s) => [[s.termin.id, scheduleForm(s)]],
  editCourseInSchema: (s) => [[s.termin.id, s.schemaItem.id, scheduleForm(s)]],
  delSchemaItem: (s) => [[s.schemaItem.id]],
  editTermin: (s) => [[s.termin.id, terminForm, true]],
  checkTerminDateChange: (s) => [[s.termin.id, "2035-01-01", "2035-06-01"]],
  addNewTermin: () => [[terminForm]],
  delTermin: (s) => [[s.termin.id]],
  // admin.ts
  getTerminer: () => [[true]],
  getSchemaItems: (s) => [[s.termin.id]],
  getAllCourses: () => [["", true]],
  getAllStudios: () => [[]],
  addNewEvent: () => [[eventForm]],
  editNewEvent: (s) => [[{ ...eventForm, id: s.event.id }]],
  delEvent: (s) => [[s.event.id]],
  delCourse: (s) => [[s.spareCourse.id]],
  addNewCourse: (s) => [[courseForm(s)]],
  editCourse: (s) => [[s.courseA.id, courseForm(s)]],
  editLessonItem: (s) => [
    [{ id: s.futureLesson.id, cancelled: true, message: "Hackad" }],
  ],
  bulkCancelLessons: (s) => [
    [
      {
        from: "2020-01-01",
        to: "2035-01-01",
        courseIds: [s.courseA.id],
        message: "Hackad",
        cancelled: true,
      },
    ],
  ],
  addNewProduct: () => [[productForm]],
  editProduct: (s) => [[s.prodCourse.id, productForm]],
  removeProduct: (s) => [[s.spareProduct.id]],
  addCourseToProduct: (s) => [
    [
      {
        productId: s.prodCourse.id,
        courseId: s.courseB.id,
        lessonsIncluded: 5,
      },
    ],
  ],
  removeCourseInProduct: (s) => [
    [{ productId: s.prodPack.id, courseId: s.courseB.id, lessonsIncluded: 0 }],
  ],
  isCourseInProduct: (s) => [[s.courseA.id, s.prodCourse.id]],
  getUsersWithPurchasedProductsWithCourseInIt: (s) => [[s.courseA.id]],
  getBookings: (s) => [[s.futureLesson.id]],
  addUserInLesson: (s) => [
    [
      {
        lessonId: s.futureLesson.id,
        userId: s.victim.id,
        purchaseItemId: s.victimClipItem.id,
      },
    ],
  ],
  removeUserFromLesson: (s) => [[s.victimItem.id, s.futureLesson.id]],
  getTerminCascadeImpact: (s) => [[s.termin.id, true]],
  toggleTerminActive: (s) => [[s.termin.id, false, true]],
  toggleCourseActive: (s) => [[s.courseA.id, false]],
  toggleProductActive: (s) => [[s.prodCourse.id, false]],
  toggleEventStartpageVisibility: (s) => [[s.event.id, true]],
  // auth-actions.ts — sessionen hämtas via better-auth och cookies, som är
  // tomma i testerna; anropen prövar alltså bara utloggat läge.
  changeDetails: () => [[userDetailsForm]],
  changePassword: () => [
    [
      {
        oldPassword: "Abcdefg1",
        password: "Hackad123",
        confirmPassword: "Hackad123",
      },
    ],
  ],
  changeMail: (s) => [
    [{ currentEmail: s.victimEmail, email: "angripare@test.local" }],
  ],
  // cart.ts
  addToCart: (s) => [[{ productId: s.prodCourse.id }]],
  updateCart: (s) => [[{ productId: s.prodCourse.id, qty: 2 }]],
  removeFromCart: (s) => [[{ productId: s.prodCourse.id }]],
  clearCartAndRedirect: () => [[]],
  getCart: () => [[]],
  // category-actions.ts
  addCategory: () => [[{ name: "Hackad" }]],
  editCategory: (s) => [[s.category.id, { name: "Hackad" }]],
  getCategoryProductCount: (s) => [[s.category.id]],
  deleteCategory: (s) => [[s.category.id]],
  // checkout.ts — anmäler offrets barn och väljer barnet som fakturamottagare.
  createCheckout: (s) => [
    // Offrets barn som deltagare, egen fakturamottagare.
    [
      {
        items: [
          {
            productId: s.prodCourse.id,
            count: 1,
            participantId: s.victimParticipant.id,
          },
        ],
        invoice: otherInvoice,
      },
    ],
    // Offrets barn som fakturamottagare: servern slår upp namnet på
    // deltagaren, så det får inte gå att peka ut någon annans.
    [
      {
        items: [
          {
            productId: s.prodClip.id,
            count: 1,
            participantId: s.victimParticipant2.id,
          },
        ],
        invoice: {
          ...invoiceChoice(s),
          participantId: s.victimParticipant2.id,
        },
      },
    ],
    // Offrets barn som fakturamottagare utan att barnet står på ordern.
    [
      {
        items: [{ productId: s.prodClip.id, count: 1 }],
        invoice: invoiceChoice(s),
      },
    ],
  ],
  createCheckoutAndRedirect: (s) => [
    [
      {
        items: [
          {
            productId: s.prodClip.id,
            count: 1,
            participantId: s.victimParticipant2.id,
          },
        ],
        invoice: otherInvoice,
      },
    ],
  ],
  // events.ts
  createEvent: () => [[eventFormData()]],
  updateEvent: (s) => [[s.event.id, eventFormData()]],
  // gallery.ts
  getAllGalleryItems: () => [[]],
  createGalleryItem: () => [
    [{ type: "IMAGE", title: "Hackad", url: "https://example.invalid/h.jpg" }],
  ],
  updateGalleryItem: (s) => [[s.gallery.id, { title: "Hackad" }]],
  deleteGalleryItem: (s) => [[s.gallery.id]],
  toggleGalleryItemActive: (s) => [[s.gallery.id, false]],
  // health-actions.ts
  runHealthChecks: () => [[]],
  mergeParticipants: (s) => [
    [s.victimParticipant.id, [s.victimParticipant2.id]],
    [s.attackerParticipant.id, [s.victimParticipant.id]],
  ],
  backfillPurchaseItems: (s) => [[s.victimCourse.purchase.id]],
  grantTeacherRole: (s) => [[s.attacker.id]],
  removeStaleBooking: (s) => [
    [s.cancelledLesson.id, s.victimItem.id, "cancelled"],
  ],
  createMissingPurchase: (s) => [[s.victimApprovedNoPurchase.id]],
  disableProductAutobook: (s) => [[s.prodCourse.id]],
  // invoice-actions.ts
  saveInvoiceRecipient: (s) => [[invoiceChoice(s)]],
  setOwnOrdersInvoiceRecipient: (s) => [
    [[s.victimPending.id], otherInvoice],
    [[s.attackerPending.id, s.victimPending.id], otherInvoice],
  ],
  setOrderInvoiceRecipient: (s) => [[s.victimPending.id, otherInvoice]],
  // legal-actions.ts
  getLegalPageBySlug: (s) => [[s.legal.slug]],
  updateLegalPage: (s) => [
    [{ slug: s.legal.slug, title: "Hackad", content: "<p>Hackad</p>" }],
  ],
  // newsletter.ts
  sendStudentNewsletter: (s) => [
    [
      {
        recipients: [{ name: "Offer", email: s.victimEmail }],
        headline: "Köp bitcoin",
        content: "<p>Klicka här</p>",
      },
    ],
  ],
  // orders.ts
  updateOrderStatus: (s) => [[s.victimPending.id, "APPROVED"]],
  approveOrder: (s) => [[s.victimPending.id]],
  setOrderPaid: (s) => [[s.victimPending.id, true]],
  cancelOrder: (s) => [[s.victimPending.id]],
  adminGetOrder: (s) => [[s.victimPending.id]],
  updateOrder: (s) => [
    [
      s.victimPending.id,
      {
        creates: [{ productId: s.prodClip.id, participantId: null }],
        updates: [],
        deletes: [],
      },
    ],
  ],
  updateOrderItemCourseSelections: (s) => [
    [s.victimPending.id, s.victimPendingItem.id, [s.courseB.id]],
  ],
  createPurchaseFromOrder: (s) => [[s.victimApprovedNoPurchase.id]],
  getPurchaseFromOrder: (s) => [[s.victimCourse.order.id]],
  getPurchasesForStudent: (s) => [
    [{ userId: s.victim.id, participantId: null }],
    [{ userId: s.victim.id, participantId: s.victimParticipant.id }],
  ],
  adminChangePurchaseItemCourse: (s) => [[s.victimItem.id, s.courseB.id]],
  getUserOrders: () => [[]],
  getUserOrder: (s) => [[s.victimPending.id], [s.victimCourse.order.id]],
  deleteOrder: (s) => [[s.victimPending.id]],
  // participants.ts
  getParticipantsForUser: (s) => [[s.victim.id]],
  getMyParticipants: () => [[]],
  getOrCreateParticipant: (s) => [
    // Samma namn som offrets barn: får inte returnera offrets rad.
    [
      {
        name: s.victimParticipant.name,
        allowPhotoVideo: false,
        userId: s.victim.id,
      },
    ],
    // Offrets e-post: får inte koppla ihop en ny deltagare med offrets konto
    // eller avslöja att adressen har ett konto.
    [
      {
        name: "Ny deltagare",
        email: s.victimEmail,
        dateOfBirth: "2012-01-01",
        allowPhotoVideo: false,
      },
    ],
  ],
  updateParticipant: (s) => [
    [s.victimParticipant.id, { name: "Hackad" }],
    [s.attackerParticipant.id, { email: s.victimEmail }],
  ],
  // purchase-actions.ts
  getProductStats: (s) => [[s.prodCourse.id]],
  // roster-actions.ts
  removeStudentFromCourse: (s) => [
    [s.courseA.id, `participant:${s.victimParticipant.id}`],
  ],
  addStudentToCourse: (s) => [
    [s.courseB.id, `participant:${s.victimParticipant.id}`],
    [s.courseB.id, `user:${s.attacker.id}`],
  ],
  getCourseRoster: (s) => [[s.courseA.id]],
  getCourseStudentCounts: (s) => [[[s.courseA.id, s.courseB.id]]],
  searchStudentsForCourse: (s) => [[s.courseA.id, SECRET]],
  // schedule-actions.ts
  getPurchaseSchedule: (s) => [[s.victimCourse.purchase.id]],
  bookMyCourse: (s) => [[s.victimClipItem.id]],
  setCourseBooking: (s) => [
    [s.victimItem.id, false],
    [s.victimClipItem.id, true],
  ],
  // server-actions.ts
  getUserBookings: () => [[]],
  getUserLessons: () => [[]],
  getUserPurchases: () => [[]],
  getUserPendingRegistrations: () => [[]],
  delBooking: (s) => [[s.futureLesson.id, s.victimItem.id]],
  getFullCourseNameFromId: (s) => [[s.courseA.id]],
  getAllCoursesInProduct: (s) => [[s.prodCourse.id]],
  autobook: (s) => [
    [s.victimClipItem.id, undefined, { explicit: true }],
    [s.victimItem.id],
  ],
  getRemainingSlotsForCourse: (s) => [[s.prodCourse.id, 10]],
  // start-page-actions.ts
  updateStartPageContent: () => [[startPageForm]],
  // studio-actions.ts
  createStudio: () => [[{ name: "Hack", name_en: "Hack", description: "x" }]],
  updateStudio: (s) => [
    [s.studio.id, { name: "Hack", name_en: "Hack", description: "x" }],
  ],
  deleteStudio: (s) => [[s.studio.id]],
  // style-actions.ts
  createStyle: () => [[{ name: "Hack", description: "x" }]],
  updateStyle: (s) => [[s.style.id, { name: "Hack", description: "x" }]],
  deleteStyle: (s) => [[s.style.id]],
  // teacher-actions.ts
  getTeachers: () => [[]],
  getTeacherUsers: () => [[]],
  createTeacher: (s) => [[{ userId: s.attacker.id, name: "Hack" }]],
  updateTeacher: (s) => [
    [s.teacherProfile.id, { userId: s.teacher.id, name: "Hackad" }],
  ],
  deleteTeacher: (s) => [[s.teacherProfile.id]],
  // user-management.ts
  getUsers: () => [
    ["", 1, 50],
    [SECRET, 1, 50],
  ],
  adminUpdateUserDetails: (s) => [
    [
      s.victim.id,
      {
        firstName: "Hack",
        lastName: "Hackersson",
        phoneNumber: "",
        address: "",
        postalCode: "",
        city: "",
        dateOfBirth: "1990-01-01",
        allowPhotoVideo: true,
      },
    ],
  ],
  adminSetRole: (s) => [[s.attacker.id, "admin"]],
  adminBanUser: (s) => [[s.victim.id, "hackad"]],
  adminUnbanUser: (s) => [[s.victim.id]],
  // dom-sanitize.ts
  sanitizeRichText: () => [["<p>hej</p><script>alert(1)</script>"]],
};

/**
 * Funktioner som har samma namn i flera filer får sina argument här, med
 * filen som nyckel. (getAllProducts i admin.ts är admin-låst; den i
 * server-actions.ts är publik.)
 */
const ARGS_BY_FILE: Record<string, ArgsFor> = {
  "src/lib/actions/admin.ts#getAllProducts": () => [[true]],
  "src/lib/actions/server-actions.ts#getAllProducts": () => [[]],
};

const PUBLIC_BY_FILE: Record<string, string> = {
  "src/lib/actions/server-actions.ts#getAllProducts":
    "aktiva produkter visas publikt",
};

/** Främmande id:n i varje position, för funktioner som saknar egen rad. */
const fallbackArgs: (fn: AnyFn) => ArgsFor = (fn) => (s) => [
  Array.from({ length: Math.max(fn.length, 1) }, () => s.victimItem.id),
];

// --- Upptäckt av endpoints --------------------------------------------------

type Endpoint = { file: string; name: string; fn: AnyFn };

const files = findUseServerFiles();
const endpoints: Endpoint[] = [];
for (const full of files) {
  const mod = (await import(/* @vite-ignore */ full)) as Record<
    string,
    unknown
  >;
  for (const [name, value] of Object.entries(mod)) {
    if (typeof value === "function")
      endpoints.push({ file: relativeToRepo(full), name, fn: value as AnyFn });
  }
}

function argsFor(e: Endpoint): ArgsFor {
  return (
    ARGS_BY_FILE[`${e.file}#${e.name}`] ?? ARGS[e.name] ?? fallbackArgs(e.fn)
  );
}

function isPublic(e: Endpoint): boolean {
  return (
    Boolean(PUBLIC_BY_FILE[`${e.file}#${e.name}`]) ||
    (e.name in PUBLIC && !(`${e.file}#${e.name}` in ARGS_BY_FILE))
  );
}

// --- Svepet --------------------------------------------------------------------

let s: Seed;

/** Allt som visar att offret, admin eller deras data läckt ut. */
function secretsIn(text: string): string[] {
  const found: string[] = [];
  if (text.includes(SECRET)) found.push("personuppgift/intern anteckning");
  if (text.toLowerCase().includes(SECRET.toLowerCase()) && !found.length)
    found.push("e-postadress");
  if (s && text.includes(s.victim.id)) found.push("offrets användar-id");
  return found;
}

/** Alla strängar i ett värde, på vilket djup som helst. */
function stringLeaves(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(stringLeaves);
  if (value && typeof value === "object")
    return Object.values(value).flatMap(stringLeaves);
  return [];
}

async function invoke(fn: AnyFn, args: unknown[]) {
  try {
    return { ok: true as const, value: await fn(...args) };
  } catch (error) {
    return { ok: false as const, error };
  }
}

type Finding = {
  endpoint: string;
  role: string;
  variant: number;
  problems: string[];
};
const findings: Finding[] = [];

async function sweepOne(
  e: Endpoint,
  role: "utloggad" | "kund",
  args: unknown[],
  variant: number,
) {
  actAs(role === "kund" ? { id: s.attacker.id, role: "user" } : null);
  vi.mocked(sendMail).mockClear();

  const before = await snapshot();
  const result = await invoke(e.fn, args);
  const after = await snapshot();
  actAs(null);

  const problems: string[] = [];

  // 1. Databasen.
  const changes = diffSnapshots(before, after);
  if (changes.length > 0) {
    if (role === "kund" && SELF_SERVICE.has(e.name)) {
      const own = await ownedIds(s.attacker.id);
      const foreign = new Set(
        [
          ...(await ownedIds(s.victim.id)),
          ...(await ownedIds(s.admin.id)),
        ].filter((id) => !own.has(id)),
      );
      for (const c of changes) {
        const rows = [c.before, c.after];
        const touchesOwn = rows.some((r) => rowReferences(r, own));
        const touchesForeign = rows.some((r) => rowReferences(r, foreign));
        if (!touchesOwn || touchesForeign)
          problems.push(`ändrade annans/gemensam data: ${describeChange(c)}`);
      }
    } else {
      for (const c of changes)
        problems.push(`ändrade data: ${describeChange(c)}`);
    }
  }

  // 2. Returvärdet (eller felmeddelandet). Det anroparen själv skickade in —
  // t.ex. en e-postadress i ett formulär — är ingen läcka när det kommer
  // tillbaka, så de värdena stryks innan texten granskas.
  let text = result.ok
    ? stringifyResult(result.value)
    : String((result.error as Error)?.message ?? result.error);
  for (const own of stringLeaves(args).filter((v) => v.length > 3))
    text = text.split(own).join("");
  const leaked = secretsIn(text);
  if (leaked.length > 0)
    problems.push(`returnerade ${leaked.join(", ")}: ${text.slice(0, 300)}`);

  // 3. Mejl. En kund som beställer får sin egen bekräftelse; mejl till någon
  // annan, eller mejl alls från en funktion som inte är kundens egen, är fel.
  const recipients = vi
    .mocked(sendMail)
    .mock.calls.map((call) => String(call[0]));
  const mayMail = role === "kund" && SELF_SERVICE.has(e.name);
  const badMail = mayMail
    ? recipients.filter((to) => secretsIn(to).length > 0)
    : recipients;
  if (badMail.length > 0)
    problems.push(`skickade mejl till ${badMail.join(", ")}`);

  // Återställ, så att nästa anrop möter samma data och ett fynd inte
  // fortplantar sig till funktioner som bara läser.
  if (changes.length > 0) await revert(changes);

  if (problems.length > 0)
    findings.push({ endpoint: `${e.file}#${e.name}`, role, variant, problems });

  return problems;
}

beforeAll(async () => {
  s = await seed();
});

afterAll(() => {
  if (findings.length === 0) return;
  // Sammanställning för rapporten — testerna nedan misslyckas var för sig.
  console.log(
    "\n=== Behörighetsfynd ===\n" +
      findings
        .map(
          (f) =>
            `${f.endpoint} [${f.role}, variant ${f.variant}]\n  - ${f.problems.join("\n  - ")}`,
        )
        .join("\n"),
  );
});

describe("behörighetssvep: alla server actions", () => {
  it("hittar use server-filerna", () => {
    const names = files.map(relativeToRepo);
    expect(names).toContain("src/lib/actions/orders.ts");
    expect(names).toContain("src/lib/actions/server-actions.ts");
    expect(endpoints.length).toBeGreaterThan(100);
  });

  it("varje allowlistad publik funktion finns fortfarande", () => {
    const exported = new Set(endpoints.map((e) => e.name));
    for (const name of Object.keys(PUBLIC)) expect(exported).toContain(name);
  });

  for (const role of ["utloggad", "kund"] as const) {
    describe(role, () => {
      for (const e of endpoints) {
        const label = `${e.file.replace("src/lib/", "")}#${e.name}${
          isPublic(e) ? " (publik)" : ""
        }`;
        if (e.name in SKIP) {
          it.skip(`${label} — ${SKIP[e.name]}`, () => {});
          continue;
        }
        it(label, async () => {
          const variants = argsFor(e)(s);
          const all: string[] = [];
          for (const [i, args] of variants.entries()) {
            const problems = await sweepOne(e, role, args, i);
            all.push(...problems.map((p) => `variant ${i}: ${p}`));
          }
          expect(all, `${e.file}#${e.name} som ${role}`).toEqual([]);
        });
      }
    });
  }
});

// --- Kontroll av argumenten ------------------------------------------------------

/**
 * Funktioner som inte har någon märkbar effekt ens när admin anropar dem med
 * svepets argument. För dem prövar svepet bara behörighetskontrollen i
 * kodens första rader, inte att argumenten hade nått fram.
 */
const KNOWN_SHALLOW: Record<string, string> = {
  "src/lib/actions/admin.ts#addUserInLesson":
    "hämtar sessionen via auth.api.getSession och cookies, inte getSessionData — går inte att logga in i testerna",
  "src/lib/actions/auth-actions.ts#changeDetails":
    "auth.api.getSession, se ovan",
  "src/lib/actions/auth-actions.ts#changePassword":
    "auth.api.getSession, se ovan",
  "src/lib/actions/auth-actions.ts#changeMail": "auth.api.getSession, se ovan",
  "src/lib/actions/user-management.ts#adminSetRole":
    "better-auth:s admin-API kräver en riktig sessionscookie",
  "src/lib/actions/user-management.ts#adminBanUser": "better-auth, se ovan",
  "src/lib/actions/user-management.ts#adminUnbanUser": "better-auth, se ovan",
  "src/lib/actions/health-actions.ts#grantTeacherRole":
    "går vidare till adminSetRole (better-auth)",
  "src/lib/actions/gallery.ts#deleteGalleryItem":
    "S3 är inte konfigurerat i testerna",
  "src/lib/actions/health-actions.ts#backfillPurchaseItems":
    "kräver ett köp som saknar kursrader, vilket appens flöde inte skapar",
  // Kundens egna funktioner. Med svepets främmande argument ska de inte
  // göra något, inte heller för admin, som inte äger offrets data.
  "src/lib/actions/invoice-actions.ts#saveInvoiceRecipient": "kundens egen",
  "src/lib/actions/invoice-actions.ts#setOwnOrdersInvoiceRecipient":
    "kundens egen",
  "src/lib/actions/orders.ts#getUserOrders": "kundens egen",
  "src/lib/actions/orders.ts#getUserOrder": "kundens egen",
  "src/lib/actions/participants.ts#getMyParticipants": "kundens egen",
  "src/lib/actions/schedule-actions.ts#bookMyCourse": "kundens egen",
  "src/lib/actions/server-actions.ts#getUserPurchases": "kundens egen",
  "src/lib/actions/server-actions.ts#getUserPendingRegistrations":
    "kundens egen",
  "src/lib/actions/server-actions.ts#delBooking": "kundens egen",
  // Deltagaren måste vara köparens egen, så svepets främmande deltagare
  // nekas även för admin. Täcks av "kassan" nedan och checkout.test.ts.
  "src/lib/actions/checkout.ts#createCheckout": "kundens egen",
  "src/lib/actions/checkout.ts#createCheckoutAndRedirect": "kundens egen",
};

describe("kontroll: argumenten biter när admin anropar", () => {
  // Ett nekande i svepet säger bara något om argumenten faktiskt hade gjort
  // något för en behörig användare. Här körs samma anrop som admin och som
  // utloggad: ändrar admin-anropet något, skickar mejl eller svarar
  // annorlunda än det utloggade, så når argumenten fram.
  it("bara de kända funktionerna prövas ytligt", async () => {
    const shallow: string[] = [];
    for (const e of endpoints) {
      if (e.name in SKIP || isPublic(e)) continue;
      let effective = false;
      for (const args of argsFor(e)(s)) {
        actAs(null);
        const anon = await invoke(e.fn, args);
        const anonText = anon.ok
          ? stringifyResult(anon.value)
          : `fel: ${String((anon.error as Error)?.message)}`;

        actAs({ id: s.admin.id, role: "admin" });
        vi.mocked(sendMail).mockClear();
        const before = await snapshot();
        const result = await invoke(e.fn, args);
        const after = await snapshot();
        actAs(null);
        const changes = diffSnapshots(before, after);
        const text = result.ok
          ? stringifyResult(result.value)
          : `fel: ${String((result.error as Error)?.message)}`;
        const looksDenied =
          !result.ok || /"success":false/.test(text) || text === "[]";
        if (
          changes.length > 0 ||
          vi.mocked(sendMail).mock.calls.length > 0 ||
          (!looksDenied && text !== anonText)
        )
          effective = true;
        if (changes.length > 0) await revert(changes);
      }
      if (!effective) shallow.push(`${e.file}#${e.name}`);
    }
    expect(shallow.sort()).toEqual(Object.keys(KNOWN_SHALLOW).sort());
  });
});

// --- Riktade fall ------------------------------------------------------------

describe("studions borttagning går inte att kringgå", () => {
  // autobook har en flagga (explicit) som stänger av spärrarna, och en
  // bokning häver studions borttagning av eleven. Den får därför inte vara
  // en server action: då kan kunden anropa den direkt med explicit: true på
  // sitt eget köp och boka tillbaka sig. bookMyCourse är kundens väg, och
  // den nekar ("removedByStudio").

  async function ownPurchaseRemovedByStudio(autobookProduct: boolean) {
    const course = await createCourse({ teacher: s.teacher, future: 3 });
    const product = await createProduct({
      type: "COURSE",
      courses: [course],
      lessonsIncluded: 10,
      autobook: false,
    });
    const { items } = await buy({ admin: s.admin, buyer: s.attacker, product });
    if (autobookProduct)
      await prisma.product.update({
        where: { id: product.id },
        data: { autobook: true },
      });
    await prisma.courseRosterEntry.create({
      data: {
        courseId: course.id,
        studentKey: `user:${s.attacker.id}`,
        userId: s.attacker.id,
        status: "REMOVED",
        changedByUserId: s.admin.id,
      },
    });
    return { course, item: items[0] };
  }

  async function stillRemoved(courseId: string, itemId: string) {
    const entry = await prisma.courseRosterEntry.findUnique({
      where: {
        courseId_studentKey: {
          courseId,
          studentKey: `user:${s.attacker.id}`,
        },
      },
    });
    const bookings = await prisma.booking.count({
      where: { purchaseItemId: itemId },
    });
    return { status: entry?.status, bookings };
  }

  it("ingen use server-fil exporterar autobook", () => {
    const exported = endpoints
      .filter((e) => e.name === "autobook")
      .map((e) => e.file);
    expect(exported).toEqual([]);
  });

  it("bookMyCourse nekar en elev som studion tagit bort", async () => {
    const { course, item } = await ownPurchaseRemovedByStudio(false);
    actAs({ id: s.attacker.id, role: "user" });
    const { bookMyCourse } = await import("@/lib/actions/schedule-actions");
    const res = await bookMyCourse(item.id);
    actAs(null);
    expect(res).toEqual({ success: false, reason: "removedByStudio" });
    expect(await stillRemoved(course.id, item.id)).toEqual({
      status: "REMOVED",
      bookings: 0,
    });
  });

  it("ingen server action låter kunden boka tillbaka sig", async () => {
    // Varje export anropas med kundens egen kursrad i alla positioner, och
    // med de flaggor en angripare skulle pröva. Efteråt ska eleven fortfarande
    // vara borttagen och sakna bokningar på raden.
    const autobooking = await ownPurchaseRemovedByStudio(true);
    const manual = await ownPurchaseRemovedByStudio(false);
    const bypasses: string[] = [];

    for (const { course, item } of [autobooking, manual]) {
      const variants = (fn: AnyFn): unknown[][] => [
        Array.from({ length: Math.max(fn.length, 1) }, () => item.id),
        [item.id, true],
        [item.id, undefined, { explicit: true }],
        [item.id, null, { explicit: true }],
        [course.id, `user:${s.attacker.id}`],
      ];
      for (const e of endpoints) {
        if (e.name in SKIP) continue;
        for (const args of variants(e.fn)) {
          actAs({ id: s.attacker.id, role: "user" });
          const before = await snapshot();
          await invoke(e.fn, args);
          const after = await snapshot();
          actAs(null);
          const state = await stillRemoved(course.id, item.id);
          if (state.status !== "REMOVED" || state.bookings > 0)
            bypasses.push(
              `${e.file}#${e.name}(${stringifyResult(args)}) → ${stringifyResult(state)}`,
            );
          const changes = diffSnapshots(before, after);
          if (changes.length > 0) await revert(changes);
        }
      }
    }
    expect(bypasses).toEqual([]);
  });

  it("bookMyCourse bokar inte en kurs som kunden valt bort i paketet", async () => {
    // Paket med maxCourses: kunden valde courseA. Köpet skapar bara rader för
    // valda kurser; en rad för den bortvalda kursen läggs dit för hand — som
    // om den funnits kvar från ett tidigare kursval.
    const product = await createProduct({
      type: "PACK",
      courses: [s.courseA, s.courseB],
      lessonsIncluded: 10,
      maxCourses: 1,
    });
    const { items } = await buy({
      admin: s.admin,
      buyer: s.attacker,
      product,
      selectedCourseIds: [s.courseA.id],
    });
    expect(items.map((i) => i.courseId)).toEqual([s.courseA.id]);
    const other = await prisma.purchaseItem.create({
      data: {
        purchaseId: items[0].purchaseId,
        orderItemId: items[0].orderItemId,
        courseId: s.courseB.id,
        type: "PACK",
        lessonsIncluded: 10,
        remainingCount: 10,
      },
    });

    actAs({ id: s.attacker.id, role: "user" });
    const { bookMyCourse } = await import("@/lib/actions/schedule-actions");
    const res = await bookMyCourse(other.id);
    actAs(null);
    expect(res.success).toBe(false);
    expect(
      await prisma.booking.count({ where: { purchaseItemId: other.id } }),
    ).toBe(0);
  });
});

describe("kassan", () => {
  it("en kund kan inte beställa en inaktiv produkt", async () => {
    const product = await createProduct({
      type: "COURSE",
      courses: [s.courseA],
      lessonsIncluded: 10,
    });
    await prisma.product.update({
      where: { id: product.id },
      data: { active: false },
    });

    actAs({ id: s.attacker.id, role: "user" });
    const { createCheckout } = await import("@/lib/actions/checkout");
    const result = await invoke(createCheckout as AnyFn, [
      {
        items: [{ productId: product.id, count: 1 }],
        invoice: { ...otherInvoice },
      },
    ]);
    actAs(null);

    expect(result.ok).toBe(false);
    expect(
      await prisma.orderItem.count({ where: { productId: product.id } }),
    ).toBe(0);
  });

  it("en kund kan inte anmäla någon annans deltagare", async () => {
    actAs({ id: s.attacker.id, role: "user" });
    const { createCheckout } = await import("@/lib/actions/checkout");
    const result = await invoke(createCheckout as AnyFn, [
      {
        items: [
          {
            productId: s.prodClip.id,
            count: 1,
            participantId: s.victimParticipant2.id,
          },
        ],
        invoice: { ...otherInvoice },
      },
    ]);
    actAs(null);

    expect(result.ok).toBe(false);
    expect(
      await prisma.orderItem.count({
        where: {
          participantId: s.victimParticipant2.id,
          order: { userId: s.attacker.id },
        },
      }),
    ).toBe(0);
  });
});
