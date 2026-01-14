"use server";

import { revalidatePath } from "next/cache";
import type z from "zod";
import type {
  Booking,
  Course,
  Lesson,
  Prisma,
  Product,
  SchemaItem,
  Termin,
  Weekday,
} from "@/generated/prisma/client";
import {
  AdminAddUserInLessonSchema,
  AdminProductCourseItemSchema,
  adminAddCourseSchema,
  adminAddCourseToSchemaSchema,
  adminAddProductSchema,
  adminAddTerminSchema,
  adminLessonFormSchema,
} from "@/validations/adminforms";
import prisma from "../prisma";
import { formToDbDate } from "../time-convert";
import { getSessionData } from "./sessiondata";

// Lika bra att exportera denna tänker jag.
export async function isAdminRole(): Promise<boolean> {
  const sessiondata = await getSessionData();

  return sessiondata?.user.role === "admin";
}

// Inser att det är svengelska. Men men.
export async function getTermin(): Promise<Termin[]> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return [];

  const terminer = await prisma.termin.findMany({
    orderBy: { startDate: "asc" },
  });
  return terminer;
}

// Behövs i admin - Termin för att läsa in alla SChemaItems, inkluderar course för att få kursdatan också. Kursnamnet byggs ihop baserat på flera uppgifter i Course (namn + ålder - nivå, se GetCourseName i tools), därför skickar vi just nu med all data.
export type SchemaItemWithCourse = SchemaItem & { course: Course };

// Tyo för att lista alla Lektioner inkl alla bokningar.
export type LessonWithBookings = Lesson & { bookings: Booking[] };

export type AdminLessonWithCourse = Lesson & { course: Course };

export type BookingWithPurchaseParticipant = Prisma.BookingGetPayload<{
  include: {
    purchaseItem: {
      include: {
        purchase: {
          include: {
            participant: { select: { id: true; name: true } };
          };
        };
      };
    };
  };
}>;

export async function getAdminLessons(): Promise<AdminLessonWithCourse[]> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return [];

  const lessons = await prisma.lesson.findMany({
    include: { course: true },
    orderBy: { startTime: "asc" },
  });

  return lessons;
}

