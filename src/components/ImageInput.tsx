"use client";

import Image from "next/image";
import { type ChangeEvent, useCallback, useState } from "react";
// So i have this for previewing the image, and upload the image. This maybe solves the upload problem too, if i can take a image buffer to just preview it.
import { Input } from "@/components/ui/input";

interface ImageInputProps {
  // RHFs Controller:
  onChange: (value: string | undefined) => void;
  onBlur: () => void;
  value: string | undefined; // Här kommer Base64 Data URL (temporärt) eller den slutliga R2 URL:en
  name: string;
}

// Bara för att snabbt spara.
// // Return the Base64 string as a data URL for client-side use
// const dataUrl = `data:image/png;base64,${base64Image}`;

export default function ImageInput({
  onChange,
  onBlur,
  value, // So this will hold the image as base64 data.
}: ImageInputProps) {
  const [_genMsg, _setgenMsg] = useState("");

  const fileImg = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      // Check that its a valid image (png or jpg)
      const file = e.target.files?.[0];

      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

      if (file) {
        if (!file.type.startsWith("image/")) {
          alert("Only images are allowed."); // Vi kör en säkrare validering i server-action.
          e.target.value = "";
          return;
        }

        if (file.size > MAX_FILE_SIZE) {
          alert(`Max 5 MB`);
          e.target.value = ""; // Återställ input
          return;
        }
        // 1. Initialize FileReader
        const reader = new FileReader();

        reader.onload = () => {
          const dataUrl = reader.result as string;

          onChange(dataUrl);
          onBlur();
        };

        // 4. Starta läsningen av filen som en Data URL (Base64)
        reader.readAsDataURL(file);
      }

      // read the file as base64 and set it as value
    },
    [onChange, onBlur],
  );

  return (
    <div className="p-2 border-2 rounded-lg">
      {value && (
        <Image
          src={value ?? ""}
          width={512}
          height={512}
          className="w-full p-2"
          alt="Preview image"
        ></Image>
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
            ></Input>
          </div>
        </div>
      </div>
    </div>
  );
}
