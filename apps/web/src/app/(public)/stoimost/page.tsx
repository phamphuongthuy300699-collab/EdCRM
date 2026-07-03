import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@robotics-crm/ui";
import { CreditCard, ArrowLeft, Check, Percent } from "lucide-react";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";

export const metadata: Metadata = {
  title: "Стоимость обучения робототехнике в Липецке | Цены кружка",
  description: "Тарифы и стоимость обучения робототехнике и программированию для детей в Липецке. Месячные абонементы от 4000 рублей. Все материалы включены.",
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

  let displayTariffs: any[] = [];
  let publicCourses: any[] = [];

  try {
    const supabase = createSupabaseAdminClient();
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", "robotics-lipetsk")
      .single();

    if (org) {
      // 1. Fetch Tariffs
      const { data: tariffsData } = await supabase
        .from("course_tariffs")
        .select("*")
        .eq("organization_id", org.id)
        .eq("show_on_site", true)
        .order("sort_order", { ascending: true });

      if (tariffsData && tariffsData.length > 0) {
        displayTariffs = tariffsData;
      }

      // 2. Fetch Courses
      const { data: courses } = await (supabase.from("courses") as any)
        .select("id, title, short_description, min_age, max_age, duration_minutes, price_monthly, sort_order")
        .eq("organization_id", org.id)
        .eq("is_public", true)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (courses) {
        publicCourses = courses;
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
        <div className="container" style={{ maxWidth: "960px", display: "grid", gap: "48px" }}>
          
          <div>
            <h2 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", marginBottom: "36px", textAlign: "center" }}>Наши тарифы</h2>
            
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "24px",
              alignItems: "stretch"
            }}>
              {displayTariffs.length === 0 ? (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "48px 0", color: "var(--color-text-muted)", background: "white", borderRadius: "16px", border: "1px dashed var(--color-border)" }}>
                  Данные о тарифах пока не заполнены в CRM.
                </div>
              ) : (
                displayTariffs.map((t) => {
                  const isTrial = Number(t.price) === 0;
                  const isPopular = t.title.toLowerCase().includes("абонемент");
                  const badgeLabel = isTrial ? "Знакомство" : isPopular ? "Популярно" : "Углубленный";
                  const badgeClass = isTrial ? "badge-blue" : isPopular ? "badge-green" : "badge-purple";
                  const borderStyle = isPopular 
                    ? { border: "2px solid var(--color-primary)", transform: "scale(1.02)", boxShadow: "0 8px 30px rgba(37,99,235,0.06)" } 
                    : { border: "1px solid var(--color-border)" };

                  return (
                    <div 
                      key={t.id} 
                      style={{ 
                        background: "white", 
                        padding: "32px", 
                        borderRadius: "16px", 
                        display: "flex", 
                        flexDirection: "column", 
                        justifyContent: "space-between", 
                        gap: "24px",
                        ...borderStyle
                      }}
                    >
                      <div>
                        <span className={`badge ${badgeClass}`} style={{ marginBottom: "12px" }}>{badgeLabel}</span>
                        <h3 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 8px 0" }}>{t.title}</h3>
                        <p style={{ fontSize: "12.5px", color: "var(--color-text-muted)", margin: "0 0 16px 0", lineHeight: 1.5 }}>{t.format}</p>
                        <div style={{ fontSize: "28px", fontWeight: 900, color: "var(--color-text)" }}>
                          {Number(t.price) === 0 ? "0 ₽" : `${Number(t.price).toLocaleString("ru-RU")} ₽`}
                          {!t.is_one_time && Number(t.price) > 0 && <span style={{ fontSize: "14px", fontWeight: 550, color: "var(--color-text-muted)" }}> / мес</span>}
                        </div>
                      </div>
                      <Link href="/#lead-form">
                        <Button 
                          variant={isPopular ? "primary-site" : "secondary-site"} 
                          style={{ width: "100%", background: isPopular ? "var(--color-primary)" : undefined }}
                        >
                          {isTrial ? "Записаться" : "Выбрать тариф"}
                        </Button>
                      </Link>
                    </div>
                  );
                })
              )}
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
