/**
 * Rapporterar vilka OrderStatus-värden som faktiskt förekommer i en databas.
 *
 * Körs innan man tar bort värden ur enumet: koden kan sluta skriva ett värde
 * långt innan raderna med det värdet försvinner, och audit-tabellen
 * order_status_event behåller dem för alltid.
 *
 *   npm run check:order-status                      # mot .env
 *   DATABASE_URL="postgres://..." npm run check:order-status   # mot annan db
 *
 * Läser bara — gör inga ändringar.
 *
 * Frågorna är avsiktligt rå SQL och castar till text. Går de via Prisma-klienten
 * kraschar de så fort schemat och databasen inte har samma enum-värden, vilket
 * är precis det läge skriptet finns till för att utreda.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// Egen klient i stället för src/lib/prisma, så skriptet kan peka på en annan
// databas via DATABASE_URL utan att dra in appens globala singleton.
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type CountRow = { value: string | null; count: bigint };

async function report(title: string, rows: CountRow[]) {
  console.log(`\n${title}`);
  if (rows.length === 0) {
    console.log("  (inga rader)");
    return;
  }
  for (const row of rows) {
    console.log(`  ${row.value ?? "(null)"}: ${row.count}`);
  }
}

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  const host = url.replace(/:\/\/[^@]*@/, "://<dolt>@");
  console.log(`Databas: ${host || "(DATABASE_URL saknas)"}`);

  const declared = await prisma.$queryRaw<{ enumlabel: string }[]>`
    SELECT e.enumlabel
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'OrderStatus'
    ORDER BY e.enumsortorder
  `;
  console.log(
    `\nDeklarerade värden i enumet: ${declared.map((d) => d.enumlabel).join(", ")}`,
  );

  const orders = await prisma.$queryRaw<CountRow[]>`
    SELECT status::text AS value, COUNT(*)::bigint AS count
    FROM "order" GROUP BY 1 ORDER BY 1
  `;
  const to = await prisma.$queryRaw<CountRow[]>`
    SELECT "toStatus"::text AS value, COUNT(*)::bigint AS count
    FROM "order_status_event" GROUP BY 1 ORDER BY 1
  `;
  const from = await prisma.$queryRaw<CountRow[]>`
    SELECT "fromStatus"::text AS value, COUNT(*)::bigint AS count
    FROM "order_status_event" GROUP BY 1 ORDER BY 1
  `;

  await report("order.status", orders);
  await report("order_status_event.toStatus", to);
  await report("order_status_event.fromStatus", from);

  const used = new Set<string>();
  for (const row of [...orders, ...to, ...from]) {
    if (row.value) used.add(row.value);
  }

  const unused = declared
    .map((d) => d.enumlabel)
    .filter((label) => !used.has(label));

  console.log(
    `\nFörekommer inte i datan: ${unused.length > 0 ? unused.join(", ") : "(inga — alla värden förekommer)"}`,
  );
  console.log(
    "OBS: det här säger bara att inga rader har värdet, inte att koden slutat\n" +
      "använda det. CANCELLED saknas t.ex. i en databas utan avbrutna ordrar men\n" +
      "sätts fortfarande av cancelOrder(). Kontrollera koden separat innan du tar\n" +
      "bort något.",
  );
}

main()
  .catch((e) => {
    console.error("FEL:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
