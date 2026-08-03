"use client";

import type { CSSProperties, ReactNode } from "react";
import { normalizeImageLayout } from "./image-collection";
import type { ImageCollectionItem, ImageCollectionLayout } from "./types";

type GridStyle = CSSProperties & Record<`--${string}`, string | number>;

export function ImageCollectionGrid({
  images,
  layout,
  renderItem,
  className = "",
}: {
  images: ImageCollectionItem[];
  layout?: Partial<ImageCollectionLayout> | null;
  renderItem: (image: ImageCollectionItem, index: number) => ReactNode;
  className?: string;
}) {
  const safeLayout = normalizeImageLayout(layout);
  const style: GridStyle = {
    "--image-grid-desktop": safeLayout.columnsDesktop,
    "--image-grid-tablet": safeLayout.columnsTablet,
    "--image-grid-mobile": safeLayout.columnsMobile,
    "--image-grid-gap": `${safeLayout.gap}px`,
  };

  return (
    <div className={`site-image-collection-grid ${className}`.trim()} style={style}>
      {images.map(renderItem)}
      <style jsx>{`
        .site-image-collection-grid {
          display: grid;
          grid-template-columns: repeat(var(--image-grid-desktop), minmax(0, 1fr));
          gap: var(--image-grid-gap);
        }
        @media (max-width: 1023px) {
          .site-image-collection-grid {
            grid-template-columns: repeat(var(--image-grid-tablet), minmax(0, 1fr));
          }
        }
        @media (max-width: 639px) {
          .site-image-collection-grid {
            grid-template-columns: repeat(var(--image-grid-mobile), minmax(0, 1fr));
          }
        }
      `}</style>
    </div>
  );
}
