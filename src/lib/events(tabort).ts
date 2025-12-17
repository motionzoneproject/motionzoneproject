// Sparar denna bara för att lägga in i db sen. Duger för visning till kunden idag.

// Default events that can be easily replaced with API calls
export interface EventTempType {
  id?: string;
  number: string;
  title: string;
  description: string;
  date: string;
  time: string;
  price: string;
  location: string;
}

export const DEFAULT_EVENTS: EventTempType[] = [
  {
    id: "event-1",
    number: "1",
    title: "Julbalen",
    description:
      "En magisk kväll fylld av dans, musik och festligheter för hela familjen.",
    date: "2025-12-20",
    time: "19:00",
    price: "299 SEK",
    location: "Motion Zone Studio",
  },
  {
    id: "event-2",
    number: "2",
    title: "Vinteruppvärmning",
    description:
      "Värm upp inför nyåret med vår spektakulär dansshow och live musik.",
    date: "2025-12-27",
    time: "20:00",
    price: "199 SEK",
    location: "Motion Zone Studio",
  },
  {
    id: "event-3",
    number: "3",
    title: "Vårkonsert 2025",
    description:
      "Upplev vårt höjdpunkt för året - en fantastisk framställning av våra elever.",
    date: "2025-04-15",
    time: "19:30",
    price: "249 SEK",
    location: "Motion Zone Studio",
  },
];

// Yes, look in server-action.ts!

// // This function will be replaced with actual API call to your backend
// export async function fetchEvents(): Promise<Event[]> {
//   try {
//     // TODO: Replace with actual API endpoint
//     // const response = await fetch('/api/events');
//     // return response.json();

//     // For now, return default events
//     return DEFAULT_EVENTS;
//   } catch (error) {
//     console.error("Failed to fetch events:", error);
//     return DEFAULT_EVENTS;
//   }
// }
