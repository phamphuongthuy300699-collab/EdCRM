import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@robotics-crm/ui";
import { Gamepad2, ArrowLeft, Check, Compass } from "lucide-react";

export const metadata: Metadata = {
  title: "Обучение Scratch программированию детей в Липецке",
  description: "Курсы программирования Scratch для детей 7–11 лет в Липецке. Создание игр, мультфильмов и анимаций. Запишитесь на первое бесплатное пробное занятие!",
  alternates: {
    canonical: "https://robotics-lipetsk.ru/scratch-dlya-detey-lipetsk",
  },
};

export default function ScratchPage() {
  const jsonLdCourse = {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": "Программирование на Scratch для детей в Липецке",
    "description": "Практический курс обучения основам алгоритмического мышления и разработки 2D-игр в визуальной среде Scratch для детей 7–11 лет.",
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
        "name": "Scratch",
        "item": "https://robotics-lipetsk.ru/scratch-dlya-detey-lipetsk"
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
              <Gamepad2 size={28} />
            </div>
            <span className="badge badge-blue" style={{ fontWeight: 800 }}>Возраст 7–11 лет</span>
          </div>

          <h1 style={{ fontSize: "var(--font-h1)", fontFamily: "var(--font-geologica)", lineHeight: 1.2, marginBottom: "20px" }}>
            Курс Scratch программирования в Липецке
          </h1>
          
          <p style={{ fontSize: "var(--font-body-lg)", color: "var(--color-text-muted)", lineHeight: 1.6, marginBottom: "32px" }}>
            Увлекательное введение в мир программирования через визуальные блоки. Дети создают собственные игры и истории, не отвлекаясь на сложный синтаксис текстового кода.
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
                "Понимать основные концепции ИТ: переменные, списки, циклы и условные операторы;",
                "Проектировать 2D-игры: от прорисовки персонажей до программирования их поведения;",
                "Управлять звуком, сценой и анимацией;",
                "Создавать игры с физикой прыжков, начислением очков и переключением уровней."
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
                <div style={{ fontWeight: 800, fontSize: "var(--font-small)", color: "var(--color-primary)", marginBottom: "4px" }}>Урок 1: Знакомство со сценой и спрайтами</div>
                <div style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>Создание первой интерактивной открытки. Логика смены костюмов и перемещения объектов при клике.</div>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "var(--font-small)", color: "var(--color-primary)", marginBottom: "4px" }}>Урок 2: Игра «Поймай предмет» (Логика координат)</div>
                <div style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>Создание игры-сборщика падающих фруктов. Опыт работы с переменными для начисления очков и случайными числами.</div>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "var(--font-small)", color: "var(--color-primary)", marginBottom: "4px" }}>Урок 3: Игра «Лабиринт» (Условные конструкции)</div>
                <div style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>Программирование движения персонажа по клавишам со стрелками. Детекция соприкосновения со стенами лабиринта.</div>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "var(--font-small)", color: "var(--color-primary)", marginBottom: "4px" }}>Урок 4: Защита игрового проекта</div>
                <div style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>Ребенок дорабатывает один из созданных проектов, добавляя собственные правила игры, и демонстрирует родителям.</div>
              </div>
            </div>
          </div>

          {/* Schedule Summary */}
          <div>
            <h3 style={{ fontSize: "var(--font-h3)", fontFamily: "var(--font-geologica)", marginBottom: "16px" }}>График занятий и стоимость</h3>
            <p style={{ fontSize: "var(--font-body)", color: "var(--color-text-muted)", marginBottom: "20px" }}>
              Группы формируются по 6-8 человек. Занятия проводятся 2 раза в неделю по 90 минут с перерывом на чай и разминку.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ background: "white", padding: "20px", borderRadius: "12px", border: "1px solid var(--color-border)" }}>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 700, marginBottom: "4px" }}>Расписание</div>
                <div style={{ fontWeight: 800, fontSize: "15px" }}>Среда / Пятница 18:00</div>
              </div>
              <div style={{ background: "white", padding: "20px", borderRadius: "12px", border: "1px solid var(--color-border)" }}>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 700, marginBottom: "4px" }}>Стоимость абонемента</div>
                <div style={{ fontWeight: 800, fontSize: "15px" }}>4 000 ₽ / месяц (4 занятия по 90 мин)</div>
              </div>
            </div>
          </div>

          {/* CTA Footer */}
          <div style={{ textAlign: "center", borderTop: "1px solid var(--color-border)", paddingTop: "40px" }}>
            <h4 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "16px" }}>Записаться на пробный урок</h4>
            <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", marginBottom: "24px" }}>
              Каждый ребенок на первом пробном уроке гарантированно создаст свой первый мини-мультфильм или игру!
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
