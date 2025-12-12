export type Language = "en" | "sv";

export const translations = {
  en: {
    // Navigation
    nav: {
      events: "Events",
      features: "Why Choose Us",
      testimonials: "Testimonials",
      contact: "Contact",
      contactButton: "Contact Us",
    },
    // Hero Section
    hero: {
      welcome: "Welcome to Motion Zone",
      title: "Dance is",
      subtitle: "Life in Motion",
      description:
        "Experience dance in a whole new way. Our studio offers classes for all ages and levels with professional instructors.",
      courseButton: "See Our Courses",
      contactCTA: "Contact Us",
    },
    // Events Section
    events: {
      title: "Upcoming Events",
      subtitle:
        "Buy tickets and participate in our spectacular dance highlights",
      bookButton: "Book Ticket",
      noEvents: "No events available at this time",
    },
    // Features Section
    features: {
      title: "Why Motion Zone?",
      subtitle:
        "We offer a unique dance experience with world-class instructors and modern facilities",
      professional: {
        title: "Professional Instructors",
        description:
          "Our experienced teachers have decades of experience and are passionate about sharing their love for dance.",
      },
      flexible: {
        title: "Flexible Course Times",
        description:
          "We offer courses at different times to fit your schedule. From morning to evening, every day.",
      },
      modern: {
        title: "Modern Facilities",
        description:
          "Our studio is equipped with the latest sound system and large mirrors for optimal training.",
      },
    },
    // Testimonials Section
    testimonials: {
      title: "What Our Students Say",
      subtitle: "Read about experiences from our satisfied dance participants",
    },
    // Contact Section
    contact: {
      title: "Contact Us",
      description:
        "Interested in starting to dance with us? Contact Motion Zone Växjö today for more information about our courses and events!",
      email: "Email",
      phone: "Phone",
      address: "Address",
      hours: "Hours",
      mondayFriday: "Mon-Fri: 16:00-21:00",
      saturday: "Sat: 10:00-18:00",
      sunday: "Sun: Closed",
      followUs: "Follow Us",
      followDescription: "Stay updated with our latest news and events",
      freeLesson: "Book a Free Trial Class!",
      freeDescription: "Come and try one of our classes completely free",
      bookNow: "Book Now",
    },
    // Footer
    footer: {
      copyright: "© 2025 Motion Zone Växjö. All rights reserved.",
      privacy: "Privacy Policy",
      terms: "Terms of Use",
      sitemap: "Sitemap",
    },
    // Event Details
    eventDetails: {
      date: "Date",
      time: "Time",
      price: "Price",
      location: "Location",
    },
  },
  sv: {
    // Navigation
    nav: {
      events: "Event",
      features: "Varför Välja Oss",
      testimonials: "Testimonialer",
      contact: "Kontakt",
      contactButton: "Kontakta Oss",
    },
    // Hero Section
    hero: {
      welcome: "Välkommen till Motion Zone",
      title: "Dans är",
      subtitle: "Livet i Rörelse",
      description:
        "Upplev dansen på ett helt nytt sätt. Vår studio erbjuder kurser för alla åldrar och nivåer med professionella instruktörer.",
      courseButton: "Se Våra Kurser",
      contactCTA: "Kontakta Oss",
    },
    // Events Section
    events: {
      title: "Kommande Event",
      subtitle: "Köp biljetter och delta i våra spektakulära danshöjdpunkter",
      bookButton: "Köp Biljett",
      noEvents: "Inga events tillgängliga för närvarande",
    },
    // Features Section
    features: {
      title: "Varför Motion Zone?",
      subtitle:
        "Vi erbjuder en unik dansupplevelse med världsklass instruktörer och moderna faciliteter",
      professional: {
        title: "Professionella instruktörer",
        description:
          "Våra erfarna lärare har årtionden av erfarenhet och brinner för att dela sin passion för dans.",
      },
      flexible: {
        title: "Flexibla Kursider",
        description:
          "Vi erbjuder kurser på olika tider för att passa din schema. Från morgon till kväll, alla dagar.",
      },
      modern: {
        title: "Moderna Lokaler",
        description:
          "Vår studio är utrustad med det senaste ljudsystemet och stora speglar för optimal träning.",
      },
    },
    // Testimonials Section
    testimonials: {
      title: "Vad Våra Elever Säger",
      subtitle: "Läs om upplevelser från våra nöjda dansdeltagare",
    },
    // Contact Section
    contact: {
      title: "Kontakta Oss",
      description:
        "Är du intresserad av att börja dansa med oss? Kontakta Motion Zone Växjö idag för mer information om våra kurser och events!",
      email: "Email",
      phone: "Telefon",
      address: "Adress",
      hours: "Öppettider",
      mondayFriday: "Mån-Fre: 16:00-21:00",
      saturday: "Lör: 10:00-18:00",
      sunday: "Sön: Stängt",
      followUs: "Följ Oss",
      followDescription:
        "Håll dig uppdaterad med våra senaste nyheter och events",
      freeLesson: "Boka en Gratis Provlektion!",
      freeDescription: "Kom och prova en av våra klasser helt kostnadsfritt",
      bookNow: "Boka Nu",
    },
    // Footer
    footer: {
      copyright: "© 2025 Motion Zone Växjö. Alla rättigheter förbehållna.",
      privacy: "Integritetspolicy",
      terms: "Användarvillkor",
      sitemap: "Sitemap",
    },
    // Event Details
    eventDetails: {
      date: "Datum",
      time: "Tid",
      price: "Pris",
      location: "Plats",
    },
  },
};

export function getTranslation(language: Language, key: string): string {
  const keys = key.split(".");
  let value: Record<string, unknown> | unknown = translations[language];

  for (const k of keys) {
    value = value?.[k];
  }

  return value || key;
}

export function useTranslation(language: Language) {
  return (key: string) => getTranslation(language, key);
}
