import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@robotics-crm/ui";
import { CreditCard, ArrowLeft, Check } from "lucide-react";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";

export const metadata: Metadata = {
  title: "Стоимость обучения робототехнике в Липецке | Цены кружка",
  description: "Тарифы и стоимость обучения робототехнике и программированию для детей in Липецке. Месячные абонементы от 4000 рублей. Все материалы включены.",
  alternates: {
    canonical: "https://robotics-lipetsk.ru/stoimost",
  },
};

export default async function StoimostPage() {
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

  const trialPrice = "0 ₽";
  let monthlyPrice = "от 4 000 ₽";
  const individualPrice = "от 1 500 ₽";
  let publicCourses: any[] = [];

  try {
    const supabase = createSupabaseAdminClient();
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", "robotics-lipetsk")
      .single();

    if (org) {
      const { data: courses } = await (supabase.from("courses") as any)
        .select("id, title, short_description, min_age, max_age, duration_minutes, price_monthly, sort_order")
        .eq("organization_id", org.id)
        .eq("is_public", true)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (courses && courses.length > 0) {
        publicCourses = courses;
        const prices = courses.map((course: any) => Number(course.price_monthly || 0)).filter(Boolean);
        if (prices.length > 0) {
          monthlyPrice = `от ${Math.min(...prices).toLocaleString("ru-RU")} ₽`;
        }
      }

      const { data: groups } = await (supabase.from("groups") as any)
        .select("price_monthly")
        .eq("organization_id", org.id)
        .eq("status", "active")
        .eq("show_on_site", true);

      const groupPrices = (groups || []).map((group: any) => Number(group.price_monthly || 0)).filter(Boolean);
      if (groupPrices.length > 0) {
        monthlyPrice = `от ${Math.min(...groupPrices).toLocaleString("ru-RU")} ₽`;
      }
    }
  } catch (e) {
    console.error("Error loading pricing page dynamic data:", e);
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
                  <div style={{ fontSize: "24px", fontWeight: 900 }}>{trialPrice}</div>
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
                  <div style={{ fontSize: "24px", fontWeight: 900 }}>{monthlyPrice}</div>
                </div>
                <Link href="/#lead-form">
                  <Button variant="primary-site" style={{ width: "100%", background: "var(--color-primary)" }}>Купить абонемент</Button>
                </Link>
              </div>

              <div style={{ background: "white", padding: "32px", borderRadius: "16px", border: "1px solid var(--color-border)", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "24px" }}>
                <div>
                  <span className="badge badge-purple" style={{ marginBottom: "12px" }}>Углубленный</span>
                  <h3 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 8px 0" }}>Индивидуальный</h3>
                  <p style={{ fontSize: "12px", color: "var(--color-text-muted)", margin: "0 0 16px 0" }}>Персональный урок с наставником. Индивидуальный разбор сложных проектов.</p>
                  <div style={{ fontSize: "24px", fontWeight: 900 }}>{individualPrice}</div>
                </div>
                <Link href="/#lead-form">
                  <Button variant="secondary-site" style={{ width: "100%" }}>Заказать разбор</Button>
                </Link>
              </div>
            </div>
          </div>

          {publicCourses.length > 0 && (
            <div>
              <h2 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", marginBottom: "24px", textAlign: "center" }}>Цены по направлениям</h2>
              <div style={{ display: "grid", gap: "12px" }}>
                {publicCourses.map((course) => (
                  <div key={course.id} style={{ display: "grid", gridTemplateColumns: "1.2fr 0.7fr 0.7fr", gap: "16px", alignItems: "center", background: "white", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "18px 20px" }}>
                    <div>
                      <h3 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: 800 }}>{course.title}</h3>
                      <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: "12px" }}>{course.short_description || "Описание направления уточняется"}</p>
                    </div>
                    <span style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>{course.min_age || 6}-{course.max_age || 14} лет · {course.duration_minutes || 90} мин</span>
                    <strong style={{ textAlign: "right" }}>{course.price_monthly ? `${Number(course.price_monthly).toLocaleString("ru-RU")} ₽ / мес` : "Цена уточняется"}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ background: "rgba(37, 99, 235, 0.04)", border: "1px dashed rgba(37, 99, 235, 0.3)", borderRadius: "16px", padding: "32px", marginTop: "24px" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "16px" }}>Что входит в стоимость:</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 32px" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", fontSize: "13px" }}>
                <Check size={16} style={{ color: "var(--color-success)" }} />
                <span>Оригинальные конструкторы LEGO Education</span>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", fontSize: "13px" }}>
                <Check size={16} style={{ color: "var(--color-success)" }} />
                <span>Датчики, моторы, платы Arduino</span>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", fontSize: "13px" }}>
                <Check size={16} style={{ color: "var(--color-success)" }} />
                <span>Личный кабинет родителя и отчетность</span>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", fontSize: "13px" }}>
                <Check size={16} style={{ color: "var(--color-success)" }} />
                <span>Оборудованные рабочие места (компьютеры)</span>
              </div>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
