import KursForm from "@/components/kurs-formular";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";


export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers()
  });
  if (session){
    console.log("/courses")
  }else{
    console.log("/signin")
  }
 
  return (
    <div className="max-w-sm flex flex-col justify-center items-center mx-auto min-h-screen bg-slate-400 w-full">
      <p className="text-md font-bold text-black mb-4 text-center">
        Fyll i det här formuläret för att ansöka till vilken kurs du än är
        intresserad av
      </p>
      <KursForm />
    </div>
  );
}
