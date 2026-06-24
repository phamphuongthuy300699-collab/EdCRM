"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@robotics-crm/ui";
import { createSupabaseBrowserClient } from "@/shared/db/supabase/browser";
import Link from "next/link";
import { 
  Inbox, 
  CreditCard, 
  Calendar, 
  Users, 
  PhoneCall, 
  UserPlus, 
  UserCheck,
  XCircle, 
  ArrowRight, 
  AlertTriangle 
} from "lucide-react";
import { isDemoMode } from "@/shared/utils/demo";

export default function CrmDashboard() {
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState({
    newLeadsCount: 0,
    newLeadsToday: 0,
    overdueAmount: 0,
    overdueCount: 0,
    activeGroupsCount: 0,
    activeStudentsCount: 0,
    totalCapacity: 0,
    enrolledCount: 0
  });

  // Lists state (empty by default)
  const [leads, setLeads] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);

        if (isDemoMode()) {
          setLeads([
            { id: "l1", name: "Анна Петрова", phone: "+7 (905) 555-12-34", child: "Игорь, 8 лет", course: "LEGO Start", date: "Сегодня, 11:32", status: "new" },
            { id: "l2", name: "Сергей Волков", phone: "+7 (920) 222-33-44", child: "Алиса, 10 лет", course: "Scratch", date: "Сегодня, 09:15", status: "new" },
            { id: "l3", name: "Ольга Семенова", phone: "+7 (915) 333-55-66", child: "Кирилл, 7 лет", course: "LEGO Start", date: "Вчера, 18:20", status: "contacted" }
          ]);
          setSchedule([
            { time: "17:00", name: "LEGO Start (6-8 лет)", room: "Каб. 101", teacher: "Алексей Д.", filled: "7/8 мест" },
            { time: "18:30", name: "Scratch (8-11 лет)", room: "Каб. 102", teacher: "Мария С.", filled: "6/8 мест" }
          ]);
          setInvoices([
            { id: "i1", student: "Миша Сидоров", parent: "Дмитрий С.", amount: "4 000 ₽", due: "18.06.2026" },
            { id: "i2", student: "Лера Козлова", parent: "Елена К.", amount: "4 500 ₽", due: "15.06.2026" }
          ]);
          setStatsData({
            newLeadsCount: 3,
            newLeadsToday: 2,
            overdueAmount: 8500,
            overdueCount: 2,
            activeGroupsCount: 2,
            activeStudentsCount: 5,
            totalCapacity: 16,
            enrolledCount: 13
          });
          return;
        }

        const supabase = createSupabaseBrowserClient();

        // 1. Leads
        const { data: leadsData } = await supabase
          .from("leads")
          .select("id, first_name, phone, child_name, course_id, status, created_at, courses(title)")
          .order("created_at", { ascending: false });

        // 2. Invoices
        const { data: invoicesData } = await supabase
          .from("invoices")
          .select(`
            id,
            title,
            amount,
            status,
            due_date,
            students (
              id,
              full_name,
              student_guardians (
                guardians (
                  full_name
                )
              )
            )
          `);

        // 3. Students
        const { data: studentsData } = await supabase
          .from("students")
          .select("id, status");

        // 4. Groups & Enrollments
        const { data: groupsData } = await supabase
          .from("groups")
          .select("id, title, capacity, profiles(full_name), courses(title), group_schedule_rules(weekday, starts_at)")
          .eq("status", "active");

        const { data: enrollmentsData } = await supabase
          .from("enrollments")
          .select("id")
          .eq("status", "active");

        // Calculations
        const newLeads = leadsData?.filter((l: any) => l.status === "new") || [];
        const newLeadsToday = leadsData?.filter((l: any) => l.status === "new" && new Date(l.created_at).toDateString() === new Date().toDateString()).length || 0;
        
        const overdueInvs = invoicesData?.filter((i: any) => i.status === "overdue") || [];
        const overdueSum = overdueInvs.reduce((acc: number, curr: any) => acc + parseFloat(curr.amount || 0), 0);
        
        const activeStuds = studentsData?.filter((s: any) => s.status === "active") || [];
        
        const totalCapacity = groupsData?.reduce((acc: number, curr: any) => acc + (curr.capacity || 8), 0) || 0;
        const enrolled = enrollmentsData?.length || 0;

        setStatsData({
          newLeadsCount: newLeads.length,
          newLeadsToday,
          overdueAmount: overdueSum,
          overdueCount: overdueInvs.length,
          activeGroupsCount: groupsData?.length || 0,
          activeStudentsCount: activeStuds.length,
          totalCapacity,
          enrolledCount: enrolled
        });

        // Set recent leads
        if (leadsData && leadsData.length > 0) {
          setLeads(leadsData.slice(0, 3).map((l: any) => ({
            id: l.id,
            name: l.first_name || "Без имени",
            phone: l.phone || "",
            child: l.child_name ? `${l.child_name}` : "Не указан",
            course: l.courses?.title || "Не указан",
            date: new Date(l.created_at).toLocaleDateString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
            status: l.status
          })));
        } else {
          setLeads([]);
        }

        // Set overdue invoices list
        if (overdueInvs.length > 0) {
          setInvoices(overdueInvs.slice(0, 3).map((i: any) => {
            const firstGuardian = i.students?.student_guardians?.[0]?.guardians;
            return {
              id: i.id,
              student: i.students?.full_name || "Неизвестно",
              parent: firstGuardian?.full_name || "Не указан",
              amount: `${parseFloat(i.amount).toLocaleString()} ₽`,
              due: i.due_date ? new Date(i.due_date).toLocaleDateString("ru-RU") : "Не установлен"
            };
          }));
        } else {
          setInvoices([]);
        }

        // Set schedule
        if (groupsData && groupsData.length > 0) {
          setSchedule(groupsData.slice(0, 3).map((g: any, idx: number) => {
            const rule = g.group_schedule_rules?.[0];
            const time = rule ? rule.starts_at.slice(0, 5) : "18:00";
            return {
              time,
              name: g.title,
              room: `Каб. ${101 + idx}`,
              teacher: g.profiles?.full_name || "Не назначен",
              filled: `${enrolled} мест`
            };
          }));
        } else {
          setSchedule([]);
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
        setLeads([]);
        setSchedule([]);
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const stats = [
    { name: "Новые заявки", value: String(statsData.newLeadsCount), icon: Inbox, color: "var(--color-primary)", bg: "var(--color-primary-soft)", desc: `+${statsData.newLeadsToday} новые за сегодня` },
    { name: "Просроченные счета", value: `${statsData.overdueAmount.toLocaleString()} ₽`, icon: CreditCard, color: "var(--color-danger)", bg: "var(--color-danger-soft)", desc: `${statsData.overdueCount} неоплаченных счета` },
    { name: "Активные группы", value: String(statsData.activeGroupsCount), icon: Calendar, color: "var(--color-warning)", bg: "var(--color-warning-soft)", desc: "Действующие классы" },
    { name: "Активные ученики", value: String(statsData.activeStudentsCount), icon: Users, color: "var(--color-success)", bg: "var(--color-success-soft)", desc: `Заполненность: ${statsData.totalCapacity > 0 ? Math.round((statsData.enrolledCount / statsData.totalCapacity) * 100) : 0}%` }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", color: "var(--color-text)", marginBottom: "4px" }}>
            Рабочий стол
          </h1>
          <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>
            Сегодня: {new Date().toLocaleDateString("ru-RU", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <Link href="/crm/leads">
          <Button variant="primary-crm" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>Управление заявками</span>
            <ArrowRight size={16} />
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "24px"
      }}>
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="card-crm" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", fontWeight: 600 }}>{stat.name}</span>
                <div style={{
                  background: stat.bg,
                  color: stat.color,
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <Icon size={18} />
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--color-text)", fontFamily: "var(--font-geologica)", lineHeight: 1 }}>
                  {stat.value}
                </h3>
                <span style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "4px", display: "block" }}>{stat.desc}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Сегодня требует внимания */}
      <div className="card-crm" style={{ 
        background: "var(--color-warning-soft)", 
        borderColor: "#F59E0B",
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "14px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#D97706" }}>
          <AlertTriangle size={20} />
          <h3 style={{ fontSize: "15px", fontWeight: 700, fontFamily: "var(--font-geologica)" }}>
            Сегодня требует внимания
          </h3>
        </div>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(4, 1fr)", 
          gap: "20px", 
          fontSize: "var(--font-small)",
          fontWeight: 600,
          color: "var(--color-text)" 
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "white", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--color-border)" }}>
            <span style={{ color: "var(--color-primary)", fontSize: "1.1rem", fontWeight: 800 }}>{statsData.newLeadsCount}</span>
            <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-xs)" }}>новых заявок в очереди</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "white", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--color-border)" }}>
            <span style={{ color: "var(--color-danger)", fontSize: "1.1rem", fontWeight: 800 }}>{statsData.overdueCount}</span>
            <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-xs)" }}>просроченных счета</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "white", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--color-border)" }}>
            <span style={{ color: "#D97706", fontSize: "1.1rem", fontWeight: 800 }}>{statsData.activeGroupsCount}</span>
            <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-xs)" }}>активных групп</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "white", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--color-border)" }}>
            <span style={{ color: "var(--color-success)", fontSize: "1.1rem", fontWeight: 800 }}>{statsData.activeStudentsCount}</span>
            <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-xs)" }}>активных учеников</span>
          </div>
        </div>
      </div>

      {/* Main Sections Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1.2fr 1fr",
        gap: "32px",
        alignItems: "start"
      }}>
        
        {/* Left Column: Recent Leads */}
        <div className="card-crm" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: "var(--font-h3)", fontFamily: "var(--font-geologica)" }}>Новые заявки</h3>
            <Link href="/crm/leads" style={{ fontSize: "var(--font-xs)", color: "var(--color-primary)", fontWeight: 700 }}>Все заявки →</Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {leads.map((lead, idx) => (
              <div key={idx} style={{
                border: "1px solid var(--color-border)",
                borderRadius: "10px",
                padding: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontWeight: 700, fontSize: "var(--font-small)" }}>{lead.name}</span>
                    <span className={`badge ${lead.status === "new" ? "badge-blue" : "badge-amber"}`}>
                      {lead.status === "new" ? "Новая" : "Связались"}
                    </span>
                  </div>
                  <div style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
                    {lead.child} · {lead.course}
                  </div>
                  <div style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)", marginTop: "4px" }}>
                    {lead.date}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button title="Позвонить" style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "6px",
                    border: "1px solid var(--color-border)",
                    background: "white",
                    color: "var(--color-text)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer"
                  }}>
                    <PhoneCall size={14} />
                  </button>
                  <button title="Зачислить ученика" style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "6px",
                    border: "none",
                    background: "var(--color-success-soft)",
                    color: "var(--color-success)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer"
                  }}>
                    <UserCheck size={14} />
                  </button>
                  <button title="Отклонить" style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "6px",
                    border: "none",
                    background: "var(--color-danger-soft)",
                    color: "var(--color-danger)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer"
                  }}>
                    <XCircle size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Schedule & Invoices */}
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          
          {/* Today's Schedule */}
          <div className="card-crm" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <h3 style={{ fontSize: "1.125rem", fontFamily: "var(--font-geologica)" }}>Занятия на сегодня</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {schedule.map((session, idx) => (
                <div key={idx} style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingBottom: idx === schedule.length - 1 ? 0 : "12px",
                  borderBottom: idx === schedule.length - 1 ? "none" : "1px solid var(--color-border)"
                }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: 800, color: "var(--color-primary-dark)", fontSize: "var(--font-small)" }}>{session.time}</span>
                      <span style={{ fontWeight: 700, fontSize: "var(--font-small)" }}>{session.name}</span>
                    </div>
                    <span style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
                      {session.room} · {session.teacher}
                    </span>
                  </div>
                  <span className="badge badge-blue">{session.filled}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Overdue Invoices */}
          <div className="card-crm" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertTriangle size={18} style={{ color: "var(--color-danger)" }} />
              <h3 style={{ fontSize: "1.125rem", fontFamily: "var(--font-geologica)" }}>Просроченные оплаты</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {invoices.map((inv, idx) => (
                <div key={idx} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: idx === invoices.length - 1 ? 0 : "12px",
                  borderBottom: idx === invoices.length - 1 ? "none" : "1px solid var(--color-border)"
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "var(--font-small)" }}>{inv.student}</div>
                    <span style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
                      Род: {inv.parent} · Срок: {inv.due}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                    <span style={{ fontWeight: 800, color: "var(--color-danger)" }}>{inv.amount}</span>
                    <button style={{
                      background: "none",
                      border: "none",
                      color: "var(--color-primary)",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: 0
                    }}>
                      Напомнить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
