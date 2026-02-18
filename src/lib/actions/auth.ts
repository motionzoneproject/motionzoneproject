"use server";
import { headers } from "next/headers";
import type z from "zod";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { SignUpFormSchema } from "@/validations/betterauthforms";
import { UserDetailsSchema } from "@/validations/userforms";

type SignUpValues = z.infer<typeof SignUpFormSchema>;

export async function signUpWithDetails(values: SignUpValues) {
  const validated = SignUpFormSchema.parse(values);

  try {
    // 1. Skapa användaren via Better Auth
    // Vi använder auth.api.signUpEmail direkt på servern
    const result = await auth.api.signUpEmail({
      body: {
        email: validated.email,
        password: validated.password,
        name: `${validated.firstName} ${validated.lastName}`,
      },
      headers: await headers(),
    });

    if (!result || !result.user) {
      return { success: false, error: "Kunde inte skapa användare" };
    }

    try {
      // 2. Skapa användardetaljer i den nya tabellen
      await prisma.userDetails.create({
        data: {
          userId: result.user.id,
          firstName: validated.firstName,
          lastName: validated.lastName,
          phoneNumber: validated.phoneNumber,
          address: validated.address,
          postalCode: validated.postalCode,
          city: validated.city,
          dateOfBirth: new Date(validated.dateOfBirth),
          allowPhotoVideo: validated.allowPhotoVideo,
        },
      });
    } catch (detailError: unknown) {
      // Om vi misslyckas med att skapa detaljer, bör vi ta bort användaren
      // så att de kan försöka igen (annars blir de "fast" med ett konto utan detaljer)
      console.error(
        "Failed to create user details, rolling back user:",
        detailError,
      );
      await prisma.user.delete({ where: { id: result.user.id } });
      throw detailError;
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Signup error:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Ett oväntat fel inträffade vid registrering";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

type ChangeDetailsValues = z.infer<typeof UserDetailsSchema>;

const nullIfEmpty = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export async function changeDetails(values: ChangeDetailsValues) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({
    headers: reqHeaders,
  });
  if (!session) return { success: false, error: "Ej inloggad." };
  const user = session.user;

  try {
    const validated = await UserDetailsSchema.parseAsync(values);
    const fullName = `${validated.firstName} ${validated.lastName}`.trim();
    const dateOfBirth = validated.dateOfBirth
      ? new Date(`${validated.dateOfBirth}T00:00:00.000Z`)
      : null;

    const result = await auth.api.updateUser({
      body: {
        name: fullName,
      },
      headers: reqHeaders,
    });

    if (!result) {
      return { success: false, error: "Kunde inte ändra namnet i användaren." };
    }

    // Egentligen går ju registrering av användare alltid via funktionen signUpWithDetails så details bör alltid finnas, men kör en upsert ändå.
    await prisma.userDetails.upsert({
      where: { userId: user.id },
      update: {
        firstName: validated.firstName,
        lastName: validated.lastName,
        phoneNumber: nullIfEmpty(validated.phoneNumber),
        address: nullIfEmpty(validated.address),
        postalCode: nullIfEmpty(validated.postalCode),
        city: nullIfEmpty(validated.city),
        dateOfBirth,
        bio: nullIfEmpty(validated.bio),
        allowPhotoVideo: validated.allowPhotoVideo,
      },
      create: {
        userId: user.id,
        firstName: validated.firstName,
        lastName: validated.lastName,
        phoneNumber: nullIfEmpty(validated.phoneNumber),
        address: nullIfEmpty(validated.address),
        postalCode: nullIfEmpty(validated.postalCode),
        city: nullIfEmpty(validated.city),
        dateOfBirth,
        bio: nullIfEmpty(validated.bio),
        allowPhotoVideo: validated.allowPhotoVideo,
      },
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("Change details error:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Ett oväntat fel inträffade vid uppdatering";
    return {
      success: false,
      error: errorMessage,
    };
  }
}
