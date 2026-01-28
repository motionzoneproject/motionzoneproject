"use server";

// Is this better?

import { revalidatePath } from "next/cache";
import type z from "zod";
import type {
  Course,
  Prisma,
  Product,
  SchemaItem,
  Termin,
  Weekday,
} from "@/generated/prisma/client";
import {
  AdminProductCourseItemSchema,
  adminAddCourseSchema,
  adminAddCourseToSchemaSchema,
  adminAddProductSchema,
  adminAddTerminSchema,
  adminLessonFormSchema,
} from "@/validations/adminforms";
import prisma from "../prisma";

import { formToDbDate } from "../time-convert";
import { handleClips } from "./purchase-actions";
import { getSessionData } from "./sessiondata";

/**
 * Check if session user is admin.
 * @returns true/false
 */
export async function isAdminRole(): Promise<boolean> {
  const sessiondata = await getSessionData();

  return sessiondata?.user.role === "admin";
}

/**
 * Get a list of all "terminer" in db.
 * @returns Promise of Terminer as a list of Termin[].
 */
export async function getTerminer(): Promise<Termin[]> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return [];

  const terminer = await prisma.termin.findMany({
    orderBy: { startDate: "asc" },
  });
  return terminer;
}

/**
 * Needed in admin/termin to list all schemaitems, including course for building coursename (see GetCourseName in app/tools).
 *
 */
export type SchemaItemWithCourse = SchemaItem & { course: Course };

/**
 * Gets schemaItems (with course) for a specific termin
 * @param terminId The id of the termin.
 * @returns schemaItems (with course) for a specific termin as an array of type SchemaItemWithCourse
 */
export async function getSchemaItems(
  terminId: string,
): Promise<SchemaItemWithCourse[]> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return [];

  const schemaItems = await prisma.schemaItem.findMany({
    where: { terminId },
    include: { course: true },
  });

  return schemaItems;
}

/**
 * Listing courses, with filter for course name. (Notice that its not searching for the combined name only the db field name)
 * @param q term for course name.
 * @returns the found courses as Course[]
 */
export async function getAllCourses(q: string = ""): Promise<Course[]> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return [];

  const courses = await prisma.course.findMany({
    where: { name: { contains: q, mode: "insensitive" } },
    orderBy: { name: "asc" },
  });
  return courses;
}

/**
 * Creates a new termin.
 * Konverterar datumsträngar till Date-objekt innan de sparas i databasen.
 * * @param formData - Data som validerats mot `adminAddTerminSchema` (innehåller namn, start- och slutdatum).
 * @returns Ett objekt med `success: boolean` och ett meddelande (`msg`).
 * Returnerar ett felmeddelande om behörighet saknas eller om valideringen misslyckas.
 * @auth Admin
 */
export async function addNewTermin(
  formData: z.infer<typeof adminAddTerminSchema>,
) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    // Validate terminSchema.
    const validated = await adminAddTerminSchema.parseAsync(formData);

    const newSchemaItem = await prisma.termin.create({
      data: {
        name: validated.name,
        startDate: new Date(validated.startDate),
        endDate: new Date(validated.endDate),
      },
    });
    return {
      success: true,
      msg: `Terminen ${newSchemaItem.name} skapades.`,
    };
  } catch (e) {
    return { success: false, msg: JSON.stringify(e) };
  }
}

/**
 * Kontrollerar om en ändring av terminens datum kommer att påverka befintliga bokningar.
 * Räknar hur många bokningar som hamnar utanför det nya tidsintervallet och därmed riskerar att bli ogiltiga.
 * * @param terminId - ID:t för terminen som ska kontrolleras.
 * @param newStart - Det föreslagna nya startdatumet för terminen.
 * @param newEnd - Det föreslagna nya slutdatumet för terminen.
 * @returns Ett objekt med `count` som anger antalet påverkade bokningar. Returnerar 0 om användaren inte är admin.
 * @auth Admin
 */
export async function checkTerminDateChange(
  terminId: string,
  newStart: Date,
  newEnd: Date,
) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { count: 0 };

  const affectedBookings = await prisma.booking.count({
    where: {
      lesson: {
        terminId: terminId,
        OR: [{ startTime: { lt: newStart } }, { startTime: { gt: newEnd } }],
      },
    },
  });

  return { count: affectedBookings };
}

/**
 * Uppdaterar en befintlig termin och synkroniserar alla tillhörande lektioner och bokningar.
 * * Funktionen körs som en Prisma-transaktion och utför följande steg:
 * 1. Uppdaterar terminens namn och datumintervall.
 * 2. Identifierar bokningar som hamnar utanför det nya intervallet och återställer
 * nyttjade lektionstillfällen (remainingCount) till elevernas köp.
 * 3. Raderar lektioner som hamnar utanför det nya intervallet (med tillhörande bokningar).
 * 4. Genererar automatiskt nya lektioner för eventuella nya datum som tillkommit i intervallet,
 * baserat på terminens befintliga SchemaItems (veckomallar).
 * * @param id - Det unika ID:t för terminen som ska redigeras.
 * @param formData - Validerad data från formuläret (namn, startdatum, slutdatum).
 * @returns Ett objekt med success-status och ett beskrivande meddelande till användaren.
 * @auth Admin
 */
