"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/shared/db/supabase/browser";
import { RoboAssistant } from "@/shared/ui/robo-assistant";
import { isDemoMode } from "@/shared/utils/demo";
import { 
  Smile, 
  Cpu, 
  Calendar, 
  MapPin, 
  User, 
  CreditCard, 
  MessageSquare,
  CheckCircle,
  XCircle,
  HelpCircle,
  Clock,
  Sparkles
} from "lucide-react";
import { Button } from "@robotics-crm/ui";

const daysMap: Record<number, string> = {
  1: "Пн", 2: "Вт", 3: "Ср", 4: "Чт", 5: "Пт", 6: "Сб", 7: "Вс"
};

function formatScheduleRules(rules: any[]) {
  if (!rules || rules.length === 0) return "Не определено";
  return rules
    .map(rule => `${daysMap[rule.weekday] || rule.weekday} ${rule.starts_at.slice(0, 5)}`)
    .join(", ");
}

function getNextClass(scheduleRules: any[]) {
  if (!scheduleRules || scheduleRules.length === 0) return "Не определено";
  
  const now = new Date();
  const currentDay = now.getDay(); // 0 is Sunday, 1-6 are Mon-Sat
  const currentDayMapped = currentDay === 0 ? 7 : currentDay;
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  let minDiff = 8;
  let nextRule = null;
  
  for (const rule of scheduleRules) {
    let diff = rule.weekday - currentDayMapped;
    if (diff < 0) {
      diff += 7;
    } else if (diff === 0) {
      const [sh, sm] = rule.starts_at.split(":").map(Number);
      if (currentHour > sh || (currentHour === sh && currentMinute >= sm)) {
        diff = 7;
      }
    }
    
    if (diff < minDiff) {
      minDiff = diff;
      nextRule = rule;
    }
  }
  
  if (!nextRule) return "Не определено";
  
  const startsShort = nextRule.starts_at.slice(0, 5);
  if (minDiff === 0) {
    return `Сегодня, ${startsShort}`;
  } else if (minDiff === 1) {
    return `Завтра, ${startsShort}`;
  } else {
    return `${daysMap[nextRule.weekday]}, ${startsShort}`;
  }
}

