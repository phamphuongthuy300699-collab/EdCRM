import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@robotics-crm/ui";
import { Calendar, ArrowLeft, Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Расписание занятий по робототехнике в Липецке",
  description: "Расписание учебных групп школы робототехники и программирования Robotics Липецк. Группы по возрастам для детей от 6 до 15 лет.",
  alternates: {
    canonical: "https://robotics-lipetsk.ru/raspisanie",
  },
};

export default function RaspisaniePage() {
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 1fr 1.2fr", padding: "20px 32px", background: "var(--color-bg)", fontWeight: 700, fontSize: "14px", borderBottom: "1px solid var(--color-border)" }}>
                <span>Возраст</span>
                <span>Курс</span>
                <span>Время занятий</span>
                <span>Наличие мест</span>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 1fr 1.2fr", padding: "24px 32px", borderBottom: "1px solid var(--color-border)", alignItems: "center", fontSize: "14px" }}>
                <span style={{ fontWeight: 700 }}>6–8 лет</span>
                <span>Робототехника Lego (Старт)</span>
                <span>Вторник / Четверг 17:00</span>
                <span className="badge badge-amber">Осталось 2 места</span>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 1fr 1.2fr", padding: "24px 32px", borderBottom: "1px solid var(--color-border)", alignItems: "center", fontSize: "14px" }}>
                <span style={{ fontWeight: 700 }}>8–10 лет</span>
                <span>Программирование Scratch</span>
                <span>Среда / Пятница 18:00</span>
                <span className="badge badge-green">Осталось 3 места</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 1fr 1.2fr", padding: "24px 32px", borderBottom: "1px solid var(--color-border)", alignItems: "center", fontSize: "14px" }}>
                <span style={{ fontWeight: 700 }}>10–14 лет</span>
                <span>Разработка на Python</span>
                <span>Суббота 12:00</span>
                <span className="badge badge-red">Группа заполнена</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 1fr 1.2fr", padding: "24px 32px", alignItems: "center", fontSize: "14px" }}>
                <span style={{ fontWeight: 700 }}>10–15 лет</span>
                <span>Схемотехника и Arduino</span>
                <span>Суббота 15:00</span>
                <span className="badge badge-green">Осталось 4 места</span>
              </div>
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