export async function editTermin(
  id: string,
  formData: z.infer<typeof adminAddTerminSchema>,
) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminAddTerminSchema.parseAsync(formData);
    const newStartDate = new Date(validated.startDate);
    const newEndDate = new Date(validated.endDate);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Uppdatera själva terminen
      const updatedTermin = await tx.termin.update({
        where: { id },
        data: {
          name: validated.name,
          startDate: newStartDate,
          endDate: newEndDate,
        },
      });

      // 2. Hantera bokningar som hamnar utanför de nya datumen (Återbetalning).
      const affectedBookings = await tx.booking.findMany({
        where: {
          lesson: {
            terminId: id,
            OR: [
              { startTime: { lt: newStartDate } },
              { startTime: { gt: newEndDate } },
            ],
          },
        },
        select: { id: true, purchaseItemId: true },
      });

      for (const booking of affectedBookings) {
        if (!booking.purchaseItemId) continue;

        // Ge tillbaka klipp via handleClips:
        const clipResult = await handleClips(tx, booking.purchaseItemId, 1);

        if (!clipResult.success) {
          throw new Error(clipResult.msg || "Clip update failed.");
        }
      }

      // 3. Hämta alla schemaItems för att synka lektioner
      const schemaItems = await tx.schemaItem.findMany({
        where: { terminId: id },
        include: {
          course: true,
          Lessons: true,
        },
      });

      // 4. Städa bort lektioner som nu ligger utanför intervallet
      // (Bokningarna raderas här pga Cascade Delete, klippen är redan återställda ovan).
      await tx.lesson.deleteMany({
        where: {
          terminId: id,
          OR: [
            { startTime: { lt: newStartDate } },
            { startTime: { gt: newEndDate } },
          ],
        },
      });

      // 5. Skapa nya lektioner för de datum som tillkommit
      const WEEKDAY_MAP: Record<string, number> = {
        MONDAY: 1,
        TUESDAY: 2,
        WEDNESDAY: 3,
        THURSDAY: 4,
        FRIDAY: 5,
        SATURDAY: 6,
        SUNDAY: 0,
      };

      const lessonsToCreate = [];

      for (const item of schemaItems) {
        const targetDay = WEEKDAY_MAP[item.weekday];
        const currentDate = new Date(newStartDate.getTime());

        const startHours = item.timeStart.getHours();
        const startMinutes = item.timeStart.getMinutes();
        const endHours = item.timeEnd.getHours();
        const endMinutes = item.timeEnd.getMinutes();

        while (currentDate <= newEndDate) {
          currentDate.setHours(0, 0, 0, 0);

          if (currentDate.getDay() === targetDay) {
            const combinedStartTime = new Date(currentDate.getTime());
            combinedStartTime.setHours(startHours, startMinutes, 0, 0);

            // Kolla om lektionen redan finns (så vi inte skapar dubbletter)
            const exists = item.Lessons.some(
              (l) => l.startTime.getTime() === combinedStartTime.getTime(),
            );

            if (!exists) {
              const combinedEndTime = new Date(currentDate.getTime());
              combinedEndTime.setHours(endHours, endMinutes, 0, 0);

              lessonsToCreate.push({
                startTime: combinedStartTime,
                endTime: combinedEndTime,
                terminId: id,
                courseId: item.courseId,
                teacherId: item.course.teacherId,
                maxBookings: item.maxBookings,
                schemaItemId: item.id,
              });
            }
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      if (lessonsToCreate.length > 0) {
        await tx.lesson.createMany({
          data: lessonsToCreate,
        });
      }

      return updatedTermin;
    });

    revalidatePath("/admin/courses");

    return {
      success: true,
      msg: `Terminen "${result.name}" har uppdaterats. Eventuella bokningar utanför perioden har raderats och bokningar har återställts till eleverna.`,
    };
  } catch (e) {
    console.error("Fel vid editTermin:", e);
    return { success: false, msg: "Ett fel uppstod vid uppdatering." };
  }
}

/**
 * Lägger till en kurs i en termins schema och genererar automatiskt alla lektionstillfällen.
 * * Funktionen utför följande steg:
 * 1. Validerar indata och kontrollerar att kursen existerar.
 * 2. Skapar ett `SchemaItem` som fungerar som en veckomall för kursen.
 * 3. Anropar `createLessons` för att generera faktiska `Lesson`-poster för varje aktuell
 * veckodag mellan terminens start- och slutdatum.
 * 4. Om inga lektioner kan skapas (t.ex. om terminen är för kort) rullas skapandet
 * av schemaposten tillbaka för att undvika inkonsistent data.
 * * @param terminId - ID för den termin där kursen ska läggas till.
 * @param formData - Validerad data innehållande kurs-ID, plats, veckodag samt start- och sluttid.
 * @returns Ett objekt med framgångsstatus och ett beskrivande meddelande om hur många lektioner som skapades.
 * @auth Admin
 */
