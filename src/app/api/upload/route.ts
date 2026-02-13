import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRole } from "@/lib/actions/admin";
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

    const bucket = process.env.S3_BUCKET;
    const endpoint = process.env.S3_ENDPOINT;
    const region = process.env.S3_REGION || "us-east-1";
    const publicUrl = process.env.S3_PUBLIC_URL;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

    if (
      !bucket ||
      !endpoint ||
      !publicUrl ||
      !accessKeyId ||
      !secretAccessKey
    ) {
      return NextResponse.json(
        { error: "Saknar S3-konfiguration i miljövariabler" },
        { status: 500 },
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

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: uniqueFileName,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 60,
    });

    const imageUrl = `${process.env.S3_PUBLIC_URL}/${uniqueFileName}`;

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
