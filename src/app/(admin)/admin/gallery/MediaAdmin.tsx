"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Clapperboard,
  Eye,
  EyeOff,
  ImageIcon,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type z from "zod";
import ImageInput from "@/components/ImageInput";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import VideoInput from "@/components/VideoInput";
import { addPhoto, deletePhoto, editPhoto } from "@/lib/actions/admin";
import {
  createGalleryItem,
  deleteGalleryItem,
  toggleGalleryItemActive,
  updateGalleryItem,
} from "@/lib/actions/gallery";
import { uploadImageFromBlob } from "@/lib/uploads";
import { adminPhotoSchema } from "@/validations/adminforms";

interface PhotoRecord {
  id: string;
  url: string;
  caption?: string;
  description?: string;
  eventId?: string;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

interface GalleryItemRecord {
  id: string;
  type: "IMAGE" | "VIDEO";
  title: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  displayOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EventOption {
  id: string;
  headline: string;
}

type MediaCardItem = {
  id: string;
  source: "photo" | "gallery-item";
  mediaType: "IMAGE" | "VIDEO";
  title: string;
  description?: string;
  previewUrl: string;
  assetUrl: string;
  status: boolean;
  eventId?: string;
  eventHeadline?: string;
  displayOrder?: number;
  createdAt: string;
};

type PhotoFormValues = z.infer<typeof adminPhotoSchema>;

type GalleryItemDraft = {
  title: string;
  description: string;
  url: string;
  displayOrder: number;
  active: boolean;
  type: "IMAGE" | "VIDEO";
};

const emptyGalleryDraft: GalleryItemDraft = {
  title: "",
  description: "",
  url: "",
  displayOrder: 0,
  active: true,
  type: "VIDEO",
};

export default function MediaAdmin({
  photos,
  galleryItems,
  events,
}: {
  photos: PhotoRecord[];
  galleryItems: GalleryItemRecord[];
  events: EventOption[];
}) {
  const router = useRouter();
  const [filterText, setFilterText] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "IMAGE" | "VIDEO">(
    "ALL",
  );
  const [filterStatus, setFilterStatus] = useState<
    "ALL" | "VISIBLE" | "HIDDEN"
  >("ALL");
  const [filterEvent, setFilterEvent] = useState("ALL");
  const [editingPhoto, setEditingPhoto] = useState<PhotoRecord | null>(null);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [photoModalKey, setPhotoModalKey] = useState(0);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [editingGalleryItem, setEditingGalleryItem] =
    useState<GalleryItemRecord | null>(null);
  const [galleryDialogOpen, setGalleryDialogOpen] = useState(false);
  const [galleryBusy, setGalleryBusy] = useState(false);
  const [galleryDraft, setGalleryDraft] =
    useState<GalleryItemDraft>(emptyGalleryDraft);

  const photoForm = useForm<PhotoFormValues>({
    resolver: zodResolver(adminPhotoSchema),
    defaultValues: {
      caption: "",
      description: "",
      eventId: "",
      url: "",
      isVisible: true,
    },
  });

  const eventMap = useMemo(
    () => new Map(events.map((event) => [event.id, event.headline])),
    [events],
  );

  const mediaItems = useMemo<MediaCardItem[]>(() => {
    const normalizedPhotos = photos.map((photo) => ({
      id: photo.id,
      source: "photo" as const,
      mediaType: "IMAGE" as const,
      title: photo.caption?.trim() || "Bild",
      description: photo.description,
      previewUrl: photo.url,
      assetUrl: photo.url,
      status: photo.isVisible,
      eventId: photo.eventId,
      eventHeadline: photo.eventId ? eventMap.get(photo.eventId) : undefined,
      createdAt: photo.createdAt,
    }));

    const normalizedGalleryItems = galleryItems.map((item) => ({
      id: item.id,
      source: "gallery-item" as const,
      mediaType: item.type,
      title: item.title,
      description: item.description,
      previewUrl:
        item.type === "IMAGE" ? item.url : (item.thumbnailUrl ?? item.url),
      assetUrl: item.url,
      status: item.active,
      displayOrder: item.displayOrder,
      createdAt: item.createdAt,
    }));

    return [...normalizedPhotos, ...normalizedGalleryItems].sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    );
  }, [eventMap, galleryItems, photos]);