/**
 * Hämtar alla schemaposter för en specifik termin.
 * Kräver admin-behörighet.
 * * @param terminId - Det unika ID:t för terminen som ska hämtas.
 * @returns En lista med SchemaItems inklusive tillhörande kursdata,
 * eller en tom lista om användaren inte är admin.
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
 * Hämtar samtliga kurser i systemet sorterade alfabetiskt efter namn.
 * * @returns En Promise som löser ut till en array av Course.
 * Returnerar en tom array om den anropande användaren saknar administratörsbehörighet.
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

export async function getBookingsFromLesson(
  lessonId: string,
): Promise<BookingWithPurchaseParticipant[]> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return [];

  try {
    const b = await prisma.booking.findMany({
      where: { lessonId: lessonId },
      include: {
        purchaseItem: {
          include: {
            purchase: {
              include: {
                participant: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
    return b;
  } catch (e) {
    console.error(JSON.stringify(e));
    return [];
  }
}

/**
 * Skapar en ny termin i systemet baserat på validerad formulärdata.
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

      // 2. Hämta alla schemaItems för att synka lektioner
      const schemaItems = await tx.schemaItem.findMany({
        where: { terminId: id },
        include: {
          course: true,
          Lessons: true,
        },
      });

      // 3. Hantera bokningar och klippkort som hamnar utanför de nya tidsramarna
      for (const item of schemaItems) {
        const validStart = item.customStartDate || newStartDate;
        const validEnd = item.customEndDate || newEndDate;

        const affectedBookings = await tx.booking.findMany({
          where: {
            lesson: {
              schemaItemId: item.id,
              OR: [
                { startTime: { lt: validStart } },
                { startTime: { gt: validEnd } },
              ],
            },
          },
          select: { id: true, purchaseItemId: true },
        });

        // Återställ klipp/lektioner till kontot för de som drabbas
        for (const booking of affectedBookings) {
          if (booking.purchaseItemId) {
            await tx.purchaseItem.update({
              where: { id: booking.purchaseItemId },
              data: { remainingCount: { increment: 1 } },
            });
          }
        }

        // 4. Städa bort lektioner som nu ligger utanför intervallet för denna specifika kurs
        await tx.lesson.deleteMany({
          where: {
            schemaItemId: item.id,
            OR: [
              { startTime: { lt: validStart } },
              { startTime: { gt: validEnd } },
            ],
          },
        });
      }

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

        // Här används de nya datumen eller kursens egna specialdatum
        const actualStart = item.customStartDate || newStartDate;
        const actualEnd = item.customEndDate || newEndDate;

        const currentDate = new Date(actualStart.getTime());

        const startHours = item.timeStart.getHours();
        const startMinutes = item.timeStart.getMinutes();
        const endHours = item.timeEnd.getHours();
        const endMinutes = item.timeEnd.getMinutes();

        while (currentDate <= actualEnd) {
          currentDate.setHours(0, 0, 0, 0);

          if (currentDate.getDay() === targetDay) {
            const combinedStartTime = new Date(currentDate.getTime());
            combinedStartTime.setHours(startHours, startMinutes, 0, 0);

            // Undvik dubbletter: Kolla om lektionen redan finns för detta SchemaItem
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
    revalidatePath("/admin/termin");

    return {
      success: true,
      msg: `Terminen "${result.name}" har uppdaterats och lektionerna har synkroniserats.`,
    };
  } catch (e) {
    console.error("Fel vid editTermin:", e);
    return {
      success: false,
      msg: "Ett fel uppstod vid uppdatering av terminen.",
    };
  }
}
// fix: klippkort

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
    console.log("Creating!");

    const validated = await adminAddCourseToSchemaSchema.parseAsync(formData);

    const getCourse = await prisma.course.findUnique({
      where: { id: validated.courseId },
    });

    if (!getCourse) throw new Error("Course was not found.");

    const termin = await prisma.termin.findUnique({ where: { id: terminId } });

    if (!termin) throw new Error("No termin.");
    // fix: lägg in så den kopplar terminen till kursen också?

    const isSameDateUtc = (a: Date, b: Date) =>
      a.getUTCFullYear() === b.getUTCFullYear() &&
      a.getUTCMonth() === b.getUTCMonth() &&
      a.getUTCDate() === b.getUTCDate();

    // Förbered datumen och kolla om de matchar terminen
    const inputStartDate = validated.customStartDate
      ? new Date(validated.customStartDate)
      : null;
    const inputEndDate = validated.customEndDate
      ? new Date(validated.customEndDate)
      : null;

    // Om datumet finns och är exakt samma som terminens -> sätt till null
    const finalStartDate =
      inputStartDate && isSameDateUtc(inputStartDate, termin.startDate)
        ? null
        : inputStartDate;

    const finalEndDate =
      inputEndDate && isSameDateUtc(inputEndDate, termin.endDate)
        ? null
        : inputEndDate;

    const newSchemaItem = await prisma.schemaItem.create({
      data: {
        terminId,
        place: validated.place,
        courseId: validated.courseId,
        maxBookings: getCourse?.maxBookings,
        timeStart: formToDbDate(validated.timeStart),
        timeEnd: formToDbDate(validated.timeEnd),
        customEndDate: finalEndDate,
        customStartDate: finalStartDate,
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
    console.error(e);
    return { success: false, msg: JSON.stringify(e) };
  }
}

/**
 * Flyttar en kurs i en termins schema och genererar automatiskt alla lektionstillfällen (tar bort de gamla)
 * * Funktionen utför följande steg:
 * 1. Validerar indata och kontrollerar att kursen existerar.
 * 2. Uppdaterar ett `SchemaItem` som fungerar som en veckomall för kursen.
 * 3. Tar bort aööa öesspms. sedam anropar `createLessons` för att generera faktiska `Lesson`-poster för varje aktuell
 * veckodag mellan terminens start- och slutdatum.
 * 4. Om inga lektioner kan skapas (t.ex. om terminen är för kort) rullas skapandet
 * av schemaposten tillbaka för att undvika inkonsistent data.
 * * @param terminId - ID för den termin där kursen ska läggas till.
 * @param schemaItemId - ID för det schemaItem som skall ändras.
 * @param formData - Validerad data innehållande kurs-ID, plats, veckodag samt start- och sluttid.
 * @returns Ett objekt med framgångsstatus och ett beskrivande meddelande om hur många lektioner som skapades.
 * @auth Admin
 */
