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

interface StudentAttendance {
  studentId: string;
  studentName: string;
  isPresent: boolean;
  comment: string;
  attendanceId?: string;
}

export default function TeacherDashboard() {
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(true);
  
  // States
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [lessonDate, setLessonDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [studentsAttendance, setStudentsAttendance] = useState<StudentAttendance[]>([]);
  const [saveLoading, setSaveLoading] = useState(false);

  // Fallback demo values
  const demoTeacher = {
    full_name: "Демо Преподаватель",
    phone: "+7 (999) 444-55-66"
  };

  const demoGroups = [
    { id: "g1", title: "LEGO Start 1", courseName: "Робототехника (Lego Education)", time: "Вторник / Четверг 17:00" },
    { id: "g2", title: "Scratch Basic", courseName: "Программирование на Scratch", time: "Суббота 11:00" }
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

        if (!user) {
          // Local fallback
          setTeacherProfile(demoTeacher);
          setGroups(demoGroups);
          if (demoGroups.length > 0) {
            setSelectedGroupId(demoGroups[0].id);
          }
          setLoading(false);
          return;
        }

        // Query profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        setTeacherProfile(profile || demoTeacher);

        // Query groups where teacher_id = user.id
        const { data: groupsData } = await (supabase.from("groups") as any)
          .select(`
            id,
            title,
            courses (title)
          `)
          .eq("teacher_id", user.id);

        if (groupsData && groupsData.length > 0) {
          const formatted = groupsData.map((g: any) => ({
            id: g.id,
            title: g.title,
            courseName: g.courses?.title || "Робототехника",
            time: "Пн / Чт 18:00 (демо)"
          }));
          setGroups(formatted);
          setSelectedGroupId(formatted[0].id);
        } else {
          setGroups(demoGroups);
          setSelectedGroupId(demoGroups[0].id);
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

  // Fetch students and attendance when group or date changes
  useEffect(() => {
    if (!selectedGroupId) return;

    async function loadAttendanceForGroup() {
      try {
        const isDemo = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
        const { data: { user } } = await supabase.auth.getUser();

        if (isDemo || !user) {
          // Load demo students
          const mapped = demoStudents.map(student => ({
            studentId: student.id,
            studentName: student.full_name,
            isPresent: true,
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
          full_name: e.students?.full_name || "Неизвестный ученик"
        })) || [];

        if (studentsList.length === 0) {
          // If no real students enrolled, use demo ones for presentation liveness
          const mapped = demoStudents.map(student => ({
            studentId: student.id,
            studentName: student.full_name,
            isPresent: true,
            comment: ""
          }));
          setStudentsAttendance(mapped);
          return;
        }

        // 2. Fetch attendance marks for this group & date
        const { data: attendanceData } = await (supabase.from("attendance") as any)
          .select("*")
          .eq("group_id", selectedGroupId)
          .eq("lesson_date", lessonDate);

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
            isPresent: mark ? mark.is_present : true, // default present
            comment: mark ? (mark.comment || "") : "",
            attendanceId: mark?.id
          };
        });

        setStudentsAttendance(mappedAttendance);
      } catch (err) {
        console.error("Error loading group attendance:", err);
      }
    }

    loadAttendanceForGroup();
  }, [selectedGroupId, lessonDate]);

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
      const isDemo = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      const { data: { user } } = await supabase.auth.getUser();

      if (isDemo || !user) {
        alert("Посещаемость успешно сохранена (Демо-режим)!");
        setSaveLoading(false);
        return;
      }

      // Fetch organization ID
      const orgRes = await (supabase.from("organizations") as any)
        .select("id")
        .eq("slug", "robotics-lipetsk")
        .single();
      
      if (!orgRes.data) throw new Error("Organization not found");
      const organizationId = orgRes.data.id;

      // Map rows for database insertion
      const rows = studentsAttendance.map(row => ({
        ...(row.attendanceId ? { id: row.attendanceId } : {}),
        organization_id: organizationId,
        group_id: selectedGroupId,
        student_id: row.studentId,
        lesson_date: lessonDate,
        is_present: row.isPresent,
        comment: row.comment || null
      }));

      const { error } = await (supabase.from("attendance") as any).upsert(rows, {
        onConflict: "group_id,student_id,lesson_date"
      });

      if (error) throw error;
      alert("Журнал посещаемости и отзывы успешно сохранены!");
    } catch (err: any) {
      console.error(err);
      alert("Не удалось сохранить посещаемость: " + err.message);
    } finally {
      setSaveLoading(false);
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
          </div>
        </div>

        {/* Attendance Marks & Review Journal */}
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

            {/* Students List */}
            {studentsAttendance.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <p style={{ color: "var(--color-text-muted)" }}>Нет учеников в этой группе</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {studentsAttendance.map((row) => (
                  <div 
                    key={row.studentId}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 1fr 2fr",
                      gap: "20px",
                      alignItems: "center",
                      padding: "16px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "10px",
                      background: row.isPresent ? "white" : "rgba(239, 68, 68, 0.02)"
                    }}
                  >
                    {/* Name */}
                    <div>
                      <span style={{ fontWeight: 700, color: "var(--color-text)" }}>{row.studentName}</span>
                    </div>

                    {/* Presence Toggle */}
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => handleTogglePresent(row.studentId)}
                        style={{
                          flex: 1,
                          height: "36px",
                          borderRadius: "6px",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: 700,
                          fontSize: "12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                          background: row.isPresent ? "var(--color-success-soft)" : "var(--color-bg)",
                          color: row.isPresent ? "var(--color-success)" : "var(--color-text-muted)"
                        }}
                      >
                        <CheckCircle size={14} />
                        Был
                      </button>
                      <button
                        onClick={() => handleTogglePresent(row.studentId)}
                        style={{
                          flex: 1,
                          height: "36px",
                          borderRadius: "6px",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: 700,
                          fontSize: "12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                          background: !row.isPresent ? "var(--color-danger-soft)" : "var(--color-bg)",
                          color: !row.isPresent ? "var(--color-danger)" : "var(--color-text-muted)"
                        }}
                      >
                        <XCircle size={14} />
                        Н/Б
                      </button>
                    </div>

                    {/* Feedback Comment */}
                    <div style={{ position: "relative" }}>
                      <MessageSquare size={14} style={{
                        position: "absolute",
                        left: "10px",
                        top: "11px",
                        color: "var(--color-text-muted)"
                      }} />
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Например: Отличный робот-сумоист, сам настроил датчик!"
                        value={row.comment}
                        onChange={(e) => handleCommentChange(row.studentId, e.target.value)}
                        style={{
                          paddingLeft: "32px",
                          fontSize: "var(--font-small)",
                          height: "36px",
                          borderRadius: "6px"
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
