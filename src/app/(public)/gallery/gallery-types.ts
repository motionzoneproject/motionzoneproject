export type GalleryMediaType = "IMAGE" | "VIDEO";

export type GalleryMediaItem = {
  clientId: string;
  id: string;
  type: GalleryMediaType;
  title: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
  sortDate: string;
  displayOrder?: number;
  eventId?: string;
  eventHeadline?: string;
  eventStartDate?: string;
};