export async function editCourseInSchema(
  terminId: string,
  schemaItemId: string,
  formData: z.infer<typeof adminAddCourseToSchemaSchema>,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminAddCourseToSchemaSchema.parseAsync(formData);
    const getCourse = await prisma.course.findUnique({
      where: { id: validated.courseId },
    });
    if (!getCourse) throw new Error("Course was not found.");

    const termin = await prisma.termin.findUnique({ where: { id: terminId } });
    if (!termin) throw new Error("No termin.");

    const isSameDateUtc = (a: Date, b: Date) =>
      a.getUTCFullYear() === b.getUTCFullYear() &&
      a.getUTCMonth() === b.getUTCMonth() &&
      a.getUTCDate() === b.getUTCDate();

    // Datum-tvätt
    const inputStartDate = validated.customStartDate
      ? new Date(validated.customStartDate)
      : null;
    const inputEndDate = validated.customEndDate
      ? new Date(validated.customEndDate)
      : null;

    const finalStartDate =
      inputStartDate && isSameDateUtc(inputStartDate, termin.startDate)
        ? null
        : inputStartDate;
    const finalEndDate =
      inputEndDate && isSameDateUtc(inputEndDate, termin.endDate)
        ? null
        : inputEndDate;

    // Kör allt i en transaktion så vi inte förstör något om createLessons misslyckas
    const result = await prisma.$transaction(async (tx) => {
      const updatedSchemaItem = await tx.schemaItem.update({
        where: { id: schemaItemId },
        data: {
          terminId,
          place: validated.place,
          courseId: validated.courseId,
          maxBookings: getCourse?.maxBookings,
          timeStart: formToDbDate(validated.timeStart),
          timeEnd: formToDbDate(validated.timeEnd),
          customEndDate: finalEndDate,
          customStartDate: finalStartDate,
          weekday: validated.day as Weekday,
        },
        include: { course: true, termin: true },
      });

      // Ta bort gamla lektioner för detta schemaItem
      await tx.lesson.deleteMany({
        where: { schemaItemId: updatedSchemaItem.id },
      });

      return updatedSchemaItem;
    });

    // Skapa de nya lektionerna
    const lessons = await createLessons(schemaItemId);

    if (!lessons.success) {
      // Istället för att radera schemaItem vid EDIT, kastar vi bara ett fel.
      // Admin får behålla raden men måste fixa datumen.
      throw new Error(
        "Kunde inte generera nya lektioner. Kontrollera dina datum.",
      );
    }

    revalidatePath("/admin/termin");

    return {
      success: true,
      msg: `Kursen ${result.course.name} har uppdaterats i ${result.termin.name}. ${lessons.msg}`,
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      msg: e instanceof Error ? e.message : "Ett okänt fel uppstod.",
    };
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

    const newCourseItem = await prisma.course.update({
      data: {
        name: validated.name,
        maxBookings: validated.maxbookings,
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

/**
 * Genererar fysiska lektionstillfällen baserat på SchemaItem.
 * * Funktionen itererar genom varje dag mellan terminens start- och slutdatum (eller customStart/EndDate i schemaItem om det är satt),
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

    const startDate = schemaItm.customStartDate
      ? schemaItm.customStartDate
      : schemaItm.termin.startDate;
    const endDate = schemaItm.customEndDate
      ? schemaItm.customEndDate
      : schemaItm.termin.endDate;
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
    console.error(e);
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
          const clipResult = await handleClips(tx, booking.purchaseItemId, 1);
          if (!clipResult.success) {
            throw new Error(clipResult.msg || "Clip update failed.");
          }
        }
      }
      // 3. Kolla om vi aktiverar en inställd lektion igen (från true till false)
      else if (currentLesson.cancelled && !validated.cancelled) {
        for (const booking of currentLesson.bookings) {
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
  unlimited: boolean;
  lessonsIncluded: number;
};

// Så denna funktion körs om man skapar en produkt eller ändrar en produkt eller lägger in en kurs i en produkt, ändrar en kurs i en produkt eller tar bort en kurs ur en produkt.
// Den kollar om det är ett klippkort, eller om den bara innehåller 1 kurs eller flera kurser, och avgör därefter produkttypen och ställer in det i produkten.
async function updateProductType(
  productId: string,
  options?: { isClip?: boolean; tx?: PrismaTx },
): Promise<"COURSE" | "PACK" | "CLIP"> {
  const client = options?.tx ?? prisma; //
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

  await client.productOnCourse.updateMany({
    where: { productId: product.id },
    data: { type: nextType },
  });

  return nextType;
}

/**
 * Skapar en ny produkt i systemet baserat på validerad formulärdata.
 * * @param formData - Validerad data från `adminAddProductSchema`. Innehåller namn,
 * beskrivning, pris, kundbegränsning samt (fix) gammal logik för klippkort (totalCount), detta kommer ändras.
 * @returns Ett objekt med success-status och ett bekräftande meddelande med produktens namn.
 * @auth Admin
 */
export async function addNewProduct(
  formData: z.output<typeof adminAddProductSchema>,
): Promise<{ success: boolean; msg: string; productId?: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminAddProductSchema.parseAsync(formData);

    // dubbelchecka så det blev rätt vid upload (eftersom blob tillåts)
    if (validated.imageURL?.startsWith("blob:")) {
      return {
        success: false,
        msg: "Bilden laddades inte upp korrekt till molnet.",
      };
    }

    const newProd = await prisma.product.create({
      data: {
        name: validated.name,
        description: validated.description,
        price: validated.price,
        imageURL: validated.imageURL,
        maxCustomer: validated.maxCustomers,
        unlimitedCustomers: validated.unlimitedCustomers ?? false,
        totalCount: validated.clipCount,
        type: validated.clipcard ? "CLIP" : "COURSE",
      },
    });

    revalidatePath("/admin/products");
    return {
      success: true,
      msg: `Produkten ${newProd.name} skapades.`,
      productId: newProd.id,
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
  newImg?: boolean,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminAddProductSchema.parseAsync(formData);

    // dubbelchecka så det blev rätt vid upload (eftersom blob tillåts)
    if (validated.imageURL?.startsWith("blob:")) {
      return {
        success: false,
        msg: "Bilden laddades inte upp korrekt till molnet.",
      };
    }

    if (!validated.unlimitedCustomers) {
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
    }

    const oldImageURL = await prisma.product.findFirst({
      where: { id },
      select: { imageURL: true },
    });

    if (oldImageURL?.imageURL !== validated.imageURL || newImg) {
      // Delete the old pic from bucket
    }

    const newProd = await prisma.product.update({
      where: { id },
      data: {
        name: validated.name,
        description: validated.description,
        price: validated.price,
        imageURL: validated.imageURL,
        maxCustomer: validated.maxCustomers,
        unlimitedCustomers: validated.unlimitedCustomers ?? false,
        totalCount: validated.clipCount,
      },
    });

    await updateProductType(id, { isClip: validated.clipcard });

    return {
      success: true,
      msg: `Produkten ${newProd.name} ändrades.`,
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
      msg: `Produkten ${remProd.name} togs bort.`,
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

  try {
    const validated = await AdminProductCourseItemSchema.parseAsync(formData);

    const isInProd = await isCourseInProduct(
      formData.courseId,
      formData.productId,
    );

    if (isInProd.found) {
      await prisma.$transaction(async (tx) => {
        const product = await tx.product.findUnique({
          where: { id: validated.productId },
          select: { type: true },
        });
        if (!product) throw new Error("Product not found.");
        const lessonsIncluded =
          product.type === "CLIP" ? 0 : validated.lessonsIncluded;

        await tx.productOnCourse.update({
          where: {
            courseId_productId: {
              courseId: validated.courseId,
              productId: validated.productId,
            },
          },
          data: {
            unlimited: validated.unlimited,
            lessonsIncluded,
          },
        });

        await updateProductType(validated.productId, { tx });
      });

      return {
        success: true,
        msg: `Kursen ändrades i produkten.`,
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
            unlimited: validated.unlimited,
            lessonsIncluded:
              productType === "CLIP" ? 0 : validated.lessonsIncluded,
            type: productType,
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
      msg: `Kursen togs bort i produkten.`,
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
): Promise<{ found: boolean; lessonsIncluded?: number; unlimited?: boolean }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { found: false };

  try {
    const found = await prisma.productOnCourse.findUnique({
      where: { courseId_productId: { courseId, productId } },
    });

    if (found)
      return {
        found: true,
        lessonsIncluded: found.lessonsIncluded,
        unlimited: found.unlimited,
      };
    return { found: false };
  } catch (e) {
    console.error(e);
    return { found: false };
  }
}

/**
 * Analyserar användningen av en specifik kurs i relation till produkter och försäljning.
 * Beräknar både hur många produkter som innehåller kursen och hur många ordrar som lagts på dessa produkter.
 * * @param courseId - ID för kursen som ska analyseras.
 * @returns Ett objekt som innehåller:
 * - `found`: Om sökningen lyckades.
 * - `orderItemCount`: Totalt antal sålda orderrader (OrderItems) för produkter där denna kurs ingår.
 * - `countProd`: Antal unika produkter som inkluderar denna kurs i sitt utbud.
 * - `purchaseItemCount`: Antal PurchaseItems kopplade till kursen (antal köp med tillgång).
 * * @description Denna funktion är avgörande för att bedöma konsekvenserna av att radera eller ändra en kurs,
 * då den visar om kursen är bunden till befintliga kundavtal och paket.
 * @auth Admin
 */
export async function countOrderItemsAndProductsCourse(
  courseId: string,
): Promise<{
  found: boolean;
  orderItemCount?: number;
  countProd?: number;
  purchaseItemCount?: number;
}> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { found: false };
  try {
    const purchaseItemCount = await prisma.purchaseItem.count({
      where: { courseId },
    });

    const orderItemCount = await prisma.orderItem.count({
      where: { product: { courses: { some: { courseId } } } },
    });

    const countProd = await prisma.product.count({
      where: { courses: { some: { courseId } } },
    });
    // Vi returnerar success: true även om count är 0
    return { found: true, orderItemCount, countProd, purchaseItemCount };
  } catch (e) {
    console.error(e);
    return { found: false };
  }
}

/**
 * Representerar en användare och dennes samlade köphistorik relaterat till kurser.
 * Använder Prismas `GetPayload` för att definiera en exakt struktur för djup-nästlad data.
 * * @structure
 * - id & name: Grundläggande användarinformation.
 * - purchases: Lista över genomförda köp med koppling till den köpta produkten.
 * - PurchaseItems: Specifika rader i varje köp som håller reda på:
 * - remainingCount: Hur många klipp/lektioner som finns kvar.
 * - lessonsIncluded: Det totala antalet lektioner som ingick vid köptillfället.
 * - course: Namnet på den specifika kursen som köpet avser.
 * * @usage Används främst i admin-vyn för att se en elevs saldo eller i användarens profil för att visa "X av Y lektioner kvar".
 */
export type UserPurchasesForCourse = Prisma.UserGetPayload<{
  select: {
    id: true;
    name: true;
    purchases: {
      select: {
        id: true;
        product: { select: { id: true; name: true } };
        participant: { select: { id: true; name: true } };
        type: true;
        remainingCount: true;
        PurchaseItems: {
          select: {
            id: true;
            remainingCount: true;
            unlimited: true;
            lessonsIncluded: true; // Bra att ha för "X av Y" logik
            course: { select: { name: true } }; // Hämtar namnet direkt
          };
        };
      };
    };
  };
}>;
// ev. fix för klippkort? Ska kolla hur funktionen används.

/**
 * Hämtar en lista över användare som har giltiga köp (kvarvarande klipp/lektioner) för en specifik kurs.
 * * @param courseId - ID:t för den kurs man vill hitta behöriga deltagare för.
 * @returns Ett objekt med success-status och en array av användare (`UserPurchasesForCourse[]`),
 * där varje användare endast har sina relevanta och aktiva köp inkluderade.
 * * @description
 * Funktionen filtrerar på två nivåer:
 * 1. Hittar användare som har MINST ett köp där `remainingCount > 0` för den valda kursen.
 * 2. Inuti sökresultatet (select) filtreras även inköpslistan så att endast de specifika
 * rader som faktiskt gäller den aktuella kursen och har saldo kvar visas.
 * @auth Admin
 */
export async function getUsersWithPurchasedProductsWithCourseInIt(
  courseId: string,
): Promise<{
  success: boolean;
  msg?: string;
  users?: UserPurchasesForCourse[];
}> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };
  try {
    const usersWithData = await prisma.user.findMany({
      where: {
        purchases: {
          some: {
            PurchaseItems: {
              some: {
                courseId,
                OR: [
                  { unlimited: true },
                  {
                    purchase: { type: "CLIP", remainingCount: { gt: 0 } },
                  },
                  {
                    remainingCount: { gt: 0 },
                    purchase: { type: { not: "CLIP" } },
                  },
                ],
              },
            },
          },
        },
      },
      select: {
        id: true,
        name: true,

        purchases: {
          where: {
            PurchaseItems: {
              some: {
                courseId,
                OR: [
                  { unlimited: true },
                  {
                    purchase: { type: "CLIP", remainingCount: { gt: 0 } },
                  },
                  {
                    remainingCount: { gt: 0 },
                    purchase: { type: { not: "CLIP" } },
                  },
                ],
              },
            },
          },
          select: {
            id: true,
            product: {
              select: { id: true, name: true },
            },
            participant: { select: { id: true, name: true } },
            type: true,
            remainingCount: true,
            PurchaseItems: {
              where: {
                courseId,
                OR: [
                  { unlimited: true },
                  {
                    purchase: { type: "CLIP", remainingCount: { gt: 0 } },
                  },
                  {
                    remainingCount: { gt: 0 },
                    purchase: { type: { not: "CLIP" } },
                  },
                ],
              },
              select: {
                id: true,
                remainingCount: true,
                unlimited: true,
                lessonsIncluded: true, // Lagt till för att matcha typen
                course: {
                  select: { name: true }, // Lagt till för att matcha typen
                },
              },
            },
          },
        },
      },
    });

    if (!usersWithData) {
      return { success: false, msg: "Användaren hittades inte." };
    }

    return {
      success: true,
      msg: "Hämtade användare och giltiga köp.",
      users: usersWithData,
    };
  } catch (e) {
    console.error(e);
    return { success: false };
  }
}

/**
 * Registrerar en elev på en specifik lektion och drar av ett klipp från deras saldo.
 * * Operationen körs som en atomär transaktion för att säkerställa dataintegritet.
 * * @param formData - Validerad data innehållande `userId`, `lessonId` och det specifika `purchaseId` som ska belastas.
 * @returns Ett objekt med success-status och ett förklarande meddelande.
 * * @process
 * 1. Validerar att köpet existerar och har klipp kvar (`remainingCount > 0`).
 * 2. Kontrollerar att eleven inte redan är bokad på samma lektion (förhindrar dubbelbokning).
 * 3. Verifierar att lektionen inte är inställd.
 * 4. Skapar en bokningspost och dekrementerar elevens saldo simultant.
 * @auth Admin
 */
export async function addUserInLesson(
  formData: z.output<typeof AdminAddUserInLessonSchema>,
): Promise<{ success: boolean; msg?: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };
  try {
    const validated = await AdminAddUserInLessonSchema.parseAsync(formData);

    const purchase = await prisma.purchaseItem.findUnique({
      where: { id: validated.purchaseId },
      include: { purchase: true },
    });

    if (!purchase)
      return { success: false, msg: "Could not find the purchase" };

    if (!purchase.unlimited) {
      const remaining =
        purchase.purchase.type === "CLIP"
          ? (purchase.purchase.remainingCount ?? 0)
          : purchase.remainingCount;
      if (remaining <= 0) {
        return { success: false, msg: "No remaining count." };
      }
    }

    const participantId = purchase.purchase.participantId;
    const duplicateClauses = participantId
      ? [{ purchaseItem: { purchase: { participantId } } }]
      : [
          {
            userId: validated.userId,
            purchaseItem: { purchase: { participantId: null } },
          },
        ];
    const existingBooking = await prisma.booking.findFirst({
      where: {
        lessonId: validated.lessonId,
        OR: duplicateClauses,
      },
    });

    if (existingBooking) {
      return {
        success: false,
        msg: "Eleven är redan registrerad på denna lektion.",
      };
    }

    // KOLLA STATUS OCH KAPACITET PÅ LEKTIONEN
    const lesson = await prisma.lesson.findUnique({
      where: { id: validated.lessonId },
      select: { cancelled: true, maxBookings: true },
    });

    if (!lesson) {
      return { success: false, msg: "Lektionen hittades inte." };
    }

    if (lesson?.cancelled) {
      return {
        success: false,
        msg: "Kan inte lägga till elever i en inställd lektion.",
      };
    }

    if (lesson?.maxBookings && lesson.maxBookings > 0) {
      const currentBookings = await prisma.booking.count({
        where: { lessonId: validated.lessonId, cancelled: false },
      });

      if (currentBookings >= lesson.maxBookings) {
        return { success: false, msg: "Lektionen är fullbokad." };
      }
    }

    await prisma.$transaction(async (tx) => {
      const txLesson = await tx.lesson.findUnique({
        where: { id: validated.lessonId },
        select: { cancelled: true, maxBookings: true },
      });

      if (!txLesson) {
        throw new Error("Lektionen hittades inte.");
      }

      if (txLesson?.cancelled) {
        throw new Error("Kan inte lägga till elever i en inställd lektion.");
      }

      if (txLesson?.maxBookings && txLesson.maxBookings > 0) {
        const currentBookings = await tx.booking.count({
          where: { lessonId: validated.lessonId, cancelled: false },
        });

        if (currentBookings >= txLesson.maxBookings) {
          throw new Error("Lektionen är fullbokad.");
        }
      }

      await tx.booking.create({
        data: {
          lessonId: validated.lessonId,
          userId: validated.userId,
          purchaseItemId: purchase.id,
        },
      });

      const clipResult = await handleClips(tx, validated.purchaseId, -1);

      if (!clipResult.success) {
        throw new Error(clipResult.msg || "Clip update failed.");
      }
    });

    revalidatePath("/admin/courses"); // Sökvägen där komponenten bor

    return { success: true, msg: "Eleven blev tillagd i lektionen." };
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "";
    if (
      msg === "Lektionen är fullbokad." ||
      msg === "Kan inte lägga till elever i en inställd lektion." ||
      msg === "Lektionen hittades inte."
    ) {
      return { success: false, msg };
    }
    return { success: false };
  }
}

/**
 * Tar bort en elevs bokning från en specifik lektion och återför ett klipp till saldot.
 * * Operationen körs som en transaktion för att garantera att saldot alltid matchar antalet bokningar.
 * * @param userId - ID för den användare vars bokning ska tas bort.
 * @param lessonId - ID för lektionen som bokningen avser.
 * @returns Ett objekt med success-status och ett meddelande.
 * * @process
 * 1. Kontrollerar om lektionen är inställd (om den är inställd har saldot redan återställts via `editLessonItem`).
 * 2. Hittar den specifika bokningen för att identifiera vilket `purchaseItemId` som användes.
 * 3. Raderar bokningen och inkrementerar `remainingCount` på det tillhörande köpet.
 * @auth Admin
 */
export async function removeUserFromLesson(
  userId: string,
  lessonId: string,
): Promise<{ success: boolean; msg?: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    // KOLLA STATUS PÅ LEKTIONEN
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { cancelled: true },
    });

    if (lesson?.cancelled) {
      return {
        success: false,
        msg: "Kan inte ta bort elev i en inställd lektion. Eleven har redan fått tillbaka sin bokning.",
      };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Hitta bokningen baserat på användare och lektion
      const booking = await tx.booking.findFirst({
        where: {
          userId: userId,
          lessonId: lessonId,
        },
        select: { id: true, purchaseItemId: true },
      });

      if (!booking) {
        throw new Error(
          "Ingen bokning hittades för denna användare på denna lektion.",
        );
      }

      // 2. Ta bort bokningen med dess unika ID
      await tx.booking.delete({
        where: { id: booking.id },
      });

      // 3. Ge tillbaka klippet på rätt köp
      await handleClips(tx, booking.purchaseItemId, 1);
    });

    revalidatePath("/admin/courses");
    return { success: true, msg: "Närvaro borttagen och klipp återställt." };
  } catch (e) {
    console.error("Fel vid borttagning av närvaro:", e);
    return { success: false, msg: "Kunde inte ta bort närvaro." };
  }
}

