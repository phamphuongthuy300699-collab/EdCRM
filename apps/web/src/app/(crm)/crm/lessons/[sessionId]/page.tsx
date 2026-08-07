"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@robotics-crm/ui";
import { 
  ArrowLeft, 
  BookOpen, 
  ClipboardList, 
  MapPin, 
  Clock, 
  Calendar, 
  Users, 
  Eye, 
  Plus,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/shared/db/supabase/browser";
import { useActionConfirmation } from "@/shared/ui/useActionConfirmation";
import { AttendanceRoster, type AttendanceRosterRow } from "@/features/scheduling/AttendanceRoster";
import type { AttendanceStatus } from "@/features/scheduling/domain";

interface LessonSession {
  id: string;
  starts_at: string;
  ends_at: string | null;
  status: "planned" | "completed" | "cancelled" | "moved" | "live";
  materials_unlocked?: boolean;
  topic: string | null;
  group_id: string;
  course_id: string | null;
  lesson_template_id: string | null;
  teacher_id: string | null;
  room_id: string | null;
  teacher_comment: string | null;
  groups: { title: string } | null;
  courses: { title: string } | null;
  lesson_templates: { 
    id: string; 
    title: string; 
    description: string | null; 
    goals: string | null; 
    plan: string | null;
    equipment: string | null;
  } | null;
  rooms: { name: string } | null;
}

interface Student {
  id: string;
  full_name: string;
  isMakeup?: boolean;
}

interface AttendanceRecord {
  student_id: string;
  is_present: boolean;
  attendance_status: AttendanceStatus;
  comment: string;
  absence_reason?: string;
  id?: string; // If already exists
}

interface HomeworkTemplate {
  id: string;
  title: string;
  difficulty: string;
}

interface HomeworkAssignment {
  id: string;
  homework_templates: { title: string } | null;
  due_at: string | null;
  status: string;
}

export default function LessonConductPage() {
  const { askAction, modal: actionModal } = useActionConfirmation();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<LessonSession | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  
  const [materials, setMaterials] = useState<any[]>([]);
  const [homeworkTemplates, setHomeworkTemplates] = useState<HomeworkTemplate[]>([]);
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([]);
  
  // Homework Assignment Form
  const [selectedHwTemplateId, setSelectedHwTemplateId] = useState("");
  const [hwDueDate, setHwDueDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [closingSession, setClosingSession] = useState(false);
  const [submittingHw, setSubmittingHw] = useState(false);
  const [orgId, setOrgId] = useState<string>("");
  const [attendanceMessage, setAttendanceMessage] = useState("");
  const [attendanceError, setAttendanceError] = useState("");

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    if (!sessionId) return;

    async function loadData() {
      try {
        setLoading(true);
        // Get org
        const orgRes = await supabase.from("organizations").select("id").eq("slug", "robotics-lipetsk").single() as any;
        if (!orgRes.data) throw new Error("Organization not found");
        setOrgId(orgRes.data.id);

        // Fetch session
        const { data: sessionData, error: sError } = await (supabase
          .from("lesson_sessions") as any)
          .select(`
            id,
            starts_at,
            ends_at,
            status,
            topic,
            group_id,
            course_id,
            lesson_template_id,
            teacher_id,
            room_id,
            teacher_comment,
            materials_unlocked,
            groups (title),
            courses (title),
            lesson_templates (id, title, description, goals, plan, equipment),
            rooms (name)
          `)
          .eq("id", sessionId)
          .single();

        if (sError) throw sError;
        const currentSession = sessionData as any;
        setSession(currentSession);

        // Fetch materials of the template
        if (currentSession.lesson_template_id) {
          const { data: matData } = await (supabase
            .from("lesson_materials") as any)
            .select("*")
            .eq("lesson_template_id", currentSession.lesson_template_id)
            .order("sort_order", { ascending: true });
          setMaterials(matData || []);
        }

        // Fetch group enrollments
        const { data: enrollmentData } = await (supabase
          .from("enrollments") as any)
          .select("student_id, students(id, full_name)")
          .eq("group_id", currentSession.group_id)
          .eq("status", "active");

        const activeStudents: Student[] = enrollmentData?.map((e: any) => ({ ...e.students, isMakeup: false })).filter((student: any) => student.id) || [];
        const { data: makeupRows } = await (supabase.from("makeup_assignments") as any)
          .select("student_id, students(id, full_name)")
          .eq("target_session_id", sessionId)
          .eq("status", "scheduled");
        for (const makeup of makeupRows || []) {
          if (!activeStudents.some((student) => student.id === makeup.student_id)) {
            activeStudents.push({ id: makeup.students?.id || makeup.student_id, full_name: makeup.students?.full_name || "Ученик на отработке", isMakeup: true });
          }
        }
        setStudents(activeStudents);

        // Fetch existing attendance
        const { data: attendanceData } = await (supabase
          .from("attendance") as any)
          .select("*")
          .eq("lesson_session_id", sessionId);

        const attendanceMap: Record<string, AttendanceRecord> = {};
        // Pre-populate with false/empty
        activeStudents.forEach((student: any) => {
          attendanceMap[student.id] = {
            student_id: student.id,
            is_present: false,
            attendance_status: "unmarked",
            comment: ""
          };
        });

        // Merge saved attendance
        attendanceData?.forEach((att: any) => {
          attendanceMap[att.student_id] = {
            id: att.id,
            student_id: att.student_id,
            is_present: att.is_present,
            attendance_status: att.attendance_status || (att.is_present ? "present" : "absent_unexcused"),
            absence_reason: att.absence_reason || "",
            comment: att.comment || ""
          };
        });

        setAttendance(attendanceMap);

        // Fetch homework templates
        const { data: hwTemplates } = await (supabase
          .from("homework_templates") as any)
          .select("id, title, difficulty")
          .eq("organization_id", orgRes.data.id)
          .eq("status", "published");
        setHomeworkTemplates(hwTemplates || []);

        // Fetch assignments for this session
        const { data: assignData } = await (supabase
          .from("homework_assignments") as any)
          .select(`
            id,
            homework_templates (title),
            due_at,
            status
          `)
          .eq("lesson_session_id", sessionId);
        setAssignments((assignData as any) || []);

      } catch (err) {
        console.error("Error loading session conduct screen:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [sessionId]);

  const handleSaveAttendance = async (throwOnError = false) => {
    if (!session) return;
    try {
      setSavingAttendance(true);
      setAttendanceMessage("");
      setAttendanceError("");
      const response = await fetch("/api/crm/schedule", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "save_attendance",
          sessionId: session.id,
          records: Object.values(attendance).map((record) => ({
            studentId: record.student_id,
            status: record.attendance_status,
            comment: record.comment,
            absenceReason: record.absence_reason || "",
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Не удалось сохранить посещаемость");
      setAttendanceMessage("Посещаемость сохранена");
    } catch (err) {
      console.error("Error saving attendance:", err);
      setAttendanceError((err as Error).message || "Не удалось сохранить посещаемость");
      if (throwOnError) throw err;
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleAssignHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !selectedHwTemplateId || submittingHw) return;

    try {
      setSubmittingHw(true);
      const { data, error } = await (supabase
        .from("homework_assignments") as any)
        .insert({
          organization_id: orgId,
          homework_template_id: selectedHwTemplateId,
          group_id: session.group_id,
          lesson_session_id: session.id,
          due_at: hwDueDate ? new Date(hwDueDate).toISOString() : null,
          status: "assigned"
        })
        .select(`
          id,
          homework_templates (title),
          due_at,
          status
        `)
        .single();

      if (error) throw error;

      setAssignments(prev => [...prev, data as any]);
      setSelectedHwTemplateId("");
      setHwDueDate("");
      alert("Домашнее задание успешно назначено группе!");
    } catch (err) {
      console.error("Error assigning homework:", err);
      alert("Не удалось выдать домашнее задание");
    } finally {
      setSubmittingHw(false);
    }
  };

  const handleCloseSession = async () => {
    if (!session || closingSession || session.status === "completed") return;
    const allowed = await askAction({
      title: "Завершить занятие",
      description: "Статус сменится на «Проведено», посещаемость будет сохранена.",
      dangerLevel: "warning",
      confirmText: "Завершить",
    });
    if (!allowed) return;

    try {
      setClosingSession(true);
      if (session.status === "planned") {
        const startResponse = await fetch("/api/crm/schedule", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "start_session", sessionId: session.id }) });
        const startResult = await startResponse.json();
        if (!startResponse.ok || !startResult.ok) throw new Error(startResult.error || "Не удалось начать занятие");
      }
      await handleSaveAttendance(true);
      const response = await fetch("/api/crm/schedule", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "complete_session", sessionId: session.id }) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Не удалось завершить занятие");

      setSession(prev => prev ? { ...prev, status: "completed" } : null);
      setAttendanceMessage("Занятие завершено");
    } catch (err) {
      console.error("Error closing session:", err);
      setAttendanceError((err as Error).message || "Не удалось завершить занятие");
    } finally {
      setClosingSession(false);
    }
  };

  if (loading) {
    return <div style={{ color: "var(--color-text-muted)", padding: "40px", textAlign: "center" }}>Загрузка панели занятия...</div>;
  }

  if (!session) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <p style={{ color: "var(--color-danger)" }}>Занятие не найдено</p>
        <Link href="/crm/lessons" style={{ color: "var(--color-primary)", textDecoration: "underline", marginTop: "12px", display: "inline-block" }}>
          Вернуться в расписание
        </Link>
      </div>
    );
  }

  const date = new Date(session.starts_at);
  const timeStr = date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const dateStr = date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Top Navigation */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <Link href="/crm/lessons" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>
          <ArrowLeft size={14} />
          <span>Назад к расписанию</span>
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <h1 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)" }}>
                Панель преподавателя: {session.groups ? session.groups.title : "Группа"}
              </h1>
              <span className={`badge ${session.status === "completed" ? "badge-green" : session.status === "live" ? "badge-green animation-pulse" : "badge-blue"}`} style={session.status === "live" ? { background: "var(--color-success)", color: "white" } : {}}>
                {session.status === "completed" ? "Проведено" : session.status === "live" ? "Идет урок" : "Запланировано"}
              </span>
              {session.status === "live" && (
                <span className={`badge ${session.materials_unlocked ? "badge-blue" : "badge-amber"}`}>
                  Материалы: {session.materials_unlocked ? "Открыты" : "Закрыты"}
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: "16px", color: "var(--color-text-muted)", fontSize: "var(--font-small)", marginTop: "4px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Calendar size={14} /> {dateStr}</span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Clock size={14} /> {timeStr}</span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><MapPin size={14} /> {session.rooms ? session.rooms.name : "Каб. 101"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Sections: Materials, Attendance, Homework */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: "32px", alignItems: "start" }}>
        
        {/* Left Column: Lesson Content & Quick Launcher */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Quick launch materials */}
          <div className="card-crm" style={{ background: "white", display: "flex", flexDirection: "column", gap: "16px" }}>
            <h3 style={{ fontSize: "var(--font-h3)", fontFamily: "var(--font-geologica)", color: "var(--color-text)" }}>
              Материалы к сегодняшнему уроку
            </h3>
            {session.lesson_templates ? (
              <div>
                <span style={{ fontSize: "var(--font-small)", fontWeight: 700, color: "var(--color-primary-dark)" }}>
                  Тема: {session.lesson_templates.title}
                </span>
                <p style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)", marginTop: "4px" }}>
                  {session.lesson_templates.description}
                </p>
                {session.lesson_templates.equipment && (
                  <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "8px", background: "var(--color-bg)", padding: "8px 12px", borderRadius: "6px" }}>
                    <strong>Оборудование:</strong> {session.lesson_templates.equipment}
                  </div>
                )}
              </div>
            ) : (
              <span style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)", fontStyle: "italic" }}>
                Специальный урок вне программы. Тема: {session.topic || "Не задана"}
              </span>
            )}

            <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                Быстрый запуск для проектора / доски:
              </span>
              {materials.map((mat) => (
                <div 
                  key={mat.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    background: "var(--color-bg)"
                  }}
                >
                  <span style={{ fontSize: "var(--font-small)", fontWeight: 600 }}>{mat.title}</span>
                  {mat.external_url ? (
                    <a 
                      href={mat.external_url} 
                      target="_blank" 
                      rel="noreferrer"
                      style={{
                        fontSize: "11px",
                        color: "var(--color-primary)",
                        fontWeight: 700,
                        textDecoration: "underline",
                        display: "flex",
                        alignItems: "center",
                        gap: "2px"
                      }}
                    >
                      <span>Открыть</span>
                      <Eye size={12} />
                    </a>
                  ) : (
                    <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Инструкция в тексте</span>
                  )}
                </div>
              ))}
              {materials.length === 0 && (
                <span style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)", fontStyle: "italic" }}>
                  Методические материалы к данному уроку не прикреплены.
                </span>
              )}
            </div>
          </div>

          {/* Issue Homework Section */}
          <div className="card-crm" style={{ background: "white", display: "flex", flexDirection: "column", gap: "16px" }}>
            <h3 style={{ fontSize: "var(--font-h3)", fontFamily: "var(--font-geologica)" }}>
              Выдача домашнего задания
            </h3>

            <form onSubmit={handleAssignHomework} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group">
                <label className="form-label">Шаблон ДЗ</label>
                <select 
                  className="form-input"
                  value={selectedHwTemplateId}
                  onChange={e => setSelectedHwTemplateId(e.target.value)}
                  required
                >
                  <option value="">-- Выберите задание --</option>
                  {homeworkTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.title} ({t.difficulty})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Срок сдачи (Дедлайн)</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={hwDueDate}
                  onChange={e => setHwDueDate(e.target.value)}
                />
              </div>

              <Button 
                type="submit" 
                variant="primary-crm"
                disabled={submittingHw}
                style={{ width: "100%", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
              >
                <Plus size={16} />
                <span>{submittingHw ? "Назначение..." : "Назначить группе"}</span>
              </Button>
            </form>

            <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "16px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
                Уже выдано на занятии:
              </span>
              {assignments.map(as => (
                <div key={as.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--color-border)", fontSize: "var(--font-xs)" }}>
                  <span style={{ fontWeight: 600 }}>{as.homework_templates ? as.homework_templates.title : "Задание"}</span>
                  <span style={{ color: "var(--color-text-muted)" }}>
                    Срок: {as.due_at ? new Date(as.due_at).toLocaleDateString("ru-RU") : "Без срока"}
                  </span>
                </div>
              ))}
              {assignments.length === 0 && (
                <span style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)", fontStyle: "italic" }}>
                  Домашнее задание пока не выдано.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Attendance & Lesson Feedback */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Attendance sheet */}
          <div className="card-crm" style={{ background: "white", display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "var(--font-h3)", fontFamily: "var(--font-geologica)", display: "flex", alignItems: "center", gap: "8px" }}>
                <Users size={20} style={{ color: "var(--color-primary)" }} />
                <span>Журнал посещаемости ({students.length})</span>
              </h3>
            </div>

            <AttendanceRoster
              disabled={session.status === "completed"}
              onSave={handleSaveAttendance}
              onComplete={handleCloseSession}
              saving={savingAttendance}
              completing={closingSession}
              sessionStatus={session.status}
              message={attendanceMessage}
              rows={students.map((student): AttendanceRosterRow => {
                const record = attendance[student.id];
                return {
                  studentId: student.id,
                  studentName: student.full_name,
                  status: record?.attendance_status || "unmarked",
                  comment: record?.comment || "",
                  absenceReason: record?.absence_reason || "",
                  isMakeup: student.isMakeup,
                };
              })}
              onChange={(rows) => setAttendance(Object.fromEntries(rows.map((row) => [row.studentId, {
                student_id: row.studentId,
                is_present: row.status === "present" || row.status === "late",
                attendance_status: row.status,
                comment: row.comment,
                absence_reason: row.absenceReason,
                id: attendance[row.studentId]?.id,
              }])))}
            />
            {attendanceError && <div role="alert" style={{ color: "var(--color-danger)", marginTop: 10, fontSize: 13, fontWeight: 700 }}>{attendanceError}</div>}
          </div>
        </div>

      </div>
      {actionModal}
    </div>
  );
}
