import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

// TODO: customer to fill in real legal entity name and org number below.
const COMPANY = "Motion Zone Växjö AB (org.nr ÅÅÅÅÅÅ-ÅÅÅÅ)";
// TODO: customer to confirm contact email used for data subject requests.
const CONTACT_EMAIL = "info@motionzonevaxjo.se";

const integritetspolicySv = `
<h2>Integritetspolicy</h2>
<p>Denna integritetspolicy beskriver hur ${COMPANY} ("vi", "oss") behandlar dina personuppgifter när du använder webbplatsen motionzone.se och våra tjänster. Vi följer dataskyddsförordningen (GDPR) och svensk dataskyddslag.</p>

<h3>1. Personuppgiftsansvarig</h3>
<p>${COMPANY}, Smedsvängen 70, 352 54 Växjö. Kontakt: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>

<h3>2. Vilka personuppgifter vi behandlar och varför</h3>
<ul>
  <li><strong>Konto:</strong> namn, e-postadress, telefonnummer och lösenord (hashat) — för inloggning och kommunikation. Rättslig grund: avtal (art. 6.1 b GDPR).</li>
  <li><strong>Bokningar och köp:</strong> kursval, deltagare, betalningsstatus, fakturauppgifter — för att leverera den tjänst du köpt. Rättslig grund: avtal.</li>
  <li><strong>Deltagaruppgifter:</strong> om du anmäler någon annan (t.ex. ditt barn) registrerar vi namn, e-post, telefon och eventuellt foto-/videosamtycke. Rättslig grund: avtal samt samtycke för foto/video (art. 6.1 a).</li>
  <li><strong>Foton och videor:</strong> bilder från kurser och evenemang som du laddar upp eller vi tar lagras hos vår molnleverantör. Publicering sker endast om foto-/videosamtycke finns. Rättslig grund: samtycke.</li>
  <li><strong>Transaktionsmejl:</strong> bekräftelser, påminnelser och systemmeddelanden skickas via Resend (vår e-postleverantör). Rättslig grund: avtal.</li>
  <li><strong>Cookies:</strong> se separat <a href="/cookiepolicy">cookiepolicy</a>.</li>
</ul>

<h3>3. Mottagare av personuppgifter</h3>
<p>Vi delar endast uppgifter med personuppgiftsbiträden som behövs för driften:</p>
<ul>
  <li>Vår databas- och hostingleverantör inom EU/EES.</li>
  <li>Vår fillagring (S3-kompatibel) för foton och videor.</li>
  <li>Resend för utskick av transaktionsmejl.</li>
  <li>Betalningsleverantör vid köp.</li>
</ul>
<p>Personuppgiftsbiträdesavtal (DPA) finns på plats med varje leverantör.</p>

<h3>4. Lagringstid</h3>
<ul>
  <li>Kontouppgifter: så länge du har ett aktivt konto. Vi raderar konton som varit inaktiva i mer än 24 månader.</li>
  <li>Bokföringsmaterial: 7 år enligt bokföringslagen.</li>
  <li>Foton och videor: tills du återkallar samtycket eller vi inte längre använder materialet.</li>
</ul>

<h3>5. Dina rättigheter (art. 15–22 GDPR)</h3>
<ul>
  <li>Rätt till information och tillgång till dina uppgifter.</li>
  <li>Rätt till rättelse av felaktiga uppgifter.</li>
  <li>Rätt till radering ("rätten att bli bortglömd").</li>
  <li>Rätt till begränsning av behandling.</li>
  <li>Rätt till dataportabilitet.</li>
  <li>Rätt att invända mot behandling.</li>
  <li>Rätt att återkalla samtycke när som helst (t.ex. foto-/videosamtycke).</li>
</ul>
<p>Kontakta oss på <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> för att utöva dina rättigheter.</p>

<h3>6. Klagomål till tillsynsmyndighet</h3>
<p>Om du anser att vi behandlar dina personuppgifter felaktigt har du rätt att lämna in ett klagomål till Integritetsskyddsmyndigheten (IMY), <a href="https://www.imy.se" target="_blank" rel="noreferrer">www.imy.se</a>.</p>

<h3>7. Överföringar utanför EU/EES</h3>
<p>Vi strävar efter att hålla all behandling inom EU/EES. Om en leverantör skulle behandla uppgifter utanför EU/EES sker det med EU-kommissionens standardavtalsklausuler som skydd.</p>

<h3>8. Ändringar i policyn</h3>
<p>Vi kan komma att uppdatera denna policy. Datum för senaste uppdatering visas ovan.</p>
`.trim();

