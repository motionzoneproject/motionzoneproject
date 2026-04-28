-- Seed placeholder rows for the three legal pages the public footer
-- links to. Idempotent: ON CONFLICT (slug) DO NOTHING so we never
-- overwrite content the admin has already edited via /admin/legal.
INSERT INTO "LegalPage" (id, slug, title, content, "createdAt", "updatedAt")
VALUES
  (
    'seed-integritetspolicy',
    'integritetspolicy',
    'Integritetspolicy',
    '<p><strong>Platshållartext.</strong> Denna sida måste fyllas i av administratör innan lansering. Logga in i admin och redigera under <em>Juridiskt</em>.</p><h2>Personuppgiftsansvarig</h2><p>MotionZone Växjö är personuppgiftsansvarig för behandlingen av dina personuppgifter.</p><h2>Vilka uppgifter samlar vi in?</h2><p>Vi samlar in namn, e-post, telefon, adress, födelsedatum och eventuellt foto-/video-samtycke när du registrerar ett konto.</p><h2>Hur används dina uppgifter?</h2><p>Uppgifterna används för att hantera bokningar, ordrar, kommunikation och bokföringsskyldighet enligt lag.</p><h2>Lagring</h2><p>Vi sparar dina uppgifter så länge ditt konto är aktivt eller så länge det krävs enligt bokföringslagen.</p><h2>Dina rättigheter</h2><p>Du har rätt att begära registerutdrag, rättelse eller radering av dina uppgifter. Kontakta oss på sophiebretonesh@gmail.com.</p>',
    NOW(),
    NOW()
  ),
  (
    'seed-cookiepolicy',
    'cookiepolicy',
    'Cookiepolicy',
    '<p><strong>Platshållartext.</strong> Denna sida måste fyllas i av administratör innan lansering.</p><h2>Vad är cookies?</h2><p>Cookies är små textfiler som lagras i din webbläsare när du besöker en webbplats.</p><h2>Vilka cookies använder vi?</h2><p>Vi använder nödvändiga cookies för inloggning och varukorg samt eventuella analyscookies för statistik.</p><h2>Hantera cookies</h2><p>Du kan när som helst radera cookies eller blockera dem i webbläsarens inställningar. Notera att vissa funktioner kräver cookies för att fungera.</p>',
    NOW(),
    NOW()
  ),
  (
    'seed-kopvillkor',
    'kopvillkor',
    'Köpvillkor',
    '<p><strong>Platshållartext.</strong> Denna sida måste fyllas i av administratör innan lansering.</p><h2>Allmänt</h2><p>Dessa villkor gäller vid köp av kurser, klippkort och produkter via MotionZone Växjös webbplats.</p><h2>Priser och betalning</h2><p>Alla priser anges i SEK inklusive moms. Betalning sker enligt valt betalsätt vid kassan.</p><h2>Ångerrätt</h2><p>För digitala bokningar och påbörjade kurser gäller distansavtalslagens regler om ångerrätt. Kontakta oss för information om hur du nyttjar din ångerrätt.</p><h2>Avbokning</h2><p>Avbokning av enstaka lektion sker via din profilsida senast {X} timmar innan lektionen.</p><h2>Reklamation</h2><p>Vid frågor eller reklamation kontakta sophiebretonesh@gmail.com.</p>',
    NOW(),
    NOW()
  )
ON CONFLICT (slug) DO NOTHING;
