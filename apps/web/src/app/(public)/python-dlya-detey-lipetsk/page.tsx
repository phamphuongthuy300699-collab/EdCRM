import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@robotics-crm/ui";
import { Code, ArrowLeft, Check, Compass } from "lucide-react";

export const metadata: Metadata = {
  title: "Курсы Python для детей в Липецке | Обучение программированию",
  description: "Курсы программирования на Python для детей и подростков 10–14 лет в Липецке. Практика написания кода, разработка чат-ботов и логических программ с нуля.",
  alternates: {
    canonical: "https://robotics-lipetsk.ru/python-dlya-detey-lipetsk",
  },
};

export default function PythonPage() {
  const jsonLdCourse = {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": "Программирование на Python для детей в Липецке",
    "description": "Практический курс обучения программированию на языке Python для школьников от 10 до 14 лет.",
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
        "name": "Python",
        "item": "https://robotics-lipetsk.ru/python-dlya-detey-lipetsk"
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
            <span className="badge badge-blue" style={{ fontWeight: 800 }}>Возраст 10–14 лет</span>
          </div>

          <h1 style={{ fontSize: "var(--font-h1)", fontFamily: "var(--font-geologica)", lineHeight: 1.2, marginBottom: "20px" }}>
            Курсы Python для школьников в Липецке
          </h1>
          
          <p style={{ fontSize: "var(--font-body-lg)", color: "var(--color-text-muted)", lineHeight: 1.6, marginBottom: "32px" }}>
            Профессиональное программирование на одном из самых популярных языков мира. Дети изучают реальный синтаксис, пишут консольные программы и проектируют умных Telegram-ботов.
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
                "Писать чистый текстовый синтаксис языка Python (переменные, типы данных, списки, кортежи);",
                "Использовать циклы `for`/`while` и условные конструкции `if`-`elif`-`else` для управления поведением программ;",
                "Проектировать собственные функции и подключать сторонние библиотеки (например, `telebot` или `random`);",
                "Разрабатывать логику работы с API и создавать настоящих интерактивных ботов."
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
                <div style={{ fontWeight: 800, fontSize: "var(--font-small)", color: "var(--color-primary)", marginBottom: "4px" }}>Урок 1: Синтаксис и первая консольная программа</div>
                <div style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>Знакомство с Python, установкой окружения VS Code. Вывод текста и ввод данных от пользователя.</div>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "var(--font-small)", color: "var(--color-primary)", marginBottom: "4px" }}>Урок 2: Разработка логической игры «Угадай число»</div>
                <div style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>Создание алгоритма сравнения чисел с использованием генератора случайных значений и цикла `while`.</div>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "var(--font-small)", color: "var(--color-primary)", marginBottom: "4px" }}>Урок 3: Работа со списками и текстовыми данными</div>
                <div style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>Написание программы-помощника для управления личными делами. Хранение, удаление и добавление записей.</div>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "var(--font-small)", color: "var(--color-primary)", marginBottom: "4px" }}>Урок 4: Введение в разработку Telegram-бота</div>
                <div style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>Подключение библиотеки `pyTelegramBotAPI`, регистрация бота в BotFather и запуск первого простого эхо-бота.</div>
              </div>
            </div>
          </div>

          {/* Schedule Summary */}
          <div>
            <h3 style={{ fontSize: "var(--font-h3)", fontFamily: "var(--font-geologica)", marginBottom: "16px" }}>График занятий и стоимость</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ background: "white", padding: "20px", borderRadius: "12px", border: "1px solid var(--color-border)" }}>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 700, marginBottom: "4px" }}>Расписание</div>
                <div style={{ fontWeight: 800, fontSize: "15px" }}>Суббота 12:00</div>
              </div>
              <div style={{ background: "white", padding: "20px", borderRadius: "12px", border: "1px solid var(--color-border)" }}>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 700, marginBottom: "4px" }}>Стоимость абонемента</div>
                <div style={{ fontWeight: 800, fontSize: "15px" }}>4 800 ₽ / месяц (4 занятия по 90 мин)</div>
              </div>
            </div>
          </div>

          {/* CTA Footer */}
          <div style={{ textAlign: "center", borderTop: "1px solid var(--color-border)", paddingTop: "40px" }}>
            <h4 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "16px" }}>Записаться на пробное занятие</h4>
            <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", marginBottom: "24px" }}>
              Занятие проходит на удобных компьютерах под чутким руководством наставника. Опыт программирования не требуется!
            </p>
            <Link href="/#lead-form">
              <Button variant="primary-site" style={{ background: "var(--color-accent)" }}>
                Подать заявку
              </Button>
            </Link>
          </div>

        </div>
      </section>

    </div>
  );
}
