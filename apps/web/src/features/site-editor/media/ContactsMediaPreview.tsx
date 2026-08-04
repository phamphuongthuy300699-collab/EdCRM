import { getMediaUrl } from "@/shared/utils/media";
import type { ContentImage } from "@/shared/utils/site-media-content";

export function ContactsMediaGallery({ mapImage, facadeImage, classroomImage, images = [] }: { mapImage: ContentImage | null; facadeImage: ContentImage | null; classroomImage: ContentImage | null; images?: ContentImage[] }) {
  const items = [mapImage, facadeImage, classroomImage, ...images].filter(Boolean) as ContentImage[];
  return (
    items.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>{items.map((item) => <figure key={item.path} style={{ margin: 0 }}><div style={{ height: 180, borderRadius: 10, overflow: "hidden", background: "#EEF2F7" }}><img src={getMediaUrl(item.path)} alt={item.alt} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: item.objectPosition }} /></div>{item.title && <figcaption style={{ marginTop: 5, fontSize: 11, fontWeight: 700 }}>{item.title}</figcaption>}</figure>)}</div> : <div style={{ padding: 24, textAlign: "center", color: "var(--color-text-muted)", border: "1px dashed var(--color-border)", borderRadius: 10, fontSize: 12 }}>Фотографии контактов не заданы</div>
  );
}

export function ContactsMediaPreview(props: Parameters<typeof ContactsMediaGallery>[0]) {
  return <div style={{ display: "grid", gap: 10, padding: 14, border: "1px solid var(--color-border)", borderRadius: 12, background: "#F8FAFC" }}><strong style={{ fontSize: 13 }}>Предпросмотр страницы контактов</strong><ContactsMediaGallery {...props} /></div>;
}
