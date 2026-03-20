-- CreateTable
CREATE TABLE "StartPageContent" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "heroImage" TEXT NOT NULL DEFAULT '/hero.png',
    "heroLabel" TEXT NOT NULL DEFAULT 'Välkommen till Motion Zone',
    "heroTitleLine1" TEXT NOT NULL DEFAULT 'Dans är',
    "heroTitleAccent" TEXT NOT NULL DEFAULT 'Passion',
    "heroTitleLine2" TEXT NOT NULL DEFAULT 'Och Livet i Rörelse',
    "heroSubtext" TEXT NOT NULL DEFAULT 'Upplev dansen på ett helt nytt sätt. Vår studio erbjuder kurser för alla åldrar och nivåer med professionella instruktörer.',
    "featuresTitle" TEXT NOT NULL DEFAULT 'Varför Motion Zone?',
    "featuresSubtext" TEXT NOT NULL DEFAULT 'Vi erbjuder en unik dansupplevelse med instruktörer i världsklass och moderna faciliteter',
    "feature1Image" TEXT NOT NULL DEFAULT '/professionella-instruktörer.png',
    "feature1Title" TEXT NOT NULL DEFAULT 'Professionella instruktörer',
    "feature1Description" TEXT NOT NULL DEFAULT 'Våra erfarna lärare har lång erfarenhet och brinner för att dela sin passion för dans.',
    "feature2Image" TEXT NOT NULL DEFAULT '/flexibla-kurstider.png',
    "feature2Title" TEXT NOT NULL DEFAULT 'Flexibla Kurstider',
    "feature2Description" TEXT NOT NULL DEFAULT 'Vi erbjuder kurser på olika tider för att passa ditt schema. Från morgon till kväll, alla dagar.',
    "feature3Image" TEXT NOT NULL DEFAULT '/moderna-lokaler.png',
    "feature3Title" TEXT NOT NULL DEFAULT 'Moderna Lokaler',
    "feature3Description" TEXT NOT NULL DEFAULT 'Vår studio är utrustad med det senaste ljudsystemet och stora speglar för optimal träning.',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StartPageContent_pkey" PRIMARY KEY ("id")
);
