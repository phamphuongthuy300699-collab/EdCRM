"use client";
import { useEffect, useState } from "react";
import { CrmDialog } from "@/shared/ui/CrmDialog";
import { Button } from "@robotics-crm/ui";
import { TrialSubjectPicker, type TrialSubjectOption } from "./TrialSubjectPicker";
import type { TrialSubjectInput } from "./contracts";

export function TeacherTrialDialog({ sessionId, onClose, onSaved }: {
  sessionId: string; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const [kind, setKind] = useState<"existing" | "new">("existing");
  const [options, setOptions] = useState<TrialSubjectOption[]>([]);
  const [selected, setSelected] = useState<TrialSubjectInput[]>([]);
  const [childName, setChildName] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [requestId] = useState(() => crypto.randomUUID());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const endpoint = `/api/teacher/lessons/${sessionId}/trials`;
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch(endpoint); const payload = await response.json();
        if (!response.ok || !payload.ok) throw new Error(payload.error || "Не удалось загрузить участников");
        if (active) setOptions(payload.options || []);
      } catch (cause) { if (active) setError((cause as Error).message); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [endpoint]);
  async function save() {
    if (saving) return;
    setSaving(true); setError("");
    try {
      const body = kind === "new" ? { kind, requestId, childName, parentName, parentPhone } : { kind, participant: selected[0] };
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Не удалось добавить участника");
      await onSaved(); onClose();
    } catch (cause) { setError((cause as Error).message); }
    finally { setSaving(false); }
  }
  return <CrmDialog title="Добавить пробного участника" description="Участник будет добавлен в открытое занятие." onClose={() => { if (!saving) onClose(); }} width={560}>
    <div style={{ display: "grid", gap: 14 }}>
      <label><input type="radio" checked={kind === "existing"} onChange={() => setKind("existing")} disabled={saving} /> Выбрать ученика или лида</label>
      <label><input type="radio" checked={kind === "new"} onChange={() => setKind("new")} disabled={saving} /> Новый ребёнок</label>
      {kind === "existing" ? (loading ? <p>Загрузка…</p> : <TrialSubjectPicker options={options} selected={selected} onChange={items => setSelected(items.slice(-1))} />) : <>
        <label>Имя ребёнка *<input aria-label="Имя ребёнка" className="form-input" value={childName} maxLength={150} onChange={e => setChildName(e.target.value)} disabled={saving} /></label>
        <label>Имя родителя<input aria-label="Имя родителя" className="form-input" value={parentName} maxLength={150} onChange={e => setParentName(e.target.value)} disabled={saving} /></label>
        <label>Телефон родителя<input aria-label="Телефон родителя" className="form-input" type="tel" value={parentPhone} maxLength={40} onChange={e => setParentPhone(e.target.value)} disabled={saving} /></label>
        <small>Создадим заявку для нового ребёнка и запишем на пробное. Контакты можно дополнить позже в CRM.</small>
      </>}
      {error && <p role="alert" style={{ color: "var(--color-danger)" }}>{error}</p>}
      <Button variant="primary-crm" disabled={saving || (kind === "existing" ? loading || !selected.length : childName.trim().length < 2)} onClick={() => void save()}>{saving ? "Добавляем…" : "Добавить на пробное"}</Button>
    </div>
  </CrmDialog>;
}
