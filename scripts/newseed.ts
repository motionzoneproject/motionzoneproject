import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { addTermin } from "@/lib/actions/seed-actions";
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
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          password: user.password,
          confirmPassword: user.password,
        }),
      });

      const result = await response.json();

      createdUserIds.push(result.user.id);
    } catch (e) {
      // Gick ej skapa användare, throwa ett Error för resten av seeden kommer vilja connecta eleverna till saker.
      // Eventuellt gör vi ett annat case om det inte går, men försök lösa det tror jag blir bäst.
      throw new Error(JSON.stringify(e));
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

  let _terminId: string = "";

  // enligt: https://www.instagram.com/p/DR_vmSpgv9y/ så börjar terminen 1 feb.

  try {
    const terminRes = await addTermin({
      name: "Vårterminen 2026",
      startDate: new Date("2026-02-01"),
      endDate: new Date("2026-06-30"), // fix: gissar på det atm, får väl fråga kanske, de kanske har sommarstängt osv.
    });

    if (!terminRes) throw new Error("Termin kunde inte skapas.");

    _terminId = terminRes.id;
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
      maxBookings: 20,
      maxCustomers: 25,
      teacherId,
    },
    {
      name: "Balett",
      minAge: 9,
      maxAge: 0,
      adult: false,
      level: "Nybörjare/Mellan",
      description: "Klassisk balett.",
      maxBookings: 20,
      maxCustomers: 25,
      teacherId,
    },
    {
      name: "Teater",
      minAge: 10,
      maxAge: 0,
      adult: false,
      level: "Grundnivå",
      description: "Grundläggande teater.",
      maxBookings: 15,
      maxCustomers: 20,
      teacherId,
    },
    {
      name: "Jazz",
      minAge: 15,
      maxAge: 0,
      adult: true,
      level: "Öppen nivå",
      description: "Jazz för ungdomar och vuxna.",
      maxBookings: 20,
      maxCustomers: 25,
      teacherId,
    },
    {
      name: "Salsa",
      minAge: 19,
      maxAge: 0,
      adult: true,
      level: "Nybörjare",
      description: "Salsa i Studio B.",
      maxBookings: 20,
      maxCustomers: 25,
      teacherId,
    },

    // TISDAG
    {
      name: "Hip Hop",
      minAge: 5,
      maxAge: 8,
      adult: false,
      level: "Nybörjare",
      description: "Hip hop för barn.",
      maxBookings: 20,
      maxCustomers: 25,
      teacherId,
    },
    {
      name: "Hip Hop",
      minAge: 9,
      maxAge: 0,
      adult: false,
      level: "Nybörjare",
      description: "Hip hop fortsättning.",
      maxBookings: 20,
      maxCustomers: 25,
      teacherId,
    },
    {
      name: "Contemporary",
      minAge: 13,
      maxAge: 0,
      adult: false,
      level: "Öppen nivå",
      description: "Modern dans.",
      maxBookings: 20,
      maxCustomers: 25,
      teacherId,
    },
    {
      name: "Latin Rhythms",
      minAge: 19,
      maxAge: 0,
      adult: true,
      level: "Öppen nivå",
      description: "Latinska rytmer.",
      maxBookings: 20,
      maxCustomers: 25,
      teacherId,
    },
    {
      name: "Reggaeton",
      minAge: 19,
      maxAge: 0,
      adult: true,
      level: "Öppen nivå",
      description: "Högintensiv dans.",
      maxBookings: 20,
      maxCustomers: 25,
      teacherId,
    },
    {
      name: "Träning med band & stretching",
      minAge: 0,
      maxAge: 0,
      adult: true,
      level: "Fys",
      description: "Styrka och rörlighet.",
      maxBookings: 15,
      maxCustomers: 20,
      teacherId,
    },

    // ONSDAG
    {
      name: "Balett",
      minAge: 9,
      maxAge: 0,
      adult: false,
      level: "Fortsättning",
      description: "Balett för äldre barn.",
      maxBookings: 20,
      maxCustomers: 25,
      teacherId,
    },
    {
      name: "Balett",
      minAge: 0,
      maxAge: 0,
      adult: false,
      level: "Mellan/Avancerad",
      description: "Avancerad teknik.",
      maxBookings: 20,
      maxCustomers: 25,
      teacherId,
    },
    {
      name: "Pointe",
      minAge: 0,
      maxAge: 0,
      adult: false,
      level: "Mellannivå",
      description: "Tåspetsteknik.",
      maxBookings: 10,
      maxCustomers: 15,
      teacherId,
    },
    {
      name: "Stretching",
      minAge: 0,
      maxAge: 0,
      adult: false,
      level: "För dansare",
      description: "Specifik stretch för dansare.",
      maxBookings: 20,
      maxCustomers: 25,
      teacherId,
    },
    {
      name: "Heels",
      minAge: 16,
      maxAge: 0,
      adult: true,
      level: "Öppen nivå",
      description: "Dans i klackar.",
      maxBookings: 20,
      maxCustomers: 25,
      teacherId,
    },

    // TORSDAG
    {
      name: "Balett",
      minAge: 5,
      maxAge: 8,
      adult: false,
      level: "Nybörjare",
      description: "Barnbalett.",
      maxBookings: 15,
      maxCustomers: 20,
      teacherId,
    },
    {
      name: "Barre",
      minAge: 0,
      maxAge: 0,
      adult: true,
      level: "Öppen nivå",
      description: "Styrketräning vid stång.",
      maxBookings: 15,
      maxCustomers: 20,
      teacherId,
    },
    {
      name: "Balett",
      minAge: 13,
      maxAge: 0,
      adult: true,
      level: "Mellannivå",
      description: "Vuxenbalett.",
      maxBookings: 20,
      maxCustomers: 25,
      teacherId,
    },
    {
      name: "Pointe",
      minAge: 12,
      maxAge: 0,
      adult: false,
      level: "Nybörjare",
      description: "Introduktion till tåspets.",
      maxBookings: 10,
      maxCustomers: 15,
      teacherId,
    },
    {
      name: "Hip Hop",
      minAge: 15,
      maxAge: 0,
      adult: true,
      level: "Öppen nivå",
      description: "Hip hop vuxen.",
      maxBookings: 20,
      maxCustomers: 25,
      teacherId,
    },

    // LÖRDAG
    {
      name: "Barre",
      minAge: 0,
      maxAge: 0,
      adult: true,
      level: "Lördagspass",
      description: "Förmiddagspass.",
      maxBookings: 15,
      maxCustomers: 20,
      teacherId,
    },
    {
      name: "Balett",
      minAge: 13,
      maxAge: 0,
      adult: true,
      level: "Öppen nivå",
      description: "Lördagsbalett.",
      maxBookings: 20,
      maxCustomers: 25,
      teacherId,
    },
    {
      name: "Stretch & Relax",
      minAge: 0,
      maxAge: 0,
      adult: true,
      level: "Lugnt pass",
      description: "Avkoppling och stretch.",
      maxBookings: 20,
      maxCustomers: 25,
      teacherId,
    },
    {
      name: "Bachata",
      minAge: 19,
      maxAge: 0,
      adult: true,
      level: "Öppen nivå",
      description: "Bachata i Studio B.",
      maxBookings: 20,
      maxCustomers: 25,
      teacherId,
    },

    // SÖNDAG
    {
      name: "Balett Vuxen",
      minAge: 0,
      maxAge: 0,
      adult: true,
      level: "Nybörjare",
      description: "Grundkurs för vuxna.",
      maxBookings: 20,
      maxCustomers: 25,
      teacherId,
    },
    {
      name: "Jazz",
      minAge: 12,
      maxAge: 0,
      adult: false,
      level: "Öppen nivå",
      description: "Söndagsjazz.",
      maxBookings: 20,
      maxCustomers: 25,
      teacherId,
    },
    {
      name: "Motion X Dance Crew",
      minAge: 12,
      maxAge: 0,
      adult: false,
      level: "Uppvisningsgrupp",
      description: "Specialgrupp.",
      maxBookings: 20,
      maxCustomers: 25,
      teacherId,
    },
    {
      name: "Kids Art Lab",
      minAge: 5,
      maxAge: 8,
      adult: false,
      level: "Kreativ workshop",
      description: "Konst och rörelse.",
      maxBookings: 15,
      maxCustomers: 20,
      teacherId,
    },
    {
      name: "Art Lab Zone",
      minAge: 9,
      maxAge: 0,
      adult: false,
      level: "Kreativ workshop",
      description: "Fördjupning konst.",
      maxBookings: 15,
      maxCustomers: 20,
      teacherId,
    },
  ];

  const _createdCoursesId = []; // en lista med id för alla kurser.

  try {
    for (const _course of coursesToCreate) {
    }
  } catch (e) {
    throw new Error(JSON.stringify(e));
  }

  // Sådär då.
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
