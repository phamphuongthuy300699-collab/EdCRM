"use client";

import { useState } from "react";
import { Button } from "@robotics-crm/ui";
import { ImageCollectionEditor } from "./ImageCollectionEditor";
import { normalizeImageLayout } from "./image-collection";
import { SingleImageEditor } from "./SingleImageEditor";
import { SITE_MEDIA_SLOTS, type SiteMediaSlot } from "./site-media-slots";
import type { MediaLibraryFile, SiteMediaSlotDraft } from "./types";

const groups = [
  { id: "home", label: "Главная" },
  { id: "contacts", label: "Контакты" },
  { id: "brand", label: "Бренд и SEO" },
  { id: "footer", label: "Футер" },
] as const;

export function SiteMediaBlocksEditor({
  drafts,
  mediaFolders,
  onDraftChange,
  onLoadFolder,
  onUpload,
  onSave,
  dirtySlots,
  onDirtyChange,
}: {
  drafts: Record<string, SiteMediaSlotDraft>;
  mediaFolders: Array<{ id: string; label: string }>;
  onDraftChange: (slotId: string, draft: SiteMediaSlotDraft) => void;
  onLoadFolder: (folder: string) => Promise<MediaLibraryFile[]>;
  onUpload: (files: File[], folder: string) => Promise<MediaLibraryFile[]>;
  onSave: (slot: SiteMediaSlot, draft: SiteMediaSlotDraft) => Promise<void>;
  dirtySlots: Record<string, true>;
  onDirtyChange: (slotId: string, dirty: boolean) => void;
}) {
  const [group, setGroup] = useState<(typeof groups)[number]["id"]>("home");
  return (
    <div className="site-media-blocks-editor">
      <div className="site-media-guide">
        <div>
          <h3>Изображения в блоках сайта</h3>
          <p>Выберите раздел, настройте нужное место и сохраните его. Файл можно выбрать из медиатеки или загрузить прямо во время замены.</p>
        </div>
        <ol>
          <li>Откройте раздел сайта</li>
          <li>Выберите или загрузите изображение</li>
          <li>Проверьте предпросмотр и сохраните</li>
        </ol>
      </div>

      <div className="site-media-group-tabs" role="tablist" aria-label="Разделы сайта">
        {groups.map((item) => (
          <Button key={item.id} type="button" variant={group === item.id ? "primary-crm" : "secondary-crm"} onClick={() => setGroup(item.id)} role="tab" aria-selected={group === item.id}>
            {item.label}
          </Button>
        ))}
      </div>

      <div className="site-media-slot-list">
        {SITE_MEDIA_SLOTS.map((slot) => {
          const draft = drafts[slot.id] || {};
          return <div key={slot.id} style={{ display: slot.group === group ? "block" : "none", minWidth: 0, width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>{slot.mode === "single" ? (
            <SingleImageEditor
              blockLabel={slot.label}
              description={slot.description}
              image={draft.image || null}
              folder={slot.folder}
              mediaFolders={mediaFolders}
              onChange={(image) => onDraftChange(slot.id, { ...draft, image })}
              onLoadFolder={onLoadFolder}
              onUpload={onUpload}
              onSave={() => onSave(slot, draft)}
              dirty={Boolean(dirtySlots[slot.id])}
              onDirtyChange={(dirty) => onDirtyChange(slot.id, dirty)}
            />
          ) : (
            <ImageCollectionEditor
              blockKey={slot.blockKey}
              blockLabel={slot.label}
              description={slot.description}
              preferredFolder={slot.folder}
              showLayoutSettings={slot.showLayoutSettings !== false}
              images={draft.images || []}
              layout={normalizeImageLayout(draft.layout || slot.layout)}
              mediaFiles={[]}
              mediaFolders={mediaFolders}
              onChange={(images) => onDraftChange(slot.id, { ...draft, images })}
              onLayoutChange={(layout) => onDraftChange(slot.id, { ...draft, layout })}
              onLoadFolder={onLoadFolder}
              onUpload={onUpload}
              onSave={() => onSave(slot, draft)}
              dirty={Boolean(dirtySlots[slot.id])}
              onDirtyChange={(dirty) => onDirtyChange(slot.id, dirty)}
            />
          )}</div>;
        })}
      </div>

      <aside className="site-media-related">
        <strong>Изображения сущностей</strong>
        <span>Фоны карточек курсов редактируются в настройках направлений, фото преподавателей — в разделе преподавателей. Здесь они не дублируются, чтобы изменения не расходились.</span>
      </aside>

      <style jsx>{`
        .site-media-blocks-editor { display: flex; flex-direction: column; gap: 18px; min-width: 0; }
        .site-media-blocks-editor > * { min-width: 0; max-width: 100%; }
        .site-media-guide { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 24px; padding: 18px; border-radius: 14px; background: linear-gradient(135deg, #EEF6FF, #F6F3FF); border: 1px solid #DCE6F5; }
        h3 { margin: 0; font-size: 17px; }
        p { margin: 6px 0 0; max-width: 660px; color: var(--color-text-muted); font-size: 12px; line-height: 1.5; }
        ol { margin: 0; padding-left: 20px; color: var(--color-text); font-size: 11px; line-height: 1.8; font-weight: 700; }
        .site-media-group-tabs { display: flex; flex-wrap: wrap; gap: 8px; }
        .site-media-slot-list { display: grid; gap: 16px; }
        .site-media-related { display: grid; gap: 4px; padding: 14px 16px; border: 1px solid var(--color-border); border-radius: 12px; background: #F8FAFC; }
        .site-media-related strong { font-size: 12px; }
        .site-media-related span { color: var(--color-text-muted); font-size: 11px; line-height: 1.5; }
        @media (max-width: 760px) { .site-media-guide { grid-template-columns: 1fr; gap: 12px; } }
      `}</style>
    </div>
  );
}