  const filteredMediaItems = useMemo(() => {
    return mediaItems.filter((item) => {
      const search = filterText.trim().toLowerCase();
      const textMatches =
        !search ||
        item.title.toLowerCase().includes(search) ||
        item.description?.toLowerCase().includes(search) ||
        item.eventHeadline?.toLowerCase().includes(search);

      const typeMatches = filterType === "ALL" || item.mediaType === filterType;
      const statusMatches =
        filterStatus === "ALL" ||
        (filterStatus === "VISIBLE" ? item.status : !item.status);
      const eventMatches =
        filterEvent === "ALL" || item.eventId === filterEvent;

      return textMatches && typeMatches && statusMatches && eventMatches;
    });
  }, [filterEvent, filterStatus, filterText, filterType, mediaItems]);

  const openAddPhotoDialog = () => {
    setEditingPhoto(null);
    setPhotoPreviewUrl(null);
    photoForm.reset({
      caption: "",
      description: "",
      eventId: "",
      url: "",
      isVisible: true,
    });
    setPhotoModalKey((current) => current + 1);
    setPhotoDialogOpen(true);
  };

  const openEditPhotoDialog = (photo: PhotoRecord) => {
    setEditingPhoto(photo);
    setPhotoPreviewUrl(photo.url);
    photoForm.reset({
      caption: photo.caption || "",
      description: photo.description || "",
      eventId: photo.eventId || "",
      url: photo.url,
      isVisible: photo.isVisible,
    });
    setPhotoModalKey((current) => current + 1);
    setPhotoDialogOpen(true);
  };

  const closePhotoDialog = () => {
    setEditingPhoto(null);
    setPhotoPreviewUrl(null);
    setPhotoDialogOpen(false);
    photoForm.reset({
      caption: "",
      description: "",
      eventId: "",
      url: "",
      isVisible: true,
    });
  };

  const openAddGalleryDialog = () => {
    setEditingGalleryItem(null);
    setGalleryDraft(emptyGalleryDraft);
    setGalleryDialogOpen(true);
  };

  const openEditGalleryDialog = (item: GalleryItemRecord) => {
    setEditingGalleryItem(item);
    setGalleryDraft({
      title: item.title,
      description: item.description || "",
      url: item.url,
      displayOrder: item.displayOrder,
      active: item.active,
      type: item.type,
    });
    setGalleryDialogOpen(true);
  };

  const closeGalleryDialog = () => {
    setEditingGalleryItem(null);
    setGalleryDraft(emptyGalleryDraft);
    setGalleryDialogOpen(false);
  };

  const submitPhoto = async (values: PhotoFormValues) => {
    setPhotoBusy(true);
    let finalUrl = values.url;

    if (finalUrl.startsWith("blob:")) {
      try {
        const res = await fetch(finalUrl);
        const blob = await res.blob();
        finalUrl = await uploadImageFromBlob(blob);
        URL.revokeObjectURL(values.url);
      } catch {
        toast.error("Uppladdning misslyckades.");
        setPhotoBusy(false);
        return;
      }
    }

    const result = editingPhoto
      ? await editPhoto(editingPhoto.id, { ...values, url: finalUrl })
      : await addPhoto({ ...values, url: finalUrl });

    if (result.success) {
      toast.success(result.msg);
      closePhotoDialog();
      router.refresh();
    } else {
      toast.error(result.msg);
    }

    setPhotoBusy(false);
  };