export async function addCoursetoSchema(
  terminId: string,
  formData: z.infer<typeof adminAddCourseToSchemaSchema>,
): Promise<{
  success: boolean;
  msg: string;
}> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminAddCourseToSchemaSchema.parseAsync(formData);

    const getCourse = await prisma.course.findUnique({
      where: { id: validated.courseId },
    });

    if (!getCourse) throw new Error("Course was not found.");

    // fix: lägg in så den kopplar terminen till kursen också?

    const newSchemaItem = await prisma.schemaItem.create({
      data: {
        terminId,
        place: validated.place,
        courseId: validated.courseId,
        maxBookings: getCourse?.maxBookings,
        timeStart: formToDbDate(validated.timeStart),
        timeEnd: formToDbDate(validated.timeEnd),
        weekday: validated.day as Weekday,
      },
      include: { course: true, termin: true },
    });

    // SKapa lessons!
    const lessons = await createLessons(newSchemaItem.id);

    if (!lessons.success) {
      const del = await prisma.schemaItem.delete({
        where: { id: newSchemaItem.id },
      });
      if (!del)
        throw new Error(
          "SchemaItem was created, but could not create lessons, and could not delete the schemaItem. Empty schemaItem can be in the db.",
        );

      throw new Error(
        "Inga lektioner kunde skapas inom denna termin. Kontrollera startDate och endDate så de täcker bokningsbara dagar.",
      );
    }

    return {
      success: true,
      msg: `Kursen ${newSchemaItem.course.name} lades till i terminen ${newSchemaItem.termin.name}. ${lessons.msg}`,
    };
  } catch (e) {
    return { success: false, msg: JSON.stringify(e) };
  }
}

/**
 * Tar bort ett SchemaItem från en termin.
 * * @important På grund av databasens konfiguration (Cascade Delete) kommer detta även
 * att radera samtliga lektionstillfällen (Lessons) och tillhörande bokningar.
 * Klipp ges tillbaka till kunderna.
 * * @param id - Det unika ID:t för den schemapost som ska raderas.
 * @returns Ett objekt med success-status och ett meddelande som bekräftar vilken kurs som togs bort.
 * @auth Admin
 */
export async function delSchemaItem(
  id: string,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    // Hämta ev bokningar som är gjorda i kursen.
    const bookings = await prisma.booking.findMany({
      where: {
        lesson: { schemaItemId: id },
        cancelled: false,
      },
      select: {
        id: true,
        purchaseItemId: true,
      },
    });

    // Vi sparar resultatet från transaktionen i en variabel
    const result = await prisma.$transaction(async (tx) => {
      if (bookings.length > 0) {
        for (const booking of bookings) {
          if (!booking.purchaseItemId) continue;

          // Sköts via handleClips:
          const clipResult = await handleClips(tx, booking.purchaseItemId, 1);
          if (!clipResult.success) {
            throw new Error(clipResult.msg || "Clip update failed.");
          }
        }
      }

      const del = await tx.schemaItem.delete({
        where: { id },
        select: { course: { select: { name: true } } },
      });

      return {
        success: true,
        msg: `${del.course.name} och dess bokningar togs bort. ${bookings.length} klipp har återställts.`,
      };
    });

    return result;
  } catch (e) {
    console.error(e);
    return {
      success: false,
      msg: "Ett fel uppstod vid radering av schemaposten.",
    };
  }
}

/**
 * Raderar en hel termin från systemet. Bokningar betalas tillbaka.
 * * @important Denna operation triggar en kaskad-radering (Cascade Delete). Detta innebär
 * att alla SchemaItems, lektioner och bokningar.
 * som är kopplade till denna termin kommer att raderas permanent från databasen.
 * * @param id - Det unika ID:t för terminen som ska raderas.
 * @returns Ett objekt med success-status och ett meddelande som bekräftar att terminen tagits bort.
 * @auth Admin
 */
export async function delTermin(
  id: string,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    // 1. Hitta alla aktiva bokningar kopplade till denna termin
    const bookings = await prisma.booking.findMany({
      where: {
        lesson: { terminId: id },
        cancelled: false, // Hmm, ska vi verkligen ignorera detta? Kommer ligga onödiga bokningar. Eller just det, ja för annars betalas inställda bokningar tillbaka. Ev. fix för att inte ha onödig data i db.
      },
      select: { purchaseItemId: true },
    });

    // 2. Kör transaktionen
    const result = await prisma.$transaction(async (tx) => {
      // Återställ alla klipp
      if (bookings.length > 0) {
        for (const booking of bookings) {
          if (!booking.purchaseItemId) continue;

          // Via handleClips :)
          const clipResult = await handleClips(tx, booking.purchaseItemId, 1);

          if (!clipResult.success) {
            throw new Error(clipResult.msg || "Clip update failed.");
          }
        }
      }

      // Radera terminen (triggar cascade för resten)
      const deletedTermin = await tx.termin.delete({
        where: { id },
        select: { name: true },
      });

      return deletedTermin.name;
    });

    revalidatePath("/admin/termins");

    return {
      success: true,
      msg: `Terminen ${result} och ${bookings.length} tillhörande bokningar raderades. Klipp har återställts.`,
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      msg: "Kunde inte radera terminen. Kontrollera om den har aktiva kopplingar som hindrar radering.",
    };
  }
}

