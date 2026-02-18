import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  deletePhoto,
  setPhotoVisibility,
  updatePhoto,
} from "@/lib/actions/photos";

export async function DELETE(
  _req: NextRequest,
  context: { params: { id: string } } | { params: Promise<{ id: string }> },
) {
  let id: string;
  if (context.params instanceof Promise) {
    id = (await context.params).id;
  } else {
    id = context.params.id;
  }
  await deletePhoto(id);
  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  context: { params: { id: string } } | { params: Promise<{ id: string }> },
) {
  let id: string;
  if (context.params instanceof Promise) {
    id = (await context.params).id;
  } else {
    id = context.params.id;
  }
  const body = await req.json();
  if (Object.hasOwn(body, "isVisible")) {
    await setPhotoVisibility(id, (body as { isVisible?: boolean }).isVisible);
    return NextResponse.json({ success: true });
  }
  // Edit caption/eventId
  await updatePhoto(id, { ...body });
  return NextResponse.json({ success: true });
}
