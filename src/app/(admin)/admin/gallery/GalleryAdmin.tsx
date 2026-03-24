"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type z from "zod";
import AdminGalleryPagination from "@/components/AdminGalleryPagination";
import ImageInput from "@/components/ImageInput";
// Removed Loader to avoid showing spinner during uploads; only button text used
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { addPhoto, deletePhoto, editPhoto } from "@/lib/actions/admin";
import { uploadImageFromBlob } from "@/lib/uploads";
import { adminPhotoSchema } from "@/validations/adminforms";

interface Photo {
  id: string;
  url: string;
  caption?: string;
  description?: string;
  eventId?: string;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}
interface Event {
  id: string;
  headline: string;
}

export default function GalleryAdmin({
  photos,
  events,
  currentPage,
  totalPages,
}: {
  photos: Photo[];
  events: Event[];
  currentPage: number;
  totalPages: number;
}) {
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [modalKey, setModalKey] = useState(0); // for resetting ImageInput
  const [filterText, setFilterText] = useState("");
  const [filterEvent, setFilterEvent] = useState("");
  const [filterVisible, setFilterVisible] = useState("");
  const router = useRouter();

  // Add/Edit modal form
  const form = useForm<z.infer<typeof adminPhotoSchema>>({
    resolver: zodResolver(adminPhotoSchema),
    defaultValues: {
      caption: "",
      description: "",
      eventId: "",
      url: "",
      isVisible: true,
    },
  });

  const openAddModal = () => {
    setEditingPhoto(null);
    setPreviewUrl(null);
    form.reset({
      caption: "",
      description: "",
      eventId: "",
      url: "",
      isVisible: true,
    });
    setModalKey((k) => k + 1); // force ImageInput reset
    setIsModalOpen(true);
  };
  const openEditModal = (photo: Photo) => {
    setEditingPhoto(photo);
    form.reset({
      caption: photo.caption || "",
      description: photo.description || "",
      eventId: photo.eventId || "",
      url: photo.url,
      isVisible: photo.isVisible,
    });
    setPreviewUrl(photo.url);
    setModalKey((k) => k + 1); // force ImageInput reset
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPhoto(null);
    setPreviewUrl(null);
    form.reset({
      caption: "",
      description: "",
      eventId: "",
      url: "",
      isVisible: true,
    });
  };

  // Add/Edit photo handler
  type AdminPhotoForm = z.infer<typeof adminPhotoSchema>;
  const onSubmit = async (values: AdminPhotoForm) => {
    setIsBusy(true);
    let finalUrl = values.url;
    if (finalUrl.startsWith("blob:")) {
      try {
        const res = await fetch(finalUrl);
        const blob = await res.blob();
        finalUrl = await uploadImageFromBlob(blob);
        URL.revokeObjectURL(values.url);
      } catch (_e) {
        toast.error("Uppladdning misslyckades.");
        setIsBusy(false);
        return;
      }
    }
    const res = editingPhoto
      ? await editPhoto(editingPhoto.id, { ...values, url: finalUrl })
      : await addPhoto({ ...values, url: finalUrl });
    if (res.success) {
      toast.success(res.msg);
      setTimeout(() => {
        closeModal();
        router.refresh();
      }, 800);
    } else {
      toast.error(res.msg);
    }
    setIsBusy(false);
  };

  // Delete photo handler
  const handleDeletePhoto = async (photoId: string) => {
    if (!window.confirm("Är du säker på att du vill ta bort denna bild?"))
      return;
    setIsBusy(true);
    const res = await deletePhoto(photoId);
    if (res.success) {
      toast.success(res.msg);
      router.refresh();
    } else {
      toast.error(res.msg);
    }
    setIsBusy(false);
  };

  // Filter photos in-memory
  const filteredPhotos = useMemo(() => {
    return photos.filter((photo) => {
      const matchesText =
        !filterText ||
        photo.caption?.toLowerCase().includes(filterText.toLowerCase()) ||
        photo.description?.toLowerCase().includes(filterText.toLowerCase());
      const matchesEvent = !filterEvent || photo.eventId === filterEvent;
      const matchesVisible =
        filterVisible === ""
          ? true
          : filterVisible === "true"
            ? photo.isVisible
            : !photo.isVisible;
      return matchesText && matchesEvent && matchesVisible;
    });
  }, [photos, filterText, filterEvent, filterVisible]);

  return (
    <div className="p-4 w-full bg-background text-foreground">
      <h1 className="text-2xl font-bold mb-6">
        Galleri - Hantera bilder
        <span className="text-sm text-muted-foreground ml-3">
          Sida {currentPage} av {totalPages}
        </span>
      </h1>
      <Button onClick={openAddModal} className="cursor-pointer">
        Lägg till bild
      </Button>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mt-6 mb-4 items-end justify-between">
        {/* Sök filter on the left */}
        <div>
          <label htmlFor="filterText" className="block text-xs mb-1">
            Sök
          </label>
          <Input
            id="filterText"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Sök rubrik eller beskrivning..."
            className="min-w-160"
          />
        </div>
        {/* Event & Synlig filters on the far right */}
        <div className="flex gap-4">
          <div>
            <label htmlFor="filterEvent" className="block text-xs mb-1">
              Event
            </label>
            <select
              id="filterEvent"
              aria-label="Event filter"
              value={filterEvent}
              onChange={(e) => setFilterEvent(e.target.value)}
              className="border border-border rounded p-2 min-w-[120px] bg-background text-foreground dark:bg-input dark:text-foreground"
            >
              <option value="">Alla</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.headline}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filterVisible" className="block text-xs mb-1">
              Synlig
            </label>
            <select
              id="filterVisible"
              aria-label="Synlig filter"
              value={filterVisible}
              onChange={(e) => setFilterVisible(e.target.value)}
              className="border border-border rounded p-2 min-w-[100px] bg-background text-foreground dark:bg-input dark:text-foreground"
            >
              <option value="">Alla</option>
              <option value="true">Endast synliga</option>
              <option value="false">Endast dolda</option>
            </select>
          </div>
        </div>
      </div>

      {filteredPhotos.length === 0 ? (
        <div className="text-center text-muted-foreground mt-10">
          Inga bilder matchar filtren.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {filteredPhotos.map((photo, _idx) => (
            <Card
              key={photo.id}
              className="relative group bg-card text-card-foreground"
            >
              <CardContent>
                <a
                  href={photo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative w-full h-48 flex items-center justify-center bg-transparent border-transparent rounded overflow-hidden"
                  title={
                    photo.caption || photo.description || "Visa i full storlek"
                  }
                  aria-label={
                    photo.caption || photo.description || "Visa i full storlek"
                  }
                >
                  <Image
                    src={photo.url}
                    alt={photo.caption || "Bild"}
                    fill
                    className="object-contain rounded-lg bg-transparent border-transparent"
                  />
                </a>
                <div className="mt-3 text-center">
                  {photo.caption && (
                    <div className="text-lg md:text-xl font-semibold text-foreground leading-tight">
                      {photo.caption}
                    </div>
                  )}
                  {photo.description && (
                    <div className="mt-1 text-sm md:text-base text-muted-foreground px-2">
                      <em>{photo.description}</em>
                    </div>
                  )}
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mt-2">
                    {photo.eventId
                      ? events.find((e) => e.id === photo.eventId)?.headline
                      : "Ingen"}
                  </div>
                  <div className="flex gap-2 mt-2 justify-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(photo);
                          }}
                          className="transition-colors group-hover:border-blue-500 cursor-pointer"
                        >
                          Redigera
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Redigera</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePhoto(photo.id);
                          }}
                          className="transition-colors group-hover:border-red-500 cursor-pointer"
                        >
                          Ta bort
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Ta bort</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <div className="mt-6">
        <AdminGalleryPagination
          currentPage={currentPage}
          totalPages={totalPages}
        />
      </div>
      {/* While busy we keep only the disabled button state; no global spinner */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-card dark:text-card-foreground rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto border border-border">
            <h2 className="text-xl font-bold mb-4">
              {editingPhoto ? "Redigera bild" : "Lägg till bild"}
            </h2>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bild</FormLabel>
                      <FormControl>
                        <div>
                          <ImageInput
                            key={modalKey}
                            {...field}
                            onChange={(val: string | undefined) => {
                              field.onChange(val);
                              setPreviewUrl(val ?? null);
                            }}
                          />
                          {/* Only show preview image in edit mode, never in add mode. Only keep the preview below the upload input. */}
                          {editingPhoto && previewUrl && (
                            <Image
                              src={previewUrl}
                              alt="Förhandsvisning"
                              width={800}
                              height={192}
                              className="mt-2 w-full h-48 object-cover rounded border-transparent bg-transparent"
                            />
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="caption"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rubrik</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Beskrivning</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="eventId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full border rounded p-2 bg-background text-foreground dark:bg-input border-border"
                        >
                          <option value="">Ingen</option>
                          {events.map((event) => (
                            <option key={event.id} value={event.id}>
                              {event.headline}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isVisible"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Synlig</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                            className="accent-primary dark:accent-primary bg-background dark:bg-input/30 border border-border rounded"
                            aria-label="Synlig"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* No inline spinner while uploading; keep button disabled with text only */}
                <div className="flex gap-2 mt-4">
                  <Button
                    type="submit"
                    disabled={isBusy}
                    className={isBusy ? "cursor-not-allowed" : "cursor-pointer"}
                  >
                    {isBusy
                      ? "Uppladdar..."
                      : editingPhoto
                        ? "Uppdatera"
                        : "Lägg till"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeModal}
                    className="cursor-pointer"
                  >
                    Avbryt
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      )}
    </div>
  );
}
