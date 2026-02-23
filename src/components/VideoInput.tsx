"use client";

import { Trash2 } from "lucide-react";
import { type ChangeEvent, useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteUploadedFile, uploadVideoFromBlob } from "@/lib/uploads";

const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB

interface VideoInputProps {
  // RHF Controller-compatible shape (matching ImageInput)
  onChange: (value: string | undefined) => void;
  onBlur: () => void;
  value: string | undefined;
  name: string;
}

export default function VideoInput({
  onChange,
  onBlur,
  value,
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
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Uppladdning misslyckades",
        );
        if (inputRef.current) inputRef.current.value = "";
      } finally {
        setUploading(false);
      }
    },
    [onChange, onBlur],
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
