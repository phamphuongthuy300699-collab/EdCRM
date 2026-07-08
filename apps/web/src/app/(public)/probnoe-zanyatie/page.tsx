import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@robotics-crm/ui";
import { Smile, ArrowLeft, Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Бесплатное пробное занятие по робототехнике в Липецке",
  description: "Запишитесь на бесплатное пробное занятие 90 минут по робототехнике и программированию в Липецке. Ребенок соберет первого робота на первом уроке!",
  alternates: {
    canonical: "https://robotics-lipetsk.ru/probnoe-zanyatie",
  },
};

export default function ProbnoeZanyatiePage() {
  const jsonLdOrg = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": "Робокс Липецк",
    "url": "https://robotics-lipetsk.ru",
    "description": "Бесплатное ознакомительное занятие по робототехнике и программированию для детей в Липецке."
  };

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
        "name": "Пробное занятие",
        "item": "https://robotics-lipetsk.ru/probnoe-zanyatie"
      }
    ]
  };

  return (
    <div style={{ fontFamily: "var(--font-inter), sans-serif", color: "var(--color-text)", paddingBottom: "100px" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }}
      />
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
            <div style={{ background: "var(--color-success-soft)", color: "var(--color-success)", padding: "10px", borderRadius: "10px" }}>
              <Smile size={28} />
            </div>
            <span className="badge badge-green" style={{ fontWeight: 800 }}>Длительность 90 минут</span>
          </div>

          <h1 style={{ fontSize: "var(--font-h1)", fontFamily: "var(--font-geologica)", lineHeight: 1.2, marginBottom: "20px" }}>
            Бесплатное пробное занятие в Липецке
          </h1>
          
          <p style={{ fontSize: "var(--font-body-lg)", color: "var(--color-text-muted)", lineHeight: 1.6, marginBottom: "32px" }}>
            Ознакомительный практический урок для детей 6–14 лет. Прекрасный способ познакомиться со школой, преподавателями и понять, насколько ребенку интересны инженерные технологии.
          </p>

          <Link href="/#lead-form">
            <Button variant="primary-site" style={{ background: "var(--color-accent)", height: "48px", padding: "0 24px" }}>
              Зарегистрироваться бесплатно
            </Button>
          </Link>
        </div>
      </section>

      <section style={{ padding: "80px 0" }}>
        <div className="container" style={{ maxWidth: "800px", display: "grid", gap: "48px" }}>
          
          <div>
            <h2 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", marginBottom: "20px" }}>Как проходит пробное занятие?</h2>
            <div style={{ display: "grid", gap: "24px" }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: "var(--font-body)", color: "var(--color-primary)", marginBottom: "4px" }}>1. Вводный инструктаж (15 минут)</div>
                <div style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>Знакомим ребенка с наставником, правилами безопасности в лаборатории и показываем компоненты роботов.</div>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "var(--font-body)", color: "var(--color-primary)", marginBottom: "4px" }}>2. Практическая сборка робота (45 минут)</div>
                <div style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>Ребенок по инструкции и под руководством наставника собирает свою первую модель (из LEGO Mindstorms или электронную схему на Arduino).</div>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "var(--font-body)", color: "var(--color-primary)", marginBottom: "4px" }}>3. Программирование (20 минут)</div>
                <div style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>Пишем алгоритм поведения: учим робота ехать, объезжать препятствия или зажигать умные лампочки по датчику освещенности.</div>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "var(--font-body)", color: "var(--color-primary)", marginBottom: "4px" }}>4. Демонстрация проекта родителям (10 минут)</div>
                <div style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>Ребенок с гордостью показывает своего работающего робота родителям, объясняет его логику и получает диплом юного инженера.</div>
              </div>
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", marginBottom: "20px" }}>Преимущества нашего пробного урока</h2>
            <div style={{ display: "grid", gap: "16px" }}>
              {[
                "100% бесплатно: вы ни за что не платите, все материалы и ноутбуки входят в занятие;",
                "Индивидуальный подход: наставник помогает каждому и адаптирует скорость урока под ребенка;",
                "Реальный результат: ребенок уходит с чувством победы, ведь он сам заставил робота ожить.",
                "Удобно родителям: вы можете посидеть в зоне ожидания или лично присутствовать при защите проекта."
              ].map((text, i) => (
                <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <Check size={18} style={{ color: "var(--color-success)", flexShrink: 0, marginTop: "3px" }} />
                  <span style={{ fontSize: "var(--font-body)", lineHeight: 1.5 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ textAlign: "center", borderTop: "1px solid var(--color-border)", paddingTop: "40px" }}>
            <h4 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "16px" }}>Забронируйте удобное время</h4>
            <Link href="/#lead-form">
              <Button variant="primary-site" style={{ background: "var(--color-accent)" }}>
                Записаться на пробный урок
              </Button>
            </Link>
          </div>

        </div>
      </section>
    </div>
  );
}
