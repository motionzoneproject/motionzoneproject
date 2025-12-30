import Link from "next/link";
import SignUpForm from "./form";

export default function SignUpPage() {
  return (
    <main className="flex-1 flex items-center justify-center py-12 px-4 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Skapa konto
          </h1>
          <p className="text-muted-foreground">
            Bli medlem och börja boka dina danslektioner
          </p>
        </div>

        <SignUpForm />

        <p className="text-center mt-6 text-muted-foreground text-sm">
          Har du redan ett konto?{" "}
          <Link href="/signin" className="text-brand hover:text-brand-light">
            Logga in
          </Link>
        </p>
      </div>
    </main>
  );
}
