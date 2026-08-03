import { getMediaUrl } from "@/shared/utils/media";
import type { ImageCollectionItem, ImageCollectionLayout } from "./types";

function imageSource(item: ImageCollectionItem) {
  return String(item.img || "") || (item.path ? getMediaUrl(item.path) : "");
}

export function PublicStudentProjectCard({ item, layout, index = 0 }: { item: ImageCollectionItem; layout: ImageCollectionLayout; index?: number }) {
  const src = imageSource(item);
  const title = String(item.title || "Проект ученика");
  return (
    <div data-public-media-card="student-project" data-preview-path={item.path} className="card-site" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ aspectRatio: layout.aspectRatio, position: "relative" }}>
        {src ? <img src={src} alt={String(item.alt || title)} style={{ width: "100%", height: "100%", objectFit: layout.objectFit, objectPosition: item.objectPosition }} /> : (
          <div style={{ width: "100%", height: "100%", background: "var(--color-surface-soft)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)", fontSize: 12, fontWeight: 700 }}>Фото проекта появится после загрузки</div>
        )}
      </div>
      <div style={{ padding: 24 }}>
        <span className={`badge ${String(item.tagColor || (index % 2 === 0 ? "badge-amber" : "badge-purple"))}`} style={{ marginBottom: 12 }}>{String(item.tag || item.badge || "Проект ученика")}</span>
        <h4 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 8 }}>{title}</h4>
        <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", lineHeight: 1.5 }}>{String(item.desc || item.description || "")}</p>
      </div>
    </div>
  );
}

export function PublicLessonStepCard({ item, layout, index = 0 }: { item: ImageCollectionItem; layout: ImageCollectionLayout; index?: number }) {
  const src = imageSource(item);
  const title = String(item.title || "Этап занятия");
  return (
    <div data-public-media-card="lesson-step" data-preview-path={item.path} style={{ position: "relative", display: "flex", flexDirection: "column", gap: 12, zIndex: 2, background: "white", padding: 16, borderRadius: 12, border: "1px solid var(--color-border)", boxShadow: "0 8px 20px rgba(0,0,0,0.02)" }}>
      <div style={{ aspectRatio: layout.aspectRatio, borderRadius: 8, overflow: "hidden", position: "relative", background: "var(--color-surface-soft)" }}>
        {src ? <img src={src} alt={String(item.alt || title)} style={{ width: "100%", height: "100%", objectFit: layout.objectFit, objectPosition: item.objectPosition }} /> : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)", fontSize: 11, fontWeight: 700 }}>Этап</div>
        )}
        <div className="bg-grid-blueprint" style={{ position: "absolute", inset: 0, opacity: 0.1, pointerEvents: "none" }} />
      </div>
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--color-primary-soft)", color: "var(--color-primary-dark)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, fontFamily: "var(--font-geologica)", border: "2px solid white", boxShadow: "0 4px 10px rgba(37, 99, 235, 0.1)", marginTop: -28, marginLeft: 8, position: "relative", zIndex: 5 }}>
        {String(item.num || item.number || index + 1).padStart(2, "0")}
      </div>
      <div style={{ marginTop: 4 }}>
        <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--color-text)", marginBottom: 6 }}>{title}</h4>
        <p style={{ fontSize: 11, color: "var(--color-text-muted)", lineHeight: 1.4, margin: 0 }}>{String(item.text || item.description || "")}</p>
      </div>
    </div>
  );
}
