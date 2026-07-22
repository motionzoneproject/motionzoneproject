import z from "zod";

export const UserBookLessonSchema = z.object({
  courseId: z.string().min(1),
  purchaseItemId: z.string().min(1),
  lessonId: z.string().min(1),
});

export const UserDetailsSchema = z.object({
  firstName: z.string().trim().min(1, "Förnamn krävs").max(100),
  lastName: z.string().trim().min(1, "Efternamn krävs").max(100),
  phoneNumber: z
    .string()
    .trim()
    .min(5, "Ogiltigt telefonnummer")
    .or(z.literal("")),
  address: z.string().trim().min(5, "Adressen är för kort").or(z.literal("")),
  postalCode: z.string().trim().min(5, "Ogiltigt postnummer").or(z.literal("")),
  city: z.string().trim().min(1, "Ort krävs").or(z.literal("")),
  dateOfBirth: z.iso.date(),
  bio: z.string().trim().max(500).or(z.literal("")),
  allowPhotoVideo: z.boolean(),
});

export const AdminEditUserSchema = z.object({
  firstName: z.string().trim().min(1, "Förnamn krävs").max(100),
  lastName: z.string().trim().min(1, "Efternamn krävs").max(100),
  phoneNumber: z
    .string()
    .trim()
    .min(5, "Ogiltigt telefonnummer")
    .or(z.literal("")),
  address: z.string().trim().min(5, "Adressen är för kort").or(z.literal("")),
  dateOfBirth: z.iso.date(),
  postalCode: z.string().trim().min(5, "Ogiltigt postnummer").or(z.literal("")),
  city: z.string().trim().min(1, "Ort krävs").or(z.literal("")),
  allowPhotoVideo: z.boolean(),
});

export const UserEmailSchema = z.object({
  currentEmail: z.email("Ogiltig e-postadress").max(250),
  email: z.email("Ogiltig e-postadress").max(250),
});

export const UserPasswordSchema = z
  .object({
    oldPassword: z
      .string()
      .min(8, "Lösenordet måste vara minst 8 tecken")
      .max(128)
      .regex(/[A-Z]/, "Lösenordet måste innehålla minst en stor bokstav")
      .regex(/[a-z]/, "Lösenordet måste innehålla minst en liten bokstav")
      .regex(/[0-9]/, "Lösenordet måste innehålla minst en siffra"),
    password: z
      .string()
      .min(8, "Lösenordet måste vara minst 8 tecken")
      .max(128)
      .regex(/[A-Z]/, "Lösenordet måste innehålla minst en stor bokstav")
      .regex(/[a-z]/, "Lösenordet måste innehålla minst en liten bokstav")
      .regex(/[0-9]/, "Lösenordet måste innehålla minst en siffra"),
    confirmPassword: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.confirmPassword !== values.password)
      ctx.addIssue({
        code: "custom",
        message: "Lösenorden matchar inte",
        path: ["confirmPassword"],
      });
  });
