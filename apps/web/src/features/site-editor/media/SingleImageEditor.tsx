"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@robotics-crm/ui";
import { ImagePlus, RotateCcw, Trash2 } from "lucide-react";
import { getMediaUrl } from "@/shared/utils/media";
import { replaceSingleImage } from "./site-media-slots";
import { MediaLibraryPicker } from "./MediaLibraryPicker";
import type { MediaLibraryFile, SingleImageValue } from "./types";

export function SingleImageEditor({
  blockLabel,
  description,
  image,
  folder,
  mediaFolders,
  onChange,
  onLoadFolder,
  onUpload,
  onSave,
  dirty,
  onDirtyChange,
  showSaveButton = true,
}: {
  blockLabel: string;
  description: string;
  image: SingleImageValue | null;
  folder: string;
  mediaFolders: Array<{ id: string; label: string }>;
  onChange: (image: SingleImageValue | null) => void;
  onLoadFolder: (folder: string) => Promise<MediaLibraryFile[]>;
  onUpload: (files: File[], folder: string) => Promise<MediaLibraryFile[]>;
  onSave: () => Promise<void>;
  dirty: boolean;
  onDirtyChange: (dirty: boolean) => void;
  showSaveButton?: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerFiles, setPickerFiles] = useState<MediaLibraryFile[]>([]);
  const [saving, setSaving] = useState(false);
  const [clearedImage, setClearedImage] = useState<SingleImageValue | null>(null);

  const openLibrary = async () => {
    setPickerFiles(await onLoadFolder(folder));
    setPickerOpen(true);
  };

  const commit = (next: SingleImageValue | null) => {
    onChange(next);
    onDirtyChange(true);
  };

  return (
    <section className="site-single-image-editor" aria-label={blockLabel}>
      <div className="site-single-image-copy">
        <div>
          <h4>{blockLabel}</h4>
          <p>{description}</p>
        </div>
        {dirty && <span className="site-media-dirty">Не сохранено</span>}
      </div>

      {clearedImage && (
        <div role="status" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 12px", borderRadius: 10, background: "#FFF7ED", color: "#9A3412", fontSize: 12 }}>
          <span>Изображение удалено из блока.</span>
          <Button type="button" variant="secondary-crm" onClick={() => { commit(clearedImage); setClearedImage(null); }}><RotateCcw size={13} /> Отменить удаление</Button>
        </div>
      )}

      <div className="site-single-image-content">
        <div className="site-single-image-preview">
          {image ? (
            <Image src={getMediaUrl(image.path)} alt={image.alt || blockLabel} fill unoptimized sizes="320px" style={{ objectFit: "cover", objectPosition: image.objectPosition }} />
          ) : (
            <div className="site-media-empty"><ImagePlus size={24} /><span>Изображение не задано</span></div>
          )}
        </div>
        <div className="site-single-image-actions">
          <div>
            <strong>{image ? "Текущее изображение" : "Используется стандартный вид"}</strong>
            <span>{image?.path || "Публичная страница продолжит работать без файла."}</span>
          </div>
          <div className="site-media-button-row">
            <Button type="button" variant="secondary-crm" onClick={() => void openLibrary()}>{image ? "Заменить" : "Выбрать изображение"}</Button>
            {image && <Button type="button" variant="secondary-crm" onClick={() => { setClearedImage(image); commit(null); }} style={{ color: "#B91C1C" }}><Trash2 size={13} /> Очистить</Button>}
          </div>
          {image && <div className="site-single-image-fields">
            <label><span>Название</span><input className="form-input" value={image.title} onChange={(event) => commit({ ...image, title: event.target.value })} /></label>
            <label><span>Alt-текст</span><input className="form-input" value={image.alt} onChange={(event) => commit({ ...image, alt: event.target.value })} /></label>
            <label><span>Кадрирование</span><select className="form-input" value={image.objectPosition} onChange={(event) => commit({ ...image, objectPosition: event.target.value })}><option value="50% 50%">По центру</option><option value="50% 25%">Верх</option><option value="50% 75%">Низ</option><option value="25% 50%">Левая часть</option><option value="75% 50%">Правая часть</option></select></label>
          </div>}
          {showSaveButton && <Button type="button" variant="primary-crm" disabled={saving} onClick={async () => {
            setSaving(true);
            try {
              await onSave();
              onDirtyChange(false);
              setClearedImage(null);
            } finally {
              setSaving(false);
            }
          }}>{saving ? "Сохранение…" : "Сохранить"}</Button>}
        </div>
      </div>

      <style jsx>{`
        .site-single-image-editor { display: flex; flex-direction: column; gap: 14px; width: 100%; min-width: 0; box-sizing: border-box; padding: 16px; border: 1px solid var(--color-border); border-radius: 14px; background: white; }
        .site-single-image-editor > * { min-width: 0; max-width: 100%; }
        .site-single-image-copy { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
        h4 { margin: 0; font-size: 14px; }
        p { margin: 5px 0 0; color: var(--color-text-muted); font-size: 12px; line-height: 1.45; }
        .site-media-dirty { flex: none; padding: 4px 8px; border-radius: 999px; background: #FFF7ED; color: #B45309; font-size: 10px; font-weight: 800; }
        .site-single-image-content { display: grid; grid-template-columns: minmax(180px, 280px) minmax(0, 1fr); gap: 16px; min-width: 0; align-items: stretch; }
        .site-single-image-preview { position: relative; min-height: 150px; aspect-ratio: 16/9; overflow: hidden; border-radius: 10px; background: #EEF2F7; }
        .site-media-empty { height: 100%; display: grid; place-content: center; justify-items: center; gap: 7px; color: var(--color-text-muted); font-size: 11px; }
        .site-single-image-actions { display: flex; flex-direction: column; justify-content: space-between; align-items: flex-start; gap: 12px; min-width: 0; }
        .site-single-image-actions strong, .site-single-image-actions span { display: block; }
        .site-single-image-actions strong { font-size: 12px; }
        .site-single-image-actions span { margin-top: 5px; color: var(--color-text-muted); font-size: 11px; overflow-wrap: anywhere; }
        .site-media-button-row { display: flex; flex-wrap: wrap; gap: 8px; }
        .site-single-image-fields { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; width: 100%; }
        .site-single-image-fields label { display: grid; gap: 4px; min-width: 0; }
        .site-single-image-fields label > span { color: var(--color-text-muted); font-size: 10px; font-weight: 700; }
        .site-single-image-fields input, .site-single-image-fields select { min-width: 0; width: 100%; }
        @media (max-width: 700px) { .site-single-image-content { grid-template-columns: minmax(0, 1fr); } .site-single-image-preview { width: 100%; min-height: 180px; } }
        @media (max-width: 900px) { .site-single-image-fields { grid-template-columns: 1fr; } }
      `}</style>

      <MediaLibraryPicker
        open={pickerOpen}
        blockLabel={blockLabel}
        position={image ? 0 : null}
        initialFolder={folder}
        folders={mediaFolders}
        initialFiles={pickerFiles}
        usedPaths={image ? [image.path] : []}
        multiple={false}
        onLoadFolder={onLoadFolder}
        onUpload={onUpload}
        onClose={() => setPickerOpen(false)}
        onSelect={(files) => {
          if (files[0]) { commit(replaceSingleImage(image, files[0].path)); setClearedImage(null); }
          setPickerOpen(false);
        }}
      />
    </section>
  );
}
