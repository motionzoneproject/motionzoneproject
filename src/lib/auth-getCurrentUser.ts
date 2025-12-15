// lib/auth.ts

import { auth } from "./auth";

export async function getCurrentUser(req: Request) {
  const session = await auth.api.getSession({
    headers: req.headers,
  }); // Retrieve the session from the request

  if (session?.user) {
    return session.user; // Return the authenticated user if the session exists
  }

  return null; // If no session or user is found, return null
}
