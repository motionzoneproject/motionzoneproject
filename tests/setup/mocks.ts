import { vi } from "vitest";
import { getTestSession } from "../helpers/session";

// Next.js-API:er som bara finns inuti en request. Server actions anropas här
// som vanliga funktioner, så de ersätts med det minsta som behövs.
vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({
    get: () => undefined,
    getAll: () => [],
    set: () => {},
    delete: () => {},
    has: () => false,
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: <T>(fn: T) => fn,
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

// Vem som är inloggad styrs av testet med actAs() i tests/helpers/session.ts.
vi.mock("@/lib/actions/sessiondata", () => ({
  getSessionData: vi.fn(async () => getTestSession()),
  getRole: vi.fn(async () => getTestSession()?.user.role),
}));

// Inga riktiga mejl. Mallarna körs ändå, så ett fel i dem syns.
vi.mock("@/lib/mail", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/mail")>();
  return {
    ...actual,
    sendMail: vi.fn(async () => ({ success: true })),
  };
});
