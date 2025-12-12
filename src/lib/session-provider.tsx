"use client";

// So this is a solution for handling the session and user data in the whole application. This just provides down the same session to the other components, so it is lika a parent component for the whole app and we dont need to get the session in other places etc.

// In client components, just add in the "mainfunction":
//  const { session, user } = useSession();
// The user will have role.

// In server components / actions, use await getSessionData() or await getRole() like:
// const sessionData = await getSessionData();
// const user = sessionData?.user;

// const role = await getRole(); // if you just need the role.
// (see lib/actions/sessiondata.ts)

import type { Session, User } from "better-auth";
import { createContext, type ReactNode, useContext } from "react";

// Add role to User in SessionContextProps. (Its not there as default).
interface UserAndRole extends User {
  role: string | null;
  banned?: boolean | null;
}

interface SessionContextProps {
  session: Session | null;
  user: UserAndRole | null;
}

// about create-context:
/* Lets you create a Context that components can provide or read.
The value you want the context to have when there is no matching Provider in the tree above the component reading the context. This is meant as a "last resort" fallback.
*/
const sessionContext = createContext<SessionContextProps | null>(null);

// So this is then used in our client components for easely getting the session and user (with role).
export const useSession = () => {
  const context = useContext(sessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
};

export function SessionProvider({
  children,
  session,
  user,
  admin,
}: {
  children: ReactNode;
  session: Session | null;
  user: UserAndRole | null;
}) {
  return (
    <sessionContext.Provider value={{ session, user }}>
      {children}
    </sessionContext.Provider>
  );
}
