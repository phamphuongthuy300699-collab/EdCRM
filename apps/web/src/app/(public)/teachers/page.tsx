import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { Users, ArrowRight, BookOpen, Star } from "lucide-react";
import { getMediaUrl } from "@/shared/utils/media";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Наши преподаватели | Робокс Липецк",
  description:
    "Команда опытных педагогов школы робототехники и программирования Робокс в Липецке. Индивидуальный подход, малые группы, вовлечённость каждого ребёнка.",
};

type TeacherProfile = {
  id: string;
  full_name: string;
  slug: string | null;
  specialty: string | null;
  public_bio: string | null;
  avatar_url: string | null;
  sort_order: number | null;
};

export default async function TeachersPage() {
  let teachers: TeacherProfile[] = [];

  try {
    const supabase = createSupabaseAdminClient();
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", "robotics-lipetsk")
      .single();

    if (org) {
      const { data: memberships } = await (supabase.from("org_memberships") as any)
        .select(`
          role,
          is_active,
          profiles(id, full_name, slug, specialty, public_bio, avatar_url, show_on_site, sort_order)
        `)
        .eq("organization_id", org.id)
        .eq("role", "teacher")
        .eq("is_active", true);

      if (memberships) {
        teachers = memberships
          .map((item: any) =>
            Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
          )
          .filter((p: any) => p?.show_on_site)
          .sort((a: any, b: any) => (a.sort_order || 100) - (b.sort_order || 100));
      }
    }
  } catch (e) {
    console.error("Error loading teachers:", e);
  }

  // Color palette for teacher avatars when no image
  const avatarColors = [
    { bg: "#EDE9FE", color: "#7C3AED" },
    { bg: "#DBEAFE", color: "#2563EB" },
    { bg: "#D1FAE5", color: "#059669" },
    { bg: "#FEF3C7", color: "#D97706" },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: teachers.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Person",
        name: t.full_name,
        jobTitle: "Преподаватель робототехники и программирования",
        worksFor: {
          "@type": "EducationalOrganization",
          name: "Робокс",
        },
        url: t.slug
          ? `https://robotics-lipetsk.ru/teachers/${t.slug}`
          : undefined,
        description: t.public_bio || undefined,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section
        className="container"
        style={{ padding: "72px 20px 48px", maxWidth: "960px" }}
      >
        <Link
          href="/"
          style={{
            color: "var(--color-primary)",
            fontWeight: 700,
            fontSize: "14px",
          }}
        >
          Вернуться на главную
        </Link>

        <div style={{ marginTop: "28px", display: "grid", gap: "18px" }}>
          <p
            style={{
              color: "var(--color-primary)",
              fontWeight: 800,
              textTransform: "uppercase",
              fontSize: "12px",
              letterSpacing: "0.06em",
            }}
          >
            Робокс
          </p>
          <h1
            style={{
              fontFamily: "var(--font-geologica)",
              fontSize: "clamp(2rem, 4vw, 3.2rem)",
              lineHeight: 1.08,
              color: "var(--color-text)",
            }}
          >
            Наши преподаватели
          </h1>
          <p
            style={{
              color: "var(--color-text-muted)",
              fontSize: "1.05rem",
              lineHeight: 1.7,
              maxWidth: "760px",
            }}
          >
            Команда увлечённых педагогов, которые прививают детям любовь к
            технологиям и помогают раскрыть инженерный потенциал каждого ученика.
          </p>
        </div>
      </section>

      <section
        className="container"
        style={{ padding: "0 20px 80px", maxWidth: "960px" }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "24px",
          }}
        >
          {teachers.map((teacher, idx) => {
            const color = avatarColors[idx % avatarColors.length];
            const initials = teacher.full_name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .toUpperCase();

            return (
              <Link
                key={teacher.id}
                href={teacher.slug ? `/teachers/${teacher.slug}` : "#"}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  className="card-site"
                  style={{
                    padding: "0",
                    overflow: "hidden",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    cursor: "pointer",
                  }}
                >
                  {/* Avatar area */}
                  <div
                    style={{
                      height: "220px",
                      background: teacher.avatar_url
                        ? undefined
                        : `linear-gradient(135deg, ${color.bg}, ${color.bg}dd)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                    }}
                  >
                    {teacher.avatar_url ? (
                      <img
                        src={getMediaUrl(teacher.avatar_url)}
                        alt={teacher.full_name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: "3.5rem",
                          fontWeight: 800,
                          color: color.color,
                          fontFamily: "var(--font-geologica)",
                          opacity: 0.7,
                        }}
                      >
                        {initials}
                      </span>
                    )}
                  </div>

                  {/* Info area */}
                  <div style={{ padding: "24px" }}>
                    <h3
                      style={{
                        fontWeight: 700,
                        fontSize: "1.15rem",
                        marginBottom: "8px",
                        fontFamily: "var(--font-geologica)",
                      }}
                    >
                      {teacher.full_name}
                    </h3>

                    {teacher.specialty && (
                      <p
                        style={{
                          fontSize: "var(--font-small)",
                          color: "var(--color-text-muted)",
                          lineHeight: 1.5,
                          marginBottom: "12px",
                        }}
                      >
                        {teacher.specialty.length > 100
                          ? teacher.specialty.slice(0, 100) + "…"
                          : teacher.specialty}
                      </p>
                    )}

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        color: "var(--color-primary)",
                        fontSize: "var(--font-small)",
                        fontWeight: 600,
                      }}
                    >
                      <span>Подробнее</span>
                      <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {teachers.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              color: "var(--color-text-muted)",
            }}
          >
            <Users
              size={48}
              style={{ marginBottom: "16px", opacity: 0.4 }}
            />
            <p style={{ fontSize: "1.1rem" }}>
              Информация о преподавателях скоро появится.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
