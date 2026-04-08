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
import {
  createGalleryItem,
  deleteGalleryItem,
  toggleGalleryItemActive,
  updateGalleryItem,
} from "@/lib/actions/gallery";
import { uploadImageFromBlob } from "@/lib/uploads";
import { adminGalleryItemSchema } from "@/validations/adminforms";

interface GalleryItemRecord {
  id: string;
  type: "IMAGE" | "VIDEO";
  title: string;
  caption?: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  displayOrder: number;
  active: boolean;
  eventId?: string;
  eventHeadline?: string;
  createdAt: string;
  updatedAt: string;
}

interface EventOption {
  id: string;
  headline: string;
}

type MediaCardItem = {
  id: string;
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

type GalleryFormValues = z.infer<typeof adminGalleryItemSchema>;

const emptyGalleryValues = (type: "IMAGE" | "VIDEO"): GalleryFormValues => ({
  type,
  title: "",
  description: "",
  eventId: "",
  url: "",
  thumbnailUrl: "",
  displayOrder: 0,
  active: true,
});

export default function MediaAdmin({
  items,
  events,
}: {
  items: GalleryItemRecord[];
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
  const [editingItem, setEditingItem] = useState<GalleryItemRecord | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [isBusy, setIsBusy] = useState(false);

  const form = useForm<GalleryFormValues>({
    resolver: zodResolver(adminGalleryItemSchema),
    defaultValues: emptyGalleryValues("IMAGE"),
  });
  const currentType = form.watch("type");

  const submitItem = async (values: GalleryFormValues) => {
    setIsBusy(true);
    let finalUrl = values.url;
    let finalThumbnailUrl = values.thumbnailUrl || undefined;

    if (values.type === "IMAGE" && finalUrl.startsWith("blob:")) {
      try {
        const res = await fetch(finalUrl);
        const blob = await res.blob();
        finalUrl = await uploadImageFromBlob(blob);
        URL.revokeObjectURL(values.url);
      } catch {
        toast.error("Uppladdning misslyckades.");
        setIsBusy(false);
        return;
      }
    }

    if (finalThumbnailUrl?.startsWith("blob:")) {
      try {
        const res = await fetch(finalThumbnailUrl);
        const blob = await res.blob();
        const uploaded = await uploadImageFromBlob(blob);
        URL.revokeObjectURL(finalThumbnailUrl);
        finalThumbnailUrl = uploaded;
      } catch {
        toast.error("Uppladdning av miniatyrbild misslyckades.");
        setIsBusy(false);
        return;
      }
    }

    const payload = {
      type: values.type,
      title: values.title.trim(),
      caption: values.type === "IMAGE" ? values.title.trim() : undefined,
      description: values.description || undefined,
      eventId: values.eventId || undefined,
      url: finalUrl,
      thumbnailUrl: finalThumbnailUrl,
      displayOrder: values.displayOrder,
      active: values.active,
    };

    try {
      if (editingItem) {
        await updateGalleryItem(editingItem.id, payload);
        toast.success("Galleriobjekt uppdaterat.");
      } else {
        await createGalleryItem(payload);
        toast.success(
          values.type === "IMAGE" ? "Bild skapad." : "Video skapad.",
        );
      }

      closeDialog();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Kunde inte spara galleriobjektet.",
      );
    }

    setIsBusy(false);
  };

  const mediaItems = useMemo<MediaCardItem[]>(() => {
    return items
      .map((item) => ({
        id: item.id,
        mediaType: item.type,
        title: item.caption?.trim() || item.title,
        description: item.description,
        previewUrl:
          item.type === "IMAGE" ? item.url : (item.thumbnailUrl ?? item.url),
        assetUrl: item.url,
        status: item.active,
        displayOrder: item.displayOrder,
        eventId: item.eventId,
        eventHeadline: item.eventHeadline,
        createdAt: item.createdAt,
      }))
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      );
  }, [items]);

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

  const openAddDialog = (type: "IMAGE" | "VIDEO") => {
    setEditingItem(null);
    setDialogKey((current) => current + 1);
    form.reset(emptyGalleryValues(type));
    setDialogOpen(true);
  };

  const openEditDialog = (item: GalleryItemRecord) => {
    setEditingItem(item);
    setDialogKey((current) => current + 1);
    form.reset({
      type: item.type,
      title: item.caption?.trim() || item.title,
      description: item.description || "",
      eventId: item.eventId || "",
      url: item.url,
      thumbnailUrl: item.thumbnailUrl || "",
      displayOrder: item.displayOrder,
      active: item.active,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setEditingItem(null);
    form.reset(emptyGalleryValues("IMAGE"));
    setDialogOpen(false);
  };

  const handleDeleteItem = async (item: GalleryItemRecord) => {
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

  const toggleItemVisibility = async (item: GalleryItemRecord) => {
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
            Alla galleriobjekt lagras nu i samma modell med valfri eventkoppling
            för både bild och video.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => openAddDialog("IMAGE")}
            className="cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Lägg till bild
          </Button>
          <Button
            variant="outline"
            onClick={() => openAddDialog("VIDEO")}
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
        <span>
          {items.filter((item) => item.type === "IMAGE").length} bilder
        </span>
        <span>•</span>
        <span>
          {items.filter((item) => item.type === "VIDEO").length} videor
        </span>
      </div>

      {filteredMediaItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/30 px-6 py-16 text-center text-muted-foreground">
          Inga mediaobjekt matchar filtren.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredMediaItems.map((item) => {
            const galleryItem =
              items.find((candidate) => candidate.id === item.id) ?? null;

            return (
              <Card key={item.id} className="gap-0 overflow-hidden py-0">
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
                          if (galleryItem) openEditDialog(galleryItem);
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
                          if (galleryItem)
                            void toggleItemVisibility(galleryItem);
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
                          if (galleryItem) void handleDeleteItem(galleryItem);
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

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem
                ? currentType === "IMAGE"
                  ? "Redigera bild"
                  : "Redigera video"
                : currentType === "IMAGE"
                  ? "Lägg till bild"
                  : "Lägg till video"}
            </DialogTitle>
            <DialogDescription>
              All media sparas nu i GalleryItem. Eventfältet är valfritt och kan
              användas för både bild och video.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(submitItem)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {currentType === "IMAGE" ? "Bild" : "Video"}
                    </FormLabel>
                    <FormControl>
                      {currentType === "IMAGE" ? (
                        <ImageInput key={dialogKey} {...field} />
                      ) : (
                        <VideoInput
                          key={dialogKey}
                          {...field}
                          onThumbnail={(url) =>
                            form.setValue("thumbnailUrl", url)
                          }
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {currentType === "VIDEO" && (
                <FormField
                  control={form.control}
                  name="thumbnailUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Miniatyrbild (auto-genereras, kan ersättas)
                      </FormLabel>
                      <FormControl>
                        <ImageInput key={`thumb-${dialogKey}`} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {currentType === "IMAGE" ? "Rubrik" : "Titel"}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
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
                      <Textarea {...field} value={field.value ?? ""} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
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
                  control={form.control}
                  name="displayOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sorteringsordning</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value}
                          onChange={(event) =>
                            field.onChange(Number(event.target.value || 0))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="active"
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
                        Visa objektet i publika galleriet
                      </label>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button type="submit" disabled={isBusy}>
                  {isBusy
                    ? "Sparar..."
                    : editingItem
                      ? "Uppdatera objekt"
                      : currentType === "IMAGE"
                        ? "Lägg till bild"
                        : "Lägg till video"}
                </Button>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Avbryt
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