const integritetspolicyEn = `
<h2>Privacy Policy</h2>
<p>This privacy policy explains how ${COMPANY} ("we", "us") processes your personal data when you use the website motionzone.se and our services. We comply with the GDPR and Swedish data protection law.</p>

<h3>1. Data controller</h3>
<p>${COMPANY}, Smedsvängen 70, 352 54 Växjö, Sweden. Contact: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>

<h3>2. What personal data we process and why</h3>
<ul>
  <li><strong>Account:</strong> name, email, phone number and password (hashed) — for sign-in and communication. Legal basis: contract (Art. 6(1)(b) GDPR).</li>
  <li><strong>Bookings and purchases:</strong> course selection, participants, payment status, invoice data — to deliver the service you have purchased. Legal basis: contract.</li>
  <li><strong>Participant data:</strong> if you register someone else (e.g. your child) we store name, email, phone and an optional photo/video consent flag. Legal basis: contract, plus consent for photo/video (Art. 6(1)(a)).</li>
  <li><strong>Photos and videos:</strong> images from courses and events that you upload or we capture are stored with our cloud provider. We only publish them where photo/video consent exists. Legal basis: consent.</li>
  <li><strong>Transactional emails:</strong> confirmations, reminders and system messages are sent via Resend (our email provider). Legal basis: contract.</li>
  <li><strong>Cookies:</strong> see separate <a href="/cookiepolicy">cookie policy</a>.</li>
</ul>

<h3>3. Recipients</h3>
<p>We only share data with processors needed to operate the service:</p>
<ul>
  <li>Our database and hosting provider within the EU/EEA.</li>
  <li>Our object storage (S3-compatible) for photos and videos.</li>
  <li>Resend for transactional email.</li>
  <li>Payment provider for purchases.</li>
</ul>
<p>Data processing agreements (DPA) are in place with each processor.</p>

<h3>4. Retention</h3>
<ul>
  <li>Account data: as long as you have an active account. Accounts inactive for more than 24 months are deleted.</li>
  <li>Accounting records: 7 years as required by the Swedish Accounting Act.</li>
  <li>Photos and videos: until you withdraw consent or we no longer use the material.</li>
</ul>

<h3>5. Your rights (Art. 15–22 GDPR)</h3>
<ul>
  <li>Right to information and access.</li>
  <li>Right to rectification.</li>
  <li>Right to erasure ("right to be forgotten").</li>
  <li>Right to restriction of processing.</li>
  <li>Right to data portability.</li>
  <li>Right to object.</li>
  <li>Right to withdraw consent at any time (e.g. photo/video consent).</li>
</ul>
<p>Contact us at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> to exercise any of these rights.</p>

<h3>6. Lodging a complaint</h3>
<p>If you believe we process your personal data incorrectly, you have the right to lodge a complaint with the Swedish Authority for Privacy Protection (IMY), <a href="https://www.imy.se" target="_blank" rel="noreferrer">www.imy.se</a>.</p>

<h3>7. Transfers outside the EU/EEA</h3>
<p>We aim to keep all processing within the EU/EEA. Where a processor would process data outside the EU/EEA, EU Commission Standard Contractual Clauses are used as a safeguard.</p>

<h3>8. Changes to this policy</h3>
<p>We may update this policy. The date of the latest update is shown above.</p>
`.trim();

