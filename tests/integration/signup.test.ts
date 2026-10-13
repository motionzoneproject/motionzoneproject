import { afterEach, describe, expect, it, vi } from "vitest";
import { signUpWithDetails } from "@/lib/actions/auth-actions";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

const PASSWORD = "Abcdefg1";

let seq = 0;
function form(email = `signup${Date.now()}-${seq++}@example.com`) {
  return {
    firstName: "Test",
    lastName: "Person",
    email,
    password: PASSWORD,
    confirmPassword: PASSWORD,
    phoneNumber: "0701234567",
    address: "Gatan 1",
    postalCode: "12345",
    city: "Stad",
    dateOfBirth: "1990-05-05",
    allowPhotoVideo: false,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("signUpWithDetails", () => {
  it("skapar användare, lösenordskonto och detaljer, och kontot går att logga in på", async () => {
    const values = form();

    const res = await signUpWithDetails(values);

    expect(res).toEqual({ success: true });
    const user = await prisma.user.findFirstOrThrow({
      where: { email: values.email },
      include: { accounts: true, details: true },
    });
    expect(user.accounts).toHaveLength(1);
    expect(user.accounts[0].providerId).toBe("credential");
    expect(user.details?.firstName).toBe("Test");

    const signIn = await auth.api.signInEmail({
      body: { email: values.email, password: PASSWORD },
    });
    expect(signIn.user.id).toBe(user.id);
  });

  it("säger att mejlen är upptagen om kontot redan finns", async () => {
    const values = form();
    await signUpWithDetails(values);

    const res = await signUpWithDetails(values);

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/already exists/i);
    expect(await prisma.user.count({ where: { email: values.email } })).toBe(1);
  });

  it("lämnar ingen användare kvar om kontoraden inte går att skapa", async () => {
    const values = form();
    vi.spyOn(prisma.account, "create").mockRejectedValueOnce(
      new Error(
        'Invalid `prisma.account.create()` invocation: password: "hash"',
      ),
    );

    const res = await signUpWithDetails(values);

    expect(res.success).toBe(false);
    // Kunden ska inte se databasfrågan (den innehåller lösenordshashen).
    expect(res.error).not.toMatch(/prisma|password|hash/i);
    expect(await prisma.user.count({ where: { email: values.email } })).toBe(0);

    // ...och kan därför registrera sig igen med samma mejl.
    vi.restoreAllMocks();
    expect(await signUpWithDetails(values)).toEqual({ success: true });
  });
});
