import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRole } from "@/lib/actions/admin";

export async function POST(req: Request) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return new Response("Unauthorized", { status: 401 });

  const publicUrl = process.env.S3_PUBLIC_URL;
  const bucket = process.env.S3_BUCKET;
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION || "us-east-1";
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!publicUrl || !bucket || !endpoint || !accessKeyId || !secretAccessKey) {
    return NextResponse.json(
      { error: "Saknar S3-konfiguration i miljövariabler" },
      { status: 500 },
    );
  }

  const normalizedPublicUrl = publicUrl.endsWith("/")
    ? publicUrl.slice(0, -1)
    : publicUrl;

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

    const s3Client = new S3Client({
      region,
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const send = await s3Client.send(command);

    console.log("Fil togs bort från bucket:", key, send);

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
