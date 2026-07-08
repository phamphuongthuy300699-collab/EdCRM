import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@robotics-crm/ui";
import { Code, ArrowLeft, Check, Compass, Cpu, Gamepad2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Программирование для детей в Липецке | Обучение IT с нуля",
  description: "Курсы программирования для детей и подростков 7–14 лет в Липецке. Изучение Scratch, Python, алгоритмов и веб-разработки. Запишитесь на бесплатное пробное занятие!",
  alternates: {
    canonical: "https://robotics-lipetsk.ru/programmirovanie-dlya-detey-lipetsk",
  },
};

export default function ProgrammirovaniePage() {
  const jsonLdCourse = {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": "Программирование Scratch и Python для детей в Липецке",
    "description": "Практическое обучение основам логики, алгоритмов и программирования на Scratch и Python для детей от 7 до 14 лет.",
    "provider": {
      "@type": "EducationalOrganization",
      "name": "Робокс Липецк",
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
        "name": "Программирование",
        "item": "https://robotics-lipetsk.ru/programmirovanie-dlya-detey-lipetsk"
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
              <Code size={28} />
            </div>
            <span className="badge badge-blue" style={{ fontWeight: 800 }}>Возраст 7–14 лет</span>
          </div>

          <h1 style={{ fontSize: "var(--font-h1)", fontFamily: "var(--font-geologica)", lineHeight: 1.2, marginBottom: "20px" }}>
            Курсы программирования для детей в Липецке
          </h1>
          
          <p style={{ fontSize: "var(--font-body-lg)", color: "var(--color-text-muted)", lineHeight: 1.6, marginBottom: "32px" }}>
            Помогаем детям от увлечения играми перейти к созданию собственных ИТ-продуктов: от первых мультфильмов на Scratch до сложных скриптов и ботов на Python.
          </p>

          <Link href="/#lead-form">
            <Button variant="primary-site" style={{ background: "var(--color-accent)", height: "48px", padding: "0 24px" }}>
              Записаться на бесплатный пробный урок
            </Button>
          </Link>
        </div>
      </section>

      {/* Program details */}
      <section style={{ padding: "80px 0" }}>
        <div className="container" style={{ maxWidth: "800px", display: "grid", gap: "48px" }}>
          
          <div>
            <h2 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", marginBottom: "20px" }}>Наши направления программирования</h2>
            <div style={{ display: "grid", gap: "24px" }}>
              
              <div style={{ background: "white", padding: "24px", borderRadius: "16px", border: "1px solid var(--color-border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                    <Gamepad2 size={20} style={{ color: "var(--color-primary)" }} /> Scratch (7–11 лет)
                  </h3>
                  <Link href="/scratch-dlya-detey-lipetsk" style={{ fontSize: "12px", color: "var(--color-primary)", fontWeight: 600 }}>Подробнее о Scratch →</Link>
                </div>
                <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", marginBottom: "12px" }}>
                  Идеальный старт для новичков. Визуальные блоки помогают легко усвоить циклы, переменные и логику, создавая свои первые игры и интерактивные анимации.
                </p>
                <div style={{ fontSize: "12px", fontWeight: 700 }}>Стоимость: 4 000 ₽ / месяц</div>
              </div>

              <div style={{ background: "white", padding: "24px", borderRadius: "16px", border: "1px solid var(--color-border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                    <Code size={20} style={{ color: "var(--color-primary)" }} /> Python (10–14 лет)
                  </h3>
                  <Link href="/python-dlya-detey-lipetsk" style={{ fontSize: "12px", color: "var(--color-primary)", fontWeight: 600 }}>Подробнее о Python →</Link>
                </div>
                <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", marginBottom: "12px" }}>
                  Переход к профессиональному текстовому языку. Ребята пишут реальный синтаксис кода, создавая консольные приложения, парсеры и умных Telegram ботов.
                </p>
                <div style={{ fontSize: "12px", fontWeight: 700 }}>Стоимость: 4 800 ₽ / месяц</div>
              </div>

            </div>
          </div>

          <div>
            <h2 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", marginBottom: "20px" }}>Почему стоит учить программирование с детства?</h2>
            <div style={{ display: "grid", gap: "16px" }}>
              {[
                "Развитие системного и критического мышления: ребенок учится делить сложные задачи на простые шаги;",
                "Повышение успеваемости по математике и информатике за счет практического применения формул и систем координат;",
                "Осознанное использование компьютера: ребенок понимает, как устроена цифровая среда, и переключается с игр на создание своего контента;",
                "Ранняя профориентация и получение навыков для одной из самых востребованных сфер."
              ].map((text, i) => (
                <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <Check size={18} style={{ color: "var(--color-success)", flexShrink: 0, marginTop: "3px" }} />
                  <span style={{ fontSize: "var(--font-body)", lineHeight: 1.5 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Footer */}
          <div style={{ textAlign: "center", borderTop: "1px solid var(--color-border)", paddingTop: "40px" }}>
            <h4 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "16px" }}>Попробуйте бесплатно</h4>
            <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", marginBottom: "24px" }}>
              Запишитесь на первое пробное занятие. Преподаватель оценит интересы ребенка и порекомендует подходящий курс.
            </p>
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