/**
 * Raderar en kurs permanent från systemet.
 * * @important
 * Denna operation triggar en kaskad-radering (Cascade Delete) på SchemaItems, Lessons
 * och Bookings kopplade till kursen. För att skydda användarnas saldo återförs klipp
 * för alla aktiva bokningar innan raderingen genomförs.
 * * @note
 * Tack vare 'onDelete: Restrict' i databasschemat kommer denna funktion att misslyckas
 * (kasta ett fel) om det finns PurchaseItems (aktiva kundinnehav) kopplade till kursen.
 * Detta är ett skydd för att inte radera kurser som kunder har betalat för.
 * * @param id - Det unika ID:t (UUID) för kursen som ska raderas.
 * @returns Ett objekt med success-status och ett meddelande. Vid misslyckande pga
 * befintliga kundköp returneras ett förklarande felmeddelande.
 * * @auth Admin
 */
export async function delCourse(
  id: string,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    // Hitta aktiva bokningar för denna kurs (för att återställa =))
    const bookings = await prisma.booking.findMany({
      where: {
        lesson: { courseId: id },
        cancelled: false,
      },
      select: { purchaseItemId: true },
    });

    // Kör transaktionen
    const result = await prisma.$transaction(async (tx) => {
      // Återställ klipp för de bokningar som kommer raderas via cascade
      if (bookings.length > 0) {
        for (const booking of bookings) {
          if (!booking.purchaseItemId) continue;

          // Via handleclips:
          const clipResult = await handleClips(tx, booking.purchaseItemId, 1);
          if (!clipResult.success) {
            throw new Error(clipResult.msg || "Clip update failed.");
          }
        }
      }

      // 3. Försök radera kursen (om den finns i produkt så kommer inte transaktionen gå igenom.)
      const deletedCourse = await tx.course.delete({
        where: { id },
        select: { name: true },
      });

      return deletedCourse.name;
    });

    revalidatePath("/admin/courses");

    return {
      success: true,
      msg: `Kursen ${result} raderades. ${bookings.length} bokningar togs bort och klipp återställdes.`,
    };
  } catch (e) {
    console.error(e);

    return {
      success: false,
      msg: `Kunde inte radera kursen. ${JSON.stringify(e)}`,
    };
  }
}

/**
 * Skapar en ny kurs i systemet och kopplar den till en lärare.
 * * @important
 * Funktionen validerar att `teacherId` tillhör en existerande användare med rollen 'admin'.
 * Detta säkerställer att endast behörig personal kan agera som kursledare och visas i schemat.
 * * @param formData - Validerad data enligt `adminAddCourseSchema`. Innehåller grunddata som:
 * - `name`: Kursens namn.
 * - `teacherid`: ID för läraren/admin som ska hålla kursen.
 * - `maxbookings`: Antal platser per lektionstillfälle.
 * - `maxCustomers`: Totalt antal unika kunder som kan köpa in sig på kursen.
 * - `description`: Kursbeskrivning och detaljer.
 * - `minAge`/`maxAge`/`level`: Kriterier för deltagande.
 * * @returns Ett objekt med success-status och ett bekräftande meddelande med kursens namn.
 * @throws Kastar ett fel om läraren inte hittas eller saknar admin-rättigheter.
 * @auth Admin
 */
export async function addNewCourse(
  formData: z.output<typeof adminAddCourseSchema>,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminAddCourseSchema.parseAsync(formData);

    const checkTeacherId = await prisma.user.findUnique({
      where: { id: validated.teacherid },
    });

    if (!(checkTeacherId && checkTeacherId.role === "admin"))
      throw new Error(
        `A teacher with id ${validated.teacherid} was not found.`,
      );

    const newCourseItem = await prisma.course.create({
      data: {
        name: validated.name,
        maxBookings: validated.maxbookings,
        maxCustomer: validated.maxCustomers,
        minAge: validated.minAge,
        maxAge: validated.maxAge,
        level: validated.level,
        adult: validated.adult,
        description: validated.description,
        teacherId: validated.teacherid,
      },
    });
    return {
      success: true,
      msg: `Kursen ${newCourseItem.name} skapades.`,
    };
  } catch (e) {
    return { success: false, msg: JSON.stringify(e) };
  }
}

/**
 * Uppdaterar informationen för en befintlig kurs.
 * Kontrollerar att den angivna läraren existerar och har rätt behörighet innan uppdatering sker.
 * * @param id - Det unika ID:t för kursen som ska redigeras.
 * @param formData - Validerad data från `adminAddCourseSchema` innehållande kursnamn, beskrivning, lärare och restriktioner (ålder, nivå etc.).
 * @returns Ett objekt med success-status och ett meddelande som bekräftar ändringen.
 * @throws Kastar ett fel om läraren inte hittas eller inte har rollen "admin".
 * @auth Admin
 */
