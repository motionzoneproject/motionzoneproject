export type UploadMetadata = {
  contentType: string;
  size: number;
  folder?: string;
};

export type PresignResponse = {
  uploadUrl: string;
  url: string;
};

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

function normalizeContentType(type: string) {
  if (type === "image/jpg") return "image/jpeg";
  return type;
}

async function readErrorMessage(res: Response) {
  try {
    const data = (await res.json()) as { error?: string };
    return data?.error ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function uploadImageFromBlob(blob: Blob, folder?: string) {
  const contentType = normalizeContentType(blob.type || "image/jpeg");
  if (
    !ALLOWED_MIME_TYPES.includes(
      contentType as (typeof ALLOWED_MIME_TYPES)[number],
    )
  ) {
    throw new Error("Ogiltig bildtyp. Endast JPEG, PNG och WEBP stöds.");
  }

  const payload: UploadMetadata = { contentType, size: blob.size, folder };

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

/**
 * Delete a previously uploaded file from R2 via the upload API.
 * Safe to call with any URL — the server validates it belongs to the bucket.
 * @param url - The public R2 URL returned when the file was uploaded
 */
export async function deleteUploadedFile(url: string): Promise<void> {
  await fetch("/api/remove", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  // Errors are intentionally swallowed — a failed delete on discard is non-critical
}

/**
 * Upload a video file to R2 using a presigned URL obtained from the upload API.
 * @param blob - Video file as Blob
 * @param folder - R2 folder prefix (defaults to "gallery")
 * @param onProgress - Called with 0-100 progress value
 */
export async function uploadVideoFromBlob(
  blob: Blob,
  folder = "gallery",
  onProgress?: (percent: number) => void,
): Promise<string> {
  const contentType = blob.type || "video/mp4";
  const payload: UploadMetadata = { contentType, size: blob.size, folder };

  const presignRes = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!presignRes.ok) {
    throw new Error(await readErrorMessage(presignRes));
  }

  const { uploadUrl, url } = (await presignRes.json()) as PresignResponse;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Uppladdning misslyckades: ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error("Nätverksfel under uppladdning"));

    xhr.send(blob);
  });

  return url;
}
