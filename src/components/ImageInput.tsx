"use client";

import Image from "next/image";
import { type ChangeEvent, useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ImageInputProps {
  // RHFs Controller:
  onChange: (value: string | undefined) => void;
  onBlur: () => void;
  value: string | undefined;
  name: string;
}

export default function ImageInput({
  onChange,
  onBlur,
  value,
}: ImageInputProps) {
  const [_genMsg, _setgenMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const clearImage = useCallback(() => {
    if (value?.startsWith("blob:")) {
      URL.revokeObjectURL(value);
    }

    if (inputRef.current) {
      inputRef.current.value = "";
    }

    onChange("");
    onBlur();
  }, [onBlur, onChange, value]);

  const fileImg = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      const MAX_FILE_SIZE = 5 * 1024 * 1024;

      if (file) {
        if (file.size > MAX_FILE_SIZE) {
          alert(`Max 5 MB`);
          return;
        }

        const previewUrl = URL.createObjectURL(file);

        onChange(previewUrl);
        onBlur();
      }
    },
    [onChange, onBlur],
  );

  return (
    <div className="p-2 border-2 rounded-lg">
      {value && (
        <div className="flex flex-col items-center gap-2">
          {/* So i have this for previewing the image, and upload the image. This maybe solves the upload problem too, if i can take an image buffer to just preview it. */}
          <Image
            src={value ?? ""}
            width={512}
            height={512}
            className="w-[80%] p-2"
            alt="Preview image"
            unoptimized={value.startsWith("blob:")} // Skippa server-optimering för lokala filer
          ></Image>
          <Button type="button" variant="secondary" onClick={clearImage}>
            Ta bort bild
          </Button>
        </div>
      )}
      <div className="sm:grid sm:grid-cols-2 gap-1 p-2 border-2 rounded-lg">
        <div>
          <label htmlFor="uImg">Upload image</label>
          <div className="flex">
            <Input
              id="uImg"
              type="file"
              accept="image/*"
              onChange={(e) => fileImg(e)}
              ref={inputRef}
            ></Input>
          </div>
        </div>
      </div>
    </div>
  );
}
