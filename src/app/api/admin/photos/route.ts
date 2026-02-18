import { NextResponse } from "next/server";
import { getVisiblePhotos } from "@/lib/actions/photos";

export async function GET() {
  const photos = await getVisiblePhotos();
  return NextResponse.json(photos);
}