export async function editCourse(
  id: string,
  formData: z.output<typeof adminAddCourseSchema>,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminAddCourseSchema.parseAsync(formData);

    const checkTeacherId = await prisma.user.findUnique({
      where: { id: validated.teacherid },
    });

    if (!(checkTeacherId && checkTeacherId.role === "admin"))
      throw new Error(
        `A teacher with id ${validated.teacherid} was not found.`,
      );

    // Kolla hur många som redan har kursen via ett köp
    const currentSubscribers = await prisma.purchaseItem.count({
      where: { courseId: id },
    });

    // Om admin försöker sänka taket under antalet nuvarande kunder
    if (validated.maxCustomers < currentSubscribers) {
      return {
        success: false,
        msg: `Kan inte sänka max antal kunder till ${validated.maxCustomers}. Det finns redan ${currentSubscribers} kunder som äger kursen.`,
      };
    }

    const newCourseItem = await prisma.course.update({
      data: {
        name: validated.name,
        maxBookings: validated.maxbookings,
        maxCustomer: validated.maxCustomers,
        minAge: validated.minAge,
        maxAge: validated.maxAge,
        level: validated.level,
        adult: validated.adult,
        description: validated.description,
        teacherId: validated.teacherid, // Om en lärare går in nu och ändrar en kurs, blir han lärare. fix.
      },
      where: { id: id },
    });
    return {
      success: true,
      msg: `Kursen ${newCourseItem.name} ändrades.`,
    };
  } catch (e) {
    return { success: false, msg: JSON.stringify(e) };
  }
}

// *

/**
 * Genererar fysiska lektionstillfällen baserat på SchemaItem.
 * * Funktionen itererar genom varje dag mellan terminens start- och slutdatum,
 * identifierar alla datum som matchar den angivna veckodagen och skapar
 * lektionsobjekt med korrekta tidsstämplar.
 * * @param schemaItemId - ID:t för den schemamall som ska användas som underlag.
 * @returns Ett objekt med success-status och ett meddelande som anger hur många lektioner som skapats.
 * @throws Fel om SchemaItem eller dess tillhörande termin/kurs saknas.
 * @internal Denna funktion anropas främst av `addCoursetoSchema` och bör användas med försiktighet utanför transaktioner.
 */
async function createLessons(
  schemaItemId: string,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    // Hämtar all data vi behöver.

    // Behöver vi validatera någonting här? ev. fix.

    const schemaItm = await prisma.schemaItem.findUnique({
      where: { id: schemaItemId },
      include: { termin: true, course: true },
    });

    if (!schemaItm) throw new Error("schemaItm kunde inte hittas.");

    const WEEKDAY_MAP: Record<Weekday, number> = {
      MONDAY: 1,
      TUESDAY: 2,
      WEDNESDAY: 3,
      THURSDAY: 4,
      FRIDAY: 5,
      SATURDAY: 6,
      SUNDAY: 0,
    };

    const targetDay = WEEKDAY_MAP[schemaItm?.weekday]; // Få targetday som rätt nummer.

    const startDate = schemaItm.termin.startDate;
    const endDate = schemaItm.termin.endDate;
    const teacherId = schemaItm.course.teacherId;

    const lessonsToCreate = []; // Dessa lessions ska skapas.

    const currentDate = new Date(startDate.getTime());
    const startHours = schemaItm.timeStart.getHours();
    const startMinutes = schemaItm.timeStart.getMinutes();
    const endHours = schemaItm.timeEnd.getHours();
    const endMinutes = schemaItm.timeEnd.getMinutes();

    /// Så nu loopar vi igenom alla targetdays inom den perioden:

    while (currentDate <= endDate) {
      currentDate.setHours(0, 0, 0, 0);

      // Jämför veckodag (getDay() returnerar 0-6)
      if (currentDate.getDay() === targetDay) {
        // Skapa startTime: Kombinera matchande datum med tidskomponenten
        const combinedStartTime = new Date(currentDate.getTime());
        combinedStartTime.setHours(startHours, startMinutes, 0, 0); // Sätt tid, nollställ sek/ms

        // Skapa endTime: Kombinera matchande datum med tidskomponenten
        const combinedEndTime = new Date(currentDate.getTime());
        combinedEndTime.setHours(endHours, endMinutes, 0, 0);

        lessonsToCreate.push({
          startTime: combinedStartTime,
          endTime: combinedEndTime,
          terminId: schemaItm.termin.id,
          courseId: schemaItm.course.id,
          teacherId: teacherId,
          maxBookings: schemaItm.maxBookings,
          schemaItemId: schemaItm.id, // Denna kopplar Lesson till mallen
          // message och cancelled får standardvärden/null
        });
      }
      // Gå till nästa dag
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Kontrollera om det finns något att skapa
    if (lessonsToCreate.length === 0) {
      return {
        success: false,
        msg: "No matching days found to create lessons.",
      };
    }

    // 1. Definiera de operationer som ska ingå i transaktionen
    const creationOperation = prisma.lesson.createMany({
      data: lessonsToCreate,
      skipDuplicates: true,
    });

    const [result] = await prisma.$transaction([creationOperation]);

    return {
      success: true,
      msg: `Successfully created ${result.count} lessons.`,
    };
  } catch (e) {
    return { success: false, msg: JSON.stringify(e) };
  }
}

/**
 * Uppdaterar status för ett specifikt lektionstillfälle och synkroniserar elevernas klippsaldo.
 * * Funktionen körs som en transaktion och hanterar följande logik:
 * 1. Om lektionen ställs in (`cancelled` blir true): Alla elever som bokat lektionen får tillbaka ett klipp (+1 i `remainingCount`).
 * 2. Om en inställd lektion återaktiveras (`cancelled` blir false): Ett klipp dras av från de bokade eleverna igen (-1 i `remainingCount`).
 * 3. Uppdaterar lektionens meddelande och inställningsstatus.
 * 4. Synkroniserar status på alla befintliga bokningar kopplade till lektionen.
 * * @param formData - Validerad data från `adminLessonFormSchema` innehållande lektions-ID, status och meddelande.
 * @returns Ett objekt med success-status och ett bekräftande meddelande.
 * @auth Admin
 */
