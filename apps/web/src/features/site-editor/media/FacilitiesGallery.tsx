import { getMediaUrl } from "@/shared/utils/media";
import type { ContentImage } from "@/shared/utils/site-media-content";

function GalleryImage({ image, className, label }: { image: ContentImage | null; className: string; label: string }) {
  return (
    <figure className={className} style={{ margin: 0, position: "relative", overflow: "hidden", borderRadius: 20, border: "1px solid var(--color-border)", background: "#EEF2F7" }}>
      {image ? (
        <img src={getMediaUrl(image.path)} alt={image.alt} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: image.objectPosition, display: "block" }} />
      ) : (
        <div style={{ width: "100%", height: "100%", minHeight: 150, display: "grid", placeItems: "center", color: "var(--color-text-muted)", fontSize: 12, fontWeight: 700 }}>Фото не задано</div>
      )}
      {image?.title && <figcaption style={{ position: "absolute", left: 16, bottom: 14, maxWidth: "calc(100% - 32px)", padding: "5px 9px", borderRadius: 7, background: "rgba(15,23,42,.76)", color: "white", fontSize: 12, fontWeight: 700 }}>{image.title}</figcaption>}
      <span className="sr-only">{label}</span>
    </figure>
  );
}

export function FacilitiesGallery({ mainImage, equipmentImage, workspaceImage }: { mainImage: ContentImage | null; equipmentImage: ContentImage | null; workspaceImage: ContentImage | null }) {
  return (
    <div className="facilities-gallery" data-facilities-gallery>
      <GalleryImage className="facilities-main" image={mainImage} label="Основное большое фото" />
      <div className="facilities-side">
        <GalleryImage className="facilities-small" image={equipmentImage} label="Оборудование" />
        <GalleryImage className="facilities-small" image={workspaceImage} label="Рабочая зона" />
      </div>
      <style jsx>{`
        .facilities-gallery { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(220px, 1fr); gap: 24px; min-width: 0; }
        .facilities-main { height: 400px; }
        .facilities-side { display: grid; grid-template-rows: 1fr 1fr; gap: 24px; min-width: 0; }
        .facilities-small { height: 188px; }
        @media (max-width: 760px) { .facilities-gallery { grid-template-columns: 1fr; gap: 14px; } .facilities-main { height: 300px; } .facilities-side { grid-template-columns: 1fr 1fr; grid-template-rows: none; gap: 14px; } .facilities-small { height: 170px; } }
        @media (max-width: 520px) { .facilities-main { height: 250px; } .facilities-side { grid-template-columns: 1fr; } .facilities-small { height: 190px; } }
      `}</style>
    </div>
  );
}
