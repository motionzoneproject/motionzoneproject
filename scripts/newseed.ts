import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  seedAddCourse,
  seedAddCourseToProduct,
  seedAddCoursetoSchema,
  seedAddTermin,
  seedNewProduct,
} from "@/lib/actions/seed-actions";
import { auth } from "@/lib/auth";
import { getCourseName } from "@/lib/tools";
import { PrismaClient } from "../src/generated/prisma/client";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error("DATABASE_URL is not set in environment variables.");
}
const adapter = new PrismaPg({ connectionString: dbUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Skapa ett gäng elever. Den första blir admin!

  const users = Array.from({ length: 30 }, (_, i) => {
    if (i === 0) {
      return {
        name: "Admin",
        email: "admin@motionzoneworld.com",
        password: "qwe123qwe123",
      };
    }
    return {
      name: `Elev ${i + 1}`,
      email: `elev${i + 1}@gmail.com`,
      password: "qwe123qwe123",
    };
  });

  const createdUserIds: string[] = []; // Vi sparar alla skapade användare här (om man får id returnerat?)

  for (const user of users) {
    try {
      let userId: string;
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      });

      if (existingUser) {
        userId = existingUser.id;
        console.log(`Användaren ${user.name} fanns redan.`);
      } else {
        const { user: createdUser } = await auth.api.signUpEmail({
          body: {
            name: user.name,
            email: user.email,
            password: user.password,
          },
        });

        if (!createdUser) throw new Error("User creation failed");
        userId = createdUser.id;
        console.log(`Användaren ${createdUser.name} skapades.`);
      }

      // Gör första användaren till admin om det behövs
      if (user.email === "admin@motionzoneworld.com") {
        await prisma.user.update({
          where: { id: userId },
          data: { role: "admin" },
        });
      }

      createdUserIds.push(userId);
    } catch (e) {
      console.error("DETALJERAT FEL:", e);
    }
  }
  // Elever klart.

  // ****************************************************** Termin ******************************************************

  // Okej, så nu har vi 30 elever.

  // Vi börjar med att skapa vårterminen.
  // (parameter) values: {
  //     name: string;
  //     startDate: Date;
  //     endDate: Date;
  // }

  let terminId: string = "";

  // enligt: https://www.instagram.com/p/DR_vmSpgv9y/ så börjar terminen 1 feb.

  try {
    const terminRes = await seedAddTermin({
      name: "Vårterminen 2026",
      startDate: new Date("2026-02-01"),
      endDate: new Date("2026-06-30"), // fix: gissar på det atm, får väl fråga kanske, de kanske har sommarstängt osv.
    });

    if (!terminRes) throw new Error("Termin kunde inte skapas.");

    terminId = terminRes.id;
    console.log(`Terminen ${terminRes.name} skapades! :)`);
  } catch (e) {
    throw new Error(JSON.stringify(e));
  }

  // ****************************************************** Kurser ******************************************************

  // Varje kurs ka ha följande format:
  // name: string;
  // maxbookings: number;
  // maxCustomers: number;
  // description: string;
  // minAge: number;
  // maxAge: number;
  // teacherid: string; (Detta blir createdUserIds[0] eftersom den är admin)
  // level?: string | undefined;
  // adult?: boolean | undefined;

  const teacherId = createdUserIds[0];

  const coursesToCreate = [
    // MÅNDAG
    {
      name: "Jazz",
      minAge: 5,
      maxAge: 8,
      adult: false,
      level: "Nybörjare",
      description: "Jazzdans för barn.",
      maxbookings: 20,
      maxCustomers: 25,
      teacherid: teacherId,
    },
    {
      name: "Balett",
      minAge: 9,
      maxAge: 0,
      adult: false,
      level: "Nybörjare/Mellan",
      description: "Klassisk balett.",
      maxbookings: 20,
      maxCustomers: 25,
      teacherid: teacherId,
    },
    {
      name: "Teater",
      minAge: 10,
      maxAge: 0,
      adult: false,
      level: "Grundnivå",
      description: "Grundläggande teater.",
      maxbookings: 15,
      maxCustomers: 20,
      teacherid: teacherId,
    },
    {
      name: "Jazz",
      minAge: 15,
      maxAge: 0,
      adult: true,
      level: "Öppen nivå",
      description: "Jazz för ungdomar och vuxna.",
      maxbookings: 20,
      maxCustomers: 25,
      teacherid: teacherId,
    },
    {
      name: "Salsa",
      minAge: 19,
      maxAge: 0,
      adult: true,
      level: "Nybörjare",
      description: "Salsa i Studio B.",
      maxbookings: 20,
      maxCustomers: 25,
      teacherid: teacherId,
    },

    // TISDAG
    {
      name: "Hip Hop",
      minAge: 5,
      maxAge: 8,
      adult: false,
      level: "Nybörjare",
      description: "Hip hop för barn.",
      maxbookings: 20,
      maxCustomers: 25,
      teacherid: teacherId,
    },
    {
      name: "Hip Hop",
      minAge: 9,
      maxAge: 0,
      adult: false,
      level: "Nybörjare",
      description: "Hip hop fortsättning.",
      maxbookings: 20,
      maxCustomers: 25,
      teacherid: teacherId,
    },
    {
      name: "Contemporary",
      minAge: 13,
      maxAge: 0,
      adult: false,
      level: "Öppen nivå",
      description: "Modern dans.",
      maxbookings: 20,
      maxCustomers: 25,
      teacherid: teacherId,
    },
    {
      name: "Latin Rhythms",
      minAge: 19,
      maxAge: 0,
      adult: true,
      level: "Öppen nivå",
      description: "Latinska rytmer.",
      maxbookings: 20,
      maxCustomers: 25,
      teacherid: teacherId,
    },
    {
      name: "Reggaeton",
      minAge: 19,
      maxAge: 0,
      adult: true,
      level: "Öppen nivå",
      description: "Högintensiv dans.",
      maxbookings: 20,
      maxCustomers: 25,
      teacherid: teacherId,
    },
    {
      name: "Träning med band & stretching",
      minAge: 0,
      maxAge: 0,
      adult: true,
      level: "Fys",
      description: "Styrka och rörlighet.",
      maxbookings: 15,
      maxCustomers: 20,
      teacherid: teacherId,
    },

    // ONSDAG
    {
      name: "Balett",
      minAge: 9,
      maxAge: 0,
      adult: false,
      level: "Fortsättning",
      description: "Balett för äldre barn.",
      maxbookings: 20,
      maxCustomers: 25,
      teacherid: teacherId,
    },
    {
      name: "Balett",
      minAge: 0,
      maxAge: 0,
      adult: false,
      level: "Mellan/Avancerad",
      description: "Avancerad teknik.",
      maxbookings: 20,
      maxCustomers: 25,
      teacherid: teacherId,
    },
    {
      name: "Pointe",
      minAge: 0,
      maxAge: 0,
      adult: false,
      level: "Mellannivå",
      description: "Tåspetsteknik.",
      maxbookings: 10,
      maxCustomers: 15,
      teacherid: teacherId,
    },
    {
      name: "Stretching",
      minAge: 0,
      maxAge: 0,
      adult: false,
      level: "För dansare",
      description: "Specifik stretch för dansare.",
      maxbookings: 20,
      maxCustomers: 25,
      teacherid: teacherId,
    },
    {
      name: "Heels",
      minAge: 16,
      maxAge: 0,
      adult: true,
      level: "Öppen nivå",
      description: "Dans i klackar.",
      maxbookings: 20,
      maxCustomers: 25,
      teacherid: teacherId,
    },

    // TORSDAG
    {
      name: "Balett",
      minAge: 5,
      maxAge: 8,
      adult: false,
      level: "Nybörjare",
      description: "Barnbalett.",
      maxbookings: 15,
      maxCustomers: 20,
      teacherid: teacherId,
    },
    {
      name: "Barre",
      minAge: 0,
      maxAge: 0,
      adult: true,
      level: "Öppen nivå",
      description: "Styrketräning vid stång.",
      maxbookings: 15,
      maxCustomers: 20,
      teacherid: teacherId,
    },
    {
      name: "Balett",
      minAge: 13,
      maxAge: 0,
      adult: true,
      level: "Mellannivå",
      description: "Vuxenbalett.",
      maxbookings: 20,
      maxCustomers: 25,
      teacherid: teacherId,
    },
    {
      name: "Pointe",
      minAge: 12,
      maxAge: 0,
      adult: false,
      level: "Nybörjare",
      description: "Introduktion till tåspets.",
      maxbookings: 10,
      maxCustomers: 15,
      teacherid: teacherId,
    },
    {
      name: "Hip Hop",
      minAge: 15,
      maxAge: 0,
      adult: true,
      level: "Öppen nivå",
      description: "Hip hop vuxen.",
      maxbookings: 20,
      maxCustomers: 25,
      teacherid: teacherId,
    },

    // LÖRDAG
    {
      name: "Barre",
      minAge: 0,
      maxAge: 0,
      adult: true,
      level: "Lördagspass",
      description: "Förmiddagspass.",
      maxbookings: 15,
      maxCustomers: 20,
      teacherid: teacherId,
    },
    {
      name: "Balett",
      minAge: 13,
      maxAge: 0,
      adult: true,
      level: "Öppen nivå",
      description: "Lördagsbalett.",
      maxbookings: 20,
      maxCustomers: 25,
      teacherid: teacherId,
    },
    {
      name: "Stretch & Relax",
      minAge: 0,
      maxAge: 0,
      adult: true,
      level: "Lugnt pass",
      description: "Avkoppling och stretch.",
      maxbookings: 20,
      maxCustomers: 25,
      teacherid: teacherId,
    },
    {
      name: "Bachata",
      minAge: 19,
      maxAge: 0,
      adult: true,
      level: "Öppen nivå",
      description: "Bachata i Studio B.",
      maxbookings: 20,
      maxCustomers: 25,
      teacherid: teacherId,
    },

    // SÖNDAG
    {
      name: "Balett Vuxen",
      minAge: 0,
      maxAge: 0,
      adult: true,
      level: "Nybörjare",
      description: "Grundkurs för vuxna.",
      maxbookings: 20,
      maxCustomers: 25,
      teacherid: teacherId,
    },
    {
      name: "Jazz",
      minAge: 12,
      maxAge: 0,
      adult: false,
      level: "Öppen nivå",
      description: "Söndagsjazz.",
      maxbookings: 20,
      maxCustomers: 25,
      teacherid: teacherId,
    },
    {
      name: "Motion X Dance Crew",
      minAge: 12,
      maxAge: 0,
      adult: false,
      level: "Uppvisningsgrupp",
      description: "Specialgrupp.",
      maxbookings: 20,
      maxCustomers: 25,
      teacherid: teacherId,
    },
    {
      name: "Kids Art Lab",
      minAge: 5,
      maxAge: 8,
      adult: false,
      level: "Kreativ workshop",
      description: "Konst och rörelse.",
      maxbookings: 15,
      maxCustomers: 20,
      teacherid: teacherId,
    },
    {
      name: "Art Lab Zone",
      minAge: 9,
      maxAge: 0,
      adult: false,
      level: "Kreativ workshop",
      description: "Fördjupning konst.",
      maxbookings: 15,
      maxCustomers: 20,
      teacherid: teacherId,
    },
  ];

  const createdCoursesId = []; // en lista med id för alla kurser, så de kan kopplas till produkter och terminer osv.

  try {
    for (const course of coursesToCreate) {
      const addedCourse = await seedAddCourse(course);
      if (addedCourse) {
        console.log(`Lade till kursen ${getCourseName(addedCourse)} i db`);
        createdCoursesId.push(addedCourse.id); // spara id
      } else {
        throw new Error(`Gick ej skapa kursen ${JSON.stringify(course)}`);
      }
    }
  } catch (e) {
    throw new Error(JSON.stringify(e));
  }

  // Sådär då. Whats next...

  // vi gör lite produkter? Eller nä, vi lägger in i schemat först.

  // ****************************************************** Schema & Lektioner ******************************************************

  const schemaToCreate = [
    // MÅNDAG
    {
      name: "Jazz",
      minAge: 5,
      maxAge: 8,
      day: "MONDAY",
      start: "16:00",
      end: "16:45",
      place: "Studio A",
    },
    {
      name: "Balett",
      minAge: 9,
      maxAge: 0,
      day: "MONDAY",
      start: "16:55",
      end: "18:25",
      place: "Studio A",
    },
    {
      name: "Teater",
      minAge: 10,
      maxAge: 0,
      day: "MONDAY",
      start: "18:30",
      end: "19:30",
      place: "Studio A",
    },
    {
      name: "Jazz",
      minAge: 15,
      maxAge: 0,
      day: "MONDAY",
      start: "19:40",
      end: "20:55",
      place: "Studio A",
    },
    {
      name: "Salsa",
      minAge: 19,
      maxAge: 0,
      day: "MONDAY",
      start: "19:40",
      end: "20:40",
      place: "Studio B",
    },

    // TISDAG
    {
      name: "Hip Hop",
      minAge: 5,
      maxAge: 8,
      day: "TUESDAY",
      start: "16:00",
      end: "16:45",
      place: "Studio A",
    },
    {
      name: "Hip Hop",
      minAge: 9,
      maxAge: 0,
      day: "TUESDAY",
      start: "16:55",
      end: "17:55",
      place: "Studio A",
    },
    {
      name: "Contemporary",
      minAge: 13,
      maxAge: 0,
      day: "TUESDAY",
      start: "18:00",
      end: "19:15",
      place: "Studio A",
    },
    {
      name: "Latin Rhythms",
      minAge: 19,
      maxAge: 0,
      day: "TUESDAY",
      start: "19:30",
      end: "20:30",
      place: "Studio A",
    },
    {
      name: "Reggaeton",
      minAge: 19,
      maxAge: 0,
      day: "TUESDAY",
      start: "20:30",
      end: "21:30",
      place: "Studio A",
    },
    {
      name: "Träning med band & stretching",
      minAge: 0,
      maxAge: 0,
      day: "TUESDAY",
      start: "19:25",
      end: "20:10",
      place: "Studio B",
    },

    // ONSDAG
    {
      name: "Balett",
      minAge: 9,
      maxAge: 0,
      day: "WEDNESDAY",
      start: "16:00",
      end: "17:30",
      place: "Studio A",
    },
    {
      name: "Balett",
      minAge: 0,
      maxAge: 0,
      day: "WEDNESDAY",
      start: "17:40",
      end: "19:10",
      place: "Studio A",
    },
    {
      name: "Pointe",
      minAge: 0,
      maxAge: 0,
      day: "WEDNESDAY",
      start: "19:15",
      end: "19:45",
      place: "Studio A",
    },
    {
      name: "Stretching",
      minAge: 0,
      maxAge: 0,
      day: "WEDNESDAY",
      start: "19:45",
      end: "20:05",
      place: "Studio A",
    },
    {
      name: "Heels",
      minAge: 16,
      maxAge: 0,
      day: "WEDNESDAY",
      start: "20:10",
      end: "21:10",
      place: "Studio A",
    },

    // TORSDAG
    {
      name: "Balett",
      minAge: 5,
      maxAge: 8,
      day: "THURSDAY",
      start: "16:00",
      end: "16:45",
      place: "Studio A",
    },
    {
      name: "Barre",
      minAge: 0,
      maxAge: 0,
      day: "THURSDAY",
      start: "17:20",
      end: "18:05",
      place: "Studio A",
    },
    {
      name: "Balett",
      minAge: 13,
      maxAge: 0,
      day: "THURSDAY",
      start: "18:10",
      end: "19:40",
      place: "Studio A",
    },
    {
      name: "Pointe",
      minAge: 12,
      maxAge: 0,
      day: "THURSDAY",
      start: "19:40",
      end: "20:10",
      place: "Studio A",
    },
    {
      name: "Hip Hop",
      minAge: 15,
      maxAge: 0,
      day: "THURSDAY",
      start: "20:15",
      end: "21:15",
      place: "Studio A",
    },

    // LÖRDAG
    {
      name: "Barre",
      minAge: 0,
      maxAge: 0,
      day: "SATURDAY",
      start: "15:15",
      end: "16:15",
      place: "Studio A",
    },
    {
      name: "Balett",
      minAge: 13,
      maxAge: 0,
      day: "SATURDAY",
      start: "16:20",
      end: "17:50",
      place: "Studio A",
    },
    {
      name: "Stretch & Relax",
      minAge: 0,
      maxAge: 0,
      day: "SATURDAY",
      start: "17:55",
      end: "18:35",
      place: "Studio A",
    },
    {
      name: "Bachata",
      minAge: 19,
      maxAge: 0,
      day: "SATURDAY",
      start: "15:15",
      end: "16:15",
      place: "Studio B",
    },

    // SÖNDAG
    {
      name: "Balett Vuxen",
      minAge: 0,
      maxAge: 0,
      day: "SUNDAY",
      start: "10:30",
      end: "11:45",
      place: "Studio A",
    },
    {
      name: "Jazz",
      minAge: 12,
      maxAge: 0,
      day: "SUNDAY",
      start: "13:55",
      end: "14:55",
      place: "Studio A",
    },
    {
      name: "Motion X Dance Crew",
      minAge: 12,
      maxAge: 0,
      day: "SUNDAY",
      start: "15:00",
      end: "17:00",
      place: "Studio A",
    },
    {
      name: "Kids Art Lab",
      minAge: 5,
      maxAge: 8,
      day: "SUNDAY",
      start: "10:30",
      end: "11:30",
      place: "Studio B",
    },
    {
      name: "Art Lab Zone",
      minAge: 9,
      maxAge: 0,
      day: "SUNDAY",
      start: "13:30",
      end: "15:00",
      place: "Studio B",
    },
  ];

  console.log("Börjar generera schema och lektioner...");

  // Vi behöver hämta alla kurser vi nyss skapat från DB för att ha tillgång till deras data (ID, ålder, namn)
  const dbCourses = await prisma.course.findMany();

  if (!dbCourses)
    throw new Error(
      "Nope, dbCourses hittade inga kurser så kurserna skapades aldrig..",
    );

  for (const s of schemaToCreate) {
    // Hitta rätt kurs-ID genom att matcha namn och minAge (unikt nog för detta schema). Aa jag förstår :)
    const targetCourse = dbCourses.find(
      (c) => c.name === s.name && c.minAge === s.minAge,
    );

    if (!targetCourse) {
      console.warn(
        `Kunde inte hitta kursobjektet för ${s.name} (${s.minAge}+) i databasen. Hoppar över.`,
      );
      continue;
    }

    try {
      const res = await seedAddCoursetoSchema(terminId, {
        courseId: targetCourse.id,
        day: s.day,
        timeStart: s.start,
        timeEnd: s.end,
        place: s.place,
      });

      if (res.success) {
        console.log(`✅ ${res.msg}`);
      } else {
        console.error(`❌ Fel vid schemaläggning av ${s.name}: ${res.msg}`);
      }
    } catch (err) {
      console.error(`Kritiskt fel för ${s.name}:`, err);
    }
  }
  // Skapa 10 produkter

  // ****************************************************** Produkter & Kopplingar ******************************************************
  console.log("Skapar produkter och kopplar dem till kurser...");

  // Vi tar de 10 första kurserna från vår dbCourses-lista
  const coursesToPricify = dbCourses.slice(0, 10);

  for (const course of coursesToPricify) {
    try {
      // 1. Skapa själva produkten
      const productResult = await seedNewProduct({
        name: `${course.name} (Vårtermin 2026)`,
        description: `Full tillgång till ${course.name} under hela vårterminen 2026.`,
        price: 1000,
        maxCustomers: 0, // Obegränsat tror jag, får kolla logiken sen. ev. fix.
        clipcard: false,
        clipCount: 0,
      });

      if (!productResult) {
        console.error(`Kunde inte skapa produkt för ${course.name}`);
        continue;
      }

      // 2. Koppla produkten till kursen (ProductOnCourse)
      // Vi sätter lessonsIncluded till ett högt tal (t.ex. 25) så att hela terminen ingår
      const connectionResult = await seedAddCourseToProduct({
        productId: productResult.id,
        courseId: course.id,
        lessonsIncluded: 25,
      });

      if (connectionResult) {
        console.log(`🎁 Produkt skapad och kopplad till: ${course.name}`);
      }
    } catch (err) {
      console.error(`Fel vid produktgenerering för ${course.name}:`, err);
    }
  }

  console.log(
    "✅ Allt klart! Nu har du elever, schema, lektioner och säljbara produkter.",
  );

  // Lämnar över till Tarek // Tobbe
  // ****************************************************** Skapa 10 färdiga ordrar, och 5 pending kanske? ******************************************************
  // Tänker typ elev 2 - 5 har köpt produkt 1, elev 2 - 10 har köpt produkt 2

  // Tips:
  // Om ordrar bara skapas, så kanske vi kan använda samma funktioner som denna delen i admin/order/page.tsx:
  /*
  async function onApprove(formData: FormData) {
    "use server";
    const orderId = String(formData.get("orderId"));
    const note = formData.get("note")?.toString();
    await approveOrder(orderId, note); // Specifikt här
    await createPurchaseFromOrder(orderId); Specifikt här så skapas även purschases! Hade lagt in en kopia av de här funktionerna i seed-actions och använt här :)
    revalidatePath("/admin/orders");
  }
  */
  //

  // Skapa några bokningar kanske? Kan ta över det sen annars eftersom jag hållt på mkt med just det. // Tobbe
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
