"use client";

import { Button } from "@robotics-crm/ui";
import { CalendarDays, Clock, MapPin, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AttendanceRoster, type AttendanceRosterRow } from "@/features/scheduling/AttendanceRoster";
import { allAttendanceMarked } from "@/features/scheduling/domain";
import { isDemoMode } from "@/shared/utils/demo";

type TeacherSession = {
  id: string;
  teacher_id?: string | null;
  starts_at: string;
  ends_at?: string | null;
  status: "planned" | "live" | "completed" | "cancelled" | "moved";
  session_kind?: string;
  groups?: { title?: string } | null;
  rooms?: { name?: string } | null;
  studentCount?: number;
};

const demoSessions: TeacherSession[] = [
  { id: "demo-session-1", starts_at: new Date(new Date().setHours(17, 0, 0, 0)).toISOString(), ends_at: new Date(new Date().setHours(18, 30, 0, 0)).toISOString(), status: "planned", session_kind: "regular", groups: { title: "LEGO Start" }, rooms: { name: "Кабинет 2" }, studentCount: 8 },
  { id: "demo-session-2", starts_at: new Date(new Date().setHours(19, 0, 0, 0)).toISOString(), ends_at: new Date(new Date().setHours(20, 30, 0, 0)).toISOString(), status: "planned", session_kind: "regular", groups: { title: "Scratch" }, rooms: { name: "Компьютерный класс" }, studentCount: 6 },
];
const demoRows: AttendanceRosterRow[] = Array.from({ length: 8 }, (_, index) => ({ studentId: `demo-student-${index + 1}`, studentName: `Ученик ${index + 1}`, status: "unmarked", comment: "", absenceReason: "", isMakeup: index === 7 }));

function dateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export default function TeacherPage() {
  const demo = isDemoMode();
  const [sessions, setSessions] = useState<TeacherSession[]>([]);
  const [selected, setSelected] = useState<TeacherSession | null>(null);
  const [rows, setRows] = useState<AttendanceRosterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError("");
    if (demo) {
      setSessions(demoSessions);
      setLoading(false);
      return;
    }
    try {
      const today = dateKey();
      // Server API enforces teacher_id = auth.uid(); production never substitutes demo sessions.
      const response = await fetch(`/api/crm/schedule?dateFrom=${today}&dateTo=${today}`);
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Не удалось загрузить занятия");
      setSessions(payload.sessions || []);
    } catch (cause) {
      setSessions([]);
      setError((cause as Error).message || "Не удалось загрузить занятия");
    } finally {
      setLoading(false);
    }
  }, [demo]);

  useEffect(() => { void loadSessions(); }, [loadSessions]);

  const openSession = async (session: TeacherSession) => {
    setSelected(session);
    setMessage("");
    setError("");
    if (demo) { setRows(demoRows); return; }
    try {
      setLoadingRoster(true);
      const response = await fetch(`/api/crm/schedule/session/${session.id}`);
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Не удалось открыть журнал");
      setSelected(payload.session);
      setRows(payload.rows || []);
    } catch (cause) {
      setRows([]);
      setError((cause as Error).message);
    } finally {
      setLoadingRoster(false);
    }
  };

  const postAction = async (body: Record<string, unknown>) => {
    const response = await fetch("/api/crm/schedule", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || "Операция не выполнена");
    return payload;
  };

  const startSession = async () => {
    if (!selected || starting || selected.status !== "planned") return;
    setStarting(true); setError(""); setMessage("");
    try {
      if (!demo) await postAction({ action: "start_session", sessionId: selected.id });
      const live = { ...selected, status: "live" as const };
      setSelected(live);
      setSessions((current) => current.map((session) => session.id === live.id ? live : session));
      setMessage("Занятие начато. Материалы открыты ученикам.");
    } catch (cause) { setError((cause as Error).message); } finally { setStarting(false); }
  };

  const saveAttendance = async () => {
    if (!selected || saving || completing) return;
    setSaving(true); setError(""); setMessage("");
    try {
      if (!demo) await postAction({ action: "save_attendance", sessionId: selected.id, records: rows.map((row) => ({ studentId: row.studentId, status: row.status, comment: row.comment, absenceReason: row.absenceReason || "" })) });
      setMessage("Посещаемость сохранена");
    } catch (cause) { setError((cause as Error).message); throw cause; } finally { setSaving(false); }
  };

  const completeSession = async () => {
    if (!selected || completing || saving || selected.status !== "live" || !allAttendanceMarked(rows)) return;
    setCompleting(true); setError(""); setMessage("");
    try {
      if (!demo) {
        await postAction({ action: "save_attendance", sessionId: selected.id, records: rows.map((row) => ({ studentId: row.studentId, status: row.status, comment: row.comment, absenceReason: row.absenceReason || "" })) });
        await postAction({ action: "complete_session", sessionId: selected.id });
      }
      const completed = { ...selected, status: "completed" as const };
      setSelected(completed);
      setSessions((current) => current.map((session) => session.id === completed.id ? completed : session));
      setMessage("Занятие завершено");
    } catch (cause) { setError((cause as Error).message); } finally { setCompleting(false); }
  };

  const nextSession = useMemo(() => sessions.find((session) => session.status === "live") || sessions.find((session) => session.status === "planned"), [sessions]);
  const todayLabel = new Date().toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow", weekday: "long", day: "numeric", month: "long" });

  if (loading) return <main style={{ maxWidth: 820, margin: "0 auto", padding: 20 }}>Загрузка занятий…</main>;

  return (
    <main className="teacher-mobile-home" style={{ width: "100%", maxWidth: 820, margin: "0 auto", padding: "16px clamp(12px, 3vw, 24px) 80px", display: "grid", gap: 18, minWidth: 0 }}>
      <header><span style={{ fontSize: 12, color: "var(--color-text-muted)", textTransform: "capitalize" }}>{todayLabel}</span><h1 style={{ fontSize: 28, margin: "4px 0 0" }}>Сегодня</h1></header>
      {error && <div role="alert" style={{ padding: 12, borderRadius: 10, background: "var(--color-danger-soft)", color: "var(--color-danger)", fontWeight: 700 }}>{error}</div>}

      {nextSession && !selected && <section className="card-crm" style={{ background: "var(--color-primary-soft)", borderColor: "var(--color-primary)", display: "grid", gap: 14 }}><span style={{ fontSize: 11, fontWeight: 800, color: "var(--color-primary)", textTransform: "uppercase" }}>Следующее занятие</span><div><strong style={{ fontSize: 22 }}>{new Date(nextSession.starts_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} · {nextSession.groups?.title || "Группа"}</strong><div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8, color: "var(--color-text-muted)", fontSize: 13 }}><span><MapPin size={14} /> {nextSession.rooms?.name || "Кабинет не назначен"}</span><span><Users size={14} /> {nextSession.studentCount ?? "—"} учеников</span></div></div><Button variant="primary-crm" onClick={() => void openSession(nextSession)} style={{ minHeight: 48 }}>Открыть занятие</Button></section>}

      {!selected && <section style={{ display: "grid", gap: 10 }}><h2 style={{ fontSize: 18, margin: 0 }}>Сегодня</h2>{sessions.length === 0 && <div className="card-crm" style={{ background: "white", color: "var(--color-text-muted)", textAlign: "center", padding: 28 }}>На сегодня занятий нет</div>}{sessions.map((session) => <button key={session.id} type="button" onClick={() => void openSession(session)} style={{ width: "100%", minHeight: 76, padding: 14, border: "1px solid var(--color-border)", borderRadius: 12, background: "white", display: "grid", gridTemplateColumns: "60px 1fr auto", gap: 12, alignItems: "center", textAlign: "left", cursor: "pointer" }}><strong style={{ fontSize: 16 }}><Clock size={14} /> {new Date(session.starts_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</strong><span><strong style={{ display: "block" }}>{session.groups?.title || "Группа"}</strong><small style={{ color: "var(--color-text-muted)" }}>{session.rooms?.name || "Кабинет не назначен"}</small></span><span className={`badge ${session.status === "completed" ? "badge-green" : session.status === "live" ? "badge-amber" : "badge-blue"}`}>{session.status === "completed" ? "Завершено" : session.status === "live" ? "Идёт" : "План"}</span></button>)}</section>}

      {selected && <section style={{ display: "grid", gap: 14, minWidth: 0 }}><button type="button" onClick={() => { setSelected(null); setRows([]); setMessage(""); }} style={{ minHeight: 44, justifySelf: "start", border: 0, background: "transparent", color: "var(--color-primary)", fontWeight: 750, cursor: "pointer" }}>← Все занятия</button><div className="card-crm" style={{ background: "white", display: "grid", gap: 10 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div><span style={{ color: "var(--color-text-muted)", fontSize: 12 }}>{new Date(selected.starts_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span><h2 style={{ margin: "3px 0 0", fontSize: 21 }}>{selected.groups?.title || "Занятие"}</h2></div><span className={`badge ${selected.status === "completed" ? "badge-green" : selected.status === "live" ? "badge-amber" : "badge-blue"}`}>{selected.status === "completed" ? "Завершено" : selected.status === "live" ? "Идёт" : "Запланировано"}</span></div>{selected.status === "planned" && <Button variant="primary-crm" disabled={starting} onClick={() => void startSession()} style={{ minHeight: 48 }}>{starting ? "Начинаем…" : "Начать занятие"}</Button>}</div>{loadingRoster ? <div className="card-crm">Загрузка журнала…</div> : <div className="card-crm" style={{ background: "white", minWidth: 0 }}><AttendanceRoster rows={rows} onChange={setRows} disabled={selected.status === "completed"} onSave={saveAttendance} onComplete={completeSession} saving={saving} completing={completing} sessionStatus={selected.status} message={message} /></div>}</section>}
      <style jsx>{`svg { vertical-align: middle; } @media (max-width: 520px) { .teacher-mobile-home { overflow-x: clip; } }`}</style>
    </main>
  );
}