export async function editLessonItem(
  formData: z.output<typeof adminLessonFormSchema>,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminLessonFormSchema.parseAsync(formData);

    // 1. Hämta nuvarande status innan vi ändrar något
    const currentLesson = await prisma.lesson.findUnique({
      where: { id: validated.id },
      include: { bookings: true },
    });

    if (!currentLesson) return { success: false, msg: "Lesson not found." };

    await prisma.$transaction(async (tx) => {
      // 2. Kolla om vi ställer in lektionen NU (från false till true)
      if (!currentLesson.cancelled && validated.cancelled) {
        for (const booking of currentLesson.bookings) {
          // Via rätt nu:
          const clipResult = await handleClips(tx, booking.purchaseItemId, 1);
          if (!clipResult.success) {
            throw new Error(clipResult.msg || "Clip update failed.");
          }
        }
      }
      // 3. Kolla om vi aktiverar en inställd lektion igen (från true till false)
      else if (currentLesson.cancelled && !validated.cancelled) {
        for (const booking of currentLesson.bookings) {
          // Via rätt nu:
          const clipResult = await handleClips(tx, booking.purchaseItemId, -1);
          if (!clipResult.success) {
            throw new Error(clipResult.msg || "Clip update failed.");
          }
        }
      }

      // 4. Uppdatera själva lektionen och bokningarna
      await tx.lesson.update({
        where: { id: validated.id },
        data: {
          message: validated.message,
          cancelled: validated.cancelled,
        },
      });

      await tx.booking.updateMany({
        where: { lessonId: validated.id },
        data: { cancelled: validated.cancelled },
      });
    });

    revalidatePath("/admin/courses");

    return {
      success: true,
      msg: "Lektionen och klipp-saldon har uppdaterats.",
    };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Ett fel uppstod vid uppdatering." };
  }
}

/**
 * Hämtar samtliga produkter från databasen sorterade i alfabetisk ordning efter namn.
 * * @returns En Promise som löser ut till en array av samtliga produkter.
 * Returnerar en tom array om den anropande användaren saknar administratörsbehörighet.
 * @auth Admin
 */
export async function getAllProducts(): Promise<Product[]> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return [];

  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });

  return products;
}

/**
 * Representerar kopplingen mellan en produkt och en kurs (ProductOnCourse).
 * Innehåller både den råa relationsdatan och det fullständiga kurs-objektet.
 * * @property course - Det fullständiga Course-objektet med all kursinformation.
 * @property courseId - Det unika ID:t för den kopplade kursen.
 * @property productId - Det unika ID:t för produkten som kursen tillhör.
 * @property lessonsIncluded - Antalet lektionstillfällen som ingår för denna kurs i den specifika produkten.
 */
export type ProdCourse = {
  course: Course;
} & {
  courseId: string;
  productId: string;
  lessonsIncluded: number;
};

/**
 * Skapar en ny produkt i systemet baserat på validerad formulärdata.
 * * @param formData - Validerad data från `adminAddProductSchema`. Innehåller namn,
 * beskrivning, pris, kundbegränsning samt klippkortsinformation.
 * @returns Ett objekt med success-status och ett bekräftande meddelande med produktens namn.
 * @auth Admin
 */
export async function addNewProduct(
  formData: z.output<typeof adminAddProductSchema>,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminAddProductSchema.parseAsync(formData);

    const newProd = await prisma.product.create({
      data: {
        name: validated.name,
        description: validated.description,
        price: validated.price,
        maxCustomer: validated.maxCustomers,
        totalCount: validated.clipCount,
      },
    });

    // Uppdatera typen:
    await updateProductType(newProd.id, { isClip: validated.clipcard });
    return {
      success: true,
      msg: `Produkten ${newProd.name} skapades.`, // fix
    };
  } catch (e) {
    return { success: false, msg: JSON.stringify(e) };
  }
}

/**
 * Uppdaterar informationen för en befintlig produkt och validerar försäljningskapacitet.
 * * @param id - Det unika ID:t för produkten som ska redigeras.
 * @param formData - Validerad data från `adminAddProductSchema`. Innehåller:
 * - `name` & `description`: Produktens rubrik och information.
 * - `price`: Det nya priset för framtida köp.
 * - `clipcard`: Boolean som avgör om produkten fungerar som ett klippkort.
 * - `maxCustomers`: Det totala taket för hur många kunder som kan köpa produkten.
 * - `clipCount`: Antalet tillgängliga bokningar per köp (om klippkort).
 * * @description
 * Funktionen genomför en säkerhetskontroll av `maxCustomers`. Om administratören
 * försöker sänka taket till ett värde som är lägre än antalet redan genomförda köp
 * (`salesCount`), stoppas uppdateringen för att undvika logiska fel i systemets
 * kapacitetsberäkning.
 * * @returns Ett objekt med success-status och ett meddelande som bekräftar ändringen.
 * @auth Admin
 */
