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
  usages?: Array<{
    kind: "site_block" | "staff" | "course";
    label: string;
  }>;
};

export type PreviewViewport = "desktop" | "tablet" | "mobile";

export type SingleImageValue = {
  path: string;
  title: string;
  alt: string;
  objectPosition: string;
};

export type SiteMediaSlotDraft = {
  image?: SingleImageValue | null;
  images?: ImageCollectionItem[];
  layout?: ImageCollectionLayout;
  title?: string;
  subtitle?: string;
};
