import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const legalPages = [
  {
    slug: "integritetspolicy",
    title: "Integritetspolicy",
    content:
      "<h2>Integritetspolicy</h2><p>Denna integritetspolicy beskriver hur MotionZone Växjö samlar in, använder och skyddar dina personuppgifter i enlighet med dataskyddsförordningen (GDPR).</p><h3>Personuppgiftsansvarig</h3><p>MotionZone Växjö är personuppgiftsansvarig för behandlingen av dina personuppgifter.</p><h3>Vilka uppgifter vi samlar in</h3><ul><li>Namn och kontaktuppgifter (e-post, telefonnummer)</li><li>Adress och postort</li><li>Betalningsinformation vid köp</li></ul><h3>Dina rättigheter</h3><p>Du har rätt att begära tillgång till, rättelse eller radering av dina personuppgifter. Kontakta oss för att utöva dina rättigheter.</p>",
  },
  {
    slug: "cookiepolicy",
    title: "Cookiepolicy",
    content:
      "<h2>Cookiepolicy</h2><p>Denna webbplats använder cookies för att förbättra din upplevelse i enlighet med lagen om elektronisk kommunikation (LEK).</p><h3>Vad är cookies?</h3><p>Cookies är små textfiler som lagras på din enhet när du besöker en webbplats.</p><h3>Vilka cookies vi använder</h3><ul><li><strong>Nödvändiga cookies</strong> - krävs för att webbplatsen ska fungera (t.ex. inloggning)</li><li><strong>Funktionella cookies</strong> - sparar dina preferenser</li></ul><h3>Hantera cookies</h3><p>Du kan ställa in din webbläsare att blockera cookies, men det kan påverka webbplatsens funktionalitet.</p>",
  },
  {
    slug: "kopvillkor",
    title: "Köpvillkor",
    content:
      "<h2>Köpvillkor</h2><p>Dessa köpvillkor gäller för köp via MotionZone Växjös webbplats i enlighet med Distansavtalslagen.</p><h3>Priser</h3><p>Alla priser anges i svenska kronor (SEK) inklusive moms.</p><h3>Betalning</h3><p>Betalning sker via de betalningsmetoder som erbjuds vid kassan.</p><h3>Ångerrätt</h3><p>Enligt Distansavtalslagen har du 14 dagars ångerrätt från köpdagen. Ångerrätten gäller dock inte för tjänster som har börjat utföras med ditt samtycke.</p><h3>Reklamation</h3><p>Om du vill reklamera ett köp, kontakta oss så snart som möjligt.</p>",
  },
];

async function main() {
  console.log("Seeding legal pages...");

  for (const page of legalPages) {
    await prisma.legalPage.upsert({
      where: { slug: page.slug },
      update: { title: page.title },
      create: page,
    });
    console.log(`  ✓ ${page.title} (/${page.slug})`);
  }

  console.log("Done!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
