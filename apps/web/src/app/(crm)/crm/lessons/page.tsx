"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@robotics-crm/ui";
import { 
  Calendar, 
  Search, 
  Filter, 
  MapPin, 
  User, 
  Clock, 
  ChevronRight, 
  CheckCircle2, 
  Play, 
  FileText,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/shared/db/supabase/browser";

interface LessonSession {
  id: string;
  starts_at: string;
  ends_at: string | null;
  status: "planned" | "completed" | "cancelled" | "moved" | "live";
  topic: string | null;
  groups: { title: string } | null;
  courses: { title: string } | null;
  lesson_templates: { id: string; title: string } | null;
  profiles: { full_name: string } | null; // Teacher
  rooms: { name: string } | null;
}

export default function LessonsPage() {
  const [sessions, setSessions] = useState<LessonSession[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [teacherFilter, setTeacherFilter] = useState<string>("all");
  const [teachers, setTeachers] = useState<any[]>([]);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Get org
        const orgRes = await supabase.from("organizations").select("id").eq("slug", "robotics-lipetsk").single() as any;
        if (!orgRes.data) throw new Error("Organization not found");

        // Fetch teachers
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name");
        setTeachers(profilesData || []);

        // Fetch sessions
        const { data: sessionsData, error } = await supabase
          .from("lesson_sessions")
          .select(`
            id,
            starts_at,
            ends_at,
            status,
            topic,
            groups (title),
            courses (title),
            lesson_templates (id, title),
            profiles (full_name),
            rooms (name)
          `)
          .eq("organization_id", orgRes.data.id)
          .order("starts_at", { ascending: false });

        if (error) throw error;
        setSessions((sessionsData as any) || []);
      } catch (err) {
        console.error("Error loading sessions:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "planned": return <span className="badge badge-blue">Запланировано</span>;
      case "completed": return <span className="badge badge-green">Проведено</span>;
      case "cancelled": return <span className="badge badge-red">Отменено</span>;
      case "moved": return <span className="badge badge-amber">Перенесено</span>;
      case "live": return <span className="badge badge-green animation-pulse" style={{ background: "var(--color-success)", color: "white" }}>Идет урок</span>;
      default: return <span className="badge badge-gray">{status}</span>;
    }
  };

  const filteredSessions = sessions.filter(session => {
    const matchesStatus = statusFilter === "all" || session.status === statusFilter;
    const matchesTeacher = teacherFilter === "all" || (session.profiles && session.profiles.full_name === teacherFilter);
    return matchesStatus && matchesTeacher;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", color: "var(--color-text)", marginBottom: "4px" }}>
            Расписание занятий
          </h1>
          <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>
            Предстоящие и проведенные уроки преподавателей, посещаемость и выдача домашних заданий
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card-crm" style={{ padding: "16px 24px", display: "flex", gap: "20px", alignItems: "center", background: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--color-text-muted)", fontSize: "var(--font-small)", fontWeight: 600 }}>
          <Filter size={16} />
          <span>Фильтры:</span>
        </div>

        <div style={{ display: "flex", gap: "16px", flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <select 
              className="form-input"
              style={{ height: "36px", padding: "0 12px", borderRadius: "8px", fontSize: "12px", width: "160px" }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">Все статусы</option>
              <option value="live">Идет урок</option>
              <option value="planned">Запланировано</option>
              <option value="completed">Проведено</option>
              <option value="cancelled">Отменено</option>
              <option value="moved">Перенесено</option>
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <select 
              className="form-input"
              style={{ height: "36px", padding: "0 12px", borderRadius: "8px", fontSize: "12px", width: "200px" }}
              value={teacherFilter}
              onChange={e => setTeacherFilter(e.target.value)}
            >
              <option value="all">Все преподаватели</option>
              {teachers.map(t => (
                <option key={t.id} value={t.full_name}>{t.full_name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Sessions Grid / Table */}
      {loading ? (
        <div style={{ color: "var(--color-text-muted)", padding: "40px", textAlign: "center" }}>Загрузка занятий...</div>
      ) : (
        <div className="card-crm" style={{ padding: 0, overflow: "hidden", background: "white" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-bg)" }}>
                <th style={{ padding: "16px 24px", fontSize: "var(--font-xs)", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Дата и время</th>
                <th style={{ padding: "16px 24px", fontSize: "var(--font-xs)", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Группа / Курс</th>
                <th style={{ padding: "16px 24px", fontSize: "var(--font-xs)", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Тема / Урок</th>
                <th style={{ padding: "16px 24px", fontSize: "var(--font-xs)", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Кабинет / Преподаватель</th>
                <th style={{ padding: "16px 24px", fontSize: "var(--font-xs)", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Статус</th>
                <th style={{ padding: "16px 24px", fontSize: "var(--font-xs)", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.map((session) => {
                const date = new Date(session.starts_at);
                const timeStr = date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
                const dateStr = date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

                return (
                  <tr 
                    key={session.id} 
                    style={{ 
                      borderBottom: "1px solid var(--color-border)", 
                      transition: "background 0.2s" 
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--color-bg)"}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    {/* Time */}
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <Calendar size={18} style={{ color: "var(--color-primary)" }} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "var(--font-small)" }}>{dateStr}</div>
                          <div style={{ fontSize: "11px", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                            <Clock size={10} />
                            <span>{timeStr}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Group & Course */}
                    <td style={{ padding: "16px 24px" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "var(--font-small)" }}>
                          {session.groups ? session.groups.title : "Без группы"}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                          {session.courses ? session.courses.title : "Робототехника"}
                        </div>
                      </div>
                    </td>

                    {/* Topic */}
                    <td style={{ padding: "16px 24px" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "var(--font-small)" }}>
                          {session.lesson_templates ? (
                            <Link href={`/crm/materials/${session.lesson_templates.id}`} style={{ color: "var(--color-primary)", textDecoration: "underline" }}>
                              {session.lesson_templates.title}
                            </Link>
                          ) : (
                            session.topic || "Тема не задана"
                          )}
                        </div>
                        {session.topic && session.lesson_templates && (
                          <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                            {session.topic}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Cabinet & Teacher */}
                    <td style={{ padding: "16px 24px" }}>
                      <div>
                        <div style={{ fontSize: "var(--font-small)", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                          <MapPin size={12} style={{ color: "var(--color-text-muted)" }} />
                          <span>{session.rooms ? session.rooms.name : "Кабинет 101"}</span>
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                          <User size={12} />
                          <span>{session.profiles ? session.profiles.full_name : "Не назначен"}</span>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: "16px 24px" }}>
                      {getStatusBadge(session.status)}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "16px 24px", textAlign: "right" }}>
                      <Link href={`/crm/lessons/${session.id}`}>
                        {session.status === "completed" ? (
                          <Button 
                            variant="secondary-crm" 
                            style={{ 
                              display: "inline-flex", 
                              alignItems: "center", 
                              gap: "4px", 
                              height: "32px", 
                              fontSize: "11px", 
                              padding: "0 12px", 
                              borderRadius: "8px" 
                            }}
                          >
                            <FileText size={12} />
                            <span>Журнал</span>
                          </Button>
                        ) : session.status === "live" ? (
                          <Button 
                            variant="primary-crm" 
                            style={{ 
                              display: "inline-flex", 
                              alignItems: "center", 
                              gap: "4px", 
                              height: "32px", 
                              fontSize: "11px", 
                              padding: "0 12px", 
                              borderRadius: "8px",
                              background: "var(--color-success)",
                              color: "white"
                            }}
                          >
                            <span>Следить</span>
                          </Button>
                        ) : (
                          <Button 
                            variant="primary-crm" 
                            style={{ 
                              display: "inline-flex", 
                              alignItems: "center", 
                              gap: "4px", 
                              height: "32px", 
                              fontSize: "11px", 
                              padding: "0 12px", 
                              borderRadius: "8px" 
                            }}
                          >
                            <Play size={12} fill="white" />
                            <span>Провести</span>
                          </Button>
                        )}
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {filteredSessions.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: "48px", textAlign: "center", color: "var(--color-text-muted)" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                      <AlertCircle size={32} />
                      <span>Занятия по выбранным фильтрам не найдены.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
