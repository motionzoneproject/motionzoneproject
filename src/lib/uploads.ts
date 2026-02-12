export type UploadMetadata = {
  contentType: string;
  size: number;
};

export type PresignResponse = {
  uploadUrl: string;
  url: string;
};

async function readErrorMessage(res: Response) {
  try {
    const data = (await res.json()) as { error?: string };
    return data?.error ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function uploadImageFromBlob(blob: Blob) {
  const contentType = blob.type || "image/jpeg";
  const payload: UploadMetadata = { contentType, size: blob.size };

  const presignRes = await fetch("/api/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!presignRes.ok) {
    throw new Error(await readErrorMessage(presignRes));
  }

  const { uploadUrl, url } = (await presignRes.json()) as PresignResponse;

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body: blob,
  });

  if (!putRes.ok) {
    throw new Error(`Uppladdning misslyckades: ${putRes.statusText}`);
  }

  return url;
}
