"use server";

import { headers } from "next/headers";
import { auth } from "../auth";

/**
 *
 * @returns The signed in users role! (or undefined if no session).
 */
export async function getRole(): Promise<string | undefined> {
  // Get the sessionData and provide it to the sessionprov.
  const sessionData = await getSessionData();

  return sessionData?.user.role;
}

// So this is the type of what better-auth getSession returns (awaited):
type SessionData = Awaited<ReturnType<typeof auth.api.getSession>>;

/**
 *  Just a faster way than always including headers etc. Use in server components!
 * @returns The sessionData from better-auth.
 */
export async function getSessionData(): Promise<SessionData | null> {
  const sessionData = await auth.api.getSession({
    headers: await headers(),
  });

  return sessionData;
}
