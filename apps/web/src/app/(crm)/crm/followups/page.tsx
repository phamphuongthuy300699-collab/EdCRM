"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@robotics-crm/ui";
import { CheckCircle2, Phone } from "lucide-react";
import { CrmDialog } from "@/shared/ui/CrmDialog";

type Followup = {
  interaction_id: string;
  guardian_id?: string;
  student_id?: string;
  lead_id?: string;
  next_action_at: string;
  summary?: string;
  guardian?: { full_name: string; phone?: string; status: string };
  student?: { full_name: string; status: string };
};

const groups = [
  { id: "overdue", label: "Просрочено" },
  { id: "today", label: "Сегодня" },
  { id: "week", label: "Следующие 7 дней" },
  { id: "later", label: "Позже" },
];

function bucket(value: string) {
  const date = new Date(value);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const week = new Date(today);
  week.setDate(today.getDate() + 8);
  if (date < today) return "overdue";
  if (date < tomorrow) return "today";
  if (date < week) return "week";
  return "later";
}

export default function FollowupsPage() {
  const [items, setItems] = useState<Followup[]>([]);
  const [active, setActive] = useState("overdue");
  const [message, setMessage] = useState("");
  const [action, setAction] = useState<Followup | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ result: "answered", summary: "", nextActionAt: "" });

  const load = useCallback(async () => {
    const response = await fetch("/api/crm/followups");
    const payload = await response.json();
    if (response.ok && payload.ok) setItems(payload.followups || []);
    else setMessage(payload.error || "Не удалось загрузить касания");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  const visible = useMemo(() => items.filter((item) => bucket(item.next_action_at) === active), [items, active]);

  async function complete(id: string) {
    setSaving(true);
    const response = await fetch("/api/crm/interactions", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ interactionId: id }),
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok) return setMessage(payload.error || "Не удалось завершить follow-up");
    setMessage("Follow-up завершён");
    await load();
  }

  async function saveCall(event: React.FormEvent) {
    event.preventDefault();
    if (!action || saving) return;
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/crm/interactions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        guardianId: action.guardian_id || null,
        studentId: action.student_id || null,
        leadId: action.lead_id || null,
        type: "call",
        result: form.result,
        summary: form.summary || null,
        nextActionAt: form.nextActionAt ? new Date(form.nextActionAt).toISOString() : null,
        completeInteractionId: action.interaction_id,
      }),
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok) return setMessage(payload.error || "Не удалось сохранить звонок");
    setAction(null);
    setForm({ result: "answered", summary: "", nextActionAt: "" });
    setMessage("Звонок сохранён, предыдущий follow-up закрыт");
    await load();
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div>
        <h1 style={{ margin: 0 }}>Повторные касания</h1>
        <p style={{ color: "var(--color-text-muted)" }}>
          Очередь звонков и сообщений. «Не связываться» исключены автоматически.
        </p>
      </div>
      {message && <div className="card-crm" style={{ padding: 12 }}>{message}</div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {groups.map((group) => (
          <button
            key={group.id}
            onClick={() => setActive(group.id)}
            className="form-input"
            style={{
              width: "auto",
              fontWeight: 700,
              background: active === group.id ? "var(--color-primary-soft)" : "#fff",
            }}
          >
            {group.label} · {items.filter((item) => bucket(item.next_action_at) === group.id).length}
          </button>
        ))}
      </div>
      <div className="crm-followup-grid" style={{ display: "grid", gap: 12 }}>
        {visible.length === 0 ? (
          <div className="card-crm" style={{ padding: 24 }}>Нет запланированных касаний</div>
        ) : visible.map((item) => (
          <article
            key={item.interaction_id}
            className="card-crm"
            style={{
              padding: 16,
              background: "#fff",
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) auto",
              gap: 16,
            }}
          >
            <div>
              <strong>{item.guardian?.full_name || item.student?.full_name || "Контакт"}</strong>
              <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                {item.guardian?.phone || "Телефон не указан"} · {item.guardian?.status || item.student?.status}
              </div>
              <p style={{ margin: "8px 0 0" }}>{item.summary || "Связаться с клиентом"}</p>
              <small>{new Date(item.next_action_at).toLocaleString("ru-RU")}</small>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Button variant="secondary-crm" disabled={saving} onClick={() => setAction(item)}>
                <Phone size={14} /> Позвонили
              </Button>
              <Button variant="primary-crm" disabled={saving} onClick={() => complete(item.interaction_id)}>
                <CheckCircle2 size={14} /> Завершить follow-up
              </Button>
            </div>
          </article>
        ))}
      </div>
      {action && (
        <CrmDialog
          title="Результат звонка"
          description="Сохранение атомарно закроет текущий follow-up"
          onClose={() => !saving && setAction(null)}
          width={520}
        >
          <form onSubmit={saveCall} style={{ display: "grid", gap: 12 }}>
            <select
              className="form-input"
              value={form.result}
              onChange={(event) => setForm({ ...form, result: event.target.value })}
            >
              <option value="answered">Ответил</option>
              <option value="no_answer">Не дозвонились</option>
              <option value="interested">Интересуется</option>
              <option value="thinking">Думает</option>
              <option value="rejected">Отказ</option>
            </select>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Итог / заметка"
              value={form.summary}
              onChange={(event) => setForm({ ...form, summary: event.target.value })}
            />
            <label style={{ fontWeight: 700, fontSize: 13 }}>
              Следующий контакт (необязательно)
              <input
                className="form-input"
                type="datetime-local"
                value={form.nextActionAt}
                onChange={(event) => setForm({ ...form, nextActionAt: event.target.value })}
              />
            </label>
            <div className="crm-dialog-actions">
              <Button type="button" variant="secondary-crm" disabled={saving} onClick={() => setAction(null)}>
                Отмена
              </Button>
              <Button type="submit" variant="primary-crm" disabled={saving}>
                {saving ? "Сохранение…" : "Сохранить звонок"}
              </Button>
            </div>
          </form>
        </CrmDialog>
      )}
      <style jsx>{`
        @media (max-width: 640px) {
          .crm-followup-grid article { grid-template-columns: 1fr !important; }
          .crm-followup-grid article > div:last-child { flex-wrap: wrap; }
        }
      `}</style>
    </div>
  );
}