const cookiepolicySv = `
<h2>Cookiepolicy</h2>
<p>Denna webbplats sätter ett litet antal cookies. Vi använder inga analys-, statistik- eller marknadsföringscookies och inga tredjepartsskript. Cookies regleras i Sverige av lagen om elektronisk kommunikation (LEK), med Post- och telestyrelsen (PTS) som tillsynsmyndighet.</p>

<h3>Cookies som vi använder</h3>
<table>
  <thead>
    <tr><th>Namn</th><th>Syfte</th><th>Varaktighet</th><th>Kategori</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><code>mz_cart</code></td>
      <td>Håller din varukorg mellan sidladdningar.</td>
      <td>14 dagar</td>
      <td>Nödvändig</td>
    </tr>
    <tr>
      <td><code>mz_cookie_consent</code></td>
      <td>Sparar ditt val i cookie-banderollen.</td>
      <td>1 år</td>
      <td>Nödvändig</td>
    </tr>
    <tr>
      <td><code>i18nextLng</code></td>
      <td>Sparar valt språk (svenska/engelska).</td>
      <td>1 år</td>
      <td>Preferens</td>
    </tr>
    <tr>
      <td><code>sidebar_state</code></td>
      <td>Sparar om admin-sidomenyn är öppen eller stängd.</td>
      <td>7 dagar</td>
      <td>Nödvändig</td>
    </tr>
    <tr>
      <td>Better Auth-sessionscookies</td>
      <td>Håller dig inloggad efter att du loggat in.</td>
      <td>Session / förlängs vid aktivitet</td>
      <td>Nödvändig</td>
    </tr>
  </tbody>
</table>

<h3>Ditt samtycke</h3>
<p>Nödvändiga cookies kräver inte samtycke enligt LEK. För språkpreferens-cookien begär vi ditt samtycke första gången du besöker sidan. Du kan när som helst ändra ditt val via länken "Hantera cookies" i sidfoten.</p>

<h3>Hantera cookies i webbläsaren</h3>
<p>Du kan också blockera eller radera cookies i din webbläsares inställningar, men vissa funktioner (t.ex. inloggning och varukorg) kommer då inte att fungera.</p>

<h3>Kontakt</h3>
<p>Frågor om denna policy: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>
`.trim();

const cookiepolicyEn = `
<h2>Cookie Policy</h2>
<p>This website sets a small number of cookies. We do not use any analytics, statistics or marketing cookies and no third-party scripts. Cookies are regulated in Sweden by the Electronic Communications Act (LEK), supervised by the Swedish Post and Telecom Authority (PTS).</p>

<h3>Cookies we use</h3>
<table>
  <thead>
    <tr><th>Name</th><th>Purpose</th><th>Duration</th><th>Category</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><code>mz_cart</code></td>
      <td>Keeps your shopping cart between page loads.</td>
      <td>14 days</td>
      <td>Strictly necessary</td>
    </tr>
    <tr>
      <td><code>mz_cookie_consent</code></td>
      <td>Stores your choice from the cookie banner.</td>
      <td>1 year</td>
      <td>Strictly necessary</td>
    </tr>
    <tr>
      <td><code>i18nextLng</code></td>
      <td>Stores your language choice (Swedish/English).</td>
      <td>1 year</td>
      <td>Preferences</td>
    </tr>
    <tr>
      <td><code>sidebar_state</code></td>
      <td>Stores whether the admin sidebar is open or closed.</td>
      <td>7 days</td>
      <td>Strictly necessary</td>
    </tr>
    <tr>
      <td>Better Auth session cookies</td>
      <td>Keeps you signed in after login.</td>
      <td>Session / extended on activity</td>
      <td>Strictly necessary</td>
    </tr>
  </tbody>
</table>

<h3>Your consent</h3>
<p>Strictly necessary cookies do not require consent under LEK. We ask for your consent for the language preference cookie the first time you visit. You can change your choice at any time via the "Manage cookies" link in the footer.</p>

<h3>Managing cookies in your browser</h3>
<p>You can also block or delete cookies in your browser settings, but some features (such as login and cart) will not work.</p>

<h3>Contact</h3>
<p>Questions about this policy: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>
`.trim();

