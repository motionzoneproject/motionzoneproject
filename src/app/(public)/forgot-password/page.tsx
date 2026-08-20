import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@/locales/get-dictionary";
import ForgotPasswordForm from "./form";

export const metadata: Metadata = {
  title: "Glömt lösenord",
  description: "Återställ lösenordet till ditt MotionZone-konto.",
  robots: { index: false, follow: false },
};

export default async function ForgotPasswordPage() {
  const { t } = await getDictionary();
  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t.forgotPassword.title}
          </h1>
          <p className="text-muted-foreground">{t.forgotPassword.subtitle}</p>
        </div>

        <ForgotPasswordForm />

        <p className="text-center mt-6 text-muted-foreground text-sm">
          {t.forgotPassword.remembered}{" "}
          <Link href="/signin" className="text-brand hover:text-brand-light">
            {t.forgotPassword.backToSignIn}
          </Link>
        </p>
      </div>
    </div>
  );
}
