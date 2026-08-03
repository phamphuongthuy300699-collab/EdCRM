export type ImageCollectionItem = {
  path: string;
  title: string;
  alt: string;
  sortOrder: number;
  isActive: boolean;
  objectPosition: string;
  [key: string]: unknown;
};

export type ImageCollectionLayout = {
  columnsDesktop: number;
  columnsTablet: number;
  columnsMobile: number;
  gap: number;
  aspectRatio: string;
  objectFit: "cover" | "contain";
};

export type MediaLibraryFile = {
  name?: string;
  path: string;
  url?: string;
  size?: number;
  updatedAt?: string;
};

export type PreviewViewport = "desktop" | "tablet" | "mobile";
