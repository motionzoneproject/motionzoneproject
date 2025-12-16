**Overview**

- Purpose: MotionZone dance studio platform with auth, admin, courses/terms/schedule, products, orders, purchases, and bookings.
- Stack: Next.js 16 (App Router), React 19, Prisma 7 + PostgreSQL, Better Auth, Tailwind 4, Radix UI.

**Key Paths**

- Auth: [src/lib/auth.ts](src/lib/auth.ts), [src/app/api/auth/[...all]/route.ts](src/app/api/auth/[...all]/route.ts)
- Prisma client: [src/lib/prisma.ts](src/lib/prisma.ts)
- Schema: [prisma/schema.prisma](prisma/schema.prisma)
- Admin: [src/app/admin](src/app/admin)
- Checkout (basic): [src/app/checkout/page.tsx](src/app/checkout/page.tsx), success at [src/app/checkout/success/page.tsx](src/app/checkout/success/page.tsx)

**Setup**

- Requirements: Node 20+, PostgreSQL (local or Docker).
- Env: create [.env](.env) with:
  - `DATABASE_URL=postgresql://<user>:<password>@localhost:5432/motionzone?schema=public`
  - `BETTER_AUTH_SECRET=<random-hex>`
  - `BETTER_AUTH_URL=http://localhost:3000`
- Install + generate:

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
```

**Run**

```bash
npm run dev
# open http://localhost:3000
```

**Branching Workflow**

- Always branch from latest `dev`:

```bash
git checkout dev
git pull origin dev
git checkout -b feature/<short-topic>
```

- Keep branches small and focused; open PRs into `dev`.

**Commit & Husky Hooks**

- Pre-commit runs Biome format + lint; pre-push runs build.
- If hooks fail, fix reported files (do not bypass unless urgent).

```bash
# before commit (optional manual run)
npm run format
npm run lint

# commit normally (hooks will run)

git commit -m "<clear message>"
git push -u origin feature/<short-topic>
```

**Pull Requests**

- Target: `dev`.
- Include: summary, scope, testing notes.
- CI passes: format, lint, build.

**Database Tips**

- Local via Docker (matches sample .env):

```bash
docker run --name motionzone-pg \
	-e POSTGRES_USER=postgres \
	-e POSTGRES_PASSWORD=postgres \
	-e POSTGRES_DB=motionzone \
	-p 5432:5432 -d postgres:16
```

- After schema changes:

```bash
npx prisma generate
npx prisma migrate dev --name <change>
```

**Notes**

- Prices use Prisma Decimal; convert/format for display.
- Server actions require a signed-in user.
