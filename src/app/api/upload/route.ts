import { NextResponse } from "next/server";
// Importera din logik för R2 här (anpassad för Buffer)

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file)
      return NextResponse.json({ error: "Ingen fil" }, { status: 400 });

    const _buffer = Buffer.from(await file.arrayBuffer());

    // Här kör du din R2-logik (PutObjectCommand etc.)
    // const imageUrl = await uploadBufferToR2(buffer, file.type);

    return NextResponse.json({ success: true, url: "https://r2.../bild.jpg" });
  } catch (_e) {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
