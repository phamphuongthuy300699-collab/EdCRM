"use client";

import Image from "next/image";
import { getMediaUrl } from "@/shared/utils/media";
import { activeCollectionImages, normalizeImageLayout } from "./image-collection";
import { ImageCollectionGrid } from "./ImageCollectionGrid";
import { PublicLessonStepCard, PublicStudentProjectCard } from "./PublicSiteMediaCards";
import type { ImageCollectionItem, ImageCollectionLayout, PreviewViewport } from "./types";

const viewportWidths: Record<PreviewViewport, string> = {
  desktop: "100%",
  tablet: "720px",
  mobile: "360px",
};

export function BlockMediaPreview({
  blockKey,
  images,
  layout,
  viewport,
}: {
  blockKey: string;
  images: ImageCollectionItem[];
  layout: ImageCollectionLayout;
  viewport: PreviewViewport;
}) {
  const visibleImages = activeCollectionImages(images);
  const safeLayout = normalizeImageLayout(layout);
  const previewLayout = {
    ...safeLayout,
    columnsDesktop: viewport === "desktop" ? safeLayout.columnsDesktop : viewport === "tablet" ? safeLayout.columnsTablet : safeLayout.columnsMobile,
    columnsTablet: viewport === "mobile" ? safeLayout.columnsMobile : safeLayout.columnsTablet,
  };
  const renderItem = (image: ImageCollectionItem, index: number) => {
    if (blockKey === "home.student_projects") return <PublicStudentProjectCard key={String(image.id || image.path)} item={image} layout={previewLayout} index={index} />;
    if (blockKey === "home.lesson_process") return <PublicLessonStepCard key={String(image.id || image.path)} item={image} layout={previewLayout} index={index} />;
    return (
      <figure key={String(image.id || image.path)} data-preview-path={image.path} style={{ margin: 0, minWidth: 0 }}>
        <div style={{ position: "relative", aspectRatio: safeLayout.aspectRatio, overflow: "hidden", borderRadius: "12px", background: "#EEF2F7" }}>
          <Image src={getMediaUrl(image.path)} alt={image.alt} fill unoptimized sizes="(max-width: 640px) 100vw, 33vw" style={{ objectFit: safeLayout.objectFit, objectPosition: image.objectPosition }} />
        </div>
        {image.title && <figcaption style={{ marginTop: "8px", fontSize: "12px", fontWeight: 700 }}>{image.title}</figcaption>}
      </figure>
    );
  };

  return (
    <div style={{ width: viewportWidths[viewport], maxWidth: "100%", margin: "0 auto", transition: "width 180ms ease" }}>
      {visibleImages.length > 0 ? (
        <ImageCollectionGrid
          images={visibleImages}
          layout={previewLayout}
          renderItem={renderItem}
        />
      ) : (
        <div style={{ padding: "40px 16px", textAlign: "center", border: "1px dashed var(--color-border)", borderRadius: "12px", color: "var(--color-text-muted)", fontSize: "12px" }}>
          В блоке пока нет видимых изображений
        </div>
      )}
    </div>
  );
}
