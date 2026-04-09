"use client";

import { Trash2 } from "lucide-react";
import { type ChangeEvent, useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteUploadedFile,
  uploadImageFromBlob,
  uploadVideoFromBlob,
} from "@/lib/uploads";

const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB

interface VideoInputProps {
  // RHF Controller-compatible shape (matching ImageInput)
  onChange: (value: string | undefined) => void;
  onBlur: () => void;
  value: string | undefined;
  name: string;
  /** Called with the R2 URL of the auto-generated thumbnail after upload. */
  onThumbnail?: (url: string) => void;
}

/**
 * Seeks a video element to `seekTime`, waits for the frame, then draws it to a
 * canvas and returns the result as a JPEG Blob. Falls back to time 0 if the
 * requested seek time is beyond the video duration.
 */
function captureFrame(file: File, seekTime = 1): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    video.addEventListener("loadedmetadata", () => {
      video.currentTime = Math.min(seekTime, video.duration * 0.1);
    });

    video.addEventListener("seeked", () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Canvas 2D context unavailable"));
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("canvas.toBlob returned null"));
        },
        "image/jpeg",
        0.85,
      );
    });

    video.addEventListener("error", () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Video load error"));
    });

    video.src = objectUrl;
  });
}

export default function VideoInput({
  onChange,
  onBlur,
  value,
  onThumbnail,
}: VideoInputProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const clearVideo = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    // If the video was already uploaded to R2, delete it from the bucket
    if (value) {
      deleteUploadedFile(value);
    }
    onChange("");
    onBlur();
    setError(null);
    setProgress(0);
  }, [onChange, onBlur, value]);

  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setError(null);

      if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
        setError("Endast MP4, WebM och MOV-filer är tillåtna.");
        return;
      }

      if (file.size === 0) {
        setError(
          "Filen kunde inte läsas (0 byte). Om filnamnet innehåller å, ä eller ö kan det orsaka problem – prova att byta namn på filen.",
        );
        if (inputRef.current) inputRef.current.value = "";
        return;
      }

      if (file.size > MAX_VIDEO_SIZE) {
        setError("Filen är för stor. Max 100 MB.");
        return;
      }

      setUploading(true);
      setProgress(0);

      try {
        const url = await uploadVideoFromBlob(file, "gallery", (pct) => {
          setProgress(pct);
        });
        onChange(url);
        onBlur();

        // Auto-generate thumbnail in the background — don't block or fail the upload
        if (onThumbnail) {
          captureFrame(file)
            .then((blob) => uploadImageFromBlob(blob))
            .then((thumbUrl) => onThumbnail(thumbUrl))
            .catch((err) =>
              console.warn("Thumbnail generation failed (non-fatal):", err),
            );
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Uppladdning misslyckades",
        );
        if (inputRef.current) inputRef.current.value = "";
      } finally {
        setUploading(false);
      }
    },
    [onChange, onBlur, onThumbnail],
  );

  return (
    <div className="p-2 border-2 rounded-lg space-y-2">
      {value && !uploading && (
        <div className="flex flex-col items-center gap-2">
          <video
            src={value}
            controls
            preload="metadata"
            className="w-full max-w-md rounded-md"
          >
            <track kind="captions" />
          </video>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mb-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={clearVideo}
          >
            <Trash2 className="h-4 w-4" />
            Ta bort video
          </Button>
        </div>
      )}

      {uploading && (
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Laddar upp... {progress}%
          </p>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!value && !uploading && (
        <div className="p-2 border-2 rounded-lg">
          <label htmlFor="uVideo" className="text-sm font-medium">
            Ladda upp video (MP4, WebM, MOV — max 100 MB)
          </label>
          <Input
            id="uVideo"
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            onChange={handleFileChange}
            ref={inputRef}
            disabled={uploading}
            className="w-full mt-2"
          />
        </div>
      )}
    </div>
  );
}
