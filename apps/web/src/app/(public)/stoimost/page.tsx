import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@robotics-crm/ui";
import { CreditCard, ArrowLeft, Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Стоимость обучения робототехнике в Липецке | Цены кружка",
  description: "Тарифы и стоимость обучения робототехнике и программированию для детей в Липецке. Месячные абонементы от 4000 рублей. Все материалы включены.",
  alternates: {
    canonical: "https://robotics-lipetsk.ru/stoimost",
  },
};

export default function StoimostPage() {
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
        "name": "Стоимость",
        "item": "https://robotics-lipetsk.ru/stoimost"
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
              <CreditCard size={28} />
            </div>
            <span className="badge badge-blue" style={{ fontWeight: 800 }}>Прозрачные цены</span>
          </div>

          <h1 style={{ fontSize: "var(--font-h1)", fontFamily: "var(--font-geologica)", lineHeight: 1.2, marginBottom: "20px" }}>
            Стоимость обучения
          </h1>
          
          <p style={{ fontSize: "var(--font-body-lg)", color: "var(--color-text-muted)", lineHeight: 1.6, marginBottom: "32px" }}>
            Никаких скрытых платежей, взносов на ремонт классов или покупку учебников. Все оборудование, оригинальные конструкторы LEGO и датчики уже включены в стоимость абонементов.
          </p>

          <Link href="/#lead-form">
            <Button variant="primary-site" style={{ background: "var(--color-accent)", height: "48px", padding: "0 24px" }}>
              Записаться бесплатно
            </Button>
          </Link>
        </div>
      </section>

      <section style={{ padding: "80px 0" }}>
        <div className="container" style={{ maxWidth: "800px", display: "grid", gap: "48px" }}>
          
          <div>
            <h2 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", marginBottom: "24px", textAlign: "center" }}>Наши тарифы</h2>
            
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.1fr 1fr",
              gap: "24px",
              alignItems: "stretch"
            }}>
              <div style={{ background: "white", padding: "32px", borderRadius: "16px", border: "1px solid var(--color-border)", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "24px" }}>
                <div>
                  <span className="badge badge-blue" style={{ marginBottom: "12px" }}>Знакомство</span>
                  <h3 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 8px 0" }}>Пробный урок</h3>
                  <p style={{ fontSize: "12px", color: "var(--color-text-muted)", margin: "0 0 16px 0" }}>Ознакомительное занятие для ребенка длительностью 90 минут.</p>
                  <div style={{ fontSize: "24px", fontWeight: 900 }}>0 ₽</div>
                </div>
                <Link href="/#lead-form">
                  <Button variant="secondary-site" style={{ width: "100%" }}>Записаться</Button>
                </Link>
              </div>

              <div style={{ background: "white", padding: "32px", borderRadius: "16px", border: "2px solid var(--color-primary)", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "24px", transform: "scale(1.02)", boxShadow: "0 8px 30px rgba(37,99,235,0.06)" }}>
                <div>
                  <span className="badge badge-green" style={{ marginBottom: "12px" }}>Популярно</span>
                  <h3 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 8px 0" }}>Месячный абонемент</h3>
                  <p style={{ fontSize: "12px", color: "var(--color-text-muted)", margin: "0 0 16px 0" }}>Регулярные занятия в мини-группе 2 раза в неделю по 90 минут.</p>
                  <div style={{ fontSize: "24px", fontWeight: 900 }}>от 4 000 ₽</div>
                </div>
                <Link href="/#lead-form">
                  <Button variant="primary-site" style={{ width: "100%" }}>Купить абонемент</Button>
                </Link>
              </div>

              <div style={{ background: "white", padding: "32px", borderRadius: "16px", border: "1px solid var(--color-border)", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "24px" }}>
                <div>
                  <span className="badge badge-purple" style={{ marginBottom: "12px" }}>Персонально</span>
                  <h3 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 8px 0" }}>Индивидуальный</h3>
                  <p style={{ fontSize: "12px", color: "var(--color-text-muted)", margin: "0 0 16px 0" }}>Один на один с наставником для подготовки к олимпиадам или хакатонам.</p>
                  <div style={{ fontSize: "24px", fontWeight: 900 }}>от 1 500 ₽ <span style={{ fontSize: "12px", color: "var(--color-text-muted)", fontWeight: 500 }}>/ урок</span></div>
                </div>
                <Link href="/#lead-form">
                  <Button variant="secondary-site" style={{ width: "100%" }}>Заказать разбор</Button>
                </Link>
              </div>
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", marginBottom: "20px" }}>Что входит в стоимость абонементов?</h2>
            <div style={{ display: "grid", gap: "16px" }}>
              {[
                "Обучение по лицензированной программе с квалифицированными наставниками;",
                "Индивидуальный набор LEGO Education или электронный стенд Arduino на время урока;",
                "Современный персональный ноутбук для программирования и написания алгоритмов;",
                "Личный кабинет с отчетами о посещаемости, прогрессе ребенка и обратной связью от наставника;",
                "Чай с печеньем и разминки во время перерывов."
              ].map((text, i) => (
                <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <Check size={18} style={{ color: "var(--color-success)", flexShrink: 0, marginTop: "3px" }} />
                  <span style={{ fontSize: "var(--font-body)", lineHeight: 1.5 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ textAlign: "center", borderTop: "1px solid var(--color-border)", paddingTop: "40px" }}>
            <h4 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "16px" }}>Начните с бесплатного знакомства</h4>
            <Link href="/#lead-form">
              <Button variant="primary-site" style={{ background: "var(--color-accent)" }}>
                Записаться на бесплатный пробный урок
              </Button>
            </Link>
          </div>

        </div>
      </section>

    </div>
  );
}