// TODO: customer to review pricing, refund window and rescheduling rules.
const kopvillkorSv = `
<h2>Köpvillkor</h2>
<p>Dessa köpvillkor gäller för köp av kurser och medlemskap via motionzone.se. Säljare är ${COMPANY}, Smedsvängen 70, 352 54 Växjö. Vid köp ingår du ett avtal med oss.</p>

<h3>1. Priser och betalning</h3>
<p>Alla priser anges i svenska kronor (SEK) inklusive moms. Betalning sker via de betalmetoder som erbjuds i kassan. Köpet är genomfört först när betalningen är bekräftad.</p>

<h3>2. Bokningsbekräftelse</h3>
<p>Du får en bokningsbekräftelse via e-post när köpet är genomfört. Spara bekräftelsen — den är ditt kvitto.</p>

<h3>3. Ångerrätt (distansavtalslagen)</h3>
<p>Du har 14 dagars ångerrätt från köpdagen enligt distansavtalslagen. Ångerrätten upphör dock när kursen eller tjänsten har påbörjats med ditt samtycke. Vill du utöva ångerrätten, kontakta oss skriftligen på <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> inom 14 dagar.</p>

<h3>4. Avbokning och ombokning</h3>
<p>Om du behöver avboka en kurs som ännu inte startat, kontakta oss så snart som möjligt. Vi försöker erbjuda ombokning till annan kurs i mån av plats. Återbetalning vid avbokning efter att kursen påbörjats sker normalt inte, men särskilda skäl (t.ex. sjukdom med läkarintyg) kan medföra delvis återbetalning eller tillgodohavande.</p>

<h3>5. Vår rätt att ställa in</h3>
<p>Vi förbehåller oss rätten att ställa in en kurs vid för få anmälda eller force majeure. Om en kurs ställs in återbetalas hela kursavgiften eller erbjuds plats på motsvarande kurs.</p>

<h3>6. Reklamation</h3>
<p>Om något inte motsvarar din beställning, kontakta oss senast skäligen snart efter att felet upptäcktes. Konsumentköplagen gäller.</p>

<h3>7. Personuppgifter</h3>
<p>Behandling av personuppgifter vid köp beskrivs i vår <a href="/integritetspolicy">integritetspolicy</a>.</p>

<h3>8. Tvist</h3>
<p>Vid tvist följer vi rekommendationer från Allmänna reklamationsnämnden (ARN), <a href="https://www.arn.se" target="_blank" rel="noreferrer">www.arn.se</a>. Tvist kan även prövas av allmän domstol i Sverige.</p>

<h3>9. Kontakt</h3>
<p>${COMPANY}, <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>
`.trim();

const kopvillkorEn = `
<h2>Terms of Purchase</h2>
<p>These terms apply to purchases of courses and memberships via motionzone.se. The seller is ${COMPANY}, Smedsvängen 70, 352 54 Växjö, Sweden. By completing a purchase you enter into an agreement with us.</p>

<h3>1. Prices and payment</h3>
<p>All prices are in Swedish kronor (SEK) including VAT. Payment is made via the payment methods offered at checkout. The purchase is complete once payment is confirmed.</p>

<h3>2. Booking confirmation</h3>
<p>You receive a booking confirmation by email once the purchase is complete. Please keep it — it is your receipt.</p>

<h3>3. Right of withdrawal (Swedish Distance Contracts Act)</h3>
<p>You have a 14-day right of withdrawal from the date of purchase under the Swedish Distance Contracts Act. The right of withdrawal ends when the course or service has started with your consent. To exercise the right of withdrawal, contact us in writing at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> within 14 days.</p>

<h3>4. Cancellation and rescheduling</h3>
<p>If you need to cancel a course that has not yet started, contact us as soon as possible. We will try to offer rescheduling to another course subject to availability. Refunds for cancellations after the course has started are not normally offered, but in special circumstances (such as illness with a medical certificate) a partial refund or credit may be granted.</p>

<h3>5. Our right to cancel</h3>
<p>We reserve the right to cancel a course due to insufficient enrolment or force majeure. If a course is cancelled, the full course fee is refunded or a place on a corresponding course is offered.</p>

<h3>6. Complaints</h3>
<p>If something does not match your order, contact us within a reasonable time after the issue was discovered. The Swedish Consumer Sales Act applies.</p>

<h3>7. Personal data</h3>
<p>Processing of personal data during a purchase is described in our <a href="/integritetspolicy">privacy policy</a>.</p>

<h3>8. Disputes</h3>
<p>In the event of a dispute, we follow the recommendations of the Swedish National Board for Consumer Disputes (ARN), <a href="https://www.arn.se" target="_blank" rel="noreferrer">www.arn.se</a>. Disputes may also be heard by a Swedish court of general jurisdiction.</p>

<h3>9. Contact</h3>
<p>${COMPANY}, <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>
`.trim();

const legalPages = [
  {
    slug: "integritetspolicy",
    title: "Integritetspolicy",
    title_en: "Privacy Policy",
    content: integritetspolicySv,
    content_en: integritetspolicyEn,
  },
  {
    slug: "cookiepolicy",
    title: "Cookiepolicy",
    title_en: "Cookie Policy",
    content: cookiepolicySv,
    content_en: cookiepolicyEn,
  },
  {
    slug: "kopvillkor",
    title: "Köpvillkor",
    title_en: "Terms of Purchase",
    content: kopvillkorSv,
    content_en: kopvillkorEn,
  },
];

async function main() {
  console.log("Seeding legal pages...");

  for (const page of legalPages) {
    await prisma.legalPage.upsert({
      where: { slug: page.slug },
      update: {
        title: page.title,
        title_en: page.title_en,
        content: page.content,
        content_en: page.content_en,
      },
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
