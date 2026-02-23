"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import VideoInput from "@/components/VideoInput";
import { createGalleryItem } from "@/lib/actions/gallery";

type FormValues = {
  title: string;
  description: string;
  url: string;
  displayOrder: number;
};

export default function AddGalleryItemBtn() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | undefined>(undefined);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { title: "", description: "", url: "", displayOrder: 0 },
  });

  const onSubmit = async (data: FormValues) => {
    setUploadError(null);

    if (!videoUrl) {
      setUploadError("Du måste ladda upp en video.");
      return;
    }

    setLoading(true);
    try {
      await createGalleryItem({
        type: "VIDEO",
        title: data.title,
        description: data.description || undefined,
        url: videoUrl,
        displayOrder: Number(data.displayOrder),
      });
      reset();
      setVideoUrl(undefined);
      setOpen(false);
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : "Kunde inte spara galleriobjektet.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          reset();
          setVideoUrl(undefined);
          setUploadError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>Lägg till video</Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lägg till video i galleriet</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="title">Titel *</Label>
            <Input
              id="title"
              {...register("title", { required: "Titel krävs" })}
              placeholder="T.ex. Dansgala 2025"
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Beskrivning</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Valfri beskrivning..."
              rows={3}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="displayOrder">Sorteringsordning</Label>
            <Input
              id="displayOrder"
              type="number"
              {...register("displayOrder", { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-1">
            <Label>Video *</Label>
            <VideoInput
              name="url"
              value={videoUrl}
              onChange={(v) => setVideoUrl(v)}
              onBlur={() => {}}
            />
          </div>

          {uploadError && (
            <p className="text-sm text-destructive">{uploadError}</p>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Sparar..." : "Spara"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
