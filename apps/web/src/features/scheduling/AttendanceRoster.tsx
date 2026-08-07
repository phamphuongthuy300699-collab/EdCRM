"use client";

import { useState } from "react";
import { allAttendanceMarked, markAllPresent, type AttendanceStatus } from "./domain";

export type AttendanceRosterRow = {
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  comment: string;
  absenceReason?: string;
  isMakeup?: boolean;
};

export function AttendanceRoster({ rows, disabled = false, onChange, onSave, onComplete, saving = false, completing = false, sessionStatus, message }: {
  rows: AttendanceRosterRow[];
  disabled?: boolean;
  onChange: (rows: AttendanceRosterRow[]) => void;
  onSave?: () => void | Promise<void>;
  onComplete?: () => void | Promise<void>;
  saving?: boolean;
  completing?: boolean;
  sessionStatus?: string;
  message?: string;
}) {
  const [commentOpen, setCommentOpen] = useState<Set<string>>(new Set());
  const [absenceOpen, setAbsenceOpen] = useState<Set<string>>(new Set());
  const update = (studentId: string, patch: Partial<AttendanceRosterRow>) => onChange(rows.map((row) => row.studentId === studentId ? { ...row, ...patch } : row));
  const marked = rows.filter((row) => row.status !== "unmarked").length;
  const hasPendingAbsence = absenceOpen.size > 0;
  const canComplete = sessionStatus === "live" && allAttendanceMarked(rows) && !hasPendingAbsence && !saving && !completing;

  const bulkPresent = () => {
    if (disabled) return;
    const hasManualMarks = rows.some((row) => row.status !== "unmarked");
    if (hasManualMarks && !window.confirm("Заменить уже сделанные отметки на «Был» для всех учеников?")) return;
    setAbsenceOpen(new Set());
    onChange(markAllPresent(rows));
  };

  const selectStatus = (row: AttendanceRosterRow, status: AttendanceStatus) => {
    setAbsenceOpen((current) => {
      const next = new Set(current);
      next.delete(row.studentId);
      return next;
    });
    update(row.studentId, { status });
  };

  const statusButton = (row: AttendanceRosterRow, status: AttendanceStatus, label: string, ariaLabel = label) => {
    const selected = row.status === status;
    return <button type="button" disabled={disabled} aria-label={ariaLabel} aria-pressed={selected} onClick={() => selectStatus(row, status)} style={{ minHeight: 44, padding: "8px 12px", borderRadius: 9, border: selected ? "2px solid var(--color-primary)" : "1px solid var(--color-border)", background: selected ? "var(--color-primary-soft)" : "white", color: selected ? "var(--color-primary-dark)" : "var(--color-text)", fontWeight: 750, cursor: disabled ? "default" : "pointer" }}>{label}</button>;
  };

  return (
    <div className="attendance-roster" style={{ display: "grid", gap: 12, minWidth: 0 }}>
      {!disabled && <button type="button" onClick={bulkPresent} style={{ minHeight: 44, justifySelf: "start", padding: "8px 14px", border: "1px solid var(--color-primary)", borderRadius: 9, background: "var(--color-primary-soft)", color: "var(--color-primary-dark)", fontWeight: 750, cursor: "pointer" }}>Отметить всех присутствующими</button>}
      {!rows.length && <p style={{ color: "var(--color-text-muted)", padding: "24px 0", textAlign: "center" }}>В занятии пока нет учеников.</p>}
      {rows.map((row) => {
        const absent = absenceOpen.has(row.studentId) || row.status === "absent_excused" || row.status === "absent_unexcused";
        const showComment = commentOpen.has(row.studentId) || Boolean(row.comment);
        return (
          <article key={row.studentId} style={{ minWidth: 0, border: "1px solid var(--color-border)", borderRadius: 12, padding: 14, background: absent ? "var(--color-danger-soft)" : "white", display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><strong style={{ overflowWrap: "anywhere" }}>{row.studentName}</strong><span style={{ display: "flex", gap: 6 }}>{row.status === "unmarked" && <span className="badge badge-gray">Не отмечено</span>}{row.isMakeup && <span className="badge badge-amber">Отработка</span>}</span></div>
            <div className="attendance-primary-actions" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 7 }}>
              {statusButton(row, "present", "Был")}
              {statusButton(row, "late", "Опоздал")}
              <button type="button" disabled={disabled} aria-label="Нет" aria-pressed={absent} onClick={() => { setAbsenceOpen((current) => new Set(current).add(row.studentId)); update(row.studentId, { status: "unmarked" }); }} style={{ minHeight: 44, padding: "8px 12px", borderRadius: 9, border: absent ? "2px solid var(--color-primary)" : "1px solid var(--color-border)", background: absent ? "var(--color-primary-soft)" : "white", color: absent ? "var(--color-primary-dark)" : "var(--color-text)", fontWeight: 750, cursor: disabled ? "default" : "pointer" }}>Нет</button>
            </div>
            {absent && <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 7 }}>{statusButton(row, "absent_excused", "Уважительно", "Пропуск уважительный")}{statusButton(row, "absent_unexcused", "Без причины", "Пропуск без причины")}</div>}
            {absent && <label style={{ display: "grid", gap: 5, fontSize: 12, color: "var(--color-text-muted)" }}>Причина (необязательно)<input className="form-input" value={row.absenceReason || ""} disabled={disabled} onChange={(event) => update(row.studentId, { absenceReason: event.target.value })} placeholder="Например: заболел" style={{ minHeight: 44 }} /></label>}
            {!showComment && !disabled && <button type="button" onClick={() => setCommentOpen((current) => new Set(current).add(row.studentId))} style={{ minHeight: 44, justifySelf: "start", border: 0, background: "transparent", color: "var(--color-primary)", fontWeight: 700, cursor: "pointer" }}>+ Комментарий</button>}
            {showComment && <label style={{ display: "grid", gap: 5, fontSize: 12, color: "var(--color-text-muted)" }}>Комментарий преподавателя<input className="form-input" value={row.comment} disabled={disabled} onChange={(event) => update(row.studentId, { comment: event.target.value })} placeholder="Что важно передать администратору" style={{ minHeight: 44 }} /></label>}
          </article>
        );
      })}
      {(onSave || onComplete) && <div className="attendance-sticky-footer" style={{ position: "sticky", bottom: 0, zIndex: 10, margin: "4px -16px -16px", padding: "12px 16px max(12px, env(safe-area-inset-bottom))", borderTop: "1px solid var(--color-border)", background: "rgba(255,255,255,.96)", backdropFilter: "blur(8px)", display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "center" }}><strong style={{ fontSize: 12 }}>Отмечено {marked} из {rows.length}</strong>{onSave && <button type="button" disabled={saving || completing || disabled || hasPendingAbsence} onClick={() => void onSave()} style={{ minHeight: 44, padding: "8px 14px", border: "1px solid var(--color-primary)", borderRadius: 9, background: "white", color: "var(--color-primary)", fontWeight: 750 }}>Сохранить</button>}{onComplete && <button type="button" disabled={!canComplete} onClick={() => void onComplete()} style={{ minHeight: 44, padding: "8px 14px", border: 0, borderRadius: 9, background: canComplete ? "var(--color-primary)" : "var(--color-border)", color: canComplete ? "white" : "var(--color-text-muted)", fontWeight: 750 }}>{completing ? "Завершаем…" : "Завершить занятие"}</button>}</div>}
      {message && <div role="status" style={{ color: "var(--color-success)", fontSize: 13, fontWeight: 750 }}>{message}</div>}
      <style jsx>{`@media (max-width: 520px) { .attendance-roster article { scroll-margin-bottom: 132px; } .attendance-sticky-footer { grid-template-columns: 1fr 1fr !important; } .attendance-sticky-footer strong { grid-column: 1 / -1; } }`}</style>
    </div>
  );
}
