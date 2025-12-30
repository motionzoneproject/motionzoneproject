import { Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const quickLinks = [
  { name: "Hem", href: "/" },
  { name: "Kurser", href: "/courses" },
  { name: "Om oss", href: "/about" },
  { name: "Galleri", href: "/gallery" },
];

const Footer = () => {
  return (
    <footer className="bg-card text-card-foreground border-t border-brand/20">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div>
            <h2 className="text-lg font-bold mb-3">MotionZone</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Din plats för dans, glädje och gemenskap.
            </p>
            <div className="flex gap-3">
              <Link
                href="https://facebook.com"
                target="_blank"
                className="text-muted-foreground hover:text-brand transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </Link>
              <Link
                href="https://instagram.com"
                target="_blank"
                className="text-muted-foreground hover:text-brand transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Sidor</h3>
            <ul className="space-y-2 text-sm">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-brand transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Kontakt</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand" />
                Dansgatan 12, 352 30 Växjö
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-brand" />
                0470 – 123 45
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-brand" />
                <Link
                  href="mailto:info@motionzone.se"
                  className="hover:text-brand transition-colors"
                >
                  info@motionzone.se
                </Link>
              </li>
            </ul>
          </div>

          {/* CTA */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Bli medlem</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Skapa ett konto och boka din första kurs idag!
            </p>
            <Button
              asChild
              size="sm"
              className="bg-brand hover:bg-brand-light text-white"
            >
              <Link href="/signup">Skapa konto</Link>
            </Button>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} MotionZone Växjö
        </div>
      </div>
    </footer>
  );
};

export default Footer;
