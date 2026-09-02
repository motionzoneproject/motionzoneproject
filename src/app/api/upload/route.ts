import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionData } from "@/lib/actions/sessiondata";
import { getS3Resources } from "@/lib/s3";
import type { UploadMetadata } from "@/lib/uploads";

const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
] as const;
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
  "image/jpg": "jpg",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

const uploadMetadataSchema = z.object({
  contentType: z.enum(ALLOWED_MIME_TYPES as [string, ...string[]]),
  size: z.number().int().positive(),
  folder: z.string().optional(), // e.g. "gallery" or "products"
  ownerId: z.string().optional(), // teacher profile owner, required for folder "teachers"
});

export async function POST(req: Request) {
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
    const { size, folder, ownerId } = parsed.data satisfies UploadMetadata;

    const sessiondata = await getSessionData();
    const role = sessiondata?.user.role;
    // Lärare får bara ladda upp till sin egen lärarprofilbild (ownerId måste
    // vara deras eget id, annars kan en lärare ladda upp åt en annan lärare)
    // — allt annat (galleri, produkter, event osv.) är fortfarande admin-only.
    const isAllowed =
      role === "admin" ||
      (role === "teacher" &&
        folder === "teachers" &&
        ownerId === sessiondata?.user.id);
    if (!isAllowed) return new Response("Unauthorized", { status: 401 });

    const rawContentType = parsed.data.contentType;
    const contentType =
      rawContentType === "image/jpg" ? "image/jpeg" : rawContentType;

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
    const prefix =
      folder === "teachers" && ownerId
        ? `teachers/${ownerId}`
        : (folder ?? (isVideo ? "gallery" : "products"));
    const uniqueFileName = `${prefix}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

    const s3Resources = getS3Resources();
    if (!s3Resources) {
      // Log details server-side only
      console.error("[UPLOAD] S3 config missing");
      return NextResponse.json(
        { error: "Internt serverfel vid uppladdning" },
        { status: 500 },
      );
    }

    const { bucket, publicUrl, client } = s3Resources;
    try {
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
    } catch (_err) {
      // Log details server-side only
      console.error("[UPLOAD] S3 presign error:", _err);
      return NextResponse.json(
        { error: "Internt serverfel vid uppladdning" },
        { status: 500 },
      );
    }
  } catch (_error) {
    // Log details server-side only
    console.error("[UPLOAD] Unexpected error:", _error);
    return NextResponse.json(
      { error: "Internt serverfel vid uppladdning" },
      { status: 500 },
    );
  }
}
