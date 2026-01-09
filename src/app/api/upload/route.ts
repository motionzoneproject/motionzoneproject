import { fileTypeFromBuffer } from "file-type";
import { NextResponse } from "next/server";

// import { s3Client } from "@/lib/r2"; // Din S3-klient instans
// import { PutObjectCommand } from "@aws-sdk/client-s3";
import { isAdminRole } from "@/lib/actions/admin";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: Request) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return new Response("Unauthorized", { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Ingen fil skickades" },
        { status: 400 },
      );
    }

    // 2. Storlekskontroll på servern (Lita aldrig på klienten!)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Filen är för stor" }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 3. Validera filtyp via Magic Bytes
    const type = await fileTypeFromBuffer(buffer);

    if (!type || !ALLOWED_MIME_TYPES.includes(type.mime)) {
      return NextResponse.json(
        { error: "Ogiltigt filformat. Endast JPG, PNG och WebP tillåts." },
        { status: 415 },
      );
    }

    // 4. Skapa ett helt unikt filnamn för att förhindra överskrivning och Path Traversal
    const uniqueFileName = `products/${Date.now()}-${crypto.randomUUID()}.${
      type.ext
    }`;

    // // 5. Ladda upp till R2
    // await s3Client.send(
    //   new PutObjectCommand({
    //     Bucket: process.env.R2_BUCKET_NAME,
    //     Key: uniqueFileName,
    //     Body: buffer,
    //     ContentType: type.mime,
    //   })
    // );

    const imageUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${uniqueFileName}`;

    return NextResponse.json({
      success: true,
      url: imageUrl,
    });
  } catch (error) {
    console.error("R2 Upload Error:", error);
    return NextResponse.json(
      { error: "Internt serverfel vid uppladdning" },
      { status: 500 },
    );
  }
}
