// Sessionen som den mockade getSessionData() returnerar. Ligger på globalThis
// så att setupfilen och testfilen säkert ser samma värde.

type TestUser = { id: string; role: string | null; email?: string };

type TestSession = {
  user: {
    id: string;
    role: string | null | undefined;
    email: string;
    name: string;
  };
  session: { id: string; userId: string };
};

const store = globalThis as { __testSession?: TestSession | null };

/** Loggar in som `user` för följande anrop, eller loggar ut med null. */
export function actAs(user: TestUser | null) {
  store.__testSession = user
    ? {
        user: {
          id: user.id,
          role: user.role,
          email: user.email ?? `${user.id}@test.local`,
          name: user.id,
        },
        session: { id: `session-${user.id}`, userId: user.id },
      }
    : null;
}

export function getTestSession(): TestSession | null {
  return store.__testSession ?? null;
}
