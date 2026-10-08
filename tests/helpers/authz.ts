// Hjälpare för behörighetssvepet (tests/integration/authz-sweep.test.ts):
// hitta alla "use server"-filer, ta ögonblicksbilder av hela databasen och
// jämföra dem rad för rad.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prisma from "@/lib/prisma";

const SRC = fileURLToPath(new URL("../../src", import.meta.url));

/**
 * Filer under src/ vars första sats är "use server". Varje export i en sådan
 * fil blir en publik endpoint. Inline-direktiv inne i funktioner (t.ex. i
 * page.tsx) räknas inte — de är stängningar som bara nås via sin sida.
 */
export function findUseServerFiles(dir = SRC): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "generated" || entry.name === "node_modules") continue;
      out.push(...findUseServerFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      if (startsWithUseServer(readFileSync(full, "utf8"))) out.push(full);
    }
  }
  return out.sort();
}

function startsWithUseServer(source: string): boolean {
  // Hoppa över kommentarer och tomrader före första satsen.
  const stripped = source
    .replace(/^﻿/, "")
    .replace(/^(\s*(\/\/[^\n]*\n|\/\*[\s\S]*?\*\/))*\s*/, "");
  return /^["']use server["']/.test(stripped);
}

/** "src/lib/actions/orders.ts" — för läsbara testnamn. */
export function relativeToRepo(file: string): string {
  return path.relative(path.resolve(SRC, ".."), file).replaceAll("\\", "/");
}

// --- Ögonblicksbilder ---------------------------------------------------

/** tabell → radnyckel (id, annars hela raden) → raden som JSON-text */
export type Snapshot = Map<string, Map<string, string>>;

let tableCache: string[] | null = null;

async function tables(): Promise<string[]> {
  if (tableCache) return tableCache;
  const rows = await prisma.$queryRawUnsafe<{ tablename: string }[]>(
    `select tablename from pg_tables
     where schemaname = 'public' and tablename <> '_prisma_migrations'
     order by tablename`,
  );
  tableCache = rows.map((r) => r.tablename);
  return tableCache;
}

/** Hela databasen, rad för rad. Testdatabasen är liten, så det går fort. */
export async function snapshot(): Promise<Snapshot> {
  const snap: Snapshot = new Map();
  for (const table of await tables()) {
    const rows = await prisma.$queryRawUnsafe<
      { k: string | null; r: string }[]
    >(
      `select to_jsonb(t)->>'id' as k, to_jsonb(t)::text as r from "public"."${table}" t`,
    );
    const m = new Map<string, string>();
    for (const row of rows) m.set(row.k ?? row.r, row.r);
    snap.set(table, m);
  }
  return snap;
}

export type RowChange = {
  table: string;
  kind: "insert" | "update" | "delete";
  before?: string;
  after?: string;
};

export function diffSnapshots(before: Snapshot, after: Snapshot): RowChange[] {
  const changes: RowChange[] = [];
  for (const [table, b] of before) {
    const a = after.get(table) ?? new Map<string, string>();
    for (const [k, row] of b) {
      const next = a.get(k);
      if (next === undefined)
        changes.push({ table, kind: "delete", before: row });
      else if (next !== row)
        changes.push({ table, kind: "update", before: row, after: next });
    }
    for (const [k, row] of a) {
      if (!b.has(k)) changes.push({ table, kind: "insert", after: row });
    }
  }
  return changes;
}

/** Alla strängvärden i en JSON-rad, för att se vilka id:n den pekar på. */
function valuesOf(rowJson: string | undefined): string[] {
  if (!rowJson) return [];
  return Object.values(JSON.parse(rowJson) as Record<string, unknown>).filter(
    (v): v is string => typeof v === "string",
  );
}

export function rowReferences(
  rowJson: string | undefined,
  ids: Set<string>,
): boolean {
  return valuesOf(rowJson).some((v) => ids.has(v));
}

/**
 * Id:n som tillhör `userId`: kontot, deltagare hen lagt till, ordrar,
 * orderrader, köp, köprader och bokningar.
 */
export async function ownedIds(userId: string): Promise<Set<string>> {
  const ids = new Set<string>([userId]);
  const add = (rows: { id: string }[]) => {
    for (const r of rows) ids.add(r.id);
  };
  add(
    await prisma.participant.findMany({
      where: { addedByUserId: userId },
      select: { id: true },
    }),
  );
  add(await prisma.order.findMany({ where: { userId }, select: { id: true } }));
  add(
    await prisma.orderItem.findMany({
      where: { order: { userId } },
      select: { id: true },
    }),
  );
  add(
    await prisma.purchase.findMany({ where: { userId }, select: { id: true } }),
  );
  add(
    await prisma.purchaseItem.findMany({
      where: { purchase: { userId } },
      select: { id: true },
    }),
  );
  add(
    await prisma.booking.findMany({ where: { userId }, select: { id: true } }),
  );
  add(
    await prisma.userDetails.findMany({
      where: { userId },
      select: { id: true },
    }),
  );
  return ids;
}

/** Kort, läsbar beskrivning av en ändring till felmeddelanden. */
export function describeChange(c: RowChange): string {
  const row = c.after ?? c.before ?? "";
  return `${c.kind} ${c.table}: ${row.slice(0, 200)}`;
}

/** Gör ett returvärde sökbart som text. Hanterar Infinity, Date och Map. */
export function stringifyResult(value: unknown): string {
  try {
    return (
      JSON.stringify(value, (_k, v) => {
        if (v instanceof Map) return Object.fromEntries(v);
        if (v instanceof Set) return [...v];
        if (typeof v === "bigint") return v.toString();
        return v;
      }) ?? ""
    );
  } catch {
    return String(value);
  }
}

/**
 * Återställer databasen efter ett anrop som ändrade något, så att nästa
 * funktion i svepet möter samma utgångsläge och ett fynd inte ger följdfel.
 * Raderna läggs tillbaka i flera varv tills främmande nycklar går ihop.
 */
export async function revert(changes: RowChange[]): Promise<void> {
  let pending = [...changes];
  for (let round = 0; round < 10 && pending.length > 0; round++) {
    const failed: RowChange[] = [];
    for (const c of pending) {
      try {
        await revertOne(c);
      } catch {
        failed.push(c);
      }
    }
    pending = failed;
  }
  if (pending.length > 0)
    throw new Error(
      `Kunde inte återställa ${pending.length} rader: ${pending.map(describeChange).join("; ")}`,
    );
}

async function revertOne(c: RowChange) {
  const t = `"public"."${c.table}"`;
  if (c.kind === "insert") {
    await prisma.$executeRawUnsafe(
      `delete from ${t} where to_jsonb(${t}.*) = $1::jsonb`,
      c.after,
    );
  } else if (c.kind === "delete") {
    await prisma.$executeRawUnsafe(
      `insert into ${t} select * from jsonb_populate_record(null::${t}, $1::jsonb)`,
      c.before,
    );
  } else {
    const cols = Object.keys(JSON.parse(c.before ?? "{}") as object)
      .map((k) => `"${k}"`)
      .join(", ");
    await prisma.$executeRawUnsafe(
      `update ${t} set (${cols}) = (select ${cols} from jsonb_populate_record(null::${t}, $1::jsonb))
       where to_jsonb(${t}.*)->>'id' = $1::jsonb->>'id'`,
      c.before,
    );
  }
}
