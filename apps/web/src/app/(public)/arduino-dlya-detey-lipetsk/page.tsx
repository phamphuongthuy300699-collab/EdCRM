import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@robotics-crm/ui";
import { Lightbulb, ArrowLeft, Check, Compass } from "lucide-react";

export const metadata: Metadata = {
  title: "Обучение схемотехнике и Arduino для детей в Липецке",
  description: "Курсы робототехники и схемотехники на базе Arduino для детей и подростков 10–15 лет в Липецке. Сборка электронных схем и программирование микроконтроллеров с нуля.",
  alternates: {
    canonical: "https://robotics-lipetsk.ru/arduino-dlya-detey-lipetsk",
  },
};

export default function ArduinoPage() {
  const jsonLdCourse = {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": "Arduino и схемотехника для детей в Липецке",
    "description": "Практический курс обучения основам электроники, конструирования электронных схем и программирования плат Arduino на языке C/C++.",
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
        "name": "Arduino",
        "item": "https://robotics-lipetsk.ru/arduino-dlya-detey-lipetsk"
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
              <Lightbulb size={28} />
            </div>
            <span className="badge badge-blue" style={{ fontWeight: 800 }}>Возраст 10–15 лет</span>
          </div>

          <h1 style={{ fontSize: "var(--font-h1)", fontFamily: "var(--font-geologica)", lineHeight: 1.2, marginBottom: "20px" }}>
            Курсы Arduino и схемотехники в Липецке
          </h1>
          
          <p style={{ fontSize: "var(--font-body-lg)", color: "var(--color-text-muted)", lineHeight: 1.6, marginBottom: "32px" }}>
            Ребята собирают реальные электронные цепи без пайки на макетных платах, программируют микроконтроллеры на языке C/C++ и создают свои первые умные устройства.
          </p>

          <Link href="/#lead-form">
            <Button variant="primary-site" style={{ background: "var(--color-accent)", height: "48px", padding: "0 24px" }}>
              Записаться на бесплатный пробный урок
            </Button>
          </Link>
        </div>
      </section>

      {/* Course Details */}
      <section style={{ padding: "80px 0" }}>
        <div className="container" style={{ maxWidth: "800px", display: "grid", gap: "48px" }}>
          
          <div>
            <h2 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", marginBottom: "20px" }}>Чему научится ребёнок</h2>
            <div style={{ display: "grid", gap: "16px" }}>
              {[
                "Понимать законы физики: электрический ток, сопротивление, напряжение, закон Ома на практике;",
                "Проектировать схемы без пайки с использованием резисторов, светодиодов, транзисторов и сенсоров;",
                "Программировать контроллеры Arduino на языке C/C++ (управление пинами, условиями, циклами);",
                "Создавать системы автоматики: умный свет, автоматический полив растений, системы сигнализации."
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
                <div style={{ fontWeight: 800, fontSize: "var(--font-small)", color: "var(--color-primary)", marginBottom: "4px" }}>Урок 1: Управление светодиодом (Blink)</div>
                <div style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>Знакомство с макетной платой, микроконтроллером Arduino Uno. Сборка первой цепи и написание программы мигания.</div>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "var(--font-small)", color: "var(--color-primary)", marginBottom: "4px" }}>Урок 2: Светофор (Аналоговый и цифровой сигнал)</div>
                <div style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>Создание схемы трехцветного светофора. Программирование последовательного переключения фаз на C/C++.</div>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "var(--font-small)", color: "var(--color-primary)", marginBottom: "4px" }}>Урок 3: Датчик освещенности (Фоторезистор)</div>
                <div style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>Создание прототипа «Умного уличного фонаря», который автоматически зажигается с наступлением темноты.</div>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "var(--font-small)", color: "var(--color-primary)", marginBottom: "4px" }}>Урок 4: Автоматический полив растений</div>
                <div style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>Интеграция датчика влажности почвы и водяного насоса (помпы) для полива цветка при высыхании земли. Защита проекта.</div>
              </div>
            </div>
          </div>

          {/* Schedule Summary */}
          <div>
            <h3 style={{ fontSize: "var(--font-h3)", fontFamily: "var(--font-geologica)", marginBottom: "16px" }}>График занятий и стоимость</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ background: "white", padding: "20px", borderRadius: "12px", border: "1px solid var(--color-border)" }}>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 700, marginBottom: "4px" }}>Расписание</div>
                <div style={{ fontWeight: 800, fontSize: "15px" }}>Суббота 15:00</div>
              </div>
              <div style={{ background: "white", padding: "20px", borderRadius: "12px", border: "1px solid var(--color-border)" }}>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 700, marginBottom: "4px" }}>Стоимость абонемента</div>
                <div style={{ fontWeight: 800, fontSize: "15px" }}>5 200 ₽ / месяц (4 занятия по 90 мин)</div>
              </div>
            </div>
          </div>

          {/* CTA Footer */}
          <div style={{ textAlign: "center", borderTop: "1px solid var(--color-border)", paddingTop: "40px" }}>
            <h4 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "16px" }}>Записаться на пробный урок</h4>
            <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", marginBottom: "24px" }}>
              Вся электроника, датчики и контроллеры предоставляются школой бесплатно во время урока.
            </p>
            <Link href="/#lead-form">
              <Button variant="primary-site" style={{ background: "var(--color-accent)" }}>
                Зарегистрироваться на урок
              </Button>
            </Link>
          </div>

        </div>
      </section>

    </div>
  );
}
