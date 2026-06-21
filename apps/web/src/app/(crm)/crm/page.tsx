"use client";

import React from "react";
import { Button } from "@robotics-crm/ui";

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

export default function CrmDashboard() {
  const stats = [
    { name: "Новые заявки", value: "8", icon: Inbox, color: "var(--color-primary)", bg: "var(--color-primary-soft)", desc: "+3 новые за сегодня" },
    { name: "Просроченные счета", value: "12 500 ₽", icon: CreditCard, color: "var(--color-danger)", bg: "var(--color-danger-soft)", desc: "4 неоплаченных счета" },
    { name: "Занятия сегодня", value: "4", icon: Calendar, color: "var(--color-warning)", bg: "var(--color-warning-soft)", desc: "Ближайшее в 17:00" },
    { name: "Активные ученики", value: "37", icon: Users, color: "var(--color-success)", bg: "var(--color-success-soft)", desc: "Заполненность групп: 85%" }
  ];

  const recentLeads = [
    { name: "Анна Петрова", phone: "+7 (905) 555-12-34", child: "Игорь, 8 лет", course: "LEGO Start", date: "Сегодня, 11:32", status: "new" },
    { name: "Сергей Волков", phone: "+7 (920) 222-33-44", child: "Алиса, 10 лет", course: "Scratch", date: "Сегодня, 09:15", status: "new" },
    { name: "Ольга Семенова", phone: "+7 (915) 333-55-66", child: "Кирилл, 7 лет", course: "LEGO Start", date: "Вчера, 18:20", status: "contacted" }
  ];

  const todaysSchedule = [
    { time: "17:00", name: "LEGO Start (6-8 лет)", room: "Каб. 101", teacher: "Алексей Д.", filled: "7/8 мест" },
    { time: "18:30", name: "Scratch (8-11 лет)", room: "Каб. 102", teacher: "Мария С.", filled: "6/8 мест" }
  ];

  const overdueInvoices = [
    { student: "Миша Сидоров", parent: "Дмитрий С.", amount: "4 000 ₽", due: "18.06.2026" },
    { student: "Лера Козлова", parent: "Елена К.", amount: "4 500 ₽", due: "15.06.2026" }
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
            <span style={{ color: "var(--color-primary)", fontSize: "1.1rem", fontWeight: 800 }}>8</span>
            <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-xs)" }}>новых заявок в очереди</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "white", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--color-border)" }}>
            <span style={{ color: "var(--color-danger)", fontSize: "1.1rem", fontWeight: 800 }}>2</span>
            <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-xs)" }}>просроченных счета</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "white", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--color-border)" }}>
            <span style={{ color: "#D97706", fontSize: "1.1rem", fontWeight: 800 }}>1</span>
            <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-xs)" }}>группа почти заполнена (7/8)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "white", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--color-border)" }}>
            <span style={{ color: "var(--color-text-muted)", fontSize: "1.1rem", fontWeight: 800 }}>3</span>
            <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-xs)" }}>ребёнка пропустили занятия</span>
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
            {recentLeads.map((lead, idx) => (
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
              {todaysSchedule.map((session, idx) => (
                <div key={idx} style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingBottom: idx === todaysSchedule.length - 1 ? 0 : "12px",
                  borderBottom: idx === todaysSchedule.length - 1 ? "none" : "1px solid var(--color-border)"
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
              {overdueInvoices.map((inv, idx) => (
                <div key={idx} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: idx === overdueInvoices.length - 1 ? 0 : "12px",
                  borderBottom: idx === overdueInvoices.length - 1 ? "none" : "1px solid var(--color-border)"
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
