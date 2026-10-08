"use server";

import { ParticipantSchema } from "@/validations/userforms";
import prisma from "../prisma";
import { formToDbDate } from "../time-convert";
import { getSessionData } from "./sessiondata";

export type ParticipantData = {
  name: string;
  email?: string;
  phone?: string;
  /** Obligatoriskt när deltagaren skapas — se ParticipantSchema. */
  dateOfBirth?: string;
  allowPhotoVideo: boolean;
  userId?: string;
};

/**
 * Deltagare som en godtycklig användare lagt till. Tar emot userId utifrån,
 * så den måste vara admin-låst — annars kan vem som helst läsa ut namn och
 * e-post på andras deltagare. Inloggade som vill se sina egna använder
 * getMyParticipants(), som scopar på sessionen istället.
 * @auth Admin
 */
export async function getParticipantsForUser(userId: string) {
  const sessiondata = await getSessionData();
  if (sessiondata?.user.role !== "admin") return [];

  return prisma.participant.findMany({
    where: { addedByUserId: userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });
}

export async function getMyParticipants() {
  const session = await getSessionData();
  if (!session) return [];

  return prisma.participant.findMany({
    where: { addedByUserId: session.user.id },
    orderBy: { name: "asc" },
  });
}

/**
 * Vilket konto deltagaren ska kopplas till. En kopplad deltagare ser köpen
 * på sin egen profilsida, så kopplingen ger kontot insyn i någon annans
 * köp. En kund får därför bara koppla till sitt eget konto. Bara admin
 * kopplar till andra, och då även automatiskt via e-post. Förut kopplades
 * kundens deltagare till vilket konto som helst med samma e-post, utan
 * samtycke — och svaret avslöjade om e-posten hade ett konto.
 */
async function linkedUserId(
  session: { user: { id: string; role?: string | null; email: string } },
  data: { userId?: string | null; email?: string },
): Promise<string | null | undefined> {
  const isAdmin = session.user.role === "admin";

  if (data.userId !== undefined) {
    if (data.userId === null || isAdmin || data.userId === session.user.id)
      return data.userId;
    return undefined;
  }

  if (!data.email) return undefined;
  if (!isAdmin) {
    return data.email.toLowerCase() === session.user.email.toLowerCase()
      ? session.user.id
      : null;
  }

  const user = await prisma.user.findUnique({
    where: { email: data.email },
    select: { id: true },
  });
  return user ? user.id : null;
}

export async function getOrCreateParticipant(data: ParticipantData) {
  const session = await getSessionData();
  if (!session) throw new Error("Unauthorized");

  const userId = (await linkedUserId(session, data)) ?? undefined;

  // Finns redan en deltagare för kontot, tillagd av den här kunden?
  if (userId) {
    const existing = await prisma.participant.findFirst({
      where: {
        userId,
        addedByUserId: session.user.id,
      },
    });
    if (existing) return existing;
  }

  // Check if a participant with this name (case-insensitive) already exists for this user
  const existingByName = await prisma.participant.findFirst({
    where: {
      addedByUserId: session.user.id,
      name: {
        equals: data.name.trim(),
        mode: "insensitive",
      },
    },
  });
  if (existingByName) return existingByName;

  // Namn och födelsedatum krävs, och kontrollen sitter här: formulären i
  // kassan, på profilsidan och i adminvyn skapar alla deltagare genom den
  // här funktionen, och ett av dem har alltid fått glömma något.
  const parsed = ParticipantSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ??
        "Deltagaren saknar namn eller födelsedatum.",
    );
  }

  // Create new participant record
  return prisma.participant.create({
    data: {
      name: parsed.data.name,
      email: data.email,
      phone: data.phone,
      dateOfBirth: formToDbDate(parsed.data.dateOfBirth),
      allowPhotoVideo: data.allowPhotoVideo,
      userId: userId,
      addedByUserId: session.user.id,
    },
  });
}

export async function updateParticipant(
  id: string,
  data: Partial<ParticipantData>,
) {
  const session = await getSessionData();
  if (!session) throw new Error("Unauthorized");

  // Check if user is admin OR if they are the one who added the participant
  const existing = await prisma.participant.findUnique({
    where: { id },
    select: { addedByUserId: true, userId: true },
  });

  if (!existing) throw new Error("Participant not found");

  const isAdmin = session.user.role === "admin";
  if (!isAdmin && existing.addedByUserId !== session.user.id) {
    throw new Error("No permission to edit this participant");
  }

  // Samma krav som när deltagaren skapades: en ändring får inte tömma
  // namnet eller födelsedatumet. Fält som inte skickas med lämnas i fred.
  const patch = ParticipantSchema.partial().safeParse(data);
  if (!patch.success) {
    throw new Error(
      patch.error.issues[0]?.message ?? "Kontrollera deltagarens uppgifter.",
    );
  }

  // Ny e-post kan ge en ny koppling — samma regler som när deltagaren skapas.
  const userId = await linkedUserId(session, data);

  return prisma.participant.update({
    where: { id },
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      allowPhotoVideo: data.allowPhotoVideo,
      userId: userId !== undefined ? userId : undefined,
      dateOfBirth: data.dateOfBirth
        ? formToDbDate(data.dateOfBirth)
        : undefined,
    },
  });
}
