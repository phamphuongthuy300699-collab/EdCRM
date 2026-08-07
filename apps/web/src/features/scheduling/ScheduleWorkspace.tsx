"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@robotics-crm/ui";
import { Bell, CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, Plus, RefreshCw, UserRound } from "lucide-react";
import { CrmDialog } from "@/shared/ui/CrmDialog";

type Session = {
  id: string;
  starts_at: string;
  ends_at?: string | null;
  status: string;
  session_kind?: string;
  change_reason?: string | null;
  notification_status?: string;
  groups?: { title?: string } | null;
  courses?: { title?: string } | null;
  profiles?: { full_name?: string } | null;
  rooms?: { name?: string } | null;
};

type Makeup = { id: string; student_id: string; target_session_id?: string | null; status: string; notes?: string | null; students?: { full_name?: string } | null };

const statusLabel: Record<string, string> = { planned: "Запланировано", live: "Идёт", completed: "Проведено", cancelled: "Отменено", moved: "Перенесено" };

function monday(value: Date) {
  const date = new Date(value);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function dateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function moscowDateTimeInput(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date).replace(" ", "T");
}

export function ScheduleWorkspace({ canManage = true, groupId }: { canManage?: boolean; groupId?: string }) {
  const [week, setWeek] = useState(() => monday(new Date()));
  const [sessions, setSessions] = useState<Session[]>([]);
  const [groups, setGroups] = useState<Array<{ id: string; title: string }>>([]);
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
  const [createKind, setCreateKind] = useState<"regular" | "extra" | "trial">("extra");
  const [createReason, setCreateReason] = useState("");
  const [savingCreate, setSavingCreate] = useState(false);
  const [notifyCreate, setNotifyCreate] = useState(true);
  const [notifyChange, setNotifyChange] = useState(true);
  const [notificationEvents, setNotificationEvents] = useState<Record<string, boolean>>({});
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => new Date(week.getTime() + index * 86400000)), [week]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ dateFrom: dateKey(days[0]), dateTo: dateKey(days[6]) });
      if (groupId) params.set("groupId", groupId);
      const response = await fetch(`/api/crm/schedule?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось загрузить расписание");
      setSessions(data.sessions || []);
      setGroups(data.groups || []);
      setMakeups(data.makeups || []);
      setNotificationEvents(data.notificationEvents || {});
      setMaterializeGroupId((current) => current || data.groups?.[0]?.id || "");
      setCreateGroupId((current) => current || data.groups?.[0]?.id || "");
    } catch (reason: any) {
      setError(reason.message || "Не удалось загрузить расписание");
    } finally {
      setLoading(false);
    }
  }, [days, groupId]);

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

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 18 }} aria-label="Оперативное расписание">
      <div className="card-crm" style={{ background: "white", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <strong>Неделя {days[0].toLocaleDateString("ru-RU", { day: "numeric", month: "long" })} — {days[6].toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</strong>
          <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}><Bell size={13} /> Переносы и отмены создают адресные уведомления MAX</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary-crm" aria-label="Предыдущая неделя" onClick={() => setWeek(new Date(week.getTime() - 7 * 86400000))}><ChevronLeft size={16} /></Button>
          <Button variant="secondary-crm" onClick={() => setWeek(monday(new Date()))}>Сегодня</Button>
          <Button variant="secondary-crm" aria-label="Следующая неделя" onClick={() => setWeek(new Date(week.getTime() + 7 * 86400000))}><ChevronRight size={16} /></Button>
          <Button variant="secondary-crm" aria-label="Обновить" onClick={() => void load()}><RefreshCw size={16} /></Button>
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
                    {sessions.filter((session) => session.status === "planned" && new Date(session.starts_at) > new Date()).map((session) => <option key={session.id} value={session.id}>{new Date(session.starts_at).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {session.groups?.title}</option>)}
                  </select>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
      {error && <div role="alert" className="card-crm" style={{ color: "var(--color-danger)", background: "white" }}>{error}</div>}
      {loading ? <p style={{ color: "var(--color-text-muted)", textAlign: "center", padding: 32 }}>Загрузка расписания…</p> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {days.map((day) => {
            const daySessions = sessions.filter((session) => dateKey(new Date(session.starts_at)) === dateKey(day));
            return (
              <div key={dateKey(day)} className="card-crm" style={{ background: "white", padding: 14, minHeight: 170 }}>
                <div style={{ fontWeight: 750, display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}><CalendarDays size={15} /> {day.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" })}</div>
                {!daySessions.length && <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Нет занятий</span>}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {daySessions.map((session) => (
                    <article key={session.id} style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: 10, opacity: session.status === "cancelled" || session.status === "moved" ? .65 : 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}><strong style={{ fontSize: 13 }}>{session.groups?.title || "Без группы"}</strong><span className={`badge ${session.status === "cancelled" ? "badge-red" : session.status === "completed" ? "badge-green" : "badge-blue"}`}>{statusLabel[session.status] || session.status}</span></div>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 7, display: "grid", gap: 4 }}>
                        <span><Clock size={11} /> {new Date(session.starts_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>
                        <span><UserRound size={11} /> {session.profiles?.full_name || "Преподаватель не назначен"}</span>
                        <span><MapPin size={11} /> {session.rooms?.name || "Кабинет не назначен"}</span>
                      </div>
                      {session.change_reason && <p style={{ fontSize: 11, margin: "7px 0 0" }}>Причина: {session.change_reason}</p>}
                      {session.notification_status && session.notification_status !== "not_required" && <p style={{ fontSize: 10, margin: "5px 0 0", color: session.notification_status === "failed" ? "var(--color-danger)" : "var(--color-text-muted)" }}>MAX: {session.notification_status === "sent" ? "отправлено" : session.notification_status === "failed" ? "ошибка отправки" : "в очереди"}</p>}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 9 }}>
                        <Link href={`/crm/lessons/${session.id}`} style={{ fontSize: 11, fontWeight: 700, color: "var(--color-primary)" }}>Открыть журнал</Link>
                        {canManage && session.status === "planned" && <button onClick={() => openChange("reschedule", session)} style={{ border: 0, background: "none", color: "var(--color-primary)", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Перенести</button>}
                        {canManage && session.status === "planned" && <button onClick={() => openChange("cancel", session)} style={{ border: 0, background: "none", color: "var(--color-danger)", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Отменить</button>}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Уведомления MAX: по группе разворачиваются в отдельное сообщение каждому связанному родителю; отработка — только родителям выбранного ребёнка.</p>
      {change && (
        <CrmDialog title={change.type === "reschedule" ? "Перенести занятие" : "Отменить занятие"} description={`${change.session.groups?.title} · ${new Date(change.session.starts_at).toLocaleString("ru-RU")}. После сохранения родителям будут созданы уведомления MAX.`} onClose={() => setChange(null)} width={460}>
            <div style={{ display: "grid", gap: 13 }}>
              {change.type === "reschedule" && <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 650 }}>Новые дата и время<input autoFocus type="datetime-local" className="form-input" value={newStartsAt} onChange={(event) => setNewStartsAt(event.target.value)} /></label>}
              <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 650 }}>Причина<textarea autoFocus={change.type === "cancel"} className="form-input" value={changeReason} onChange={(event) => setChangeReason(event.target.value)} rows={3} placeholder="Например: праздничный день" style={{ height: "auto", padding: 10 }} /></label>
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}><input type="checkbox" checked={notifyChange} onChange={(event) => setNotifyChange(event.target.checked)} /> Уведомить родителей в MAX</label>
              <div style={{ padding: 10, borderRadius: 8, background: "var(--color-primary-soft)", fontSize: 11 }}>Будет отправлено: группа, старая и новая дата (при переносе), причина и имя ребёнка.</div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><Button variant="secondary-crm" onClick={() => setChange(null)}>Назад</Button><Button variant="primary-crm" disabled={savingChange || !changeReason.trim() || (change.type === "reschedule" && !newStartsAt)} onClick={() => void submitChange()}>{savingChange ? "Сохранение…" : change.type === "reschedule" ? "Перенести" : "Отменить"}</Button></div>
            </div>
        </CrmDialog>
      )}
      {creating && (
        <CrmDialog title="Добавить занятие" description="Подходит для дополнительного урока, пробного занятия или разовой замены. После сохранения родители группы получат MAX-уведомление." onClose={() => setCreating(false)} width={520}>
            <div style={{ display: "grid", gap: 12 }}>
              <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 650 }}>Группа<select className="form-input" value={createGroupId} onChange={(event) => setCreateGroupId(event.target.value)}>{groups.map((group) => <option key={group.id} value={group.id}>{group.title}</option>)}</select></label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
                <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 650 }}>Начало<input type="datetime-local" className="form-input" value={createStartsAt} onChange={(event) => setCreateStartsAt(event.target.value)} /></label>
                <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 650 }}>Окончание<input type="datetime-local" className="form-input" value={createEndsAt} onChange={(event) => setCreateEndsAt(event.target.value)} /></label>
              </div>
              <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 650 }}>Тип<select className="form-input" value={createKind} onChange={(event) => setCreateKind(event.target.value as "regular" | "extra" | "trial")}><option value="extra">Дополнительное</option><option value="trial">Пробное</option><option value="regular">Обычное</option></select></label>
              <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 650 }}>Комментарий для родителей<input className="form-input" value={createReason} onChange={(event) => setCreateReason(event.target.value)} placeholder="Например: дополнительная подготовка к соревнованиям" /></label>
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}><input type="checkbox" checked={notifyCreate} onChange={(event) => setNotifyCreate(event.target.checked)} /> Уведомить родителей в MAX</label>
              <div style={{ padding: 10, borderRadius: 8, background: "var(--color-primary-soft)", fontSize: 11 }}>Перед созданием система проверит пересечение преподавателя и кабинета. Уведомление получат все связанные родители активных учеников группы.</div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><Button variant="secondary-crm" onClick={() => setCreating(false)}>Отмена</Button><Button variant="primary-crm" disabled={savingCreate || !createGroupId || !createStartsAt || !createEndsAt} onClick={() => void submitCreate()}>{savingCreate ? "Добавление…" : "Добавить занятие"}</Button></div>
            </div>
        </CrmDialog>
      )}
    </section>
  );
}
