import { headers } from "next/headers";
import KursForm from "@/components/kurs-formular";
import { auth } from "@/lib/auth";

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (session) {
    console.log("/courses");
  } else {
    console.log("/signin");
  }

  return (
    <div className="container mx-auto mt-12 min-h-screen bg-slate-400 items-center justify-center flex flex-col">
      <p className="text-md font-bold text-black mb-4 text-center">
        Fyll i det här formuläret för att ansöka till vilken kurs du än är
        intresserad av
      </p>

      <KursForm />
    </div>
  );
}