export async function editProduct(
  id: string,
  formData: z.output<typeof adminAddProductSchema>,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminAddProductSchema.parseAsync(formData);

    // kolla så vi inte sänker för lågt. och får minus i plats kvar osv.
    const salesCount = await prisma.purchase.count({
      where: { productId: id },
    });
    if (validated.maxCustomers < salesCount) {
      return {
        success: false,
        msg: "Kan inte sänka maxantalet under redan sålt antal.",
      };
    }

    const newProd = await prisma.product.update({
      where: { id },
      data: {
        name: validated.name,
        description: validated.description,
        price: validated.price,
        maxCustomer: validated.maxCustomers,
        totalCount: validated.clipCount,
      },
    });

    // Uppdatera typen.
    await updateProductType(id, { isClip: validated.clipcard });

    return {
      success: true,
      msg: `Produkten ${newProd.name} ändrades.`, // fix
    };
  } catch (e) {
    return { success: false, msg: JSON.stringify(e) };
  }
}

/**
 * Raderar en produkt permanent från systemet.
 * * @param id - Det unika ID:t för produkten som ska raderas.
 * * @description
 * Funktionen försöker radera produkten från databasen. Tack vare databasens
 * referensintegritet (onDelete: Restrict) kommer raderingen att nekas om det
 * finns befintliga köp (Purchases) eller orderrader (OrderItems) kopplade till
 * produkten. Detta förhindrar att historisk försäljnings- och bokföringsdata går förlorad.
 * * @returns Ett objekt med success-status och ett meddelande. Om produkten är
 * kopplad till befintliga köp returneras ett felmeddelande istället för att radera.
 * @auth Admin
 */
export async function removeProduct(
  id: string,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const remProd = await prisma.product.delete({
      where: { id },
    });
    return {
      success: true,
      msg: `Produkten ${remProd.name} togs bort.`, // fix
    };
  } catch (e) {
    return { success: false, msg: JSON.stringify(e) };
  }
}

/**
 * Kopplar en kurs till en produkt eller uppdaterar en befintlig koppling.
 * Bestämmer hur många lektioner av den specifika kursen som ska ingå i produkten.
 * * @param formData - Validerad data innehållande `courseId`, `productId` och `lessonsIncluded`.
 * @returns Ett objekt med success-status och ett bekräftande meddelande om kursen lades till eller uppdaterades.
 * * @description
 * Om kursen redan finns i produkten uppdateras antalet inkluderade lektioner.
 * Om den inte finns skapas en ny post i `productOnCourse`-tabellen.
 * @auth Admin
 */
export async function addCourseToProduct(
  formData: z.output<typeof AdminProductCourseItemSchema>,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  // unlimited kommer när vi gör product-issuen.

  try {
    const validated = await AdminProductCourseItemSchema.parseAsync(formData);

    // fix: använd upsert?
    // Kolla om den redan är inlagd (för att enkelt kunna ändra istället för att skapa.)
    const isInProd = await isCourseInProduct(
      formData.courseId,
      formData.productId,
    );

    if (isInProd.found) {
      await prisma.$transaction(async (tx) => {
        const productType = await updateProductType(validated.productId, {
          tx,
        });
        await tx.productOnCourse.update({
          where: {
            courseId_productId: {
              courseId: validated.courseId,
              productId: validated.productId,
            },
          },
          data: {
            lessonsIncluded:
              productType === "CLIP" ? 0 : validated.lessonsIncluded,
          },
        });
      });

      return {
        success: true,
        msg: `Kursen ändrades i produkten.`, // fix
      };
    } else {
      await prisma.$transaction(async (tx) => {
        const productType = await updateProductType(validated.productId, {
          tx,
        });
        await tx.productOnCourse.create({
          data: {
            productId: validated.productId,
            courseId: validated.courseId,
            lessonsIncluded:
              productType === "CLIP" ? 0 : validated.lessonsIncluded,
          },
        });
      });

      return {
        success: true,
        msg: `Kursen lades in i produkten.`,
      };
    }
  } catch (e) {
    return { success: false, msg: JSON.stringify(e) };
  }
}

/**
 * Tar bort kopplingen mellan en specifik kurs och en produkt.
 * Själva kursen och produkten lämnas orörda, men kursen kommer inte längre
 * att ingå i framtida köp av produkten.
 * * @param formData - Validerad data innehållande `courseId` och `productId`.
 * @returns Ett objekt med success-status och ett bekräftande meddelande.
 * @auth Admin
 */
export async function removeCourseInProduct(
  formData: z.output<typeof AdminProductCourseItemSchema>,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await AdminProductCourseItemSchema.parseAsync(formData);

    await prisma.$transaction(async (tx) => {
      await tx.productOnCourse.delete({
        where: {
          courseId_productId: {
            productId: validated.productId,
            courseId: validated.courseId,
          },
        },
      });
      await updateProductType(validated.productId, { tx });
    });
    return {
      success: true,
      msg: `Kursen togs bort i produkten.`, // fix
    };
  } catch (e) {
    return { success: false, msg: JSON.stringify(e) };
  }
}

