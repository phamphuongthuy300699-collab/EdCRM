import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@robotics-crm/ui";
import { Cpu, ArrowLeft, Check, Calendar, HelpCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Робототехника для детей в Липецке | Lego Education курсы",
  description: "Курсы робототехники для детей 6–9 лет в Липецке. Практические занятия по конструированию и программированию LEGO Mindstorms. Запишитесь на бесплатное пробное занятие!",
  alternates: {
    canonical: "https://robotics-lipetsk.ru/robototekhnika-dlya-detey-lipetsk",
  },
};

export default function RobototekhnikaPage() {
  const jsonLdCourse = {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": "Робототехника Lego Education для детей в Липецке",
    "description": "Практический курс конструирования и программирования роботов для детей 6–9 лет с использованием наборов LEGO Education.",
    "provider": {
      "@type": "EducationalOrganization",
      "name": "Школа Robotics Липецк",
      "sameAs": "https://robotics-lipetsk.ru"
    }
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
        "name": "Робототехника",
        "item": "https://robotics-lipetsk.ru/robototekhnika-dlya-detey-lipetsk"
      }
    ]
  };

  return (
    <div style={{ fontFamily: "var(--font-inter), sans-serif", color: "var(--color-text)", paddingBottom: "100px" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdCourse) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
      />

      {/* Header Info */}
      <section className="bg-grid-blueprint" style={{ padding: "80px 0", borderBottom: "1px solid var(--color-border)" }}>
        <div className="container" style={{ maxWidth: "800px" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "var(--color-primary)", fontWeight: 600, marginBottom: "24px" }}>
            <ArrowLeft size={16} /> Вернуться на главную
          </Link>
          
          <div style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ background: "var(--color-primary-soft)", color: "var(--color-primary)", padding: "10px", borderRadius: "10px" }}>
              <Cpu size={28} />
            </div>
            <span className="badge badge-blue" style={{ fontWeight: 800 }}>Возраст 6–9 лет</span>
          </div>

          <h1 style={{ fontSize: "var(--font-h1)", fontFamily: "var(--font-geologica)", lineHeight: 1.2, marginBottom: "20px" }}>
            Курс робототехники для детей в Липецке
          </h1>
          
          <p style={{ fontSize: "var(--font-body-lg)", color: "var(--color-text-muted)", lineHeight: 1.6, marginBottom: "32px" }}>
            Практические занятия, на которых ребята знакомятся с механикой, электроникой и программированием через сборку управляемых роботов на оригинальных наборах LEGO Education.
          </p>

          <Link href="/#lead-form">
            <Button variant="primary-site" style={{ background: "var(--color-accent)", height: "48px", padding: "0 24px" }}>
              Записаться на бесплатный пробный урок
            </Button>
          </Link>
        </div>
      </section>

      {/* Content Details */}
      <section style={{ padding: "80px 0" }}>
        <div className="container" style={{ maxWidth: "800px", display: "grid", gap: "48px" }}>
          
          <div>
            <h2 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", marginBottom: "20px" }}>Чему научится ребёнок</h2>
            <div style={{ display: "grid", gap: "16px" }}>
              {[
                "Конструировать прочные и подвижные механизмы (зубчатые и ременные передачи, рычаги);",
                "Управлять роботом с помощью датчиков цвета, гироскопов и ультразвуковых сенсоров;",
                "Создавать алгоритмы поведения в визуальной блочной среде программирования;",
                "Работать в команде над решением инженерных кейсов и презентовать готовый проект наставнику и родителям."
              ].map((text, i) => (
                <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <Check size={18} style={{ color: "var(--color-success)", flexShrink: 0, marginTop: "3px" }} />
                  <span style={{ fontSize: "var(--font-body)", lineHeight: 1.5 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* About Program */}
          <div style={{ background: "var(--color-bg)", padding: "32px", borderRadius: "16px", border: "1px solid var(--color-border)" }}>
            <h3 style={{ fontSize: "var(--font-h3)", fontFamily: "var(--font-geologica)", marginBottom: "16px" }}>Программа первого месяца обучения</h3>
            <div style={{ display: "grid", gap: "16px" }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: "var(--font-small)", color: "var(--color-primary)", marginBottom: "4px" }}>Урок 1: Введение в робототехнику</div>
                <div style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>Знакомство с LEGO деталями, микроконтроллером SmartHub и сборка первого простого робота-вентилятора.</div>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "var(--font-small)", color: "var(--color-primary)", marginBottom: "4px" }}>Урок 2: Зубчатые передачи и датчик наклона</div>
                <div style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>Сборка карусели. Программирование изменения скорости вращения в зависимости от показаний датчика.</div>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "var(--font-small)", color: "var(--color-primary)", marginBottom: "4px" }}>Урок 3: Ременные передачи и датчик расстояния</div>
                <div style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>Сборка робота-сортировщика деталей. Логика сравнения расстояний для детекции размера объектов.</div>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "var(--font-small)", color: "var(--color-primary)", marginBottom: "4px" }}>Урок 4: Защита первого мини-проекта</div>
                <div style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>Каждый ребенок собирает собственную доработанную модель и показывает её родителям в конце урока.</div>
              </div>
            </div>
          </div>

          {/* Schedule Summary */}
          <div>
            <h3 style={{ fontSize: "var(--font-h3)", fontFamily: "var(--font-geologica)", marginBottom: "16px" }}>График занятий и стоимость</h3>
            <p style={{ fontSize: "var(--font-body)", color: "var(--color-text-muted)", marginBottom: "20px" }}>
              Занятия проходят в небольших группах до 8 человек 2 раза в неделю. Каждому ребенку предоставляется индивидуальный ноутбук и оригинальный конструктор LEGO Education.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ background: "white", padding: "20px", borderRadius: "12px", border: "1px solid var(--color-border)" }}>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 700, marginBottom: "4px" }}>Расписание</div>
                <div style={{ fontWeight: 800, fontSize: "15px" }}>Вторник / Четверг 17:00</div>
              </div>
              <div style={{ background: "white", padding: "20px", borderRadius: "12px", border: "1px solid var(--color-border)" }}>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 700, marginBottom: "4px" }}>Стоимость абонемента</div>
                <div style={{ fontWeight: 800, fontSize: "15px" }}>4 500 ₽ / месяц (4 занятия по 90 мин)</div>
              </div>
            </div>
          </div>

          {/* CTA Footer */}
          <div style={{ textAlign: "center", borderTop: "1px solid var(--color-border)", paddingTop: "40px" }}>
            <h4 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "16px" }}>Забронировать место в группе</h4>
            <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", marginBottom: "24px" }}>
              Начните с бесплатного пробного урока. Мы познакомим ребенка со школой и покажем его первый проект родителям!
            </p>
            <Link href="/#lead-form">
              <Button variant="primary-site" style={{ background: "var(--color-accent)" }}>
                Подать заявку на бесплатное занятие
              </Button>
            </Link>
          </div>

        </div>
      </section>

    </div>
  );
}
