# Tester

Tre sviter, alla med [Vitest](https://vitest.dev) (Next.js rekommenderade
upplägg, se `node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`):

| Svit          | Mapp                 | Kräver                    | Körs i CI |
| ------------- | -------------------- | ------------------------- | --------- |
| `unit`        | `tests/unit/`        | inget                     | ja        |
| `integration` | `tests/integration/` | `TEST_DATABASE_URL`       | ja        |
| `prod-copy`   | `tests/prod-copy/`   | `PROD_COPY_DATABASE_URL`  | nej       |

```bash
npm test                    # alla sviter som har sina variabler satta
npm run test:unit
npm run test:integration
npm run test:prod-copy
npm run test:watch          # kör om vid ändringar
```

## Integration: server actions mot en riktig Postgres

`TEST_DATABASE_URL` pekar på en Postgres-**server** du får skapa och ta bort
databaser på, t.ex. `postgresql://postgres:postgres@localhost:5432/postgres`.
Använd aldrig produktionsservern.

Snabbast är Docker:

```bash
docker run -d --name mz-test-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:17
```

Vid start bygger `tests/setup/global-db.ts` en malldatabas (`mz_test_tpl_…`, eget namn per körning) med
`prisma migrate deploy` — samma migrationer som produktionen kör. Varje
testfil klonar sedan mallen till en egen databas (`tests/setup/file-db.ts`)
och tar bort den efteråt. Filerna kör parallellt och ser aldrig varandras
data.

Server actions anropas som vanliga funktioner. Det enda som ersätts
(`tests/setup/mocks.ts`) är:

- `next/headers`, `next/cache`, `next/navigation` — finns bara i en request,
- `getSessionData()` — styrs med `actAs()` från `tests/helpers/session.ts`,
- `sendMail()` — inga riktiga mejl, men mallarna körs.

Skapa testdata med `tests/helpers/factories.ts`. `buy()` går genom appens
eget orderflöde (`createOrder` → `approveOrder` → `createPurchaseFromOrder`),
så köpet och autobokningen blir som i produktion.

```ts
const admin = await createUser({ role: "admin" });
const teacher = await createUser({ role: "teacher" });
const course = await createCourse({ teacher, past: 2, future: 4 });
const product = await createProduct({ type: "COURSE", courses: [course], autobook: true });
const { items } = await buy({ admin, buyer: await createUser(), product });

actAs({ id: admin.id, role: "admin" });
// … anropa server actions och kontrollera databasen
```

## Prod-copy: mot en kopia av produktionsdatan

Fångar det som syntetisk data missar: att migrationerna går igenom på den
riktiga datan, att felkontrollerna klarar den, och att datan håller sina
invarianter.

1. Ta en backup (`pg_dump -Fc`) och återställ den i en **lokal** databas,
   t.ex. `mz_prod_copy`:
   ```bash
   createdb mz_prod_copy
   pg_restore --no-owner -d mz_prod_copy backup.dump
   ```
2. `PROD_COPY_DATABASE_URL=postgresql://postgres@localhost:5432/mz_prod_copy npm run test:prod-copy`

Källdatabasen rörs aldrig: `tests/setup/prod-copy-db.ts` klonar den, kör
branchens migrationer på klonen och tar bort klonen efteråt.

Backupen innehåller persondata. Den ska aldrig in i repot, i CI eller i
testutskrifter — testerna rapporterar bara antal och id:n.
