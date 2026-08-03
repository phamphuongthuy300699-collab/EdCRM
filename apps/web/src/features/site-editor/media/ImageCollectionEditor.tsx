"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Button } from "@robotics-crm/ui";
import { ArrowDown, ArrowUp, GripVertical, ImagePlus, RotateCcw, Settings2, Trash2 } from "lucide-react";
import { getMediaUrl } from "@/shared/utils/media";
import {
  moveCollectionImage,
  normalizeImageCollection,
  normalizeImageLayout,
  removeCollectionImage,
  replaceCollectionImage,
  restoreCollectionImage,
} from "./image-collection";
import { BlockMediaPreview } from "./BlockMediaPreview";
import { MediaLibraryPicker } from "./MediaLibraryPicker";
import type { ImageCollectionItem, ImageCollectionLayout, MediaLibraryFile, PreviewViewport } from "./types";

const defaultFolders = [
  { id: "facilities", label: "Фото помещений" },
  { id: "student-projects", label: "Проекты учеников" },
  { id: "lesson-process", label: "Как проходят занятия" },
  { id: "equipment", label: "Классы и оборудование" },
  { id: "misc", label: "Разное" },
];

export function ImageCollectionEditor({
  blockKey,
  blockLabel,
  description,
  preferredFolder,
  showLayoutSettings = true,
  images,
  layout,
  mediaFiles,
  mediaFolders = defaultFolders,
  onChange,
  onLayoutChange,
  onLoadFolder,
  onUpload,
  onSave,
  dirty,
  onDirtyChange,
}: {
  blockKey: string;
  blockLabel: string;
  description?: string;
  preferredFolder?: string;
  showLayoutSettings?: boolean;
  images: ImageCollectionItem[];
  layout: ImageCollectionLayout;
  mediaFiles: MediaLibraryFile[];
  mediaFolders?: Array<{ id: string; label: string }>;
  onChange: (images: ImageCollectionItem[]) => void;
  onLayoutChange: (layout: ImageCollectionLayout) => void;
  onLoadFolder: (folder: string) => Promise<MediaLibraryFile[]>;
  onUpload: (files: File[], folder: string) => Promise<MediaLibraryFile[]>;
  onSave: () => Promise<void>;
  dirty: boolean;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const safeImages = useMemo(() => normalizeImageCollection(images), [images]);
  const safeLayout = useMemo(() => normalizeImageLayout(layout), [layout]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerFiles, setPickerFiles] = useState<MediaLibraryFile[]>(mediaFiles);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
  const [settingsIndex, setSettingsIndex] = useState<number | null>(null);
  const [viewport, setViewport] = useState<PreviewViewport>("desktop");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastRemoved, setLastRemoved] = useState<{ image: ImageCollectionItem; index: number } | null>(null);
  const targetFolder = preferredFolder || (blockKey === "home.student_projects" ? "student-projects" : blockKey === "home.lesson_process" ? "lesson-process" : mediaFolders[0]?.id || "misc");

  const commitImages = (nextImages: ImageCollectionItem[]) => {
    onChange(normalizeImageCollection(nextImages));
    onDirtyChange(true);
  };

  const patchImage = (index: number, patch: Partial<ImageCollectionItem>) => {
    commitImages(safeImages.map((image, imageIndex) => imageIndex === index ? { ...image, ...patch } : image));
  };

  const openLibrary = async (index: number | null) => {
    setReplaceIndex(index);
    setPickerFiles(await onLoadFolder(targetFolder));
    setPickerOpen(true);
  };

  return (
    <section className="site-image-collection-editor" data-block-key={blockKey}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <h4 style={{ margin: 0, fontSize: 15 }}>{blockLabel}</h4>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--color-text-muted)", lineHeight: 1.45 }}>{description || "Порядок карточек совпадает с порядком на сайте."}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {dirty && <span style={{ fontSize: 11, color: "#B45309", fontWeight: 700 }}>Есть несохранённые изменения</span>}
          <Button type="button" variant="primary-crm" disabled={saving} onClick={async () => {
            setSaving(true);
            try {
              await onSave();
              onDirtyChange(false);
              setLastRemoved(null);
            } finally {
              setSaving(false);
            }
          }}>{saving ? "Сохранение…" : "Сохранить блок"}</Button>
        </div>
      </header>

      {lastRemoved && (
        <div role="status" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 12px", borderRadius: 10, background: "#FFF7ED", color: "#9A3412", fontSize: 12 }}>
          <span>Изображение убрано из блока.</span>
          <Button type="button" variant="secondary-crm" onClick={() => { commitImages(restoreCollectionImage(safeImages, lastRemoved.image, lastRemoved.index)); setLastRemoved(null); }}><RotateCcw size={13} /> Отменить удаление</Button>
        </div>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {safeImages.length === 0 && (
          <div style={{ padding: "32px 16px", textAlign: "center", border: "1px dashed var(--color-border)", borderRadius: 12, color: "var(--color-text-muted)", fontSize: 12 }}>
            В блоке пока нет изображений. Добавьте первое из медиатеки или загрузите новое.
          </div>
        )}
        {safeImages.map((image, index) => (
          <article
            className="site-image-editor-item"
            key={String(image.id || image.path)}
            data-image-path={image.path}
            data-image-position={index + 1}
            draggable
            onDragStart={() => setDraggedIndex(index)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (draggedIndex != null) commitImages(moveCollectionImage(safeImages, draggedIndex, index));
              setDraggedIndex(null);
            }}
            style={{ opacity: image.isActive ? 1 : .62 }}
          >
            <GripVertical size={18} aria-label="Перетащить изображение" style={{ color: "var(--color-text-muted)", cursor: "grab" }} />
            <div style={{ position: "relative", aspectRatio: safeLayout.aspectRatio, borderRadius: 8, overflow: "hidden", background: "#EEF2F7" }}>
              <Image src={getMediaUrl(image.path)} alt={image.alt} fill unoptimized sizes="112px" style={{ objectFit: safeLayout.objectFit, objectPosition: image.objectPosition }} />
              <span style={{ position: "absolute", top: 5, left: 5, padding: "2px 6px", borderRadius: 10, background: "rgba(15,23,42,.75)", color: "white", fontSize: 10 }}>#{index + 1}</span>
            </div>
            <div className="site-image-editor-fields">
              <label><span>Название</span><input className="form-input" aria-label={`Название изображения ${index + 1}`} value={image.title} onChange={(event) => patchImage(index, { title: event.target.value })} placeholder="Название" /></label>
              <label><span>Описание для доступности</span><input className="form-input" aria-label={`Alt изображения ${index + 1}`} value={image.alt} onChange={(event) => patchImage(index, { alt: event.target.value })} placeholder="Например: ребёнок собирает робота" /></label>
              <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 700 }}>
                <input type="checkbox" checked={image.isActive} onChange={(event) => patchImage(index, { isActive: event.target.checked })} />
                {image.isActive ? "Показано" : "Скрыто"}
              </label>
            </div>
            <div className="site-image-editor-actions">
              <Button type="button" variant="secondary-crm" onClick={() => void openLibrary(index)}>Заменить</Button>
              <Button type="button" variant="secondary-crm" onClick={() => setSettingsIndex(settingsIndex === index ? null : index)}><Settings2 size={13} /> Настроить</Button>
              <div style={{ display: "flex", gap: 6 }}>
                <Button type="button" variant="secondary-crm" aria-label={`Переместить изображение ${index + 1} выше`} disabled={index === 0} onClick={() => commitImages(moveCollectionImage(safeImages, index, index - 1))}><ArrowUp size={13} /> Выше</Button>
                <Button type="button" variant="secondary-crm" aria-label={`Переместить изображение ${index + 1} ниже`} disabled={index === safeImages.length - 1} onClick={() => commitImages(moveCollectionImage(safeImages, index, index + 1))}><ArrowDown size={13} /> Ниже</Button>
              </div>
              <Button type="button" variant="secondary-crm" onClick={() => { setLastRemoved({ image, index }); commitImages(removeCollectionImage(safeImages, index)); }} style={{ color: "#B91C1C" }}><Trash2 size={13} /> Убрать из блока</Button>
            </div>
            {settingsIndex === index && (
              <div style={{ gridColumn: "2 / -1", paddingTop: 8 }}>
                <label className="form-label">Позиция изображения</label>
                <input className="form-input" value={image.objectPosition} onChange={(event) => patchImage(index, { objectPosition: event.target.value })} placeholder="50% 50%" />
              </div>
            )}
          </article>
        ))}
      </div>

      <Button type="button" variant="secondary-crm" onClick={() => void openLibrary(null)} style={{ width: "fit-content" }}><ImagePlus size={14} /> Добавить изображение</Button>

      {showLayoutSettings && <div style={{ display: "grid", gap: 12, borderTop: "1px solid var(--color-border)", paddingTop: 16 }}>
        <h4 style={{ margin: 0, fontSize: 14 }}>Настройка сетки</h4>
        <div className="form-grid-3">
          {(["columnsDesktop", "columnsTablet", "columnsMobile"] as const).map((field) => (
            <label key={field} className="form-group">
              <span className="form-label">{field === "columnsDesktop" ? "Колонки: компьютер" : field === "columnsTablet" ? "Колонки: планшет" : "Колонки: телефон"}</span>
              <input type="number" min="1" max={field === "columnsDesktop" ? 6 : field === "columnsTablet" ? 4 : 2} className="form-input" value={safeLayout[field]} onChange={(event) => { onLayoutChange(normalizeImageLayout({ ...safeLayout, [field]: Number(event.target.value) })); onDirtyChange(true); }} />
            </label>
          ))}
          <label className="form-group"><span className="form-label">Расстояние, px</span><input type="number" min="0" max="48" className="form-input" value={safeLayout.gap} onChange={(event) => { onLayoutChange(normalizeImageLayout({ ...safeLayout, gap: Number(event.target.value) })); onDirtyChange(true); }} /></label>
          <label className="form-group"><span className="form-label">Соотношение сторон</span><select className="form-input" value={safeLayout.aspectRatio} onChange={(event) => { onLayoutChange({ ...safeLayout, aspectRatio: event.target.value }); onDirtyChange(true); }}><option value="1/1">1:1</option><option value="4/3">4:3</option><option value="3/2">3:2</option><option value="16/9">16:9</option></select></label>
          <label className="form-group"><span className="form-label">Вписывание</span><select className="form-input" value={safeLayout.objectFit} onChange={(event) => { onLayoutChange({ ...safeLayout, objectFit: event.target.value === "contain" ? "contain" : "cover" }); onDirtyChange(true); }}><option value="cover">Cover</option><option value="contain">Contain</option></select></label>
        </div>
      </div>}

      <div style={{ display: "grid", gap: 12, borderTop: "1px solid var(--color-border)", paddingTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <h4 style={{ margin: 0, fontSize: 14 }}>Как это будет выглядеть на сайте</h4>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(["desktop", "tablet", "mobile"] as PreviewViewport[]).map((item) => <Button key={item} type="button" variant={viewport === item ? "primary-crm" : "secondary-crm"} onClick={() => setViewport(item)}>{item === "desktop" ? "Компьютер" : item === "tablet" ? "Планшет" : "Телефон"}</Button>)}
          </div>
        </div>
        <BlockMediaPreview blockKey={blockKey} images={safeImages} layout={safeLayout} viewport={viewport} />
      </div>

      <MediaLibraryPicker
        open={pickerOpen}
        blockLabel={blockLabel}
        position={replaceIndex}
        initialFolder={targetFolder}
        folders={mediaFolders}
        initialFiles={pickerFiles}
        usedPaths={safeImages.map((image) => image.path)}
        multiple={replaceIndex == null}
        onLoadFolder={onLoadFolder}
        onUpload={onUpload}
        onClose={() => { setPickerOpen(false); setReplaceIndex(null); }}
        onSelect={(selectedFiles) => {
          if (replaceIndex != null && selectedFiles[0]) {
            commitImages(replaceCollectionImage(safeImages, replaceIndex, selectedFiles[0].path));
          } else {
            const additions = selectedFiles.map((file, index) => ({
              path: file.path,
              title: (file.name || file.path.split("/").pop() || "Изображение").replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
              alt: (file.name || file.path.split("/").pop() || "Изображение").replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
              sortOrder: (safeImages.length + index + 1) * 10,
              isActive: true,
              objectPosition: "50% 50%",
            }));
            commitImages([...safeImages, ...additions]);
          }
          setPickerOpen(false);
          setReplaceIndex(null);
        }}
      />
      <style jsx>{`
        .site-image-collection-editor { display: flex; flex-direction: column; gap: 18px; width: 100%; min-width: 0; box-sizing: border-box; padding: 18px; border: 1px solid var(--color-border); border-radius: 14px; background: #FAFBFC; }
        .site-image-collection-editor > * { min-width: 0; max-width: 100%; }
        .site-image-collection-editor > header, .site-image-collection-editor > div { width: 100%; box-sizing: border-box; }
        .site-image-editor-item { display: grid; grid-template-columns: 24px 112px minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 12px; border: 1px solid var(--color-border); border-radius: 12px; background: white; }
        .site-image-editor-fields { min-width: 0; display: grid; gap: 7px; }
        .site-image-editor-fields label { display: grid; gap: 4px; }
        .site-image-editor-fields label > span { color: var(--color-text-muted); font-size: 10px; font-weight: 700; }
        .site-image-editor-actions { display: grid; gap: 6px; }
        @media (max-width: 820px) {
          .site-image-editor-item { grid-template-columns: 20px 96px minmax(0, 1fr); align-items: start; }
          .site-image-editor-actions { grid-column: 2 / -1; display: flex; flex-wrap: wrap; }
        }
        @media (max-width: 560px) {
          .site-image-editor-item { grid-template-columns: 20px minmax(0, 1fr); }
          .site-image-editor-item > :nth-child(2) { min-height: 160px; }
          .site-image-editor-fields, .site-image-editor-actions { grid-column: 1 / -1; }
        }
      `}</style>
    </section>
  );
}
