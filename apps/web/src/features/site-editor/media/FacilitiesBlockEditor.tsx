"use client";

import { useState } from "react";
import { Button } from "@robotics-crm/ui";
import { FacilitiesGallery } from "./FacilitiesGallery";
import { SingleImageEditor } from "./SingleImageEditor";
import type { MediaLibraryFile, SiteMediaSlotDraft } from "./types";

const positions = [
  { id: "facilities-main", label: "1. Основное большое фото", description: "Большое изображение слева." },
  { id: "facilities-equipment", label: "2. Оборудование", description: "Верхняя позиция справа." },
  { id: "facilities-workspace", label: "3. Рабочая зона", description: "Нижняя позиция справа." },
] as const;

export function FacilitiesBlockEditor({ drafts, dirty, mediaFolders, onDraftChange, onDirtyChange, onLoadFolder, onUpload, onSave }: {
  drafts: Record<string, SiteMediaSlotDraft>;
  dirty: boolean;
  mediaFolders: Array<{ id: string; label: string }>;
  onDraftChange: (slotId: string, draft: SiteMediaSlotDraft) => void;
  onDirtyChange: (slotId: string, dirty: boolean) => void;
  onLoadFolder: (folder: string) => Promise<MediaLibraryFile[]>;
  onUpload: (files: File[], folder: string) => Promise<MediaLibraryFile[]>;
  onSave: (input: { title: string; subtitle: string; mainImage: SiteMediaSlotDraft["image"]; equipmentImage: SiteMediaSlotDraft["image"]; workspaceImage: SiteMediaSlotDraft["image"] }) => Promise<void>;
}) {
  const main = drafts["facilities-main"] || {};
  const title = main.title || "Фото классов и оборудования";
  const subtitle = main.subtitle || "";
  const [saving, setSaving] = useState(false);
  const patchHeader = (field: "title" | "subtitle", value: string) => {
    for (const position of positions) onDraftChange(position.id, { ...(drafts[position.id] || {}), [field]: value });
    onDirtyChange("facilities-main", true);
  };

  return (
    <section style={{ display: "grid", gap: 16, padding: 18, border: "1px solid var(--color-border)", borderRadius: 14, background: "#FAFBFC" }} aria-label="Фото классов и оборудования">
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}><div><h3 style={{ margin: 0, fontSize: 17 }}>Фото классов и оборудования</h3><p style={{ margin: "5px 0 0", color: "var(--color-text-muted)", fontSize: 12 }}>Один блок CRM и та же композиция, которую увидят посетители сайта.</p></div>{dirty && <span style={{ padding: "4px 8px", borderRadius: 999, background: "#FFF7ED", color: "#B45309", fontSize: 10, fontWeight: 800 }}>Не сохранено</span>}</header>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        <label style={{ display: "grid", gap: 5, fontSize: 11, fontWeight: 750 }}>Заголовок<input className="form-input" value={title} onChange={(event) => patchHeader("title", event.target.value)} /></label>
        <label style={{ display: "grid", gap: 5, fontSize: 11, fontWeight: 750 }}>Подзаголовок<input className="form-input" value={subtitle} onChange={(event) => patchHeader("subtitle", event.target.value)} /></label>
      </div>
      <div style={{ display: "grid", gap: 12 }}>{positions.map((position) => <SingleImageEditor key={position.id} blockLabel={position.label} description={position.description} image={drafts[position.id]?.image || null} folder="facilities" mediaFolders={mediaFolders} onChange={(image) => onDraftChange(position.id, { ...(drafts[position.id] || {}), image })} onLoadFolder={onLoadFolder} onUpload={onUpload} onSave={async () => {}} dirty={Boolean(drafts[position.id] && dirty)} onDirtyChange={(value) => onDirtyChange(position.id, value)} showSaveButton={false} />)}</div>
      <div style={{ display: "grid", gap: 10, borderTop: "1px solid var(--color-border)", paddingTop: 16 }}><h4 style={{ margin: 0, fontSize: 14 }}>Точный предпросмотр публичного блока</h4><FacilitiesGallery mainImage={drafts["facilities-main"]?.image || null} equipmentImage={drafts["facilities-equipment"]?.image || null} workspaceImage={drafts["facilities-workspace"]?.image || null} /></div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}><Button type="button" variant="primary-crm" disabled={saving || !dirty} onClick={async () => { setSaving(true); try { await onSave({ title, subtitle, mainImage: drafts["facilities-main"]?.image || null, equipmentImage: drafts["facilities-equipment"]?.image || null, workspaceImage: drafts["facilities-workspace"]?.image || null }); } finally { setSaving(false); } }}>{saving ? "Сохранение…" : "Сохранить блок"}</Button></div>
    </section>
  );
}
