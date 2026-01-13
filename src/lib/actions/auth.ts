"use server";
import { headers } from "next/headers";
import type z from "zod";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { SignUpFormSchema } from "@/validations/betterauthforms";

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
