"use client";

import React, { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/shared/db/supabase/browser";
import { RoboAssistant } from "@/shared/ui/robo-assistant";
import { isDemoMode } from "@/shared/utils/demo";
import { 
  BookOpen, 
  Clock, 
  Award, 
  Sparkles, 
  FileText, 
  Lock, 
  CheckCircle, 
  HelpCircle, 
  ArrowRight, 
  LogOut 
} from "lucide-react";
import { Button } from "@robotics-crm/ui";
import { useRouter } from "next/navigation";

interface Material {
  id: string;
  title: string;
  type: string;
  file_url: string | null;
  external_url: string | null;
  content: string | null;
}

export default function StudentPortal() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [group, setGroup] = useState<any>(null);
  const [sessionToday, setSessionToday] = useState<any>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isPastSession, setIsPastSession] = useState(false);
  const [homeworks, setHomeworks] = useState<any[]>([]);

  // Demo toggler
  const [demoActiveSession, setDemoActiveSession] = useState(false);

  const demoStudent = {
    id: "s2",
    full_name: "Данил Соловьев",
    age: 9
  };

  const demoGroup = {
    id: "g1",
    title: "LEGO Start 1",
    courseName: "Робототехника (Lego Education)",
    schedule: "Вторник / Четверг 17:00",
    teacherName: "Алексей Дмитриев"
  };

  const demoMaterials: Material[] = [
    { id: "m1", title: "Сборка шагающего робота-паука (Схема)", type: "build_scheme", file_url: "#", external_url: null, content: "Используйте средние моторы и повышающую передачу 1:3." },
    { id: "m2", title: "Алгоритм обхода препятствий (Scratch код)", type: "code_listing", file_url: "#", external_url: null, content: "Блок: если датчик расстояния < 15 см, то повернуть на 90 градусов." },
    { id: "m3", title: "Домашнее задание: Урок 3", type: "homework", file_url: "#, ", external_url: null, content: "Улучшить код, добавив звуковой сигнал при повороте." }
  ];

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  useEffect(() => {
    async function loadStudentData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        const isDemo = isDemoMode();

        if (isDemo) {
          setProfile({ full_name: "Данил Соловьев" });
          setStudentInfo(demoStudent);
          setGroup(demoGroup);
          setLoading(false);
          return;
        }

        if (!user) {
          router.push("/login");
          return;
        }

        setProfile(user);

        // Fetch student linked to this user profile strictly via student_users
        const { data: linkData } = await (supabase
          .from("student_users") as any)
          .select(`
            student_id,
            students (
              id,
              full_name,
              birth_date,
              enrollments (
                group_id,
                groups (
                  id,
                  title,
                  teacher_id,
                  courses (title),
                  profiles (full_name)
                )
              )
            )
          `)
          .eq("user_id", user.id)
          .maybeSingle();

        const student = linkData?.students;

        if (!student) {
          setStudentInfo(null);
          setGroup(null);
          setLoading(false);
          return;
        }

        let ageNum = 8;
        if (student.birth_date) {
          const diffMs = Date.now() - new Date(student.birth_date).getTime();
          ageNum = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
        }

        setStudentInfo({
          id: student.id,
          full_name: student.full_name,
          age: ageNum
        });

        // Get active group
        const activeEnroll = student.enrollments?.find((e: any) => e.groups) || null;
        if (activeEnroll) {
          const gData = activeEnroll.groups;
          setGroup({
            id: gData.id,
            title: gData.title,
            courseName: gData.courses?.title || "Робототехника",
            schedule: "Расписание группы",
            teacherName: gData.profiles?.full_name || "Инженер-наставник"
          });
        } else {
          setGroup(null);
        }
      } catch (err) {
        console.error("Error loading student portal data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStudentData();
  }, []);

  useEffect(() => {
    if (!group || !group.id) return;
    const isDemo = isDemoMode();

    if (isDemo || (typeof group.id === "string" && group.id.startsWith("g"))) {
      if (demoActiveSession) {
        setSessionToday({
          status: "live",
          materials_unlocked: true,
          lesson_template_id: "demo-template"
        });
        setMaterials(demoMaterials);
      } else {
        setSessionToday(null);
        setMaterials([]);
      }

      setHomeworks([
        {
          id: "hw1",
          due_at: new Date(Date.now() + 86400000 * 2).toISOString(),
          status: "assigned",
          homework_templates: {
            title: "Сборка базовой тележки",
            description: "Соберите модель колесного робота по инструкции и запрограммируйте движение по квадрату.",
            difficulty: "Средняя",
            estimated_minutes: 40
          }
        }
      ]);
      return;
    }

    async function loadTodaySessionAndHomeworks() {
      try {
        const todayDate = new Date().toISOString().split("T")[0];
        const { data: liveSess } = await (supabase
          .from("lesson_sessions") as any)
          .select("*")
          .eq("group_id", group.id)
          .eq("lesson_date", todayDate)
          .eq("status", "live")
          .maybeSingle();

        let sess = liveSess;
        let isPast = false;

        if (!sess) {
          const { data: completedSess } = await (supabase
            .from("lesson_sessions") as any)
            .select("*")
            .eq("group_id", group.id)
            .eq("status", "completed")
            .order("starts_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (completedSess) {
            sess = completedSess;
            isPast = true;
          }
        }

        setSessionToday(sess);
        setIsPastSession(isPast);

        if (sess && sess.materials_unlocked && (sess.status === "live" || sess.status === "completed")) {
          // Fetch student visible materials for this lesson template strictly
          if (sess.lesson_template_id) {
            const { data: mats } = await (supabase
              .from("lesson_materials") as any)
              .select("id, title, type, file_url, external_url, content")
              .eq("lesson_template_id", sess.lesson_template_id)
              .in("visibility", ["student_visible", "parent_visible", "public_preview"])
              .order("sort_order");

            setMaterials(mats || []);
          } else {
            setMaterials([]);
          }
        } else {
          setMaterials([]);
        }

        // Fetch homework assignments
        const { data: hwData } = await (supabase
          .from("homework_assignments") as any)
          .select(`
            id,
            due_at,
            status,
            homework_templates (
              title,
              description,
              difficulty,
              estimated_minutes
            )
          `)
          .eq("group_id", group.id)
          .order("created_at", { ascending: false });

        setHomeworks(hwData || []);
      } catch (err) {
        console.error("Error loading session/materials/homework:", err);
      }
    }

    loadTodaySessionAndHomeworks();
  }, [group, demoActiveSession]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "var(--color-bg)" }}>
        <p style={{ fontWeight: 600, color: "var(--color-text-muted)" }}>Загрузка личного кабинета ученика...</p>
      </div>
    );
  }

  const isUnlocked = sessionToday && (sessionToday.status === "live" || sessionToday.status === "completed") && sessionToday.materials_unlocked;

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)", paddingBottom: "80px" }}>
      {/* Top Navbar */}
      <header style={{
        height: "64px",
        background: "white",
        borderBottom: "1px solid var(--color-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px",
        position: "sticky",
        top: 0,
        zIndex: 30
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <img 
            src="/api/crm/media?path=branding/roboks-logo.svg" 
            alt="Робокс" 
            style={{ width: "32px", height: "32px", objectFit: "contain" }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const fallback = e.currentTarget.nextSibling as HTMLDivElement;
              if (fallback) fallback.style.display = "flex";
            }}
          />
          <div style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            background: "var(--roboks-gradient)",
            display: "none",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: 900,
            fontSize: "1.1rem"
          }}>
            Р
          </div>
          <span style={{ fontWeight: 900, fontSize: "1.2rem", fontFamily: "var(--font-geologica)", color: "var(--color-text)" }}>
            Робокс <span style={{ fontWeight: 500, color: "var(--color-text-muted)", fontSize: "0.95rem" }}>Кабинет Ученика</span>
          </span>
        </div>

        <button 
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "none",
            border: "none",
            color: "var(--color-danger)",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "13px"
          }}
        >
          <LogOut size={16} />
          <span>Выйти</span>
        </button>
      </header>

      {/* Main Content */}
      <div className="container" style={{ maxWidth: "1000px", margin: "32px auto", padding: "0 20px", display: "flex", flexDirection: "column", gap: "24px" }}>
        {!studentInfo && !isDemoMode() ? (
          <div className="card-crm" style={{ background: "white", padding: "48px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
            <HelpCircle size={48} style={{ color: "var(--color-text-muted)", opacity: 0.5 }} />
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Профиль не привязан</h3>
              <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-small)", marginTop: "8px" }}>
                Ваша учетная запись пока не связана ни с одной карточкой ученика. Пожалуйста, обратитесь к администратору или преподавателю для настройки доступа.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Welcome Block */}
            <div style={{
              background: "white",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-card-site)",
              padding: "28px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.01)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "var(--color-primary-soft)", color: "var(--color-primary-dark)", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", marginBottom: "12px" }}>
              <Sparkles size={12} />
              <span>Личный кабинет</span>
            </div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 800, fontFamily: "var(--font-geologica)", margin: "0 0 4px 0" }}>
              Привет, {studentInfo?.full_name || "Ученик"}!
            </h1>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)", margin: 0 }}>
              Возраст: {studentInfo?.age} лет · Рады видеть тебя на уроках робототехники 🤖
            </p>
          </div>

          {/* Demo Toggler */}
          {(!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) && (
            <div style={{ background: "var(--color-bg)", padding: "12px 16px", borderRadius: "10px", border: "1px solid var(--color-border)", display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Демо-симуляция урока</span>
              <button
                onClick={() => setDemoActiveSession(!demoActiveSession)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: demoActiveSession ? "var(--color-success)" : "var(--color-primary)",
                  color: "white",
                  fontWeight: 700,
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                {demoActiveSession ? "Преподаватель начал урок (ВКЛ)" : "Начать урок (симулировать)"}
              </button>
            </div>
          )}
        </div>

        {/* Dashboard Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "24px", alignItems: "flex-start" }}>
          
          {/* Left Side: Group & Teacher Card */}
          <div className="card-crm" style={{ background: "white", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 800, borderBottom: "1px solid var(--color-border)", paddingBottom: "12px", margin: 0 }}>
              Моя группа
            </h3>

            {group ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Название группы</span>
                  <div style={{ fontWeight: 700, fontSize: "16px", color: "var(--color-text)", marginTop: "2px" }}>{group.title}</div>
                </div>

                <div>
                  <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Учебное направление</span>
                  <div style={{ fontWeight: 600, fontSize: "14px", marginTop: "2px" }}>{group.courseName}</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Расписание</span>
                    <div style={{ fontWeight: 600, fontSize: "13px", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Clock size={12} style={{ color: "var(--color-primary)" }} />
                      <span>{group.schedule}</span>
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Наставник</span>
                    <div style={{ fontWeight: 600, fontSize: "13px", marginTop: "2px" }}>{group.teacherName}</div>
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ color: "var(--color-text-muted)", fontStyle: "italic", fontSize: "13px" }}>Ты пока не зачислен в группу.</p>
            )}
          </div>

          {/* Right Side: Materials (Locked or Unlocked) */}
          <div className="card-crm" style={{ background: "white", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 800, borderBottom: "1px solid var(--color-border)", paddingBottom: "12px", margin: 0, display: "flex", alignItems: "center", justifySelf: "flex-start", gap: "8px" }}>
              <BookOpen size={18} style={{ color: "var(--color-primary)" }} />
              <span>{isPastSession ? "Материалы прошедшего урока" : "Материалы сегодняшнего урока"}</span>
            </h3>

            {!isUnlocked ? (
              /* Locked State Display */
              <div style={{
                padding: "48px 32px",
                border: "2px dashed var(--color-border)",
                borderRadius: "12px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "16px",
                textAlign: "center",
                background: "rgba(248, 250, 252, 0.5)"
              }}>
                <div style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "var(--color-surface-soft)",
                  color: "var(--color-text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <Lock size={24} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: "15px", color: "var(--color-text)", marginBottom: "6px" }}>
                    Доступ к материалам закрыт
                  </h4>
                  <p style={{ fontSize: "13px", color: "var(--color-text-muted)", maxWidth: "340px", margin: 0, lineHeight: 1.5 }}>
                    Материалы урока откроются сразу после того, как преподаватель начнет занятие в классе.
                  </p>
                </div>
              </div>
            ) : (
              /* Unlocked State Display */
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{
                  background: isPastSession ? "var(--color-bg)" : "var(--color-success-soft)",
                  border: isPastSession ? "1px solid var(--color-border)" : "1px solid var(--color-success)",
                  color: isPastSession ? "var(--color-text-muted)" : "var(--color-success-dark)",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <CheckCircle size={16} />
                  <span>{isPastSession ? "Доступны материалы прошедшего занятия" : "Урок запущен! Все материалы доступны для просмотра."}</span>
                </div>

                {materials.length === 0 ? (
                  <p style={{ color: "var(--color-text-muted)", fontStyle: "italic", fontSize: "13px" }}>На сегодня дополнительные файлы к уроку отсутствуют.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {materials.map(mat => (
                      <div 
                        key={mat.id}
                        style={{
                          border: "1px solid var(--color-border)",
                          borderRadius: "10px",
                          padding: "16px",
                          background: "var(--color-bg)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: "16px"
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            background: "white",
                            border: "1px solid var(--color-border)",
                            color: "var(--color-primary-dark)",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            fontSize: "10px",
                            fontWeight: 700,
                            width: "fit-content"
                          }}>
                            {mat.type === "build_scheme" ? "🔧 Схема сборки" : (mat.type === "code_listing" ? "💻 Код/Алгоритм" : "📝 Задание")}
                          </span>
                          <h4 style={{ fontWeight: 700, fontSize: "14px", margin: 0 }}>{mat.title}</h4>
                          {mat.content && (
                            <p style={{ fontSize: "12px", color: "var(--color-text-muted)", margin: "4px 0 0 0" }}>{mat.content}</p>
                          )}
                        </div>

                        {mat.file_url && (
                          <a 
                            href={mat.file_url} 
                            target="_blank" 
                            rel="noreferrer"
                            style={{
                              textDecoration: "none",
                              color: "var(--color-primary)",
                              fontSize: "12px",
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              whiteSpace: "nowrap"
                            }}
                          >
                            <span>Открыть</span>
                            <ArrowRight size={14} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Homework Section */}
        <div className="card-crm" style={{ background: "white", padding: "28px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 800, borderBottom: "1px solid var(--color-border)", paddingBottom: "12px", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <FileText size={18} style={{ color: "var(--color-primary)" }} />
            <span>Домашние задания ({homeworks.length})</span>
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
            {homeworks.map(hw => {
              const tpl = hw.homework_templates || {};
              const dueStr = hw.due_at ? new Date(hw.due_at).toLocaleDateString("ru-RU") : "Без срока";
              
              return (
                <div 
                  key={hw.id}
                  style={{
                    border: "1px solid var(--color-border)",
                    borderRadius: "10px",
                    padding: "20px",
                    background: "var(--color-bg)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    justifyContent: "space-between"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        background: "white",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-primary-dark)",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        fontSize: "10px",
                        fontWeight: 700
                      }}>
                        {tpl.difficulty || "Обычная"}
                      </span>
                      {tpl.estimated_minutes && (
                        <span style={{ fontSize: "11px", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "2px" }}>
                          <Clock size={10} />
                          <span>~{tpl.estimated_minutes} мин</span>
                        </span>
                      )}
                    </div>
                    <h4 style={{ fontWeight: 700, fontSize: "14px", margin: "0 0 6px 0", color: "var(--color-text)" }}>
                      {tpl.title}
                    </h4>
                    <p style={{ fontSize: "12px", color: "var(--color-text-muted)", margin: 0, lineHeight: 1.5 }}>
                      {tpl.description || "Инструкция к выполнению отсутствует."}
                    </p>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--color-border)", paddingTop: "10px", marginTop: "4px" }}>
                    <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                      Сдать до: <strong style={{ color: "var(--color-text)" }}>{dueStr}</strong>
                    </span>
                    <span className={`badge ${
                      hw.status === "checked" ? "badge-green" : 
                      hw.status === "submitted" ? "badge-amber" : "badge-blue"
                    }`} style={{ fontSize: "10px" }}>
                      {hw.status === "checked" ? "Проверено" : 
                       hw.status === "submitted" ? "На проверке" : "Выдано"}
                    </span>
                  </div>
                </div>
              );
            })}

            {homeworks.length === 0 && (
              <div style={{ gridColumn: "span 3", padding: "32px", textAlign: "center", color: "var(--color-text-muted)" }}>
                <p style={{ margin: 0, fontStyle: "italic", fontSize: "13px" }}>Отлично! Все домашние задания выполнены или еще не назначены.</p>
              </div>
            )}
          </div>
        </div>
      </>
    )}
      </div>
    </div>
  );
}
