import z from "zod";

// Schemas for for better auth.

// schema meets req from: (optional image and callbackURL)
// from https://www.better-auth.com/docs/authentication/email-password

// So this is for our sign-up form.
export const SignUpFormSchema = z
  .object({
    firstName: z.string().min(2, "Förnamn måste vara minst 2 tecken").max(100),
    lastName: z.string().min(2, "Efternamn måste vara minst 2 tecken").max(100),
    email: z.string().email("Ogiltig e-postadress").max(250),
    password: z
      .string()
      .min(8, "Lösenordet måste vara minst 8 tecken")
      .max(128)
      .regex(/[A-Z]/, "Lösenordet måste innehålla minst en stor bokstav")
      .regex(/[a-z]/, "Lösenordet måste innehålla minst en liten bokstav")
      .regex(/[0-9]/, "Lösenordet måste innehålla minst en siffra"),
    confirmPassword: z.string(),
    phoneNumber: z.string().min(5, "Ogiltigt telefonnummer"),
    address: z.string().min(5, "Adressen är för kort"),
    postalCode: z
      .string()
      .regex(/^\d{3}\s?\d{2}$/, "Ogiltigt postnummer (t.ex. 123 45)"),
    city: z.string().min(2, "Ort måste vara minst 2 tecken"),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Ogiltigt datum (ÅÅÅÅ-MM-DD)"),
  })
  .superRefine((values, ctx) => {
    if (values.confirmPassword !== values.password)
      ctx.addIssue({
        code: "custom",
        message: "Lösenorden matchar inte",
        path: ["confirmPassword"],
      });
  });

// So this is for our sign-in form.
export const SignInFormSchema = z.object({
  email: z.email().max(250),
  password: z.string().min(6).max(128),
});
