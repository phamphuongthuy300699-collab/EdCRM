"use client";

import { useState } from "react";
import { Button } from "@robotics-crm/ui";
import { AttendanceRoster, type AttendanceRosterRow } from "./AttendanceRoster";

type LessonConductData = {
  session: any;
  materials: any[];
  homeworkTemplates: any[];
  assignments: any[];
  payroll?: any | null;
};

export function LessonConductPanel({
  data,
  rows,
  readOnly,
  onRowsChange,
  onSaveAttendance,
  onComplete,
  onAssignHomework,
  saving,
  completing,
  message,
}: {
  data: LessonConductData;
  rows: AttendanceRosterRow[];
  readOnly: boolean;
  onRowsChange: (rows: AttendanceRosterRow[]) => void;
  onSaveAttendance?: () => void | Promise<void>;
  onComplete?: () => void | Promise<void>;
  onAssignHomework?: (templateId: string, dueAt: string | null) => Promise<void>;
  saving?: boolean;
  completing?: boolean;
  message?: string;
}) {
  const [templateId, setTemplateId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [assigning, setAssigning] = useState(false);
  const template = data.session.lesson_templates;

  async function assign(event: React.FormEvent) {
    event.preventDefault();
    if (!onAssignHomework || !templateId || assigning) return;
    setAssigning(true);
    try {
      await onAssignHomework(templateId, dueAt || null);
      setTemplateId("");
      setDueAt("");
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className="lesson-conduct-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, .9fr) minmax(0, 1.1fr)", gap: 20, alignItems: "start" }}>
      <div style={{ display: "grid", gap: 16 }}>
        <section className="card-crm" style={{ background: "white", display: "grid", gap: 12 }}>
          <h3 style={{ margin: 0 }}>Материалы урока</h3>
          <div><strong>{template?.title || data.session.topic || "Тема не задана"}</strong>{template?.description && <p>{template.description}</p>}{template?.goals && <p><strong>Цели:</strong> {template.goals}</p>}{template?.plan && <p><strong>План:</strong> {template.plan}</p>}{template?.equipment && <p><strong>Оборудование:</strong> {template.equipment}</p>}</div>
          {data.materials.map((material) => <div key={material.id} style={{ padding: 10, border: "1px solid var(--color-border)", borderRadius: 8 }}><strong>{material.title}</strong>{material.content && <p style={{ whiteSpace: "pre-wrap" }}>{material.content}</p>}{material.external_url && <a href={material.external_url} target="_blank" rel="noreferrer">Открыть материал</a>}{material.file_url && <a href={material.file_url} target="_blank" rel="noreferrer">Скачать файл</a>}</div>)}
          {!data.materials.length && <span style={{ color: "var(--color-text-muted)" }}>Материалы не прикреплены.</span>}
        </section>

        <section className="card-crm" style={{ background: "white", display: "grid", gap: 12 }}>
          <h3 style={{ margin: 0 }}>Домашнее задание</h3>
          {!readOnly && onAssignHomework && <form onSubmit={assign} style={{ display: "grid", gap: 10 }}><select className="form-input" value={templateId} onChange={(event) => setTemplateId(event.target.value)} required><option value="">Выберите опубликованный шаблон</option>{data.homeworkTemplates.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><input className="form-input" type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /><Button type="submit" variant="primary-crm" disabled={assigning}>{assigning ? "Назначаем…" : "Назначить группе"}</Button></form>}
          {data.assignments.map((assignment) => <div key={assignment.id} style={{ padding: "9px 0", borderTop: "1px solid var(--color-border)" }}><strong>{assignment.homework_templates?.title || "Задание"}</strong><small style={{ display: "block", color: "var(--color-text-muted)" }}>Срок: {assignment.due_at ? new Date(assignment.due_at).toLocaleDateString("ru-RU") : "без срока"}</small></div>)}
          {!data.assignments.length && <span style={{ color: "var(--color-text-muted)" }}>Домашнее задание пока не выдано.</span>}
        </section>
        {data.payroll && <section className="card-crm" style={{ background: "white" }}><strong>Начисление: {Number(data.payroll.amount).toLocaleString("ru-RU")} ₽</strong><small style={{ display: "block", color: "var(--color-text-muted)" }}>{data.payroll.pay_mode === "per_lesson" ? "За занятие" : "За посещение"}</small></section>}
      </div>

      <section className="card-crm" style={{ background: "white", minWidth: 0 }}>
        <h3 style={{ marginTop: 0 }}>Журнал посещаемости</h3>
        <AttendanceRoster rows={rows} onChange={onRowsChange} disabled={readOnly || data.session.status !== "live"} onSave={readOnly ? undefined : onSaveAttendance} onComplete={readOnly ? undefined : onComplete} saving={saving} completing={completing} sessionStatus={data.session.status} message={message} />
      </section>
      <style jsx>{`@media (max-width: 760px) { .lesson-conduct-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
