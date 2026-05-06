export type GalleryMediaType = "IMAGE" | "VIDEO";

export type GalleryMediaItem = {
  id: string;
  type: GalleryMediaType;
  title: string;
  title2?: string;
  description?: string;
  description2?: string;
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
  eventHeadline2?: string;
  eventStartDate?: string;
};