  const submitGalleryItem = async () => {
    setGalleryBusy(true);

    if (!galleryDraft.url) {
      toast.error(
        galleryDraft.type === "VIDEO"
          ? "Du måste ladda upp en video."
          : "Du måste ladda upp en bild.",
      );
      setGalleryBusy(false);
      return;
    }

    let finalUrl = galleryDraft.url;

    if (galleryDraft.type === "IMAGE" && finalUrl.startsWith("blob:")) {
      try {
        const res = await fetch(finalUrl);
        const blob = await res.blob();
        finalUrl = await uploadImageFromBlob(blob);
        URL.revokeObjectURL(galleryDraft.url);
      } catch {
        toast.error("Uppladdning av bild misslyckades.");
        setGalleryBusy(false);
        return;
      }
    }

    try {
      if (editingGalleryItem) {
        await updateGalleryItem(editingGalleryItem.id, {
          title: galleryDraft.title,
          description: galleryDraft.description || undefined,
          url: finalUrl,
          displayOrder: galleryDraft.displayOrder,
          active: galleryDraft.active,
        });
        toast.success("Galleriobjekt uppdaterat.");
      } else {
        await createGalleryItem({
          type: galleryDraft.type,
          title: galleryDraft.title,
          description: galleryDraft.description || undefined,
          url: finalUrl,
          displayOrder: galleryDraft.displayOrder,
          active: galleryDraft.active,
        });
        toast.success("Galleriobjekt skapat.");
      }

      closeGalleryDialog();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Kunde inte spara galleriobjektet.",
      );
    }

    setGalleryBusy(false);
  };

  const handleDeletePhoto = async (photo: PhotoRecord) => {
    if (!window.confirm("Är du säker på att du vill ta bort denna bild?")) {
      return;
    }

    const result = await deletePhoto(photo.id);
    if (result.success) {
      toast.success(result.msg);
      router.refresh();
    } else {
      toast.error(result.msg);
    }
  };

  const handleDeleteGalleryItem = async (item: GalleryItemRecord) => {
    if (
      !window.confirm("Är du säker på att du vill ta bort detta galleriobjekt?")
    ) {
      return;
    }

    try {
      await deleteGalleryItem(item.id);
      toast.success("Galleriobjekt borttaget.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Kunde inte ta bort galleriobjektet.",
      );
    }
  };

  const togglePhotoVisibility = async (photo: PhotoRecord) => {
    const result = await editPhoto(photo.id, {
      url: photo.url,
      caption: photo.caption,
      description: photo.description,
      eventId: photo.eventId,
      isVisible: !photo.isVisible,
    });

    if (result.success) {
      toast.success(photo.isVisible ? "Bild dold." : "Bild synlig.");
      router.refresh();
    } else {
      toast.error(result.msg);
    }
  };

