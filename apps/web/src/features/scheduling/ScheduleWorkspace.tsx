"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@robotics-crm/ui";
import { Bell, ChevronLeft, ChevronRight, MapPin, Plus, RefreshCw, UserRound } from "lucide-react";
import { CrmDialog } from "@/shared/ui/CrmDialog";
import { groupOperationalSessions, type ScheduleView } from "./domain";
import { TrialDialog } from "@/features/trials/TrialDialog";
import { TrialParticipantList } from "@/features/trials/TrialParticipantList";
import { scheduleCapacityLabel } from "@/features/trials/domain";
import type { TrialParticipantDto } from "@/features/trials/contracts";

type Period = "today" | "week";

type Session = {
  id: string;
  group_id?: string;
  teacher_id?: string | null;
  room_id?: string | null;
  starts_at: string;
  ends_at?: string | null;
  status: string;
  session_kind?: string;
  change_reason?: string | null;
  notification_status?: string;
  groups?: { title?: string; branch_id?: string | null; capacity?: number | null } | null;
  courses?: { title?: string } | null;
  profiles?: { full_name?: string } | null;
  rooms?: { name?: string } | null;
  studentCount?: number;
  trialParticipantCount?: number;
};

type StandaloneTrial = {
  id: string;
  mode: "standalone";
  teacher_id: string;
  branch_id: string;
  room_id: string | null;
  starts_at: string;
  ends_at: string;
  profiles?: { full_name?: string } | null;
  branches?: { name?: string } | null;
  rooms?: { name?: string; capacity?: number | null } | null;
  participants: TrialParticipantDto[];
  trialParticipantCount: number;
};

type Makeup = { id: string; student_id: string; target_session_id?: string | null; status: string; notes?: string | null; students?: { full_name?: string } | null };

const statusLabel: Record<string, string> = { planned: "Запланировано", live: "Идёт", completed: "Проведено", cancelled: "Отменено", moved: "Перенесено" };

function moscowMonday(value: Date) {
  const current = new Date(`${dateKey(value)}T12:00:00+03:00`);
  const day = current.getUTCDay() || 7;
  current.setUTCDate(current.getUTCDate() - day + 1);
  return current;
}

function dateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function moscowDateTimeInput(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date).replace(" ", "T");
}

