"use client";

import type { AttendanceStatus } from "./domain";

export type AttendanceRosterRow = {
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  comment: string;
  absenceReason?: string;
  isMakeup?: boolean;
};

const options: Array<{ value: AttendanceStatus; label: string }> = [
  { value: "unmarked", label: "Не отмечено" },
  { value: "present", label: "Присутствовал" },
  { value: "late", label: "Опоздал" },
  { value: "absent_excused", label: "Пропуск уважительный" },
  { value: "absent_unexcused", label: "Пропуск без причины" },
];

export function AttendanceRoster({ rows, disabled = false, onChange }: {
  rows: AttendanceRosterRow[];
  disabled?: boolean;
  onChange: (rows: AttendanceRosterRow[]) => void;
}) {
  const update = (studentId: string, patch: Partial<AttendanceRosterRow>) => {
    onChange(rows.map((row) => row.studentId === studentId ? { ...row, ...patch } : row));
  };

  if (!rows.length) {
    return <p style={{ color: "var(--color-text-muted)", padding: "24px 0", textAlign: "center" }}>В занятии пока нет учеников.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {rows.map((row) => {
        const absent = row.status === "absent_excused" || row.status === "absent_unexcused";
        return (
          <div key={row.studentId} style={{ border: "1px solid var(--color-border)", borderRadius: 12, padding: 16, background: absent ? "var(--color-danger-soft)" : "white" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 750 }}>{row.studentName}</div>
                {row.isMakeup && <span className="badge badge-amber" style={{ marginTop: 5 }}>Отработка</span>}
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11, color: "var(--color-text-muted)" }}>
                Статус посещения
                <select className="form-input" value={row.status} disabled={disabled} onChange={(event) => update(row.studentId, { status: event.target.value as AttendanceStatus })} style={{ height: 40 }}>
                  {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              {absent && (
                <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11, color: "var(--color-text-muted)" }}>
                  Причина пропуска
                  <input className="form-input" value={row.absenceReason || ""} disabled={disabled} onChange={(event) => update(row.studentId, { absenceReason: event.target.value })} placeholder="Причина для родителя и администратора" style={{ height: 40 }} />
                </label>
              )}
              <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11, color: "var(--color-text-muted)" }}>
                Комментарий преподавателя
                <input className="form-input" value={row.comment} disabled={disabled} onChange={(event) => update(row.studentId, { comment: event.target.value })} placeholder="Что получилось на занятии" style={{ height: 40 }} />
              </label>
            </div>
          </div>
        );
      })}
    </div>
  );
}