  const toggleGalleryVisibility = async (item: GalleryItemRecord) => {
    try {
      await toggleGalleryItemActive(item.id, !item.active);
      toast.success(
        item.active ? "Galleriobjekt dolt." : "Galleriobjekt synligt.",
      );
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Kunde inte uppdatera status.",
      );
    }
  };

  return (
    <div className="w-full bg-background p-4 text-foreground">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Galleri - Mediahantering</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hantera bilder från fotoarkivet och videoobjekt från det nya
            mediagalleriet på samma ställe.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={openAddPhotoDialog} className="cursor-pointer">
            <Plus className="h-4 w-4" />
            Lägg till bild
          </Button>
          <Button
            variant="outline"
            onClick={openAddGalleryDialog}
            className="cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Lägg till video
          </Button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 rounded-2xl border border-border bg-card/60 p-4 md:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))]">
        <div>
          <label
            htmlFor="filterText"
            className="mb-1 block text-xs font-medium text-muted-foreground"
          >
            Sök
          </label>
          <Input
            id="filterText"
            value={filterText}
            onChange={(event) => setFilterText(event.target.value)}
            placeholder="Sök titel, beskrivning eller event..."
          />
        </div>
        <div>
          <label
            htmlFor="filterType"
            className="mb-1 block text-xs font-medium text-muted-foreground"
          >
            Typ
          </label>
          <select
            id="filterType"
            value={filterType}
            onChange={(event) =>
              setFilterType(event.target.value as "ALL" | "IMAGE" | "VIDEO")
            }
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="ALL">Alla</option>
            <option value="IMAGE">Bilder</option>
            <option value="VIDEO">Video</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="filterStatus"
            className="mb-1 block text-xs font-medium text-muted-foreground"
          >
            Status
          </label>
          <select
            id="filterStatus"
            value={filterStatus}
            onChange={(event) =>
              setFilterStatus(
                event.target.value as "ALL" | "VISIBLE" | "HIDDEN",
              )
            }
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="ALL">Alla</option>
            <option value="VISIBLE">Synliga</option>
            <option value="HIDDEN">Dolda</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="filterEvent"
            className="mb-1 block text-xs font-medium text-muted-foreground"
          >
            Event
          </label>
          <select
            id="filterEvent"
            value={filterEvent}
            onChange={(event) => setFilterEvent(event.target.value)}
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="ALL">Alla</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.headline}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-sm text-muted-foreground">
        <span>{filteredMediaItems.length} objekt visas</span>
        <span>•</span>
        <span>{photos.length} bilder i fotoarkivet</span>
        <span>•</span>
        <span>{galleryItems.length} objekt i mediagalleriet</span>
      </div>

      {filteredMediaItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/30 px-6 py-16 text-center text-muted-foreground">
          Inga mediaobjekt matchar filtren.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredMediaItems.map((item) => {
            const photo =
              item.source === "photo"
                ? (photos.find((candidate) => candidate.id === item.id) ?? null)
                : null;
            const galleryItem =
              item.source === "gallery-item"
                ? (galleryItems.find((candidate) => candidate.id === item.id) ??
                  null)
                : null;

            return (
              <Card
                key={`${item.source}:${item.id}`}
                className="gap-0 overflow-hidden py-0"
              >
                <CardContent className="p-0">
                  <div className="relative h-64 bg-muted/50">
                    {item.mediaType === "VIDEO" ? (
                      <video
                        src={item.assetUrl}
                        poster={galleryItem?.thumbnailUrl ?? undefined}
                        preload="metadata"
                        className="h-full w-full object-cover"
                        muted
                      >
                        <track kind="captions" />
                      </video>
                    ) : (
                      <Image
                        src={item.previewUrl}
                        alt={item.title}
                        fill
                        sizes="(max-width: 1024px) 100vw, 33vw"
                        className="object-cover"
                      />
                    )}

                    <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                      <Badge
                        variant="secondary"
                        className="bg-background/90 text-foreground"
                      >
                        {item.mediaType === "VIDEO" ? (
                          <Clapperboard className="h-3 w-3" />
                        ) : (
                          <ImageIcon className="h-3 w-3" />
                        )}
                        {item.mediaType === "VIDEO" ? "Video" : "Bild"}
                      </Badge>
                      <Badge variant="outline" className="bg-background/80">
                        {item.source === "photo" ? "Fotoarkiv" : "Mediagalleri"}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-4 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={item.status ? "default" : "secondary"}>
                        {item.status ? "Synlig" : "Dold"}
                      </Badge>
                      {item.eventHeadline && (
                        <Badge variant="outline">{item.eventHeadline}</Badge>
                      )}
                    </div>

                    <div>
                      <h2 className="text-lg font-semibold leading-tight">
                        {item.title}
                      </h2>
                      {item.description && (
                        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1 text-sm text-muted-foreground">
                      {item.displayOrder !== undefined && (
                        <div>Sorteringsordning: {item.displayOrder}</div>
                      )}
                      <div>
                        Skapad{" "}
                        {new Intl.DateTimeFormat("sv-SE", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }).format(new Date(item.createdAt))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => {
                          if (photo) openEditPhotoDialog(photo);
                          if (galleryItem) openEditGalleryDialog(galleryItem);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                        Redigera
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => {
                          if (photo) void togglePhotoVisibility(photo);
                          if (galleryItem)
                            void toggleGalleryVisibility(galleryItem);
                        }}
                      >
                        {item.status ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        {item.status ? "Dölj" : "Visa"}
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        className="cursor-pointer"
                        onClick={() => {
                          if (photo) void handleDeletePhoto(photo);
                          if (galleryItem)
                            void handleDeleteGalleryItem(galleryItem);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Ta bort
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={photoDialogOpen}
        onOpenChange={(open) => !open && closePhotoDialog()}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPhoto ? "Redigera bild" : "Lägg till bild"}
            </DialogTitle>
            <DialogDescription>
              Bilder fortsätter tills vidare att sparas i fotoarkivet så att
              event-kopplingen fungerar som idag.
            </DialogDescription>
          </DialogHeader>

          <Form {...photoForm}>
            <form
              onSubmit={photoForm.handleSubmit(submitPhoto)}
              className="space-y-4"
            >
              <FormField
                control={photoForm.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bild</FormLabel>
                    <FormControl>
                      <div>
                        <ImageInput
                          key={photoModalKey}
                          {...field}
                          onChange={(value: string | undefined) => {
                            field.onChange(value);
                            setPhotoPreviewUrl(value ?? null);
                          }}
                        />
                        {editingPhoto && photoPreviewUrl && (
                          <Image
                            src={photoPreviewUrl}
                            alt="Förhandsvisning"
                            width={800}
                            height={192}
                            className="mt-2 h-48 w-full rounded object-cover"
                          />
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={photoForm.control}
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
                control={photoForm.control}
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
                control={photoForm.control}
                name="eventId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
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
                control={photoForm.control}
                name="isVisible"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Synlig</FormLabel>
                    <FormControl>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={(event) =>
                            field.onChange(event.target.checked)
                          }
                        />
                        Visa bilden i publika galleriet
                      </label>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button type="submit" disabled={photoBusy}>
                  {photoBusy
                    ? "Sparar..."
                    : editingPhoto
                      ? "Uppdatera bild"
                      : "Lägg till bild"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closePhotoDialog}
                >
                  Avbryt
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={galleryDialogOpen}
        onOpenChange={(open) => !open && closeGalleryDialog()}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingGalleryItem
                ? "Redigera galleriobjekt"
                : "Lägg till video"}
            </DialogTitle>
            <DialogDescription>
              Video hanteras via det nya mediagalleriet. Under migreringen
              ligger de kvar i GalleryItem-tabellen.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="gallery-title" className="text-sm font-medium">
                Titel
              </label>
              <Input
                id="gallery-title"
                value={galleryDraft.title}
                onChange={(event) =>
                  setGalleryDraft((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="T.ex. Dansgala 2025"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="gallery-description"
                className="text-sm font-medium"
              >
                Beskrivning
              </label>
              <Textarea
                id="gallery-description"
                value={galleryDraft.description}
                onChange={(event) =>
                  setGalleryDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label
                  htmlFor="gallery-display-order"
                  className="text-sm font-medium"
                >
                  Sorteringsordning
                </label>
                <Input
                  id="gallery-display-order"
                  type="number"
                  value={galleryDraft.displayOrder}
                  onChange={(event) =>
                    setGalleryDraft((current) => ({
                      ...current,
                      displayOrder: Number(event.target.value || 0),
                    }))
                  }
                />
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">Synlig</div>
                <label className="flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm">
                  <input
                    type="checkbox"
                    checked={galleryDraft.active}
                    onChange={(event) =>
                      setGalleryDraft((current) => ({
                        ...current,
                        active: event.target.checked,
                      }))
                    }
                  />
                  Visa objektet i publika galleriet
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium">
                {galleryDraft.type === "VIDEO" ? "Video" : "Bild"}
              </div>
              {galleryDraft.type === "VIDEO" ? (
                <VideoInput
                  name="url"
                  value={galleryDraft.url || undefined}
                  onChange={(value) =>
                    setGalleryDraft((current) => ({
                      ...current,
                      url: value ?? "",
                    }))
                  }
                  onBlur={() => {}}
                />
              ) : (
                <ImageInput
                  name="url"
                  value={galleryDraft.url || undefined}
                  onChange={(value) =>
                    setGalleryDraft((current) => ({
                      ...current,
                      url: value ?? "",
                    }))
                  }
                  onBlur={() => {}}
                />
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => void submitGalleryItem()}
                disabled={galleryBusy}
              >
                {galleryBusy
                  ? "Sparar..."
                  : editingGalleryItem
                    ? "Uppdatera objekt"
                    : "Lägg till video"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={closeGalleryDialog}
              >
                Avbryt
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
