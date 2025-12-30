import type z from "zod";
import {
  adminAddCourseSchema,
  adminAddTerminSchema,
} from "@/validations/adminforms";
import prisma from "../prisma";

// fix: hur kollar vi så ingen kör detta script? :P Ska vi kanske göra alla prisma grejer i seeden istället?

export async function addTermin(
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
export async function addCourse(
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
  } catch (e) {
    return { success: false, msg: JSON.stringify(e) };
  }
}
