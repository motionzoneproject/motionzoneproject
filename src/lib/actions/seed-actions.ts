import type z from "zod";
import type { Weekday } from "@/generated/prisma/enums";
import {
  adminAddCourseSchema,
  adminAddCourseToSchemaSchema,
  adminAddTerminSchema,
} from "@/validations/adminforms";
import prisma from "../prisma";
import { formToDbDate } from "../time-convert";

// fix: hur kollar vi så ingen kör detta script? :P Ska vi kanske göra alla prisma grejer i seeden istället?

export async function seedAddTermin(
  formData: z.infer<typeof adminAddTerminSchema>,
) {
  try {
    const validated = await adminAddTerminSchema.parseAsync(formData); // vi har iaf denna, det är ju bra.

    const newSchemaItem = await prisma.termin.create({
      data: {
        name: validated.name,
        startDate: new Date(validated.startDate),
        endDate: new Date(validated.endDate),
      },
    });
    return newSchemaItem;
  } catch (_e) {
    return null;
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
export async function seedAddCourse(
  formData: z.output<typeof adminAddCourseSchema>,
) {
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
    return newCourseItem;
  } catch (_e) {
    return null;
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
export async function seedAddCoursetoSchema(
  terminId: string,
  formData: z.infer<typeof adminAddCourseToSchemaSchema>,
): Promise<{
  success: boolean;
  msg: string;
}> {
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
    const lessons = await seedCreateLessons(newSchemaItem.id);

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
 * Genererar fysiska lektionstillfällen baserat på SchemaItem.
 * * Funktionen itererar genom varje dag mellan terminens start- och slutdatum,
 * identifierar alla datum som matchar den angivna veckodagen och skapar
 * lektionsobjekt med korrekta tidsstämplar.
 * * @param schemaItemId - ID:t för den schemamall som ska användas som underlag.
 * @returns Ett objekt med success-status och ett meddelande som anger hur många lektioner som skapats.
 * @throws Fel om SchemaItem eller dess tillhörande termin/kurs saknas.
 * @internal Denna funktion anropas främst av `addCoursetoSchema` och bör användas med försiktighet utanför transaktioner.
 */
async function seedCreateLessons(
  schemaItemId: string,
): Promise<{ success: boolean; msg: string }> {
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

    // console.log(
    //   "Lektioner att skapa: \n" +
    //     "targetDay: " +
    //     targetDay +
    //     "\n startDate:" +
    //     startDate +
    //     "\n endDate:" +
    //     endDate +
    //     "\n\n\n Lessons:\n" +
    //     JSON.stringify(lessonsToCreate)
    // );

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
