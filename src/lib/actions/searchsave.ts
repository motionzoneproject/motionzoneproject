"use server";

import prisma from "../prisma";

import { getSessionData } from "./sessiondata";

export async function saveSearch(query: string) {
  const session = await getSessionData();
  const user = session?.user; // Retrieve the authenticated user

  if (!user) {
    throw new Error("User is not authenticated");
  }

  // Save the search query to the database, linking it to the user
  const savedSearch = await prisma.search.create({
    data: {
      query, // The search query
      userId: user.id, // Associating the search with the current user
    },
  });

  return savedSearch; // Return the saved search object
}
