import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@/locales/get-dictionary";
import ResetPasswordForm from "./form";

export const metadata: Metadata = {
  title: "Nytt lösenord",
  description: "Välj ett nytt lösenord till ditt MotionZone-konto.",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage() {
  const { t } = await getDictionary();
  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t.resetPassword.title}
          </h1>
          <p className="text-muted-foreground">{t.resetPassword.subtitle}</p>
        </div>

        <ResetPasswordForm />

        <p className="text-center mt-6 text-muted-foreground text-sm">
          {t.resetPassword.remembered}{" "}
          <Link href="/signin" className="text-brand hover:text-brand-light">
            {t.resetPassword.backToSignIn}
          </Link>
        </p>
      </div>
    </div>
  );
}
