import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.S3_PUBLIC_URL,
  plugins: [adminClient()],
});

export const { signIn, signOut, signUp, useSession } = authClient;
