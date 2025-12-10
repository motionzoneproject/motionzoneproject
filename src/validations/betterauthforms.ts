import z from "zod";

// Schemas for for better auth.

// schema meets req from: (optional image and callbackURL)
// from https://www.better-auth.com/docs/authentication/email-password

// So this is for our sign-up form.
export const SignUpFormSchema = z
  .object({
    name: z.string().min(2).max(100),
    email: z.email().max(250),
    password: z.string().min(6).max(128),
    confirmPassword: z.string().min(6).max(128),
  })
  .superRefine((values, ctx) => {
    if (values.confirmPassword !== values.password)
      ctx.addIssue({
        code: "custom",
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
  });

// So this is for our sign-in form.
export const SignInFormSchema = z.object({
  email: z.email().max(250),
  password: z.string().min(6).max(128),
});
