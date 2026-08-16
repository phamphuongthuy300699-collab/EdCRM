"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@robotics-crm/ui";
import { ArrowLeft, Calendar, Clock, MapPin } from "lucide-react";
import { LessonConductPanel } from "@/features/scheduling/LessonConductPanel";
import type { AttendanceRosterRow } from "@/features/scheduling/AttendanceRoster";
import { allAttendanceMarked } from "@/features/scheduling/domain";
import { useActionConfirmation } from "@/shared/ui/useActionConfirmation";

export default function LessonConductPage() {
  const params = useParams();
  const sessionId = String(params.sessionId || "");
  const { askAction, modal } = useActionConfirmation();
  const [data, setData] = useState<any | null>(null);
  const [rows, setRows] = useState<AttendanceRosterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/crm/schedule/session/${sessionId}`);
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Не удалось открыть занятие");
      setData(payload);
      setRows(payload.rows || []);
    } catch (cause) {
      setData(null);
      setRows([]);
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { if (sessionId) void load(); }, [load, sessionId]);

  async function postAction(body: Record<string, unknown>) {
    const response = await fetch("/api/crm/schedule", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || "Операция не выполнена");
    return payload;
  }

  async function startSession() {
    if (!data || starting || data.session.status !== "planned") return;
    setStarting(true);
    setError("");
    try {
      await postAction({ action: "start_session", sessionId });
      setData((current: any) => ({ ...current, session: { ...current.session, status: "live", materials_unlocked: true } }));
      setMessage("Занятие начато");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setStarting(false);
    }
  }

  async function saveAttendance() {
    if (!data || saving || completing) return;
    setSaving(true);
    setError("");
    try {
      await postAction({ action: "save_attendance", sessionId, records: rows.map((row) => ({ studentId: row.studentId, status: row.status, comment: row.comment, absenceReason: row.absenceReason || "" })) });
      setMessage("Посещаемость сохранена");
    } catch (cause) {
      setError((cause as Error).message);
      throw cause;
    } finally {
      setSaving(false);
    }
  }

  async function completeSession() {
    if (!data || completing || data.session.status !== "live" || !allAttendanceMarked(rows)) return;
    const allowed = await askAction({ title: "Завершить занятие", description: "Посещаемость будет сохранена, а занятие станет проведённым.", dangerLevel: "warning", confirmText: "Завершить" });
    if (!allowed) return;
    setCompleting(true);
    setError("");
    try {
      await postAction({ action: "save_attendance", sessionId, records: rows.map((row) => ({ studentId: row.studentId, status: row.status, comment: row.comment, absenceReason: row.absenceReason || "" })) });
      await postAction({ action: "complete_session", sessionId });
      await load();
      setMessage("Занятие завершено");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setCompleting(false);
    }
  }

  async function assignHomework(homeworkTemplateId: string, dueAt: string | null) {
    const response = await fetch(`/api/crm/schedule/session/${sessionId}/homework`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ homeworkTemplateId, dueAt }) });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || "Не удалось назначить домашнее задание");
    setData((current: any) => ({ ...current, assignments: [...(current.assignments || []), payload.assignment] }));
    setMessage("Домашнее задание назначено");
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Загрузка панели занятия…</div>;
  if (!data) return <div style={{ padding: 40 }}><p role="alert" style={{ color: "var(--color-danger)" }}>{error || "Занятие не найдено"}</p><Link href="/crm/lessons">Вернуться в расписание</Link></div>;

  const session = data.session;
  const startsAt = new Date(session.starts_at);
  return (
    <div style={{ display: "grid", gap: 22 }}>
      <Link href="/crm/lessons" style={{ display: "inline-flex", gap: 6, alignItems: "center", color: "var(--color-text-muted)" }}><ArrowLeft size={14} /> Назад к расписанию</Link>
      <header className="card-crm" style={{ background: "white", display: "grid", gap: 12 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><h1 style={{ margin: 0 }}>{session.groups?.title || "Занятие"}</h1><div style={{ display: "flex", gap: 14, flexWrap: "wrap", color: "var(--color-text-muted)", marginTop: 8 }}><span><Calendar size={14} /> {startsAt.toLocaleDateString("ru-RU")}</span><span><Clock size={14} /> {startsAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span><span><MapPin size={14} /> {session.rooms?.name || "Кабинет не назначен"}</span></div></div><span className={`badge ${session.status === "completed" ? "badge-green" : session.status === "live" ? "badge-amber" : "badge-blue"}`}>{session.status === "completed" ? "Проведено" : session.status === "live" ? "Идёт урок" : "Запланировано"}</span></div>{session.status === "planned" && <Button variant="primary-crm" disabled={starting} onClick={() => void startSession()}>{starting ? "Начинаем…" : "Начать занятие"}</Button>}</header>
      {error && <div role="alert" style={{ color: "var(--color-danger)", fontWeight: 700 }}>{error}</div>}
      <LessonConductPanel data={data} rows={rows} readOnly={session.status === "completed"} onRowsChange={setRows} onSaveAttendance={saveAttendance} onComplete={completeSession} onAssignHomework={data.canAssignHomework ? assignHomework : undefined} saving={saving} completing={completing} message={message} />
      {modal}
    </div>
  );
}
