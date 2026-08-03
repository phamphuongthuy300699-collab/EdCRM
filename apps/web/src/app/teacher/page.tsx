"use client";

import React, { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/shared/db/supabase/browser";
import { RoboAssistant } from "@/shared/ui/robo-assistant";
import { 
  Users, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Award,
  Sparkles,
  Save,
  MessageSquare
} from "lucide-react";
import { Button } from "@robotics-crm/ui";
import { useRouter } from "next/navigation";
import { isDemoMode } from "@/shared/utils/demo";
import { AttendanceRoster, type AttendanceRosterRow } from "@/features/scheduling/AttendanceRoster";
import type { AttendanceStatus } from "@/features/scheduling/domain";

interface StudentAttendance {
  studentId: string;
  studentName: string;
  isPresent: boolean;
  status: AttendanceStatus;
  comment: string;
  absenceReason?: string;
  isMakeup?: boolean;
  attendanceId?: string;
}

export default function TeacherDashboard() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // States
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [lessonDate, setLessonDate] = useState<string>(() => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()));
  const [studentsAttendance, setStudentsAttendance] = useState<StudentAttendance[]>([]);
  const [saveLoading, setSaveLoading] = useState(false);

  // Lesson Session States
  const [session, setSession] = useState<any>(null);
  const [daySessions, setDaySessions] = useState<any[]>([]);
  const [loadingSession, setLoadingSession] = useState(false);
  const [startingLesson, setStartingLesson] = useState(false);
  const [endingLesson, setEndingLesson] = useState(false);

  // Fallback demo values
  const demoTeacher = {
    full_name: "Демо Преподаватель",
    phone: "+7 (999) 444-55-66"
  };

  const demoGroups = [
    { id: "g1", title: "LEGO Start 1", courseName: "Робототехника (Lego Education)", time: "Вторник / Четверг 17:00", organization_id: "7f8d5918-a6fe-4fbe-9b37-236b28ee2e7b", course_id: "4f8d5918-a6fe-4fbe-9b37-236b28ee2e7a" },
    { id: "g2", title: "Scratch Basic", courseName: "Программирование на Scratch", time: "Суббота 11:00", organization_id: "7f8d5918-a6fe-4fbe-9b37-236b28ee2e7b", course_id: "1d0d97b0-cbe6-444a-a006-2c5e533ebbbd" }
  ];

  const demoStudents = [
    { id: "s1", full_name: "Игорь Петров" },
    { id: "s2", full_name: "Данил Соловьев" },
    { id: "s3", full_name: "Кирилл Семенов" }
  ];

  useEffect(() => {
    async function loadTeacherData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        const isDemo = isDemoMode();

        if (isDemo) {
          setTeacherProfile(demoTeacher);
          setGroups(demoGroups);
          if (demoGroups.length > 0) {
            setSelectedGroupId(demoGroups[0].id);
          }
          setLoading(false);
          return;
        }

        if (!user) {
          router.push("/login");
          return;
        }

        // Query profile
        const { data: profile } = await (supabase
          .from("profiles") as any)
          .select("*")
          .eq("id", user.id)
          .single();

        setTeacherProfile(profile || { full_name: "Преподаватель", phone: "" });

        // Query groups where teacher_id = user.id
        const { data: groupsData } = await (supabase.from("groups") as any)
          .select(`
            id,
            title,
            organization_id,
            course_id,
            courses (title)
          `)
          .eq("teacher_id", user.id);

        if (groupsData && groupsData.length > 0) {
          const formatted = groupsData.map((g: any) => ({
            id: g.id,
            title: g.title,
            courseName: g.courses?.title || "Робототехника",
            time: "Пн / Чт 18:00",
            organization_id: g.organization_id,
            course_id: g.course_id
          }));
          setGroups(formatted);
          setSelectedGroupId(formatted[0].id);
        } else {
          setGroups([]);
          setSelectedGroupId("");
        }
      } catch (err) {
        console.error("Error loading teacher portal data:", err);
        setTeacherProfile(demoTeacher);
        setGroups(demoGroups);
        setSelectedGroupId(demoGroups[0].id);
      } finally {
        setLoading(false);
      }
    }

    loadTeacherData();
  }, []);

  // Fetch lesson session when group or date changes
  useEffect(() => {
    if (!selectedGroupId) {
      setSession(null);
      return;
    }

    async function loadSession() {
      try {
        setLoadingSession(true);
        const isDemo = isDemoMode();
        const { data: { user } } = await supabase.auth.getUser();

        if (isDemo || !user) {
          setSession({
            status: "planned",
            materials_unlocked: false
          });
          setDaySessions([]);
          return;
        }

        const response = await fetch(`/api/crm/schedule?dateFrom=${lessonDate}&dateTo=${lessonDate}&groupId=${selectedGroupId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Не удалось загрузить занятия");
        const actual = (data.sessions || []).filter((item: any) => item.status !== "moved");
        setDaySessions(actual);
        setSession(actual[0] || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSession(false);
      }
    }

    loadSession();
  }, [selectedGroupId, lessonDate]);

  // Fetch students and attendance when group or date changes
  useEffect(() => {
    if (!selectedGroupId) return;

    async function loadAttendanceForGroup() {
      try {
        const isDemo = isDemoMode();
        const { data: { user } } = await supabase.auth.getUser();

        if (isDemo || !user) {
          // Load demo students
          const mapped = demoStudents.map(student => ({
            studentId: student.id,
            studentName: student.full_name,
            isPresent: true,
            status: "present" as const,
            comment: ""
          }));
          setStudentsAttendance(mapped);
          return;
        }

        // 1. Fetch active enrollments for group
        const { data: enrollments } = await (supabase.from("enrollments") as any)
          .select(`
            student_id,
            students (id, full_name)
          `)
          .eq("group_id", selectedGroupId)
          .eq("status", "active");

        const studentsList = (enrollments as any[])?.map((e: any) => ({
          id: e.students?.id || e.student_id,
          full_name: e.students?.full_name || "Неизвестный ученик",
          isMakeup: false,
        })) || [];

        if (session?.id) {
          const { data: makeupRows } = await (supabase.from("makeup_assignments") as any)
            .select("student_id, students(id, full_name)")
            .eq("target_session_id", session.id)
            .eq("status", "scheduled");
          for (const makeup of makeupRows || []) {
            if (!studentsList.some((student: any) => student.id === makeup.student_id)) {
              studentsList.push({ id: makeup.students?.id || makeup.student_id, full_name: makeup.students?.full_name || "Ученик на отработке", isMakeup: true });
            }
          }
        }

        if (studentsList.length === 0) {
          setStudentsAttendance([]);
          return;
        }

        // 2. Fetch attendance marks for this group & date
        let attendanceQuery = (supabase.from("attendance") as any).select("*");
        attendanceQuery = session?.id ? attendanceQuery.eq("lesson_session_id", session.id) : attendanceQuery.eq("group_id", selectedGroupId).eq("lesson_date", lessonDate);
        const { data: attendanceData } = await attendanceQuery;

        const attendanceMap = new Map();
        (attendanceData as any[])?.forEach(a => {
          attendanceMap.set(a.student_id, a);
        });

        // 3. Map students to attendance rows
        const mappedAttendance = studentsList.map(student => {
          const mark = attendanceMap.get(student.id);
          return {
            studentId: student.id,
            studentName: student.full_name,
            isPresent: mark ? mark.is_present : false,
            status: (mark?.attendance_status || (mark ? (mark.is_present ? "present" : "absent_unexcused") : "unmarked")) as AttendanceStatus,
            comment: mark ? (mark.comment || "") : "",
            absenceReason: mark?.absence_reason || "",
            isMakeup: student.isMakeup,
            attendanceId: mark?.id
          };
        });

        setStudentsAttendance(mappedAttendance);
      } catch (err) {
        console.error("Error loading group attendance:", err);
      }
    }

    loadAttendanceForGroup();
  }, [selectedGroupId, lessonDate, session?.id]);

  const handleTogglePresent = (studentId: string) => {
    setStudentsAttendance(prev => 
      prev.map(row => 
        row.studentId === studentId ? { ...row, isPresent: !row.isPresent } : row
      )
    );
  };

  const handleCommentChange = (studentId: string, val: string) => {
    setStudentsAttendance(prev => 
      prev.map(row => 
        row.studentId === studentId ? { ...row, comment: val } : row
      )
    );
  };

  const handleSaveAttendance = async () => {
    try {
      setSaveLoading(true);
      const isDemo = isDemoMode();
      const { data: { user } } = await supabase.auth.getUser();

      if (isDemo || !user) {
        alert("Посещаемость успешно сохранена (Демо-режим)!");
        setSaveLoading(false);
        return;
      }

      if (!session?.id) throw new Error("Сначала выберите или начните конкретное занятие");
      const response = await fetch("/api/crm/schedule", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "save_attendance",
          sessionId: session.id,
          records: studentsAttendance.map((row) => ({ studentId: row.studentId, status: row.status, comment: row.comment, absenceReason: row.absenceReason || "" })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Не удалось сохранить посещаемость");
      alert("Журнал посещаемости и отзывы успешно сохранены!");
    } catch (err: any) {
      console.error(err);
      alert("Не удалось сохранить посещаемость: " + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleStartLesson = async () => {
    if (!selectedGroupId || startingLesson) return;
    try {
      setStartingLesson(true);
      const isDemo = isDemoMode();
      const { data: { user } } = await supabase.auth.getUser();

      if (isDemo || !user) {
        setSession({
          status: "live",
          materials_unlocked: true,
          started_at: new Date().toISOString()
        });
        alert("Урок начат! Допуск к учебным материалам для учеников открыт (Демо-режим).");
        return;
      }

      // Check if session is already completed in DB
      const { data: currentSess } = await (supabase
        .from("lesson_sessions") as any)
        .select("status")
        .eq("group_id", selectedGroupId)
        .eq("lesson_date", lessonDate)
        .maybeSingle();

      if (currentSess?.status === "completed") {
        alert("Этот урок уже завершен и не может быть начат повторно.");
        setSession(currentSess);
        return;
      }

      // Real database update or insert
      const currentGroup = groups.find(g => g.id === selectedGroupId);
      if (!currentGroup) return;

      const orgId = currentGroup.organization_id;
      const courseId = currentGroup.course_id || null;

      const sessionData = {
        organization_id: orgId,
        group_id: selectedGroupId,
        course_id: courseId,
        lesson_date: lessonDate,
        status: "live" as const,
        materials_unlocked: true,
        started_at: new Date().toISOString(),
        starts_at: new Date(`${lessonDate}T${new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Moscow", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(new Date())}+03:00`).toISOString(),
        teacher_id: user.id
      };

      const { data, error } = await (supabase
        .from("lesson_sessions") as any)
        .insert(sessionData)
        .select()
        .single();

      if (error) throw error;
      setSession(data);
      setDaySessions((previous) => [...previous, data]);
      alert("Урок успешно запущен! Материалы урока разблокированы для учеников на сегодня.");
    } catch (err: any) {
      console.error(err);
      alert("Не удалось запустить урок: " + err.message);
    } finally {
      setStartingLesson(false);
    }
  };

  const handleEndLesson = async () => {
    if (!selectedGroupId || !session || endingLesson) return;
    try {
      setEndingLesson(true);
      const isDemo = isDemoMode();
      const { data: { user } } = await supabase.auth.getUser();

      if (isDemo || !user) {
        setSession({
          ...session,
          status: "completed",
          completed_at: new Date().toISOString()
        });
        alert("Урок завершен (Демо-режим)!");
        return;
      }

      const { data, error } = await (supabase
        .from("lesson_sessions") as any)
        .update({
          status: "completed" as const,
          completed_at: new Date().toISOString()
        })
        .eq("id", session.id)
        .select()
        .single();

      if (error) throw error;
      setSession(data);
      alert("Урок успешно завершен!");
    } catch (err: any) {
      console.error(err);
      alert("Не удалось завершить урок: " + err.message);
    } finally {
      setEndingLesson(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <p style={{ fontWeight: 600, color: "var(--color-text-muted)" }}>Загрузка кабинета преподавателя...</p>
      </div>
    );
  }

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Welcome Banner */}
      <div style={{
        background: "white",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-card-site)",
        padding: "24px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
        display: "flex",
        flexDirection: "column",
        gap: "16px"
      }}>
        <div>
          <h1 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", color: "var(--color-text)", marginBottom: "4px" }}>
            Приветствуем, {teacherProfile?.full_name || demoTeacher.full_name}!
          </h1>
          <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>
            Сегодня отличный день для обучения будущих инженеров!
          </p>
        </div>

        <div style={{ borderTop: "1px dashed var(--color-border)", paddingTop: "16px" }}>
          <RoboAssistant 
            context="teacher-portal" 
            mood="happy" 
            message="Преподаватель — лицо нашей лаборатории. Написание хороших отзывов для родителей мотивирует их продолжать обучение! 🦾" 
            size="md" 
          />
        </div>
      </div>

      {/* Main Form Grid */}
      {groups.length === 0 ? (
        <div className="card-crm" style={{ background: "white", padding: "48px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <Users size={48} style={{ color: "var(--color-text-muted)", opacity: 0.5 }} />
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Нет активных групп</h3>
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-small)", marginTop: "8px" }}>
              У вас пока нет назначенных учебных групп. Свяжитесь с администратором CRM для добавления вас в качестве преподавателя.
            </p>
          </div>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "280px 1fr",
          gap: "32px",
          alignItems: "flex-start"
        }}>
          {/* Sidebar settings: Date & Group selection */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Select Group */}
            <div className="card-crm" style={{ background: "white" }}>
              <h3 style={{ fontSize: "var(--font-small)", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <Users size={16} style={{ color: "var(--color-primary)" }} />
                <span>Выберите класс</span>
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {groups.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGroupId(g.id)}
                    style={{
                      padding: "12px",
                      borderRadius: "8px",
                      border: selectedGroupId === g.id ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
                      background: selectedGroupId === g.id ? "var(--color-primary-soft)" : "transparent",
                      color: selectedGroupId === g.id ? "var(--color-primary-dark)" : "var(--color-text)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.2s"
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: "13px" }}>{g.title}</div>
                    <div style={{ fontSize: "10px", color: "var(--color-text-muted)", marginTop: "2px" }}>{g.courseName}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Select Date */}
            <div className="card-crm" style={{ background: "white" }}>
              <h3 style={{ fontSize: "var(--font-small)", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <Calendar size={16} style={{ color: "var(--color-primary)" }} />
                <span>Дата урока</span>
              </h3>
              <input
                type="date"
                className="form-input"
                value={lessonDate}
                onChange={(e) => setLessonDate(e.target.value)}
                style={{ borderRadius: "8px", height: "40px" }}
              />
              {daySessions.length > 0 && (
                <label style={{ display: "grid", gap: 5, marginTop: 12, fontSize: 11, color: "var(--color-text-muted)" }}>Конкретное занятие
                  <select className="form-input" value={session?.id || ""} onChange={(event) => setSession(daySessions.find((item) => item.id === event.target.value) || null)} style={{ height: 40 }}>
                    {daySessions.map((item) => <option key={item.id} value={item.id}>{new Date(item.starts_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} · {item.session_kind === "makeup" ? "Отработка" : item.status === "cancelled" ? "Отменено" : "Занятие"}</option>)}
                  </select>
                </label>
              )}
            </div>

            {/* Lesson Control Card */}
            {selectedGroupId && (
              <div className="card-crm" style={{ background: "white" }}>
                <h3 style={{ fontSize: "var(--font-small)", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                  <Sparkles size={16} style={{ color: "var(--color-primary)" }} />
                  <span>Управление уроком</span>
                </h3>
                
                {loadingSession ? (
                  <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Загрузка сессии...</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 600 }}>
                      Статус:{" "}
                      {(!session || session.status === "planned") && (
                        <span className="badge badge-blue">Запланирован</span>
                      )}
                      {session?.status === "live" && (
                        <span className="badge badge-green">Идет урок</span>
                      )}
                      {session?.status === "completed" && (
                        <span className="badge badge-gray">Завершен</span>
                      )}
                    </div>
                    
                    {(!session || session.status === "planned") && (
                      <Button 
                        onClick={handleStartLesson}
                        variant="primary-crm"
                        style={{ width: "100%", height: "36px", fontSize: "12px" }}
                      >
                        Начать урок 🚀
                      </Button>
                    )}

                    {session?.status === "live" && (
                      <Button 
                        onClick={handleEndLesson}
                        variant="secondary-site"
                        style={{ width: "100%", height: "36px", fontSize: "12px", border: "1px solid var(--color-danger)", color: "var(--color-danger)" }}
                      >
                        Завершить урок 🏁
                      </Button>
                    )}

                    {session?.status === "completed" && (
                      <div style={{ fontSize: "11px", color: "var(--color-text-muted)", fontStyle: "italic" }}>
                        Материалы закрыты для редактирования, занятие окончено.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Attendance Attendance Marks & Review Journal */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div className="card-crm" style={{ background: "white" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-border)", paddingBottom: "16px", marginBottom: "20px" }}>
                <div>
                  <h2 style={{ fontSize: "1.2rem", fontWeight: 800 }}>
                    Журнал: {selectedGroup?.title || "Загрузка..."}
                  </h2>
                  <p style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)", margin: 0 }}>
                    Отметьте присутствие учеников и напишите комментарий к работе
                  </p>
                </div>

                <Button
                  onClick={handleSaveAttendance}
                  disabled={saveLoading || studentsAttendance.length === 0}
                  variant="primary-crm"
                  style={{ display: "flex", alignItems: "center", gap: "8px", height: "40px" }}
                >
                  <Save size={16} />
                  <span>{saveLoading ? "Сохранение..." : "Сохранить посещаемость"}</span>
                </Button>
              </div>

              <AttendanceRoster
                rows={studentsAttendance.map((row): AttendanceRosterRow => ({ studentId: row.studentId, studentName: row.studentName, status: row.status, comment: row.comment, absenceReason: row.absenceReason, isMakeup: row.isMakeup }))}
                disabled={session?.status === "completed"}
                onChange={(rows) => setStudentsAttendance(rows.map((row) => ({ ...row, isPresent: row.status === "present" || row.status === "late", attendanceId: studentsAttendance.find((item) => item.studentId === row.studentId)?.attendanceId })))}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
