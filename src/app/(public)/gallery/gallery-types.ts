export type GalleryMediaType = "IMAGE" | "VIDEO";

export type GalleryMediaItem = {
  id: string;
  type: GalleryMediaType;
  title: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  createdAt: string;
  updatedAt: string;
  sortDate: string;
  displayOrder?: number;
  eventId?: string;
  eventHeadline?: string;
  eventStartDate?: string;
};
