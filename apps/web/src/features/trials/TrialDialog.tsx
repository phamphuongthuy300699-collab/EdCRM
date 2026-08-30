"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@robotics-crm/ui";
import { CrmDialog } from "@/shared/ui/CrmDialog";
import type { TrialSubjectInput } from "./contracts";
import {
  TrialSubjectPicker,
  type TrialSubjectOption,
} from "./TrialSubjectPicker";

type TrialOptions = {
  leads: any[];
  students: any[];
  teachers: Array<{ id: string; name: string }>;
  branches: Array<{ id: string; name: string }>;
  rooms: Array<{
    id: string;
    name: string;
    branch_id: string;
    capacity: number | null;
  }>;
  sessions: any[];
};

function moscowInput(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(date)
    .replace(" ", "T");
}

function related<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value || undefined;
}

function attachedSessionLabel(session: any) {
  const group = related<any>(session.groups);
  const course = related<any>(group?.courses);
  const branch = related<any>(group?.branches);
  const teacher = related<any>(session.profiles);
  const room = related<any>(session.rooms);
  const starts = new Date(session.starts_at).toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const resource = [branch?.name, room?.name].filter(Boolean).join(" · ");
  const capacity =
    session.remainingCapacity == null
      ? "лимит не задан"
      : `${session.enrollmentCount || 0} постоянных + ${session.makeupCount || 0} отработок + ${session.trialParticipantCount || 0} пробных · свободно ${session.remainingCapacity} из ${group?.capacity}`;
  return [
    starts,
    group?.title || "Группа",
    course?.title,
    teacher?.full_name,
    resource,
    capacity,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function TrialDialog({
  initialSubjects = [],
  onClose,
  onSaved,
}: {
  initialSubjects?: TrialSubjectInput[];
  onClose: () => void;
  onSaved: (result?: unknown) => void | Promise<void>;
}) {
  const initialStart = useMemo(() => {
    const date = new Date();
    date.setSeconds(0, 0);
    date.setMinutes(0);
    date.setHours(date.getHours() + 1);
    return date;
  }, []);
  const [mode, setMode] = useState<"attached_session" | "standalone">(
    "attached_session",
  );
  const [options, setOptions] = useState<TrialOptions>({
    leads: [],
    students: [],
    teachers: [],
    branches: [],
    rooms: [],
    sessions: [],
  });
  const [selected, setSelected] =
    useState<TrialSubjectInput[]>(initialSubjects);
  const [sessionId, setSessionId] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [sessionTeacherId, setSessionTeacherId] = useState("");
  const [sessionBranchId, setSessionBranchId] = useState("");
  const [sessionQuery, setSessionQuery] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [startsAt, setStartsAt] = useState(() => moscowInput(initialStart));
  const [endsAt, setEndsAt] = useState(() =>
    moscowInput(new Date(initialStart.getTime() + 60 * 60_000)),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch("/api/crm/trials/options");
        const payload = await response.json();
        if (!response.ok || !payload.ok)
          throw new Error(
            payload.error || "Не удалось загрузить варианты записи",
          );
        if (!active) return;
        setOptions(payload);
        setSessionId(payload.sessions?.[0]?.id || "");
        setTeacherId(payload.teachers?.[0]?.id || "");
        setBranchId(payload.branches?.[0]?.id || "");
      } catch (cause) {
        if (active) setError((cause as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const availableRooms = options.rooms.filter(
      (room) => room.branch_id === branchId,
    );
    if (roomId && !availableRooms.some((room) => room.id === roomId))
      setRoomId("");
  }, [branchId, options.rooms, roomId]);

  const subjects: TrialSubjectOption[] = [
    ...options.leads.map((lead) => {
      const course = related<any>(lead.courses);
      return {
        kind: "lead" as const,
        id: lead.id,
        name: lead.child_name || lead.parent_name || "Заявка",
        detail: [
          lead.parent_name || "Родитель",
          lead.child_age ? `${lead.child_age} лет` : null,
          course?.title,
          lead.parent_phone,
        ]
          .filter(Boolean)
          .join(" · "),
      };
    }),
    ...options.students.map((student) => {
      const enrollment = (student.enrollments || []).find(
        (item: any) => item.status === "active",
      );
      const guardianLink =
        (student.student_guardians || []).find(
          (item: any) => item.is_primary,
        ) || student.student_guardians?.[0];
      const guardian = related<any>(guardianLink?.guardians);
      return {
        kind: "student" as const,
        id: student.id,
        name: student.full_name,
        detail: [
          related<any>(enrollment?.groups)?.title || "Без группы",
          guardian?.full_name,
        ]
          .filter(Boolean)
          .join(" · "),
      };
    }),
  ];
  const filteredSessions = useMemo(
    () =>
      options.sessions.filter((session) => {
        const group = related<any>(session.groups);
        const course = related<any>(group?.courses);
        const haystack =
          `${group?.title || ""} ${course?.title || ""}`.toLowerCase();
        const moscowDate = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Europe/Moscow",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(session.starts_at));
        return (
          (!sessionDate || moscowDate === sessionDate) &&
          (!sessionTeacherId || session.teacher_id === sessionTeacherId) &&
          (!sessionBranchId || group?.branch_id === sessionBranchId) &&
          (!sessionQuery.trim() ||
            haystack.includes(sessionQuery.trim().toLowerCase()))
        );
      }),
    [
      options.sessions,
      sessionBranchId,
      sessionDate,
      sessionQuery,
      sessionTeacherId,
    ],
  );
  useEffect(() => {
    if (
      sessionId &&
      !filteredSessions.some((session) => session.id === sessionId)
    )
      setSessionId("");
  }, [filteredSessions, sessionId]);
  const canSave =
    selected.length > 0 &&
    (mode === "attached_session"
      ? Boolean(sessionId)
      : Boolean(teacherId && branchId && startsAt && endsAt));

  async function save() {
    if (!canSave || saving) return;
    setSaving(true);
    setError("");
    try {
      const body =
        mode === "attached_session"
          ? { mode, lessonSessionId: sessionId, participants: selected }
          : {
              mode,
              teacherId,
              branchId,
              roomId: roomId || null,
              startsAt: new Date(`${startsAt}:00+03:00`).toISOString(),
              endsAt: new Date(`${endsAt}:00+03:00`).toISOString(),
              participants: selected,
            };
      const response = await fetch("/api/crm/trials", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok)
        throw new Error(
          payload.error || "Не удалось записать на пробное занятие",
        );
      await onSaved(payload.result);
      onClose();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <CrmDialog
      title="Записать на пробное занятие"
      description="Можно добавить несколько заявок и учеников одной атомарной операцией."
      onClose={onClose}
      width={680}
    >
      <div style={{ display: "grid", gap: 16 }}>
        <fieldset
          style={{
            border: 0,
            padding: 0,
            margin: 0,
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <legend style={{ fontSize: 12, fontWeight: 750, marginBottom: 8 }}>
            Формат
          </legend>
          <label
            style={{
              display: "flex",
              gap: 7,
              alignItems: "center",
              fontSize: 13,
            }}
          >
            <input
              type="radio"
              name="trial-mode"
              checked={mode === "attached_session"}
              onChange={() => setMode("attached_session")}
            />{" "}
            К обычному занятию
          </label>
          <label
            style={{
              display: "flex",
              gap: 7,
              alignItems: "center",
              fontSize: 13,
            }}
          >
            <input
              type="radio"
              name="trial-mode"
              checked={mode === "standalone"}
              onChange={() => setMode("standalone")}
            />{" "}
            Отдельное пробное
          </label>
        </fieldset>

        {loading ? (
          <span style={{ color: "var(--color-text-muted)" }}>
            Загрузка вариантов…
          </span>
        ) : (
          <TrialSubjectPicker
            options={subjects}
            selected={selected}
            onChange={setSelected}
          />
        )}

        {mode === "attached_session" ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
                gap: 8,
              }}
            >
              <label style={{ display: "grid", gap: 4, fontSize: 11 }}>
                Дата
                <input
                  aria-label="Дата занятия"
                  type="date"
                  className="form-input"
                  value={sessionDate}
                  onChange={(event) => setSessionDate(event.target.value)}
                />
              </label>
              <label style={{ display: "grid", gap: 4, fontSize: 11 }}>
                Преподаватель
                <select
                  aria-label="Фильтр по преподавателю"
                  className="form-input"
                  value={sessionTeacherId}
                  onChange={(event) => setSessionTeacherId(event.target.value)}
                >
                  <option value="">Все</option>
                  {options.teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: 4, fontSize: 11 }}>
                Филиал
                <select
                  aria-label="Фильтр по филиалу"
                  className="form-input"
                  value={sessionBranchId}
                  onChange={(event) => setSessionBranchId(event.target.value)}
                >
                  <option value="">Все</option>
                  {options.branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: 4, fontSize: 11 }}>
                Группа / курс
                <input
                  aria-label="Фильтр по группе или курсу"
                  className="form-input"
                  value={sessionQuery}
                  onChange={(event) => setSessionQuery(event.target.value)}
                  placeholder="Название"
                />
              </label>
            </div>
            <label
              style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 650 }}
            >
              Обычное занятие
              <select
                aria-label="Обычное занятие"
                className="form-input"
                value={sessionId}
                onChange={(event) => setSessionId(event.target.value)}
              >
                <option value="">Выберите занятие</option>
                {filteredSessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {attachedSessionLabel(session)}
                  </option>
                ))}
              </select>
            </label>
            {filteredSessions.length === 0 && (
              <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                По выбранным фильтрам занятий нет.
              </span>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 10,
              }}
            >
              <label style={{ display: "grid", gap: 5, fontSize: 12 }}>
                Преподаватель
                <select
                  aria-label="Преподаватель"
                  className="form-input"
                  value={teacherId}
                  onChange={(event) => setTeacherId(event.target.value)}
                >
                  <option value="">Выберите</option>
                  {options.teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: 5, fontSize: 12 }}>
                Филиал
                <select
                  aria-label="Филиал"
                  className="form-input"
                  value={branchId}
                  onChange={(event) => setBranchId(event.target.value)}
                >
                  <option value="">Выберите</option>
                  {options.branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: 5, fontSize: 12 }}>
                Кабинет (необязательно)
                <select
                  aria-label="Кабинет"
                  className="form-input"
                  value={roomId}
                  onChange={(event) => setRoomId(event.target.value)}
                >
                  <option value="">Без кабинета</option>
                  {options.rooms
                    .filter((room) => room.branch_id === branchId)
                    .map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                        {room.capacity ? ` · ${room.capacity} мест` : ""}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                gap: 10,
              }}
            >
              <label style={{ display: "grid", gap: 5, fontSize: 12 }}>
                Начало
                <input
                  aria-label="Начало"
                  type="datetime-local"
                  className="form-input"
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.target.value)}
                />
              </label>
              <label style={{ display: "grid", gap: 5, fontSize: 12 }}>
                Окончание
                <input
                  aria-label="Окончание"
                  type="datetime-local"
                  className="form-input"
                  value={endsAt}
                  onChange={(event) => setEndsAt(event.target.value)}
                />
              </label>
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            style={{
              color: "var(--color-danger)",
              background: "var(--color-danger-soft)",
              borderRadius: 8,
              padding: 10,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        )}
        <div
          style={{
            padding: 10,
            borderRadius: 8,
            background: "var(--color-primary-soft)",
            fontSize: 11,
          }}
        >
          Свободные места и пересечения проверяются повторно внутри одной
          транзакции. Запись не создаёт зачисление, счёт или посещаемость.
        </div>
        <div
          className="crm-dialog-actions"
          style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
        >
          <Button type="button" variant="secondary-crm" onClick={onClose}>
            Отмена
          </Button>
          <Button
            type="button"
            variant="primary-crm"
            disabled={!canSave || saving}
            onClick={() => void save()}
          >
            {saving ? "Сохраняем…" : `Записать ${selected.length || ""}`}
          </Button>
        </div>
      </div>
    </CrmDialog>
  );
}
