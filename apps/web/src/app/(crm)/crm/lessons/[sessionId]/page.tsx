"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@robotics-crm/ui";
import { 
  ArrowLeft, 
  BookOpen, 
  ClipboardList, 
  CheckCircle, 
  MapPin, 
  Clock, 
  Calendar, 
  Users, 
  Eye, 
  Check, 
  X,
  Plus,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/shared/db/supabase/browser";

interface LessonSession {
  id: string;
  starts_at: string;
  ends_at: string | null;
  status: "planned" | "completed" | "cancelled" | "moved";
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
}

interface AttendanceRecord {
  student_id: string;
  is_present: boolean;
  comment: string;
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
  const [orgId, setOrgId] = useState<string>("");

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

        const activeStudents = enrollmentData?.map((e: any) => e.students).filter(Boolean) || [];
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
            is_present: true, // Default to present
            comment: ""
          };
        });

        // Merge saved attendance
        attendanceData?.forEach((att: any) => {
          attendanceMap[att.student_id] = {
            id: att.id,
            student_id: att.student_id,
            is_present: att.is_present,
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

  const handleToggleAttendance = (studentId: string) => {
    setAttendance(prev => {
      const current = prev[studentId];
      return {
        ...prev,
        [studentId]: {
          ...current,
          is_present: !current.is_present
        }
      };
    });
  };

  const handleAttendanceCommentChange = (studentId: string, comment: string) => {
    setAttendance(prev => {
      const current = prev[studentId];
      return {
        ...prev,
        [studentId]: {
          ...current,
          comment
        }
      };
    });
  };

  const handleSaveAttendance = async () => {
    if (!session) return;
    try {
      setSavingAttendance(true);
      const recordsToUpsert = Object.values(attendance).map(record => ({
        ...(record.id ? { id: record.id } : {}),
        organization_id: orgId,
        group_id: session.group_id,
        student_id: record.student_id,
        lesson_date: new Date(session.starts_at).toISOString().split("T")[0],
        is_present: record.is_present,
        comment: record.comment,
        lesson_session_id: session.id
      }));

      const { error } = await (supabase
        .from("attendance") as any)
        .upsert(recordsToUpsert);

      if (error) throw error;
      alert("Посещаемость успешно сохранена!");
    } catch (err) {
      console.error("Error saving attendance:", err);
      alert("Не удалось сохранить посещаемость");
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleAssignHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !selectedHwTemplateId) return;

    try {
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
    }
  };

  const handleCloseSession = async () => {
    if (!session) return;
    if (!confirm("Вы уверены, что хотите завершить это занятие? Статус сменится на 'Проведено', и оно будет отмечено как завершенное.")) return;

    try {
      // First save attendance to be safe
      await handleSaveAttendance();

      const { error } = await (supabase
        .from("lesson_sessions") as any)
        .update({
          status: "completed",
          completed_at: new Date().toISOString()
        })
        .eq("id", session.id);

      if (error) throw error;

      setSession(prev => prev ? { ...prev, status: "completed" } : null);
      alert("Занятие успешно закрыто!");
    } catch (err) {
      console.error("Error closing session:", err);
      alert("Не удалось завершить занятие");
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
              <span className={`badge ${session.status === "completed" ? "badge-green" : "badge-blue"}`}>
                {session.status === "completed" ? "Проведено" : "Запланировано"}
              </span>
            </div>
            <div style={{ display: "flex", gap: "16px", color: "var(--color-text-muted)", fontSize: "var(--font-small)", marginTop: "4px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Calendar size={14} /> {dateStr}</span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Clock size={14} /> {timeStr}</span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><MapPin size={14} /> {session.rooms ? session.rooms.name : "Каб. 101"}</span>
            </div>
          </div>
          {session.status !== "completed" && (
            <Button variant="primary-crm" style={{ display: "flex", alignItems: "center", gap: "8px" }} onClick={handleCloseSession}>
              <CheckCircle size={16} />
              <span>Завершить занятие</span>
            </Button>
          )}
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
                style={{ width: "100%", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
              >
                <Plus size={16} />
                <span>Назначить группе</span>
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
              {session.status !== "completed" && (
                <Button 
                  variant="secondary-crm" 
                  style={{ height: "32px", padding: "0 12px", fontSize: "11px", borderRadius: "8px" }}
                  onClick={handleSaveAttendance}
                  disabled={savingAttendance}
                >
                  {savingAttendance ? "Сохранение..." : "Сохранить"}
                </Button>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {students.map((student) => {
                const record = attendance[student.id] || { student_id: student.id, is_present: true, comment: "" };

                return (
                  <div 
                    key={student.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      padding: "16px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "10px",
                      background: record.is_present ? "white" : "var(--color-danger-soft)",
                      transition: "all 0.2s",
                      gap: "10px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 700, fontSize: "var(--font-small)" }}>
                        {student.full_name}
                      </span>
                      
                      <button
                        onClick={() => handleToggleAttendance(student.id)}
                        disabled={session.status === "completed"}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "6px 12px",
                          borderRadius: "8px",
                          border: "none",
                          cursor: session.status === "completed" ? "default" : "pointer",
                          background: record.is_present ? "var(--color-success-soft)" : "var(--color-danger)",
                          color: record.is_present ? "var(--color-success)" : "white",
                          fontSize: "11px",
                          fontWeight: 700,
                          transition: "all 0.2s"
                        }}
                      >
                        {record.is_present ? (
                          <>
                            <Check size={12} />
                            <span>Был на уроке</span>
                          </>
                        ) : (
                          <>
                            <X size={12} />
                            <span>Пропустил</span>
                          </>
                        )}
                      </button>
                    </div>

                    <input 
                      type="text"
                      className="form-input"
                      placeholder="Комментарий (активность, успехи, поведение)..."
                      style={{ height: "36px", padding: "0 12px", borderRadius: "8px", fontSize: "12px" }}
                      value={record.comment}
                      onChange={e => handleAttendanceCommentChange(student.id, e.target.value)}
                      disabled={session.status === "completed"}
                    />
                  </div>
                );
              })}

              {students.length === 0 && (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--color-text-muted)", fontSize: "var(--font-small)", border: "1px dashed var(--color-border)", borderRadius: "10px" }}>
                  В этой группе нет активных учеников. Добавьте учеников в группу.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