/**
 * Kontrollerar om en specifik kurs redan är kopplad till en viss produkt.
 * Hämtar även metadata för hur många lessons man får boka om kopplingen existerar.
 * * @param courseId - ID för kursen som ska kontrolleras.
 * @param productId - ID för produkten som ska kontrolleras.
 * @returns Ett objekt med `found: boolean`. Om kopplingen finns inkluderas även `lessonsIncluded`.
 * @internal Används främst som kontrollsteg i `addCourseToProduct`.
 * @auth Admin
 */
export async function isCourseInProduct(
  courseId: string,
  productId: string,
): Promise<{ found: boolean; lessonsIncluded?: number }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { found: false };

  try {
    const found = await prisma.productOnCourse.findUnique({
      where: { courseId_productId: { courseId, productId } },
    });

    if (found) return { found: true, lessonsIncluded: found.lessonsIncluded };
    return { found: false };
  } catch (e) {
    console.error(e);
    return { found: false };
  }
}

/**
 * Räknar hur många gånger en specifik produkt har köpts (sålda orderrader).
 * Används ofta som kontrollsteg för att se om en produkt har en köphistorik
 * innan den raderas eller ändras.
 * * @param productId - ID:t för produkten som ska kontrolleras.
 * @returns Ett objekt med `found: boolean` (om sökningen lyckades) och `count` (antalet sålda enheter).
 * Returnerar `found: false` om användaren saknar behörighet eller om ett databasfel uppstår.
 * @auth Admin
 */
export async function countOrderItems(
  productId: string,
): Promise<{ found: boolean; count?: number }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { found: false };
  try {
    // ev. fix: Kolla orderstatus osv?

    const count = await prisma.orderItem.count({
      where: { productId: productId },
    });
    // Vi returnerar success: true även om count är 0
    return { found: true, count };
  } catch (e) {
    console.error(e);
    return { found: false, count: 0 };
  }
}
// ev fix, den används nu som "platser kvar".

/**
 * Analyserar användningen av en specifik kurs i relation till produkter och försäljning.
 * Beräknar både hur många produkter som innehåller kursen och hur många ordrar som lagts på dessa produkter.
 * * @param courseId - ID för kursen som ska analyseras.
 * @returns Ett objekt som innehåller:
 * - `found`: Om sökningen lyckades.
 * - `count`: Totalt antal sålda orderrader (OrderItems) för produkter där denna kurs ingår.
 * - `countProd`: Antal unika produkter som inkluderar denna kurs i sitt utbud.
 * * @description Denna funktion är avgörande för att bedöma konsekvenserna av att radera eller ändra en kurs,
 * då den visar om kursen är bunden till befintliga kundavtal och paket.
 * @auth Admin
 */
export async function countOrderItemsAndProductsCourse(
  courseId: string,
): Promise<{ found: boolean; count?: number; countProd?: number }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { found: false };
  try {
    const count = await prisma.orderItem.count({
      where: { product: { courses: { some: { courseId } } } },
    });

    const countProd = await prisma.product.count({
      where: { courses: { some: { courseId } } },
    });
    // Vi returnerar success: true även om count är 0
    return { found: true, count, countProd };
  } catch (e) {
    console.error(e);
    return { found: false };
  }
}
// ev. fix (utredning pågår)
// Varför den inte räknar "platser kvar":
// Om du vill veta hur många som just nu har tillgång till en kurs för att jämföra med maxCustomer (platser kvar), ska du titta på PurchaseItem.
// Ett OrderItem är bara ett kvitto på ett köp.
// Ett PurchaseItem är det faktiska "medlemskapet" som ger eleven rätt att boka.

/**
 * Hämtar information om en specifik lärare (användare) baserat på dess unika ID.
 * * @param userId - ID för den användare/lärare som ska hämtas.
 * @returns Ett objekt med:
 * - `found`: Boolean som indikerar om sökningen lyckades.
 * - `teacher`: Det fullständiga användarobjektet om det hittades, annars undefined.
 * * @description Funktionen används främst för att verifiera lärarens existens och hämta detaljer
 * vid tilldelning av lärare till kurser eller redigering av profiler.
 * @auth Admin
 */
export async function getTeacher(userId: string) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { found: false };
  try {
    const teacher = await prisma.user.findUnique({
      where: { id: userId },
    });

    return { found: true, teacher: teacher };
  } catch (e) {
    console.error(e);
    return { found: false };
  }
}

export type PrismaTx = Prisma.TransactionClient;

// Uppdaterar product.type baserat på om det är klippkort eller hur många kurser som är kopplade.
export async function updateProductType(
  productId: string,
  options?: { isClip?: boolean; tx?: PrismaTx },
): Promise<"COURSE" | "PACK" | "CLIP"> {
  const client = options?.tx ?? prisma;

  const product = await client.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      type: true,
      courses: { select: { courseId: true } },
    },
  });

  if (!product) {
    throw new Error("Product not found.");
  }

  const isClip = options?.isClip ?? product.type === "CLIP";
  const nextType = isClip
    ? "CLIP"
    : product.courses.length > 1
      ? "PACK"
      : "COURSE";

  if (product.type !== nextType) {
    await client.product.update({
      where: { id: product.id },
      data: { type: nextType },
    });
  }

  return nextType;
}
