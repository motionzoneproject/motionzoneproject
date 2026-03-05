import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

function ImagePlaceholder({ caption }: { caption: string }) {
  return (
    <div className="mt-4 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
      Bildplats: {caption}
    </div>
  );
}

export default function HelpPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 md:px-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Manual</h1>
        <p className="text-muted-foreground">
          Bokstruktur för användare och admin. Innehållet är skrivet som ren
          text så du enkelt kan fortsätta skriva och lägga in bilder.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Användare</h2>

        <Accordion type="single" collapsible className="rounded-lg border px-4">
          <AccordionItem value="about-app">
            <AccordionTrigger className="hover:no-underline">
              Om appen (snabbguide)
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm">
              <p>
                Appen är byggd för att göra det enkelt att hitta rätt kurs, köpa
                ett upplägg och sedan boka sina lektioner i profilen.
                Grundflödet är: utforska innehåll, välj produkt, genomför köp,
                boka tider och följ upp bokningar.
              </p>
              <p>
                De öppna sidorna hjälper nya besökare att förstå utbudet. När
                man är inloggad får man tillgång till personliga funktioner som
                bokning, historik och kontoinställningar.
              </p>
              <ImagePlaceholder caption="Översiktsbild av appens huvudflöde" />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="home">
            <AccordionTrigger className="hover:no-underline">
              Startsidan
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm">
              <p>
                Startsidan är första intrycket av verksamheten och visar de
                viktigaste vägarna in i appen. Här ska en ny användare snabbt
                förstå vad som erbjuds och vad nästa steg är.
              </p>
              <p>
                Innehållet bör peka vidare till kurser, om oss och köpflödet på
                ett tydligt och logiskt sätt.
              </p>
              <ImagePlaceholder caption="Skärmdump av startsidans viktiga delar" />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="courses">
            <AccordionTrigger className="hover:no-underline">
              Våra kurser
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm">
              <p>
                Kurssidan hjälper användaren att jämföra alternativ innan köp.
                Här presenteras nivå, målgrupp, innehåll, period och annan
                information som behövs för att välja rätt.
              </p>
              <p>
                Målet är att användaren ska känna sig trygg i sitt val redan
                innan den går till varukorg och betalning.
              </p>
              <ImagePlaceholder caption="Exempel på kurskort eller kursdetalj" />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="about-us">
            <AccordionTrigger className="hover:no-underline">
              Om oss
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm">
              <p>
                Om oss-sidan bygger förtroende. Här beskriver ni lärare, studios
                och verksamhetens inriktning så att användaren förstår vem som
                står bakom undervisningen.
              </p>
              <p>
                Den här delen passar bra för porträttbilder, lokalbilder och
                korta presentationstexter per person.
              </p>
              <ImagePlaceholder caption="Lärarporträtt eller bild från studio" />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="membership">
            <AccordionTrigger className="hover:no-underline">
              Medlemskap
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm">
              <p>
                Medlemskapssidan förklarar villkor och vad som ingår. Användare
                ska snabbt kunna se vad medlemskapet ger tillgång till och hur
                det påverkar bokningar och köp.
              </p>
              <p>
                Tydliga rubriker och exempel gör det enklare att undvika
                missförstånd kring regler, förnyelse och paus.
              </p>
              <ImagePlaceholder caption="Infografik över medlemsförmåner" />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="profile-booking">
            <AccordionTrigger className="hover:no-underline">
              Profilsidan och bokning
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm">
              <p>
                I profilen hanterar användaren sina uppgifter, deltagare och
                bokningar. Här ser man också köpta produkter och hur många
                tillfällen som finns kvar.
              </p>
              <p>
                Den här delen är kärnan i användarens vardag: boka lektion,
                kontrollera status och uppdatera personliga uppgifter.
              </p>
              <ImagePlaceholder caption="Bokningskalender och exempel på bokning" />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="cart-checkout">
            <AccordionTrigger className="hover:no-underline">
              Varukorg och kassa
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm">
              <p>
                Varukorgen samlar valda produkter inför köp. I kassan slutförs
                betalningen och användaren får en bekräftelse på ordern.
              </p>
              <p>
                Efter genomfört köp visas nästa steg tydligt, till exempel hur
                man går vidare till bokning eller orderhistorik.
              </p>
              <ImagePlaceholder caption="Stegvis bild: varukorg till kvitto" />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Adminpanelen</h2>
        <p className="text-sm text-muted-foreground">
          Avsnitten admin-startsida och galleri är exkluderade tills de är
          färdiga.
        </p>

        <Accordion type="single" collapsible className="rounded-lg border px-4">
          <AccordionItem value="admin-overview">
            <AccordionTrigger className="hover:no-underline">
              Översikt
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm">
              <p>
                Översikten används som adminens kontrollpunkt. Här får man en
                snabb bild av vad som behöver hanteras under dagen.
              </p>
              <p>
                Tanken är att det ska gå snabbt att gå vidare till lektioner,
                ordrar, användare och övriga adminfunktioner.
              </p>
              <ImagePlaceholder caption="Adminöversikt med viktiga snabbval" />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="admin-lessons">
            <AccordionTrigger className="hover:no-underline">
              Lektioner
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm">
              <p>
                Under Lektioner planeras och uppdateras tillfällen. Admin kan
                skapa, ändra och ställa in lektioner samt följa närvaro.
              </p>
              <p>
                Den här delen påverkar användarnas bokningar direkt och behöver
                därför tydliga rutiner.
              </p>
              <ImagePlaceholder caption="Lektionslista och redigeringsvy" />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="admin-about-us">
            <AccordionTrigger className="hover:no-underline">
              Om oss
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm">
              <p>
                I admin för Om oss uppdateras lärarprofiler, dansstilar och
                studios. Ändringar här syns på den publika sidan.
              </p>
              <p>
                Det här kapitlet passar för instruktioner om textlängd,
                bildformat och publiceringsflöde.
              </p>
              <ImagePlaceholder caption="Formulär för lärare/studio/stil" />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="admin-courses">
            <AccordionTrigger className="hover:no-underline">
              Kurser
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm">
              <p>
                Kurshanteringen används för att skapa och redigera själva
                kursutbudet. Här sätts bland annat nivå, ålder och lärare.
              </p>
              <p>
                Kursdata används vidare i produkter och scheman, så denna del är
                central för hela flödet.
              </p>
              <ImagePlaceholder caption="Skapa/ändra kurs - exempelvy" />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="admin-products">
            <AccordionTrigger className="hover:no-underline">
              Produkter
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm">
              <p>
                Produkter är det som säljs i appen, till exempel kurspaket och
                klippkort. Här kopplar admin produkter till kurser och sätter
                pris samt regler för innehåll.
              </p>
              <p>
                En tydlig produktstruktur minskar frågor i support och gör köp
                enklare för användaren.
              </p>
              <ImagePlaceholder caption="Produktkort med pris och kopplade kurser" />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="admin-orders">
            <AccordionTrigger className="hover:no-underline">
              Ordrar
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm">
              <p>
                I orderhanteringen följer admin köpstatus och hanterar
                eventuella avvikelser. Här går det att söka fram order och se
                detaljer per köp.
              </p>
              <p>
                Detta kapitel kan beskriva arbetsrutiner för uppföljning,
                återkoppling och statusändringar.
              </p>
              <ImagePlaceholder caption="Orderlista och detaljvy för en order" />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="admin-events">
            <AccordionTrigger className="hover:no-underline">
              Event
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm">
              <p>
                Event används för aktiviteter utanför ordinarie kurser. Admin
                kan skapa, redigera och publicera information om särskilda
                tillfällen.
              </p>
              <p>
                För tydlighet är det bra att alltid beskriva tid, plats,
                målgrupp och hur anmälan fungerar.
              </p>
              <ImagePlaceholder caption="Eventformulär med datum och plats" />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="admin-students">
            <AccordionTrigger className="hover:no-underline">
              Elever
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm">
              <p>
                Elevdelen ger admin överblick över deltagare och deras koppling
                till kurser, köp och bokningar.
              </p>
              <p>
                Här kan ni beskriva vanliga supportsituationer och hur man
                felsöker elevärenden steg för steg.
              </p>
              <ImagePlaceholder caption="Elevlista med filtrering och detaljer" />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="admin-users">
            <AccordionTrigger className="hover:no-underline">
              Användare
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm">
              <p>
                Användarhanteringen täcker roller, behörigheter och grunddata.
                Admin kan uppdatera kontoinformation och hantera åtkomst.
              </p>
              <p>
                Dokumentera gärna tydligt vilka roller som finns och vad varje
                roll får göra.
              </p>
              <ImagePlaceholder caption="Användarvy med rollhantering" />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="admin-term-plan">
            <AccordionTrigger className="hover:no-underline">
              Terminer (och scheman)
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm">
              <p>
                I den här delen planeras terminer och scheman. Datum, tider och
                kurskopplingar styr hur lektionstillfällen skapas.
              </p>
              <p>
                Förändringar här påverkar flera delar av systemet, så tydliga
                instruktioner och exempel är extra viktiga.
              </p>
              <ImagePlaceholder caption="Schemaöversikt per termin" />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="admin-legal">
            <AccordionTrigger className="hover:no-underline">
              Juridiskt
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm">
              <p>
                Juridiksektionen innehåller texter som villkor och policyer.
                Admin uppdaterar innehållet när regler eller rutiner ändras.
              </p>
              <p>
                Den här delen bör hållas kort, tydlig och versionsstyrd så att
                ändringar är enkla att följa.
              </p>
              <ImagePlaceholder caption="Exempel på juridisk innehållssida" />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </main>
  );
}
