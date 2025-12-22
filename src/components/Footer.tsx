// components/Footer.js
import { Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const Footer = () => {
  return (
    <footer className="bg-gray-950 text-gray-300">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-white mb-4">
              MotionZone Växjö
            </h2>
            <p className="text-sm leading-relaxed text-gray-400 mb-6">
              Din plats för dans, glädje och gemenskap.
              <br />
              Kurser för alla åldrar och nivåer.
            </p>

            <div className="flex items-center gap-4">
              <Link
                href="https://facebook.com"
                target="_blank"
                className="hover:text-yellow-400 transition"
              >
                <Facebook className="w-5 h-5" />
              </Link>
              <Link
                href="https://instagram.com"
                target="_blank"
                className="hover:text-yellow-400 transition"
              >
                <Instagram className="w-5 h-5" />
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Snabblänkar
            </h3>
            <ul className=" space-y-2 text-md text-rose-200 höver:text-blue-200">
              {[
                { name: "Hem", href: "/" },
                { name: "Mina kurser", href: "/courses" },
                { name: "Om oss", href: "/about" },
                { name: "Kontakta oss", href: "/contact" },
              ].map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="hover:text-yellow-400 transition"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Kontakt</h3>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-rose-400" />
                <span>Dansgatan 12, 352 30 Växjö</span>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-rose-400" />
                <span>0470 – 123 45</span>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-rose-400" />
                <Link
                  href="mailto:info@motionzone.se"
                  className="hover:text-rose-400 transition"
                >
                  info@motionzone.se
                </Link>
              </li>
            </ul>
          </div>

          <div className="items-center mx-auto">
            <Button asChild className="mt-6 w-full bg-red-600 hover:bg-red-500">
              <Link href="/signup">Bli medlem</Link>
            </Button>
          </div>
        </div>

        <Separator className="my-10 bg-gray-800" />

        <div className="max-w-7xl mx-auto ">
          <p className=" border-neutral-200 text-md font-bold text-white-500 px-6 py-2 text-center">
            © {new Date().getFullYear()} MotionZone Växjö. Alla rättigheter
            förbehållna.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
