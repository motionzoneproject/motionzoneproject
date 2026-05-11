import {
  ArrowRight,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ManageCookiesLink } from "@/components/ManageCookiesLink";
import { Button } from "@/components/ui/button";

const quickLinks = [
  { name: "Hem", href: "/" },
  { name: "Kurser", href: "/courses" },
  { name: "Om oss", href: "/about" },
  { name: "Galleri", href: "/gallery" },
];

const legalLinks = [
  { name: "Integritetspolicy", href: "/integritetspolicy" },
  { name: "Cookiepolicy", href: "/cookiepolicy" },
  { name: "Köpvillkor", href: "/kopvillkor" },
];

const Footer = () => {
  return (
    <footer className="relative border-t border-brand/20 bg-card [background-image:linear-gradient(180deg,rgba(76,173,178,0.08)_0%,rgba(30,41,59,0.18)_38%,rgba(154,89,215,0.05)_100%),radial-gradient(circle_at_top_left,rgba(76,173,178,0.12),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(154,89,215,0.1),transparent_48%)]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-brand/5 blur-3xl" />
        <div className="absolute -bottom-20 -right-40 w-96 h-96 rounded-full bg-brand-secondary/5 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-[calc(3rem+env(safe-area-inset-bottom))] sm:pb-8">
        <div className="grid gap-12 md:grid-cols-4 mb-12">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center group mb-4">
              <Image
                src="/logo-dark.png"
                alt="MotionZone Växjö"
                width={320}
                height={90}
                className="hidden dark:block h-18 w-auto"
                priority
              />
              <Image
                src="/logo-light.png"
                alt="MotionZone Växjö"
                width={320}
                height={90}
                className="block dark:hidden h-18 w-auto"
                priority
              />
            </Link>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Din plats för dans, glädje och gemenskap.
            </p>
            <div className="flex gap-3">
              <Link
                href="https://www.facebook.com/p/Motion-Zone-V%C3%A4xj%C3%B6-61571413538266/"
                target="_blank"
                aria-label="Facebook"
                className="w-9 h-9 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:border-brand/50 hover:text-brand hover:bg-brand/5 transition-all duration-300"
              >
                <Facebook className="w-4 h-4" />
              </Link>
              <Link
                href="https://instagram.com/motionzonevaxjo"
                target="_blank"
                aria-label="Instagram"
                className="w-9 h-9 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:border-brand-secondary/50 hover:text-brand-secondary hover:bg-brand-secondary/5 transition-all duration-300"
              >
                <Instagram className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold mb-5 text-foreground tracking-wider uppercase">
              Sidor
            </h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="group flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brand transition-colors duration-200"
                  >
                    <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold mb-5 text-foreground tracking-wider uppercase">
              Kontakt
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-brand/10 shrink-0 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-brand" />
                </div>
                <span className="text-sm text-muted-foreground">
                  Smedsvängen 70
                  <br />
                  Växjö, 35254
                </span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-brand-secondary/10 shrink-0">
                  <Phone className="w-3.5 h-3.5 text-brand-secondary" />
                </div>
                <a
                  href="tel:0707825273"
                  className="text-sm text-muted-foreground hover:text-brand transition-colors duration-200"
                >
                  0707825273
                </a>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-brand/10 shrink-0">
                  <Mail className="w-3.5 h-3.5 text-brand" />
                </div>
                <Link
                  href="mailto:sophiebretonesh@gmail.com"
                  className="text-sm text-muted-foreground hover:text-brand transition-colors duration-200"
                >
                  sophiebretonesh@gmail.com
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold mb-5 text-foreground tracking-wider uppercase">
              Bli Medlem
            </h3>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              Skapa ett konto och boka din första kurs idag!
            </p>
            <Button asChild variant="cta" className="group">
              <Link href="/signup">
                Skapa konto
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} MotionZone Växjö.
          </p>
          <nav className="flex flex-wrap gap-4">
            {legalLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-xs text-muted-foreground hover:text-brand transition-colors duration-200"
              >
                {link.name}
              </Link>
            ))}
            <ManageCookiesLink />
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
