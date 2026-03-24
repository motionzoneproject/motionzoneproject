import Link from "next/link";
import SignInForm from "./form";

export default function SignInPage() {
  return (
    <main className="flex-1 flex items-center justify-center py-12 px-4 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Välkommen tillbaka
          </h1>
          <p className="text-muted-foreground">
            Logga in för att hantera dina bokningar
          </p>
        </div>

        <SignInForm />

        <p className="text-center mt-6 text-muted-foreground text-sm">
          Har du inget konto?{" "}
          <Link href="/signup" className="text-brand hover:text-brand-light">
            Skapa konto
          </Link>
        </p>
      </div>
    </main>
  );
}
