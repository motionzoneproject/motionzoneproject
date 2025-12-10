"use server";

// So this handles the signup, and besides just the standard better-auth logic, we also makes the first user Admin.

import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { SignUpFormSchema } from "@/validations/betterauthforms";

/**
 * API via POST, expecting:
 *   - name: string - User's full name
 *   - email: string - User's email address
 *   - password: string - User's password
 *   - confirmPassword: string - Password confirmation
 * @param req
 * @returns {user, message}
 * @throws { error, status }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // get req as FormData.
    const formData = (await req.json()) as FormData;
    // console.log("Recieved: " + JSON.stringify(formData));

    // safeParse it with zod:
    const result = SignUpFormSchema.safeParse(formData);

    // if parsing failed, return first issue as msg. fix?
    if (!result.success)
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 },
      );

    // get data from safeParsed results:
    const { name, email, password } = result.data;

    // run the better-auth for creating the user, returns the user as better-auth type "User".
    const { user } = await auth.api.signUpEmail({
      body: { name, email, password },
    });

    // Lets check if the user was created, and if its the first then make it admin, otherwise just user.
    const countUsers = await prisma.user.count();
    if (user) {
      if (countUsers === 1) {
        // Make the first user admin!

        await prisma.user.update({
          data: { role: "admin" },
          where: { id: user.id },
        });

        // console.log("Admin created.");
      }
    }

    // Success!
    return NextResponse.json({
      user,
      message: countUsers === 1 ? "Admin created!" : "User created!",
    });
  } catch (e) {
    const err = e as string;
    // console.log("Signup error: " + err);

    return NextResponse.json({ error: err }, { status: 500 });
  }
}
