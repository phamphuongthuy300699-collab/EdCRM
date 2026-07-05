import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@robotics-crm/ui";
import { Calendar, ArrowLeft } from "lucide-react";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Расписание занятий по робототехнике в Липецке",
  description: "Расписание учебных групп школы робототехники и программирования Robotics Липецк. Группы по возрастам для детей от 6 до 15 лет.",
  alternates: {
    canonical: "https://robotics-lipetsk.ru/raspisanie",
  },
};

export default async function RaspisaniePage() {
  const jsonLdBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Главная",
        "item": "https://robotics-lipetsk.ru"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Расписание",
        "item": "https://robotics-lipetsk.ru/raspisanie"
      }
    ]
  };

  let scheduleToRender: any[] = [];

  try {
    const supabase = createSupabaseAdminClient();
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", "robotics-lipetsk")
      .single();

    if (org) {
      const { data: groups } = await supabase
        .from("groups")
        .select(`
          id,
          title,
          age_from,
          age_to,
          capacity,
          show_on_site,
          course:courses(title),
          branch:branches(name, address, is_active, show_on_site),
          room:rooms(name),
          teacher:profiles(full_name),
          schedule_rules:group_schedule_rules(weekday, starts_at),
          enrollments(id, status)
        `)
        .eq("organization_id", org.id)
        .eq("show_on_site", true)
        .eq("status", "active")
        .order("sort_order", { ascending: true });

      if (groups && groups.length > 0) {
        const daysMap: Record<number, string> = {
          1: "Пн", 2: "Вт", 3: "Ср", 4: "Чт", 5: "Пт", 6: "Сб", 7: "Вс"
        };
        const fullDaysMap: Record<number, string> = {
          1: "Понедельник", 2: "Вторник", 3: "Среда", 4: "Четверг", 5: "Пятница", 6: "Суббота", 7: "Воскресенье"
        };

        scheduleToRender = groups
        .filter((g: any) => {
          const branch = Array.isArray(g.branch) ? g.branch[0] : g.branch;
          return !branch || (branch.is_active !== false && branch.show_on_site !== false);
        })
        .map(g => {
          const activeEnrollments = g.enrollments?.filter((e: any) => e.status === "active")?.length || 0;
          const spots = g.capacity - activeEnrollments;

          const rules = g.schedule_rules || [];
          let timeStr = "Время уточняется";
          if (rules.length > 0) {
            const sortedRules = [...rules].sort((a: any, b: any) => a.weekday - b.weekday);
            const days = sortedRules.map((r: any) => sortedRules.length > 2 ? daysMap[r.weekday] : fullDaysMap[r.weekday]).filter(Boolean).join(" / ");
            const startsAt = sortedRules[0]?.starts_at ? sortedRules[0].starts_at.substring(0, 5) : "";
            timeStr = `${days} ${startsAt}`;
          }

          let spotsText = "Осталось несколько мест";
          let badgeClass = "badge-green";
          if (spots <= 0) {
            spotsText = "Группа заполнена";
            badgeClass = "badge-red";
          } else if (spots === 1 || spots === 2) {
            spotsText = `Осталось ${spots} места`;
            badgeClass = "badge-amber";
          } else {
            spotsText = `Осталось ${spots} мест`;
            badgeClass = "badge-green";
          }

          return {
            age: g.age_from && g.age_to ? `${g.age_from}–${g.age_to} лет` : "6–14 лет",
            course: (Array.isArray(g.course) ? g.course[0]?.title : (g.course as any)?.title) || g.title,
            time: timeStr,
            branch: (Array.isArray(g.branch) ? g.branch[0]?.name : (g.branch as any)?.name) || "",
            address: (Array.isArray(g.branch) ? g.branch[0]?.address : (g.branch as any)?.address) || "",
            room: (Array.isArray(g.room) ? g.room[0]?.name : (g.room as any)?.name) || "",
            teacher: (Array.isArray(g.teacher) ? g.teacher[0]?.full_name : (g.teacher as any)?.full_name) || "",
            spotsText,
            badgeClass
          };
        });
      }
    }
  } catch (e) {
    console.error("Error loading schedule page from database:", e);
  }

  return (
    <div style={{ fontFamily: "var(--font-inter), sans-serif", color: "var(--color-text)", paddingBottom: "100px" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
      />

      <section className="bg-grid-blueprint" style={{ padding: "80px 0", borderBottom: "1px solid var(--color-border)" }}>
        <div className="container" style={{ maxWidth: "800px" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "var(--color-primary)", fontWeight: 600, marginBottom: "24px" }}>
            <ArrowLeft size={16} /> Вернуться на главную
          </Link>
          
          <div style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ background: "var(--color-primary-soft)", color: "var(--color-primary)", padding: "10px", borderRadius: "10px" }}>
              <Calendar size={28} />
            </div>
            <span className="badge badge-blue" style={{ fontWeight: 800 }}>Актуально на 2026 год</span>
          </div>

          <h1 style={{ fontSize: "var(--font-h1)", fontFamily: "var(--font-geologica)", lineHeight: 1.2, marginBottom: "20px" }}>
            Расписание занятий
          </h1>
          
          <p style={{ fontSize: "var(--font-body-lg)", color: "var(--color-text-muted)", lineHeight: 1.6, marginBottom: "32px" }}>
            Мы формируем группы по возрастам и уровням подготовки, чтобы детям было комфортно учиться вместе. Места в группах бронируются заранее.
          </p>

          <Link href="/#lead-form">
            <Button variant="primary-site" style={{ background: "var(--color-accent)", height: "48px", padding: "0 24px" }}>
              Подобрать удобное время
            </Button>
          </Link>
        </div>
      </section>

      <section style={{ padding: "80px 0" }}>
        <div className="container" style={{ maxWidth: "800px", display: "grid", gap: "48px" }}>
          
          <div>
            <h2 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", marginBottom: "24px" }}>Учебные группы и время занятий</h2>
            
            <div style={{
              background: "white",
              border: "1px solid var(--color-border)",
              borderRadius: "16px",
              overflow: "hidden",
              boxShadow: "0 12px 32px rgba(15, 23, 42, 0.03)",
              display: "grid",
              gap: "0"
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1.3fr 1fr 1.2fr 1fr 1.1fr", padding: "20px 32px", background: "var(--color-bg)", fontWeight: 700, fontSize: "14px", borderBottom: "1px solid var(--color-border)", gap: "12px" }}>
                <span>Возраст</span>
                <span>Курс</span>
                <span>Время занятий</span>
                <span>Филиал</span>
                <span>Преподаватель</span>
                <span>Наличие мест</span>
              </div>
              
              {scheduleToRender.length === 0 ? (
                <div style={{ padding: "40px 32px", textAlign: "center", color: "var(--color-text-muted)", borderTop: "1px solid var(--color-border)" }}>
                  Расписание пока не заполнено в CRM.
                </div>
              ) : (
                scheduleToRender.map((sched, idx) => (
                  <div key={idx} style={{ display: "grid", gridTemplateColumns: "0.8fr 1.3fr 1fr 1.2fr 1fr 1.1fr", padding: "24px 32px", borderBottom: idx < scheduleToRender.length - 1 ? "1px solid var(--color-border)" : "none", alignItems: "center", fontSize: "14px", gap: "12px" }}>
                    <span style={{ fontWeight: 700 }}>{sched.age}</span>
                    <span>{sched.course}</span>
                    <span>{sched.time}</span>
                    <span>{sched.branch || sched.address || "Адрес уточняется"}{sched.room ? ` · ${sched.room}` : ""}</span>
                    <span>{sched.teacher || "Наставник назначается"}</span>
                    <span className={`badge ${sched.badgeClass}`}>{sched.spotsText}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ background: "rgba(37, 99, 235, 0.04)", border: "1px dashed rgba(37, 99, 235, 0.3)", borderRadius: "16px", padding: "32px" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "12px" }}>Не подошло время?</h3>
            <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", lineHeight: 1.5, margin: 0 }}>
              Мы регулярно открываем новые учебные группы по мере поступления заявок от родителей. Оставьте заявку с вашими пожеланиями по времени в комментарии, и мы постараемся подобрать для вас индивидуальный график!
            </p>
          </div>

          <div style={{ textAlign: "center", borderTop: "1px solid var(--color-border)", paddingTop: "40px" }}>
            <Link href="/#lead-form">
              <Button variant="primary-site" style={{ background: "var(--color-accent)" }}>
                Записаться в удобную группу
              </Button>
            </Link>
          </div>

        </div>
      </section>

    </div>
  );
}
