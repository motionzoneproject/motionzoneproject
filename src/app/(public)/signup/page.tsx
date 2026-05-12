import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@/locales/get-dictionary";
import SignUpForm from "./form";

export const metadata: Metadata = {
  title: "Skapa konto",
  description:
    "Skapa ett konto hos MotionZone Växjö för att boka kurser och lektioner.",
  robots: { index: false, follow: false },
};

export default async function SignUpPage() {
  const { t } = await getDictionary();
  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t.signup.title}
          </h1>
          <p className="text-muted-foreground">{t.signup.subtitle}</p>
        </div>

        <SignUpForm />

        <p className="text-center mt-6 text-muted-foreground text-sm">
          {t.signup.haveAccount}{" "}
          <Link href="/signin" className="text-brand hover:text-brand-light">
            {t.signup.signIn}
          </Link>
        </p>
      </div>
    </div>
  );
}