export function ScheduleWorkspace({ canManage = true, groupId }: { canManage?: boolean; groupId?: string }) {
  const [week, setWeek] = useState(() => moscowMonday(new Date()));
  const [period, setPeriod] = useState<Period>("week");
  const [view, setView] = useState<ScheduleView>("all");
  const [teacherId, setTeacherId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState(groupId || "");
  const [branchId, setBranchId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [status, setStatus] = useState("");
  const [sessionKind, setSessionKind] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [standaloneTrials, setStandaloneTrials] = useState<StandaloneTrial[]>([]);
  const [groups, setGroups] = useState<Array<{ id: string; title: string; branch_id?: string; teacher_id?: string; room_id?: string; capacity?: number | null }>>([]);
  const [teachers, setTeachers] = useState<Array<{ id: string; name: string }>>([]);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [rooms, setRooms] = useState<Array<{ id: string; name: string; branch_id?: string }>>([]);
  const [makeups, setMakeups] = useState<Makeup[]>([]);
  const [materializeGroupId, setMaterializeGroupId] = useState(groupId || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [change, setChange] = useState<{ type: "reschedule" | "cancel"; session: Session } | null>(null);
  const [changeReason, setChangeReason] = useState("");
  const [newStartsAt, setNewStartsAt] = useState("");
  const [savingChange, setSavingChange] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createGroupId, setCreateGroupId] = useState(groupId || "");
  const [createStartsAt, setCreateStartsAt] = useState("");
  const [createEndsAt, setCreateEndsAt] = useState("");
  const [createKind, setCreateKind] = useState<"regular" | "extra">("extra");
  const [createReason, setCreateReason] = useState("");
  const [savingCreate, setSavingCreate] = useState(false);
  const [notifyCreate, setNotifyCreate] = useState(true);
  const [notifyChange, setNotifyChange] = useState(true);
  const [notificationEvents, setNotificationEvents] = useState<Record<string, boolean>>({});
  const [showTrialDialog, setShowTrialDialog] = useState(false);
  const [trialChange, setTrialChange] = useState<{ type: "update" | "cancel"; trial: StandaloneTrial } | null>(null);
  const [trialTeacherId, setTrialTeacherId] = useState("");
  const [trialBranchId, setTrialBranchId] = useState("");
  const [trialRoomId, setTrialRoomId] = useState("");
  const [trialStartsAt, setTrialStartsAt] = useState("");
  const [trialEndsAt, setTrialEndsAt] = useState("");
  const [trialReason, setTrialReason] = useState("");
  const [savingTrialChange, setSavingTrialChange] = useState(false);
  const days = useMemo(() => period === "today" ? [new Date()] : Array.from({ length: 7 }, (_, index) => new Date(week.getTime() + index * 86400000)), [period, week]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ dateFrom: dateKey(days[0]), dateTo: dateKey(days[days.length - 1]) });
      if (selectedGroupId) params.set("groupId", selectedGroupId);
      if (teacherId) params.set("teacherId", teacherId);
      if (branchId) params.set("branchId", branchId);
      if (roomId) params.set("roomId", roomId);
      if (status) params.set("status", status);
      if (sessionKind) params.set("sessionKind", sessionKind);
      const response = await fetch(`/api/crm/schedule?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось загрузить расписание");
      setSessions(data.sessions || []);
      setStandaloneTrials(data.standaloneTrials || []);
      setGroups(data.groups || []);
      setTeachers(data.teachers || []);
      setBranches(data.branches || []);
      setRooms(data.rooms || []);
      setMakeups(data.makeups || []);
      setNotificationEvents(data.notificationEvents || {});
      setMaterializeGroupId((current) => current || data.groups?.[0]?.id || "");
      setCreateGroupId((current) => current || data.groups?.[0]?.id || "");
    } catch (reason: any) {
      setError(reason.message || "Не удалось загрузить расписание");
    } finally {
      setLoading(false);
    }
  }, [days, selectedGroupId, teacherId, branchId, roomId, status, sessionKind]);

  useEffect(() => { void load(); }, [load]);

  const mutate = async (body: Record<string, unknown>) => {
    const response = await fetch("/api/crm/schedule", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Операция не выполнена");
    await load();
  };

  const openChange = (type: "reschedule" | "cancel", session: Session) => {
    const date = new Date(session.starts_at);
    const parts = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(date).replace(" ", "T");
    setChange({ type, session });
    setNotifyChange(type === "reschedule" ? dataEvent("lesson_rescheduled") : dataEvent("lesson_cancelled"));
    setNewStartsAt(parts);
    setChangeReason(session.change_reason || "");
  };

  const dataEvent = (key: string) => notificationEvents[key] !== false;

  const submitChange = async () => {
    if (!change || !changeReason.trim() || (change.type === "reschedule" && !newStartsAt)) return;
    setSavingChange(true);
    setError("");
    try {
      await mutate(change.type === "reschedule"
        ? { action: "reschedule", sessionId: change.session.id, startsAt: new Date(`${newStartsAt}:00+03:00`).toISOString(), reason: changeReason.trim(), notifyGuardians: notifyChange }
        : { action: "cancel", sessionId: change.session.id, reason: changeReason.trim(), notifyGuardians: notifyChange });
      setChange(null);
    } catch (reason: any) {
      setError(reason.message || "Не удалось изменить занятие");
    } finally {
      setSavingChange(false);
    }
  };

  const materialize = async () => {
    if (!materializeGroupId) return;
    try {
      const dateTo = new Date(days[0].getTime() + 83 * 86400000);
      await mutate({ action: "materialize", groupId: materializeGroupId, dateFrom: dateKey(days[0]), dateTo: dateKey(dateTo) });
    } catch (reason: any) {
      setError(reason.message || "Не удалось сформировать занятия");
    }
  };

  const openCreate = () => {
    const starts = new Date();
    starts.setMinutes(0, 0, 0);
    starts.setHours(starts.getHours() + 1);
    const ends = new Date(starts.getTime() + 90 * 60000);
    setCreateGroupId(materializeGroupId || groups[0]?.id || "");
    setCreateStartsAt(moscowDateTimeInput(starts));
    setCreateEndsAt(moscowDateTimeInput(ends));
    setCreateKind("extra");
    setCreateReason("");
    setNotifyCreate(dataEvent("lesson_scheduled"));
    setCreating(true);
  };

  const submitCreate = async () => {
    if (!createGroupId || !createStartsAt || !createEndsAt) return;
    setSavingCreate(true);
    setError("");
    try {
      await mutate({
        action: "create_session",
        groupId: createGroupId,
        startsAt: new Date(`${createStartsAt}:00+03:00`).toISOString(),
        endsAt: new Date(`${createEndsAt}:00+03:00`).toISOString(),
        kind: createKind,
        reason: createReason.trim() || undefined,
        notifyGuardians: notifyCreate,
      });
      setCreating(false);
    } catch (reason: any) {
      setError(reason.message || "Не удалось добавить занятие");
    } finally {
      setSavingCreate(false);
    }
  };

  const scheduleMakeup = async (makeupAssignmentId: string, targetSessionId: string) => {
    if (!targetSessionId) return;
    try {
      await mutate({ action: "schedule_makeup", makeupAssignmentId, targetSessionId });
    } catch (reason: any) {
      setError(reason.message || "Не удалось назначить отработку");
    }
  };

  const openTrialChange = (type: "update" | "cancel", trial: StandaloneTrial) => {
    setTrialChange({ type, trial });
    setTrialTeacherId(trial.teacher_id);
    setTrialBranchId(trial.branch_id);
    setTrialRoomId(trial.room_id || "");
    setTrialStartsAt(moscowDateTimeInput(new Date(trial.starts_at)));
    setTrialEndsAt(moscowDateTimeInput(new Date(trial.ends_at)));
    setTrialReason("");
  };

  const submitTrialChange = async () => {
    if (!trialChange || savingTrialChange) return;
    setSavingTrialChange(true);
    setError("");
    try {
      const body = trialChange.type === "cancel"
        ? { action: "cancel", reason: trialReason.trim() }
        : {
          action: "update",
          teacherId: trialTeacherId,
          branchId: trialBranchId,
          roomId: trialRoomId || null,
          startsAt: new Date(`${trialStartsAt}:00+03:00`).toISOString(),
          endsAt: new Date(`${trialEndsAt}:00+03:00`).toISOString(),
        };
      const response = await fetch(`/api/crm/trials/${trialChange.trial.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Не удалось изменить пробное занятие");
      setTrialChange(null);
      await load();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSavingTrialChange(false);
    }
  };

  const sections = groupOperationalSessions(sessions.map((session) => ({
    ...session,
    startsAt: session.starts_at,
    teacherId: session.teacher_id,
    teacherName: session.profiles?.full_name,
    groupId: session.group_id,
    groupName: session.groups?.title,
  })), view);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 18 }} aria-label="Оперативное расписание">
      <div className="card-crm" style={{ background: "white", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <strong>{period === "today" ? `Сегодня, ${days[0].toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow", day: "numeric", month: "long" })}` : `Неделя ${days[0].toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow", day: "numeric", month: "long" })} — ${days[days.length - 1].toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow", day: "numeric", month: "long" })}`}</strong>
          <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}><Bell size={13} /> Переносы и отмены создают адресные уведомления MAX</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary-crm" onClick={() => setPeriod("today")}>Сегодня</Button>
          <Button variant="secondary-crm" onClick={() => setPeriod("week")}>Неделя</Button>
          {period === "week" && <Button variant="secondary-crm" aria-label="Предыдущая неделя" onClick={() => setWeek(new Date(week.getTime() - 7 * 86400000))}><ChevronLeft size={16} /></Button>}
          {period === "week" && <Button variant="secondary-crm" aria-label="Следующая неделя" onClick={() => setWeek(new Date(week.getTime() + 7 * 86400000))}><ChevronRight size={16} /></Button>}
          <Button variant="secondary-crm" aria-label="Обновить" onClick={() => void load()}><RefreshCw size={16} /></Button>
        </div>
      </div>
      <div className="card-crm schedule-filter-toolbar" style={{ background: "white", display: "grid", gap: 12 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Button variant={view === "all" ? "primary-crm" : "secondary-crm"} onClick={() => setView("all")}>Все занятия</Button>
          <Button variant={view === "teacher" ? "primary-crm" : "secondary-crm"} onClick={() => setView("teacher")}>По преподавателям</Button>
          <Button variant={view === "group" ? "primary-crm" : "secondary-crm"} onClick={() => setView("group")}>По группам</Button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 8 }}>
          <select aria-label="Преподаватель" className="form-input" value={teacherId} onChange={(event) => setTeacherId(event.target.value)}><option value="">Все преподаватели</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select>
          <select aria-label="Группа" className="form-input" value={selectedGroupId} onChange={(event) => setSelectedGroupId(event.target.value)}><option value="">Все группы</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.title}</option>)}</select>
          <select aria-label="Филиал" className="form-input" value={branchId} onChange={(event) => { setBranchId(event.target.value); setRoomId(""); }}><option value="">Все филиалы</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>
          <select aria-label="Кабинет" className="form-input" value={roomId} onChange={(event) => setRoomId(event.target.value)}><option value="">Все кабинеты</option>{rooms.filter((room) => !branchId || room.branch_id === branchId).map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select>
          <select aria-label="Статус" className="form-input" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Все статусы</option>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <select aria-label="Тип занятия" className="form-input" value={sessionKind} onChange={(event) => setSessionKind(event.target.value)}><option value="">Все типы</option><option value="regular">Обычное</option><option value="extra">Дополнительное</option><option value="trial">Пробное</option><option value="makeup">Отработка</option></select>
        </div>
      </div>
      {canManage && (
        <div className="card-crm" style={{ background: "white", display: "flex", flexWrap: "wrap", alignItems: "end", gap: 10 }}>
          <label style={{ display: "grid", gap: 5, fontSize: 11, color: "var(--color-text-muted)", minWidth: 230 }}>Создать занятия из шаблона группы
            <select className="form-input" value={materializeGroupId} onChange={(event) => setMaterializeGroupId(event.target.value)} style={{ height: 38 }}>
              {groups.map((group) => <option key={group.id} value={group.id}>{group.title}</option>)}
            </select>
          </label>
          <Button variant="primary-crm" disabled={!materializeGroupId} onClick={() => void materialize()}>Сформировать на 12 недель</Button>
          <Button variant="secondary-crm" onClick={openCreate}><Plus size={15} /> Добавить занятие</Button>
          <Button variant="secondary-crm" onClick={() => setShowTrialDialog(true)}><Plus size={15} /> Записать на пробное</Button>
          <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Повторный запуск безопасен: существующие даты и время не дублируются.</span>
        </div>
      )}
      {canManage && makeups.length > 0 && (
        <div className="card-crm" style={{ background: "white" }}>
          <h2 style={{ fontSize: 16, marginBottom: 5 }}>Очередь отработок</h2>
          <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 14 }}>Назначьте ребёнка на конкретное предстоящее занятие. В MAX уйдёт адресное уведомление только его родителям.</p>
          <div style={{ display: "grid", gap: 10 }}>
            {makeups.map((makeup) => (
              <div key={makeup.id} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10, alignItems: "end", border: "1px solid var(--color-border)", borderRadius: 10, padding: 12 }}>
                <div><strong>{makeup.students?.full_name || "Ученик"}</strong><div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 3 }}>Статус: {makeup.status === "scheduled" ? "назначена" : "ожидает назначения"}</div></div>
                <label style={{ display: "grid", gap: 4, fontSize: 11, color: "var(--color-text-muted)" }}>Занятие для отработки
                  <select className="form-input" defaultValue={makeup.target_session_id || ""} onChange={(event) => event.target.value && void scheduleMakeup(makeup.id, event.target.value)} style={{ height: 38 }}>
                    <option value="">Выберите занятие</option>
                    {sessions.filter((session) => session.status === "planned" && new Date(session.starts_at) > new Date()).map((session) => <option key={session.id} value={session.id}>{new Date(session.starts_at).toLocaleString("ru-RU", { timeZone: "Europe/Moscow", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {session.groups?.title}</option>)}
                  </select>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
      {error && <div role="alert" className="card-crm" style={{ color: "var(--color-danger)", background: "white", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>{error}<Button variant="secondary-crm" onClick={() => void load()}>Повторить</Button></div>}
      {loading ? <p style={{ color: "var(--color-text-muted)", textAlign: "center", padding: 32 }}>Загрузка расписания…</p> : (
        <div style={{ display: "grid", gap: 14 }}>
          {!error && !sessions.length && !standaloneTrials.length && <div className="card-crm" style={{ background: "white", textAlign: "center", color: "var(--color-text-muted)", padding: 32 }}>{period === "today" ? "На сегодня занятий нет" : "На этой неделе занятий нет"}</div>}
          {sections.map((section) => (
            <section key={section.key} className="card-crm" style={{ background: "white", padding: 16 }}>
              {view !== "all" && <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>{section.label}</h2>}
              <div style={{ display: "grid", gap: 8 }}>
                {section.sessions.map((session) => (
                  <article key={session.id} style={{ display: "grid", gridTemplateColumns: "80px minmax(0, 1fr) auto", gap: 12, alignItems: "center", border: "1px solid var(--color-border)", borderRadius: 10, padding: 12, opacity: session.status === "cancelled" || session.status === "moved" ? .65 : 1 }}>
                    <div><strong style={{ fontSize: 15 }}>{new Date(session.starts_at).toLocaleTimeString("ru-RU", { timeZone: "Europe/Moscow", hour: "2-digit", minute: "2-digit" })}</strong><div style={{ fontSize: 10, color: "var(--color-text-muted)", marginTop: 3 }}>{new Date(session.starts_at).toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow", day: "numeric", month: "short" })}</div></div>
                    <div><strong style={{ fontSize: 13 }}>{session.groups?.title || "Без группы"}</strong><div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 5, fontSize: 11, color: "var(--color-text-muted)" }}><span><UserRound size={11} /> {session.profiles?.full_name || "Преподаватель не назначен"}</span><span><MapPin size={11} /> {session.rooms?.name || "Кабинет не назначен"}</span><span>{session.session_kind === "regular" ? "Обычное" : session.session_kind === "trial" ? "Пробное (legacy)" : session.session_kind === "makeup" ? "Отработка" : "Дополнительное"}</span><span>{scheduleCapacityLabel({ studentCount: session.studentCount || 0, trialParticipantCount: session.trialParticipantCount || 0, capacity: session.groups?.capacity })}</span></div>{session.change_reason && <p style={{ fontSize: 11, margin: "5px 0 0" }}>Причина: {session.change_reason}</p>}</div>
                    <div style={{ display: "grid", justifyItems: "end", gap: 7 }}><span className={`badge ${session.status === "cancelled" ? "badge-red" : session.status === "completed" ? "badge-green" : "badge-blue"}`}>{statusLabel[session.status] || session.status}</span><div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}><Link href={`/crm/lessons/${session.id}`} style={{ fontSize: 11, fontWeight: 700, color: "var(--color-primary)" }}>Открыть журнал</Link>{canManage && session.status === "planned" && <button onClick={() => openChange("reschedule", session)} style={{ border: 0, background: "none", color: "var(--color-primary)", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Перенести</button>}{canManage && session.status === "planned" && <button onClick={() => openChange("cancel", session)} style={{ border: 0, background: "none", color: "var(--color-danger)", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Отменить</button>}</div></div>
                  </article>
                ))}
              </div>
            </section>
          ))}
          {standaloneTrials.length > 0 && (
            <section className="card-crm" style={{ background: "#faf5ff", borderColor: "#ddd6fe", padding: 16 }}>
              <h2 style={{ fontSize: 16, margin: "0 0 12px", color: "#6d28d9" }}>Отдельные пробные занятия</h2>
              <div style={{ display: "grid", gap: 10 }}>
                {standaloneTrials.map((trial) => (
                  <article key={trial.id} style={{ border: "1px solid #ddd6fe", borderRadius: 10, background: "white", padding: 12, display: "grid", gap: 10 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "80px minmax(0, 1fr) auto", gap: 12, alignItems: "center" }}>
                      <div><strong>{new Date(trial.starts_at).toLocaleTimeString("ru-RU", { timeZone: "Europe/Moscow", hour: "2-digit", minute: "2-digit" })}</strong><small style={{ display: "block", color: "var(--color-text-muted)" }}>{new Date(trial.starts_at).toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow", day: "numeric", month: "short" })}</small></div>
                      <div><strong>Отдельное пробное · {trial.trialParticipantCount} участн.</strong><small style={{ display: "block", color: "var(--color-text-muted)" }}>{trial.profiles?.full_name || "Преподаватель"} · {trial.branches?.name || "Филиал"} · {trial.rooms?.name || "Кабинет"}</small></div>
                      {canManage && <div style={{ display: "flex", gap: 8 }}><button type="button" onClick={() => openTrialChange("update", trial)} style={{ border: 0, background: "transparent", color: "var(--color-primary)", cursor: "pointer", fontWeight: 700 }}>Изменить</button><button type="button" onClick={() => openTrialChange("cancel", trial)} style={{ border: 0, background: "transparent", color: "var(--color-danger)", cursor: "pointer", fontWeight: 700 }}>Отменить</button></div>}
                    </div>
                    <details><summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Участники и результаты</summary><div style={{ marginTop: 10 }}><TrialParticipantList participants={trial.participants} /></div></details>
                  </article>
                ))}
              </div>
            </section>
          )}
          <style jsx>{`@media (max-width: 640px) { article { grid-template-columns: 64px minmax(0, 1fr) !important; } article > div:last-child { grid-column: 1 / -1; justify-items: start !important; } .schedule-filter-toolbar select { width: 100%; } }`}</style>
        </div>
      )}
      <p style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Уведомления MAX: по группе разворачиваются в отдельное сообщение каждому связанному родителю; отработка — только родителям выбранного ребёнка.</p>
      {change && (
        <CrmDialog title={change.type === "reschedule" ? "Перенести занятие" : "Отменить занятие"} description={`${change.session.groups?.title} · ${new Date(change.session.starts_at).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })}. После сохранения родителям будут созданы уведомления MAX.`} onClose={() => setChange(null)} width={460}>
            <div style={{ display: "grid", gap: 13 }}>
              {change.type === "reschedule" && <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 650 }}>Новые дата и время<input autoFocus type="datetime-local" className="form-input" value={newStartsAt} onChange={(event) => setNewStartsAt(event.target.value)} /></label>}
              <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 650 }}>Причина<textarea autoFocus={change.type === "cancel"} className="form-input" value={changeReason} onChange={(event) => setChangeReason(event.target.value)} rows={3} placeholder="Например: праздничный день" style={{ height: "auto", padding: 10 }} /></label>
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}><input type="checkbox" checked={notifyChange} onChange={(event) => setNotifyChange(event.target.checked)} /> Уведомить родителей в MAX</label>
              <div style={{ padding: 10, borderRadius: 8, background: "var(--color-primary-soft)", fontSize: 11 }}>Будет отправлено: группа, старая и новая дата (при переносе), причина и имя ребёнка.</div>
              <div className="crm-dialog-actions" style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><Button variant="secondary-crm" onClick={() => setChange(null)}>Назад</Button><Button variant="primary-crm" disabled={savingChange || !changeReason.trim() || (change.type === "reschedule" && !newStartsAt)} onClick={() => void submitChange()}>{savingChange ? "Сохранение…" : change.type === "reschedule" ? "Перенести" : "Отменить"}</Button></div>
            </div>
        </CrmDialog>
      )}
      {creating && (
        <CrmDialog title="Добавить занятие" description="Подходит для дополнительного урока или разовой замены. Пробные записи создаются отдельной кнопкой." onClose={() => setCreating(false)} width={520}>
            <div style={{ display: "grid", gap: 12 }}>
              <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 650 }}>Группа<select className="form-input" value={createGroupId} onChange={(event) => setCreateGroupId(event.target.value)}>{groups.map((group) => <option key={group.id} value={group.id}>{group.title}</option>)}</select></label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
                <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 650 }}>Начало<input type="datetime-local" className="form-input" value={createStartsAt} onChange={(event) => setCreateStartsAt(event.target.value)} /></label>
                <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 650 }}>Окончание<input type="datetime-local" className="form-input" value={createEndsAt} onChange={(event) => setCreateEndsAt(event.target.value)} /></label>
              </div>
              <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 650 }}>Тип<select className="form-input" value={createKind} onChange={(event) => setCreateKind(event.target.value as "regular" | "extra")}><option value="extra">Дополнительное</option><option value="regular">Обычное</option></select></label>
              <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 650 }}>Комментарий для родителей<input className="form-input" value={createReason} onChange={(event) => setCreateReason(event.target.value)} placeholder="Например: дополнительная подготовка к соревнованиям" /></label>
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}><input type="checkbox" checked={notifyCreate} onChange={(event) => setNotifyCreate(event.target.checked)} /> Уведомить родителей в MAX</label>
              <div style={{ padding: 10, borderRadius: 8, background: "var(--color-primary-soft)", fontSize: 11 }}>Перед созданием система проверит пересечение преподавателя и кабинета. Уведомление получат все связанные родители активных учеников группы.</div>
              <div className="crm-dialog-actions" style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><Button variant="secondary-crm" onClick={() => setCreating(false)}>Отмена</Button><Button variant="primary-crm" disabled={savingCreate || !createGroupId || !createStartsAt || !createEndsAt} onClick={() => void submitCreate()}>{savingCreate ? "Добавление…" : "Добавить занятие"}</Button></div>
            </div>
        </CrmDialog>
      )}
      {showTrialDialog && <TrialDialog onClose={() => setShowTrialDialog(false)} onSaved={load} />}
      {trialChange && (
        <CrmDialog title={trialChange.type === "cancel" ? "Отменить отдельное пробное" : "Изменить отдельное пробное"} description="Изменение проверяется на пересечения и вместимость внутри транзакции." onClose={() => setTrialChange(null)} width={560}>
          <div style={{ display: "grid", gap: 12 }}>
            {trialChange.type === "cancel" ? (
              <label style={{ display: "grid", gap: 5, fontSize: 12 }}>Причина отмены<textarea className="form-input" rows={3} value={trialReason} onChange={(event) => setTrialReason(event.target.value)} style={{ height: "auto", padding: 10 }} /></label>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 }}>
                  <label style={{ display: "grid", gap: 5, fontSize: 12 }}>Преподаватель<select className="form-input" value={trialTeacherId} onChange={(event) => setTrialTeacherId(event.target.value)}>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label>
                  <label style={{ display: "grid", gap: 5, fontSize: 12 }}>Филиал<select className="form-input" value={trialBranchId} onChange={(event) => { setTrialBranchId(event.target.value); setTrialRoomId(""); }}>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
                  <label style={{ display: "grid", gap: 5, fontSize: 12 }}>Кабинет (необязательно)<select className="form-input" value={trialRoomId} onChange={(event) => setTrialRoomId(event.target.value)}><option value="">Без кабинета</option>{rooms.filter((room) => room.branch_id === trialBranchId).map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <label style={{ display: "grid", gap: 5, fontSize: 12 }}>Начало<input type="datetime-local" className="form-input" value={trialStartsAt} onChange={(event) => setTrialStartsAt(event.target.value)} /></label>
                  <label style={{ display: "grid", gap: 5, fontSize: 12 }}>Окончание<input type="datetime-local" className="form-input" value={trialEndsAt} onChange={(event) => setTrialEndsAt(event.target.value)} /></label>
                </div>
              </>
            )}
            <div className="crm-dialog-actions" style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><Button variant="secondary-crm" onClick={() => setTrialChange(null)}>Назад</Button><Button variant="primary-crm" disabled={savingTrialChange || (trialChange.type === "cancel" ? !trialReason.trim() : !trialTeacherId || !trialBranchId || !trialStartsAt || !trialEndsAt)} onClick={() => void submitTrialChange()}>{savingTrialChange ? "Сохраняем…" : trialChange.type === "cancel" ? "Отменить запись" : "Сохранить"}</Button></div>
          </div>
        </CrmDialog>
      )}
    </section>
  );
}
