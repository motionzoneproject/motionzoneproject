import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRole } from "@/lib/actions/admin";
import { getS3Resources } from "@/lib/s3";
import type { UploadMetadata } from "@/lib/uploads";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const CONTENT_TYPE_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const uploadMetadataSchema = z.object({
  contentType: z.enum(ALLOWED_MIME_TYPES),
  size: z.number().int().positive().max(MAX_FILE_SIZE),
});

export async function POST(req: Request) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return new Response("Unauthorized", { status: 401 });

  try {
    const payload = await req.json().catch(() => null);
    if (!payload) {
      return NextResponse.json(
        { error: "Ingen metadata skickades" },
        { status: 400 },
      );
    }

    const parsed = uploadMetadataSchema.safeParse(payload);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const errorMessage = issue?.message
        ? `Ogiltig metadata: ${issue.message}`
        : "Ogiltig metadata";
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    const { contentType } = parsed.data satisfies UploadMetadata;

    const fileExt = CONTENT_TYPE_TO_EXT[contentType];
    const uniqueFileName = `products/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

    const s3Resources = getS3Resources();
    if (!s3Resources) {
      return NextResponse.json(
        { error: "Saknar S3-konfiguration i miljövariabler" },
        { status: 500 },
      );
    }

    const { bucket, publicUrl, client } = s3Resources;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: uniqueFileName,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, {
      expiresIn: 60,
    });

    const imageUrl = `${publicUrl}/${uniqueFileName}`;

    return NextResponse.json({
      success: true,
      uploadUrl,
      url: imageUrl,
      key: uniqueFileName,
      method: "PUT",
    });
  } catch (error) {
    console.error("S3 Upload Error:", error);
    return NextResponse.json(
      { error: "Internt serverfel vid uppladdning" },
      { status: 500 },
    );
  }
}
