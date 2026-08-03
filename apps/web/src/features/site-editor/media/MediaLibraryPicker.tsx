"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@robotics-crm/ui";
import { Search, Upload, X } from "lucide-react";
import { getMediaUrl } from "@/shared/utils/media";
import type { MediaLibraryFile } from "./types";

type UsageFilter = "all" | "used" | "unused";

export function MediaLibraryPicker({
  open,
  blockLabel,
  position,
  initialFolder,
  folders,
  initialFiles,
  usedPaths,
  multiple,
  onLoadFolder,
  onUpload,
  onSelect,
  onClose,
}: {
  open: boolean;
  blockLabel: string;
  position?: number | null;
  initialFolder: string;
  folders: Array<{ id: string; label: string }>;
  initialFiles: MediaLibraryFile[];
  usedPaths: string[];
  multiple: boolean;
  onLoadFolder: (folder: string) => Promise<MediaLibraryFile[]>;
  onUpload: (files: File[], folder: string) => Promise<MediaLibraryFile[]>;
  onSelect: (files: MediaLibraryFile[]) => void;
  onClose: () => void;
}) {
  const [folder, setFolder] = useState(initialFolder);
  const [files, setFiles] = useState(initialFiles);
  const [query, setQuery] = useState("");
  const [usageFilter, setUsageFilter] = useState<UsageFilter>("all");
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFolder(initialFolder);
    setFiles(initialFiles);
    setSelectedPaths([]);
  }, [open, initialFiles, initialFolder]);

  const filteredFiles = useMemo(() => files.filter((file) => {
    const matchesQuery = `${file.name || ""} ${file.path}`.toLocaleLowerCase("ru").includes(query.trim().toLocaleLowerCase("ru"));
    const isUsed = usedPaths.includes(file.path) || Boolean(file.usages?.length);
    const matchesUsage = usageFilter === "all" || (usageFilter === "used" ? isUsed : !isUsed);
    return matchesQuery && matchesUsage;
  }), [files, query, usageFilter, usedPaths]);

  if (!open) return null;

  const requestClose = () => {
    if (selectedPaths.length > 0 && !window.confirm("Закрыть выбор? Несохраненное выделение будет потеряно.")) return;
    onClose();
  };

  const loadFolder = async (nextFolder: string) => {
    setFolder(nextFolder);
    setSelectedPaths([]);
    setLoading(true);
    try {
      setFiles(await onLoadFolder(nextFolder));
    } finally {
      setLoading(false);
    }
  };

  const toggleFile = (file: MediaLibraryFile) => {
    setSelectedPaths((current) => {
      if (!multiple) return current.includes(file.path) ? [] : [file.path];
      return current.includes(file.path) ? current.filter((path) => path !== file.path) : [...current, file.path];
    });
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Выбор изображения из медиатеки" style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,.55)", display: "grid", placeItems: "center", padding: "20px" }}>
      <div className="site-media-picker-panel" style={{ width: "min(1040px, 100%)", maxHeight: "90vh", overflow: "auto", background: "white", borderRadius: "16px", padding: "20px", display: "grid", gap: "16px" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "flex-start" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px" }}>Медиатека</h3>
            <p style={{ margin: "4px 0 0", color: "var(--color-text-muted)", fontSize: "12px" }}>
              Добавление в блок «{blockLabel}»{position != null ? `, позиция ${position + 1}` : ", в конец списка"}
            </p>
          </div>
          <button type="button" aria-label="Закрыть медиатеку" onClick={requestClose} style={{ border: 0, background: "transparent", cursor: "pointer" }}><X size={20} /></button>
        </header>

        <div className="site-media-picker-tools" style={{ display: "grid", gridTemplateColumns: "minmax(160px, 220px) 1fr auto", gap: "10px" }}>
          <select className="form-input" value={folder} onChange={(event) => void loadFolder(event.target.value)}>
            {folders.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
          <label style={{ position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: 11, color: "var(--color-text-muted)" }} />
            <input className="form-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по имени или пути" style={{ paddingLeft: 32 }} />
          </label>
          <select className="form-input" value={usageFilter} onChange={(event) => setUsageFilter(event.target.value as UsageFilter)}>
            <option value="all">Все файлы</option>
            <option value="used">Используется</option>
            <option value="unused">Не используется</option>
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "12px", minHeight: 220 }}>
          {loading ? <p style={{ fontSize: 12 }}>Загрузка…</p> : filteredFiles.map((file) => {
            const selected = selectedPaths.includes(file.path);
            return (
              <button key={file.path} type="button" data-media-path={file.path} onClick={() => toggleFile(file)} style={{ padding: 8, textAlign: "left", borderRadius: 10, border: selected ? "2px solid var(--color-primary)" : "1px solid var(--color-border)", background: selected ? "var(--color-primary-soft)" : "white", cursor: "pointer" }}>
                <div style={{ position: "relative", aspectRatio: "4/3", borderRadius: 7, overflow: "hidden", background: "#EEF2F7" }}>
                  <Image src={file.url || getMediaUrl(file.path)} alt={file.name || file.path} fill unoptimized sizes="180px" style={{ objectFit: "cover" }} />
                </div>
                <strong style={{ display: "block", marginTop: 7, fontSize: 11, overflowWrap: "anywhere" }}>{file.name || file.path.split("/").pop()}</strong>
                <span style={{ fontSize: 10, color: file.usages?.length || usedPaths.includes(file.path) ? "#166534" : "var(--color-text-muted)" }}>
                  {file.usages?.length ? `Используется в ${file.usages.length} ${file.usages.length === 1 ? "месте" : "местах"}` : usedPaths.includes(file.path) ? "Используется в этом блоке" : "Не используется"}
                </span>
                {file.usages?.map((usage) => <span key={`${usage.kind}-${usage.label}`} style={{ display: "block", marginTop: 3, fontSize: 9, color: "var(--color-text-muted)" }}>{usage.label}</span>)}
              </button>
            );
          })}
        </div>

        <footer style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, borderTop: "1px solid var(--color-border)", paddingTop: 14 }}>
          <label>
            <input
              type="file"
              accept="image/*"
              multiple={multiple}
              hidden
              onChange={async (event) => {
                const selected = Array.from(event.target.files || []);
                if (!selected.length) return;
                setLoading(true);
                try {
                  const uploaded = await onUpload(selected, folder);
                  setFiles((current) => [...uploaded, ...current.filter((file) => !uploaded.some((item) => item.path === file.path))]);
                  setSelectedPaths(uploaded.map((file) => file.path));
                } finally {
                  setLoading(false);
                  event.target.value = "";
                }
              }}
            />
            <span className="button-secondary-crm" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 12px", border: "1px solid var(--color-border)", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700 }}><Upload size={14} /> Загрузить новое</span>
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <Button type="button" variant="secondary-crm" onClick={requestClose}>Отмена</Button>
            <Button type="button" variant="primary-crm" disabled={!selectedPaths.length} onClick={() => onSelect(files.filter((file) => selectedPaths.includes(file.path)))}>
              {position != null ? "Заменить изображение" : `Добавить${selectedPaths.length > 1 ? ` (${selectedPaths.length})` : ""}`}
            </Button>
          </div>
        </footer>
        <style jsx>{`
          @media (max-width: 700px) {
            .site-media-picker-panel { padding: 14px !important; max-height: 94vh !important; }
            .site-media-picker-tools { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </div>
  );
}
