"use client";

import { Search, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type StudentPickerOption = {
  id: string;
  fullName: string;
  status: "active" | "paused" | "archived";
  groupId?: string | null;
  groupName?: string | null;
  withoutGroup?: boolean;
  guardians?: Array<{ fullName: string; phone?: string }>;
};

type Props = {
  value?: string | string[];
  onChange: (value: string | string[], option?: StudentPickerOption) => void;
  multiple?: boolean;
  excludeStudentIds?: string[];
  placeholder?: string;
  disabled?: boolean;
  allowEmpty?: boolean;
  demoOptions?: StudentPickerOption[];
};

const statusLabel = { active: "Активен", paused: "Приостановлен", archived: "Архив" };

export function StudentPicker({ value = "", onChange, multiple = false, excludeStudentIds = [], placeholder = "Имя ребёнка, родителя или телефон", disabled = false, allowEmpty = true, demoOptions }: Props) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<StudentPickerOption[]>(demoOptions || []);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const selectedIds = useMemo(() => new Set(Array.isArray(value) ? value : value ? [value] : []), [value]);
  const excluded = useMemo(() => new Set(excludeStudentIds), [excludeStudentIds]);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (demoOptions) {
      const term = query.toLocaleLowerCase("ru-RU");
      setOptions(demoOptions.filter((option) => `${option.fullName} ${option.guardians?.map((item) => `${item.fullName} ${item.phone || ""}`).join(" ") || ""}`.toLocaleLowerCase("ru-RU").includes(term)));
      return;
    }
    const timer = setTimeout(async () => {
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/crm/students/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        const payload = await response.json();
        if (!response.ok || !payload.ok) throw new Error(payload.error || "Не удалось найти учеников");
        setOptions(payload.students || []);
      } catch (cause) {
        if ((cause as Error).name !== "AbortError") setError((cause as Error).message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [query, demoOptions]);

  const visible = options.filter((option) => !excluded.has(option.id));
  const select = (option: StudentPickerOption) => {
    if (multiple) {
      const next = new Set(selectedIds);
      if (next.has(option.id)) next.delete(option.id); else next.add(option.id);
      onChange([...next], option);
      setQuery("");
      return;
    }
    onChange(option.id, option);
    setQuery(option.fullName);
    setOpen(false);
  };

  const clear = () => {
    onChange(multiple ? [] : "");
    setQuery("");
    setOpen(true);
  };

  return (
    <div className="student-picker" style={{ position: "relative", display: "grid", gap: 6 }}>
      <div style={{ position: "relative" }}>
        <Search aria-hidden size={17} style={{ position: "absolute", left: 13, top: 14, color: "var(--color-text-muted)" }} />
        <input
          className="form-input"
          value={query}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); if (!multiple && value) onChange(""); }}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-controls="student-picker-results"
          style={{ minHeight: 44, paddingLeft: 40, paddingRight: 42 }}
        />
        {allowEmpty && (query || selectedIds.size > 0) && <button type="button" aria-label="Очистить выбор ученика" onClick={clear} style={{ position: "absolute", right: 5, top: 5, width: 34, height: 34, border: 0, background: "transparent", color: "var(--color-text-muted)", cursor: "pointer" }}><X size={17} /></button>}
      </div>
      {multiple && selectedIds.size > 0 && <span style={{ fontSize: 12, color: "var(--color-primary)", fontWeight: 700 }}>Выбрано: {selectedIds.size}</span>}
      {open && !disabled && (
        <div id="student-picker-results" role="listbox" style={{ position: "absolute", zIndex: 30, left: 0, right: 0, top: 50, maxHeight: 280, overflowY: "auto", background: "white", border: "1px solid var(--color-border)", borderRadius: 10, boxShadow: "0 16px 36px rgba(15,23,42,.14)" }}>
          {loading && <div style={{ padding: 14, fontSize: 12, color: "var(--color-text-muted)" }}>Ищем учеников…</div>}
          {error && <div role="alert" style={{ padding: 14, fontSize: 12, color: "var(--color-danger)" }}>{error}</div>}
          {!loading && !error && visible.length === 0 && <div style={{ padding: 14, fontSize: 12, color: "var(--color-text-muted)" }}>Никого не найдено</div>}
          {visible.map((option) => (
            <button key={option.id} type="button" role="option" aria-selected={selectedIds.has(option.id)} onClick={() => select(option)} style={{ width: "100%", minHeight: 58, display: "grid", gridTemplateColumns: "28px 1fr", gap: 8, padding: "10px 12px", textAlign: "left", border: 0, borderBottom: "1px solid var(--color-border)", background: selectedIds.has(option.id) ? "var(--color-primary-soft)" : "white", cursor: "pointer" }}>
              <UserRound size={18} style={{ marginTop: 2, color: "var(--color-primary)" }} />
              <span><strong style={{ display: "block", fontSize: 13 }}>{option.fullName}</strong><span style={{ display: "block", marginTop: 3, fontSize: 11, color: "var(--color-text-muted)" }}>{option.groupName || "Без группы"} · {statusLabel[option.status]}</span></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
