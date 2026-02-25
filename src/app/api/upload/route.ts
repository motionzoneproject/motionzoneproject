import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRole } from "@/lib/actions/admin";
import { getS3Resources } from "@/lib/s3";
import type { UploadMetadata } from "@/lib/uploads";

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;
const ALLOWED_MIME_TYPES = [...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES];

const IMAGE_MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const VIDEO_MAX_SIZE = 100 * 1024 * 1024; // 100 MB

const CONTENT_TYPE_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

const uploadMetadataSchema = z.object({
  contentType: z.enum(ALLOWED_MIME_TYPES as [string, ...string[]]),
  size: z.number().int().positive(),
  folder: z.string().optional(), // e.g. "gallery" or "products"
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
    const { contentType, size, folder } = parsed.data satisfies UploadMetadata;

    // Validate size per media category
    const isVideo = (VIDEO_MIME_TYPES as readonly string[]).includes(
      contentType,
    );
    const maxSize = isVideo ? VIDEO_MAX_SIZE : IMAGE_MAX_SIZE;
    if (size > maxSize) {
      const maxMb = maxSize / (1024 * 1024);
      return NextResponse.json(
        { error: `Filen är för stor. Max ${maxMb} MB.` },
        { status: 400 },
      );
    }

    const fileExt = CONTENT_TYPE_TO_EXT[contentType];
    const prefix = folder ?? (isVideo ? "gallery" : "products");
    const uniqueFileName = `${prefix}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

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