export type PrismaTx = Prisma.TransactionClient;

// // Okej, så nu den magiska funktionen handleClips då :)
export async function handleClips(
  tx: PrismaTx,
  purchaseItemId: string,
  adjustment: number,
): Promise<{ success: boolean; msg?: string }> {
  if (adjustment === 0) {
    return { success: true, msg: "No adjustment needed." };
  }

  // Så vi hämtar purschaseItem, och inkluderar även purchasen så vi kan se vilken typ det är (CLIP, PACK eller COURSE). Kolla även unlimited.
  const purchaseItem = await tx.purchaseItem.findUnique({
    where: { id: purchaseItemId },
    select: {
      id: true,
      remainingCount: true,
      unlimited: true,
      purchase: {
        select: {
          id: true,
          type: true,
          remainingCount: true,
        },
      },
    },
  });

  // Om den inte hittas, returnera false.
  if (!purchaseItem) {
    return { success: false, msg: "PurchaseItem not found." };
  }

  // kolla om det är ett klippkort:
  const isClip = purchaseItem.purchase.type === "CLIP";
  const amount = Math.abs(adjustment); // amoint som absolutbelopp, avgör istället med if sats..

  if (purchaseItem.unlimited) {
    return { success: true, msg: "Unlimited purchase; no adjustment made." };
  }

  if (isClip) {
    // Varför skulle den vara null dock?
    if (purchaseItem.purchase.remainingCount == null) {
      return { success: false, msg: "Purchase remainingCount is null." };
    }

    // Kolla om det skall dras eller ges tillbaka.
    if (adjustment < 0) {
      // Uppdatera saldot i purchases ( eftersom det är ett klippkort )
      const result = await tx.purchase.updateMany({
        where: {
          id: purchaseItem.purchase.id,
          remainingCount: { gte: amount },
        },
        data: { remainingCount: { decrement: amount } },
      });

      if (result.count === 0) {
        return { success: false, msg: "Insufficient remaining clips." };
      }
    } else {
      await tx.purchase.update({
        where: { id: purchaseItem.purchase.id },
        data: { remainingCount: { increment: amount } },
      });
    }
  } else {
    // det är kurser / paket och just denna kurs skall alltså ges tillbaka eller dras.

    // Kolla om det skall dras eller ges tillbaka :)
    if (adjustment < 0) {
      const result = await tx.purchaseItem.updateMany({
        where: {
          id: purchaseItem.id,
          remainingCount: { gte: amount }, // Hämta bara om det finns så många bokningar kvar.
        },
        data: { remainingCount: { decrement: amount } },
      });

      if (result.count === 0) {
        return { success: false, msg: "Insufficient remaining lessons." };
      }
    } else {
      await tx.purchaseItem.update({
        where: { id: purchaseItem.id },
        data: { remainingCount: { increment: amount } },
      });
    }
  }

  return { success: true };
}
