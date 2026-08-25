import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionData } from "@/lib/actions/sessiondata";
import { getS3Resources } from "@/lib/s3";

export async function DELETE(req: Request) {
  const s3Resources = getS3Resources();
  if (!s3Resources) {
    return NextResponse.json(
      { error: "Saknar S3-konfiguration i miljövariabler" },
      { status: 500 },
    );
  }

  const { normalizedPublicUrl, bucket, client } = s3Resources;

  const removefileSchema = z.object({
    url: z.url().startsWith(normalizedPublicUrl),
  });

  try {
    const payload = await req.json().catch(() => null);
    if (!payload) {
      return NextResponse.json(
        { error: "Ingen metadata skickades" },
        { status: 400 },
      );
    }

    const validated = await removefileSchema.parseAsync(payload);

    const key = validated.url.replace(`${normalizedPublicUrl}/`, "");
    if (!key) {
      return NextResponse.json(
        { error: "Kunde inte extrahera filnyckel från URL" },
        { status: 400 },
      );
    }

    const sessiondata = await getSessionData();
    const role = sessiondata?.user.role;
    // Lärare får bara ta bort filer i sin egen teachers/{userId}/-mapp
    // (uploads namnges med ownerId i /api/upload) — allt annat är
    // fortfarande admin-only.
    const isAllowed =
      role === "admin" ||
      (role === "teacher" &&
        key.startsWith(`teachers/${sessiondata?.user.id}/`));
    if (!isAllowed) return new Response("Unauthorized", { status: 401 });

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const send = await client.send(command);

    return NextResponse.json({
      success: true,
      key,
      send,
    });
  } catch (e) {
    console.error("S3 Remove error:", e);
    return NextResponse.json(
      { error: "Internt serverfel vid filbortagning." },
      { status: 500 },
    );
  }
}
