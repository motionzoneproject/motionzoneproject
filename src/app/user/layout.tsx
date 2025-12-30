import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function UserLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/signin?callbackUrl=/user");
  }

  if (session.user.role === "admin") {
    redirect("/admin");
  }

  return (
    <main className="flex-1 bg-background py-8">
      <div className="max-w-4xl mx-auto px-4">{children}</div>
    </main>
  );
}