export default function ParentDashboard() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(true);
  
  // Real DB Data
  const [guardian, setGuardian] = useState<any>(null);
  const [childrenList, setChildrenList] = useState<any[]>([]);
  const [onlinePaymentEnabled, setOnlinePaymentEnabled] = useState(false);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState("");
  const [accessMessage, setAccessMessage] = useState("");

  // Demo Fallback Data (Anna Petrova & Igor Petrov)
  const demoData = {
    parentName: "Анна Петрова",
    studentName: "Игорь Петров",
    studentAge: 8,
    courseName: "Робототехника (Lego Education)",
    groupTitle: "LEGO Start 1",
    teacherName: "Алексей Дмитриев",
    roomName: "Кабинет 101 (Лего-конструирование)",
    nextClass: "Вторник, 17:00",
    currentMission: "Учебный инженерный проект",
    currentMissionDesc: "Программируем ультразвуковой датчик расстояния и сервопривод для сортировки деталей и выталкивания соперников.",
    feedback: "Игорь отлично справился с логикой ветвления. Сам доработал алгоритм захвата кубиков, добавив датчик расстояния. Очень активный и толковый инженер!",
    attendance: [
      { date: "02.06", present: true },
      { date: "09.06", present: true },
      { date: "16.06", present: true },
      { date: "23.06", present: true },
      { date: "30.06", present: true },
      { date: "07.07", present: true },
      { date: "14.07", present: false },
      { date: "21.07", present: true },
    ],
    remainingClasses: 2,
    billingStatus: "pending",
    billingAmount: 4500,
    dueDate: "25.06.2026"
  };

  useEffect(() => {
    async function loadParentSession() {
      try {
        setLoading(true);
        setAccessMessage("");
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setAccessMessage("Войдите в личный кабинет, чтобы увидеть данные ребенка.");
          setLoading(false);
          return;
        }

        // We have a user. Let's fetch their guardian profile using the service-free browser client (restricted by RLS or custom query)
        // Query guardian_users to link logged-in user to CRM guardian
        const { data: linkData, error: linkErr } = await (supabase.from("guardian_users") as any)
          .select("guardian_id")
          .eq("user_id", user.id)
          .single();

        if (linkErr || !linkData) {
          setAccessMessage("Доступ к личному кабинету не привязан. Обратитесь к администратору школы.");
          setLoading(false);
          return;
        }

        const { data: guardianData } = await (supabase.from("guardians") as any)
          .select("*")
          .eq("id", linkData.guardian_id)
          .single();

        if (guardianData) {
          setGuardian(guardianData);

          // Get children
          const { data: mapping } = await (supabase.from("student_guardians") as any)
            .select("student_id")
            .eq("guardian_id", guardianData.id);

          if (mapping && mapping.length > 0) {
            const studentIds = (mapping as any[]).map((m: any) => m.student_id);
            const { data: kids } = await (supabase.from("students") as any)
              .select("*")
              .in("id", studentIds);

            if (kids) {
              // For each kid, load enrollment group details
              const formattedKids = await Promise.all((kids as any[]).map(async (kid: any) => {
                const { data: enroll } = await (supabase.from("enrollments") as any)
                  .select("group_id")
                  .eq("student_id", kid.id)
                  .eq("status", "active")
                  .single();

                let groupDetails = null;
                if (enroll) {
                  const { data: gDetails } = await (supabase.from("groups") as any)
                    .select(`
                      id,
                      title,
                      courses (title),
                      profiles (full_name),
                      rooms (name),
                      group_schedule_rules (weekday, starts_at, ends_at)
                    `)
                    .eq("id", enroll.group_id)
                    .single();
                  
                  groupDetails = gDetails;
                }

                // Query invoices
                const { data: invoices } = await (supabase.from("invoices") as any)
                  .select("*")
                  .eq("student_id", kid.id)
                  .order("due_date", { ascending: false });

                // Query attendance
                const { data: att } = await (supabase.from("attendance") as any)
                  .select("*")
                  .eq("student_id", kid.id)
                  .order("lesson_date", { ascending: false })
                  .limit(8);

                return {
                  ...kid,
                  group: groupDetails,
                  invoices: invoices || [],
                  attendance: att || []
                };
              }));
              setChildrenList(formattedKids);
            }
          }
        }
      } catch (err) {
        console.error("Error loading parent dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadParentSession();

    fetch("/api/parent/payment-status")
      .then((res) => res.json())
      .then((data) => setOnlinePaymentEnabled(Boolean(data.onlinePaymentEnabled)))
      .catch(() => setOnlinePaymentEnabled(false));
  }, []);

  const handleRequestPaymentLink = async (invoiceId?: string) => {
    if (!invoiceId) {
      alert("Для демо-счета ссылка на оплату не создается.");
      return;
    }

    try {
      setPaymentError("");
      setPayingInvoiceId(invoiceId);
      const response = await fetch("/api/payments/alfabank/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const data = await response.json();

      if (!response.ok || !data.paymentUrl) {
        throw new Error(data.error || "Не удалось создать ссылку на оплату");
      }

      window.location.assign(data.paymentUrl);
      return;
    } catch (error: any) {
      setPaymentError(error.message || "Не удалось создать ссылку на оплату");
      return;
    } finally {
      setPayingInvoiceId(null);
    }
    alert("Ссылка на онлайн-оплату запрошена. Администратор отправит её вам в Telegram/WhatsApp в течение 5 минут 💳");
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <p style={{ fontWeight: 600, color: "var(--color-text-muted)" }}>Загрузка личного кабинета...</p>
      </div>
    );
  }

  // Determine whether we display real DB kids or fallback demo
  const isDemo = isDemoMode();
  const hasRealData = childrenList.length > 0;
  const showDemoData = isDemo && !hasRealData;
  const displayParentName = showDemoData ? demoData.parentName : guardian?.full_name || "";
  
  // Robo message based on state
  const isBalanceLow = !showDemoData 
    ? false // Real db balance checks can be added
    : demoData.remainingClasses <= 2;

  const roboMessage = isBalanceLow 
    ? "Внимание! На абонементе Игоря осталось всего 2 занятия. Пожалуйста, продлите абонемент, чтобы не пропустить сборку следующей миссии! ⚠️" 
    : displayParentName
      ? `Здравствуйте, ${displayParentName}! Ваш ребенок делает успехи! Загляните в отчет наставника. 🚀`
      : "Доступ к личному кабинету пока не связан с карточкой родителя.";

  const roboMood = isBalanceLow ? "warning" : "happy";

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", color: "var(--color-text)", marginBottom: "4px" }}>
              Здравствуйте{displayParentName ? `, ${displayParentName}` : ""}!
            </h1>
            <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>
              Рады видеть вас в кабинете инженерной школы Робокс!
            </p>
          </div>
        </div>

        {/* Robo assistant alert widget */}
        <div style={{ borderTop: "1px dashed var(--color-border)", paddingTop: "16px" }}>
          <RoboAssistant context="parent-portal" mood={roboMood as any} message={roboMessage} size="md" />
        </div>
      </div>

      {/* Real / Mock Student Display Grid */}
      {showDemoData ? (
        // Demo dashboard render
        <div style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: "32px"
        }}>
          {/* Left Column: Progress, Attendance and feedback */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Student Info Card */}
            <div className="card-crm" style={{ background: "white" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "var(--color-accent-soft)",
                    color: "var(--color-accent-dark)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: "1.2rem"
                  }}>
                    ИП
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0 }}>
                      {demoData.studentName}
                    </h3>
                    <span style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
                      Возраст: {demoData.studentAge} лет
                    </span>
                  </div>
                </div>
                <span className="badge badge-green">Обучается</span>
              </div>

              {/* Group & class specs */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", background: "var(--color-bg)", borderRadius: "10px", padding: "16px", marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                  <Cpu size={16} style={{ color: "var(--color-primary)" }} />
                  <div>
                    <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Направление</div>
                    <div style={{ fontWeight: 600 }}>LEGO Education</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                  <User size={16} style={{ color: "var(--color-primary)" }} />
                  <div>
                    <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Преподаватель</div>
                    <div style={{ fontWeight: 600 }}>{demoData.teacherName}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                  <Calendar size={16} style={{ color: "var(--color-primary)" }} />
                  <div>
                    <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Следующее занятие</div>
                    <div style={{ fontWeight: 600 }}>{demoData.nextClass}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                  <MapPin size={16} style={{ color: "var(--color-primary)" }} />
                  <div>
                    <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Кабинет</div>
                    <div style={{ fontWeight: 600 }}>Аудитория 101</div>
                  </div>
                </div>
              </div>

              {/* Attendance Checklist */}
              <div>
                <h4 style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-text)", marginBottom: "10px" }}>
                  Журнал посещаемости (последние занятия)
                </h4>
                <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "4px" }}>
                  {demoData.attendance.map((att, idx) => (
                    <div key={idx} style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "4px",
                      minWidth: "48px"
                    }}>
                      <div style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: att.present ? "var(--color-success-soft)" : "var(--color-danger-soft)",
                        color: att.present ? "var(--color-success)" : "var(--color-danger)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        {att.present ? <CheckCircle size={18} /> : <XCircle size={18} />}
                      </div>
                      <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>{att.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mentor Detailed Report */}
            <div className="card-crm" style={{ background: "white" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <MessageSquare size={20} style={{ color: "var(--color-accent)" }} />
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
                  Прогресс ребенка и отзывы
                </h3>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginBottom: "2px" }}>Текущая миссия</div>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, color: "var(--color-primary)" }}>{demoData.currentMission}</h4>
                  <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "4px", lineHeight: 1.4 }}>
                    {demoData.currentMissionDesc}
                  </p>
                </div>

                <div style={{
                  background: "rgba(249, 115, 22, 0.03)",
                  border: "1px dashed rgba(249, 115, 22, 0.3)",
                  borderRadius: "10px",
                  padding: "16px",
                  position: "relative"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-accent-dark)", fontSize: "11px", fontWeight: 700, marginBottom: "8px" }}>
                    <Smile size={14} />
                    <span>Отчет наставника (Алексей Д.)</span>
                  </div>
                  <p style={{ fontSize: "13px", lineHeight: 1.5, fontStyle: "italic", margin: 0, color: "var(--color-text)" }}>
                    «{demoData.feedback}»
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Billing and remaining */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Balance & Billing Card */}
            <div className="card-crm" style={{ background: "white" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
                <CreditCard size={20} style={{ color: "var(--color-primary)" }} />
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
                  Баланс и Оплата
                </h3>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {/* Remaining Classes Counter */}
                <div style={{
                  background: "var(--color-warning-soft)",
                  border: "1px solid var(--color-warning)",
                  borderRadius: "12px",
                  padding: "20px",
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: "12px", color: "var(--color-warning-dark)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Остаток абонемента
                  </div>
                  <div style={{ fontSize: "3rem", fontWeight: 900, color: "var(--color-warning-dark)", margin: "4px 0" }}>
                    {demoData.remainingClasses}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                    занятия доступно к посещению
                  </div>
                </div>

                {/* Pending Invoice notification */}
                <div style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: "10px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700 }}>Счет: Абонемент на Июль</span>
                    <span className="badge badge-amber">Ожидает оплаты</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderTop: "1px solid var(--color-border)", paddingTop: "12px" }}>
                    <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Сумма к оплате:</span>
                    <span style={{ fontSize: "1.2rem", fontWeight: 800 }}>{demoData.billingAmount} ₽</span>
                  </div>

                  <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                    Оплатить до: {demoData.dueDate}
                  </div>

                  <Button 
                    onClick={onlinePaymentEnabled ? () => handleRequestPaymentLink() : undefined}
                    disabled={!onlinePaymentEnabled}
                    variant="primary-site" 
                    style={{ 
                      background: onlinePaymentEnabled ? "var(--color-accent)" : "var(--color-text-muted)",
                      cursor: onlinePaymentEnabled ? "pointer" : "not-allowed",
                      width: "100%", 
                      height: "40px", 
                      fontSize: "13px", 
                      marginTop: "8px" 
                    }}
                  >
                    {onlinePaymentEnabled ? "Запросить ссылку на оплату" : "Онлайн-оплата Альфабанк пока не настроена"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : childrenList.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 0", background: "white", borderRadius: "14px", border: "1px solid var(--color-border)", width: "100%" }}>
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-body-lg)", margin: 0 }}>
            {accessMessage || "К вашему аккаунту не привязано ни одного ученика. Пожалуйста, обратитесь к администратору."}
          </p>
        </div>
      ) : (
        // Real DB children list render
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          {childrenList.map((kid) => {
            const hasOverdue = kid.invoices.some((inv: any) => inv.status === "overdue");
            const hasPending = kid.invoices.some((inv: any) => inv.status === "issued" || inv.status === "draft");
            
            return (
              <div key={kid.id} style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr",
                gap: "32px"
              }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  <div className="card-crm" style={{ background: "white" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <div style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "50%",
                          background: "var(--color-primary-soft)",
                          color: "var(--color-primary-dark)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: "1.2rem"
                        }}>
                          {kid.full_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0 }}>
                            {kid.full_name}
                          </h3>
                        </div>
                      </div>
                      <span className="badge badge-green">Активен</span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", background: "var(--color-bg)", borderRadius: "10px", padding: "16px", marginBottom: "20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                        <Cpu size={16} style={{ color: "var(--color-primary)" }} />
                        <div>
                          <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Группа</div>
                          <div style={{ fontWeight: 600 }}>{kid.group?.title || "Не определена"}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                        <User size={16} style={{ color: "var(--color-primary)" }} />
                        <div>
                          <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Наставник</div>
                          <div style={{ fontWeight: 600 }}>{kid.group?.profiles?.full_name || "Не назначен"}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                        <Calendar size={16} style={{ color: "var(--color-primary)" }} />
                        <div>
                          <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Направление</div>
                          <div style={{ fontWeight: 600 }}>{kid.group?.courses?.title || "Робототехника"}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                        <MapPin size={16} style={{ color: "var(--color-primary)" }} />
                        <div>
                          <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Аудитория</div>
                          <div style={{ fontWeight: 600 }}>{kid.group?.rooms?.name || "Кабинет 101"}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                        <Clock size={16} style={{ color: "var(--color-primary)" }} />
                        <div>
                          <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Расписание</div>
                          <div style={{ fontWeight: 600 }}>{formatScheduleRules(kid.group?.group_schedule_rules)}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                        <Sparkles size={16} style={{ color: "var(--color-primary)" }} />
                        <div>
                          <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Ближайшее занятие</div>
                          <div style={{ fontWeight: 600 }}>{getNextClass(kid.group?.group_schedule_rules)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Attendance check */}
                    <div>
                      <h4 style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-text)", marginBottom: "10px" }}>
                        Посещаемость занятий
                      </h4>
                      {kid.attendance.length === 0 ? (
                        <p style={{ fontSize: "12px", color: "var(--color-text-muted)", margin: 0 }}>Отметок о посещаемости пока нет</p>
                      ) : (
                        <div style={{ display: "flex", gap: "10px" }}>
                          {kid.attendance.map((att: any, idx: number) => (
                            <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                              <div style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                background: att.is_present ? "var(--color-success-soft)" : "var(--color-danger-soft)",
                                color: att.is_present ? "var(--color-success)" : "var(--color-danger)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                              }}>
                                {att.is_present ? <CheckCircle size={18} /> : <XCircle size={18} />}
                              </div>
                              <span style={{ fontSize: "9px", color: "var(--color-text-muted)" }}>
                                {new Date(att.lesson_date).toLocaleDateString("ru-RU", { month: "numeric", day: "numeric" })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  {/* Financial invoicing */}
                  <div className="card-crm" style={{ background: "white" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
                      <CreditCard size={20} style={{ color: "var(--color-primary)" }} />
                      <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
                        Счета на оплату
                      </h3>
                    </div>
                    {paymentError && (
                      <div style={{ fontSize: "12px", color: "var(--color-danger)", fontWeight: 700, marginBottom: "12px" }}>
                        {paymentError}
                      </div>
                    )}

                    {kid.invoices.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "20px 0" }}>
                        <CheckCircle size={32} style={{ color: "var(--color-success)", margin: "0 auto 8px auto", opacity: 0.8 }} />
                        <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Нет выставленных или просроченных счетов.</span>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {kid.invoices.map((inv: any) => (
                          <div key={inv.id} style={{
                            border: "1px solid var(--color-border)",
                            borderRadius: "8px",
                            padding: "12px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px"
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "12px", fontWeight: 700 }}>{inv.title}</span>
                              <span className={`badge ${inv.status === "paid" ? "badge-green" : inv.status === "overdue" ? "badge-red" : "badge-blue"}`}>
                                {inv.status === "paid" ? "Оплачен" : inv.status === "overdue" ? "Долг" : "Ожидает"}
                              </span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                              <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Срок: {new Date(inv.due_date).toLocaleDateString("ru-RU")}</span>
                              <span style={{ fontSize: "1.05rem", fontWeight: 800 }}>{inv.amount} ₽</span>
                            </div>

                            {inv.status !== "paid" && (
                              <Button 
                                onClick={onlinePaymentEnabled ? () => handleRequestPaymentLink(inv.id) : undefined}
                                disabled={!onlinePaymentEnabled || payingInvoiceId === inv.id}
                                variant="primary-site" 
                                style={{ 
                                  background: onlinePaymentEnabled ? "var(--color-accent)" : "var(--color-text-muted)",
                                  cursor: onlinePaymentEnabled ? "pointer" : "not-allowed",
                                  height: "36px", 
                                  fontSize: "12px", 
                                  width: "100%", 
                                  marginTop: "4px" 
                                }}
                              >
                                {payingInvoiceId === inv.id ? "Создаем ссылку..." : onlinePaymentEnabled ? "Оплатить" : "Онлайн-оплата Альфабанк пока не настроена"}
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
