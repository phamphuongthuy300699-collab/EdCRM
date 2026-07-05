import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { ArrowLeft, Award, BookOpen, Users } from "lucide-react";
import { getMediaUrl } from "@/shared/utils/media";

export const revalidate = 300;

type TeacherProfile = {
  id: string;
  full_name: string;
  slug: string;
  specialty: string | null;
  public_bio: string | null;
  avatar_url: string | null;
  email: string | null;
  phone: string | null;
  show_public_contacts: boolean;
};

async function getTeacher(slug: string): Promise<TeacherProfile | null> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data: profile } = await (supabase.from("profiles") as any)
      .select("id, full_name, slug, specialty, public_bio, avatar_url, email, phone, show_on_site, sort_order")
      .eq("slug", slug)
      .eq("show_on_site", true)
      .single();

    if (!profile) return null;

    // Verify this teacher belongs to our org
    const { data: membership } = await (supabase.from("org_memberships") as any)
      .select("role, is_active")
      .eq("user_id", profile.id)
      .eq("role", "teacher")
      .eq("is_active", true)
      .single();

    if (!membership) return null;

    return {
      ...profile,
      show_public_contacts: false, // Contacts hidden by default per requirements
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const teacher = await getTeacher(slug);
  if (!teacher) {
    return { title: "Преподаватель не найден | Робокс" };
  }
  return {
    title: `${teacher.full_name} — преподаватель | Робокс Липецк`,
    description:
      teacher.public_bio?.slice(0, 155) ||
      `${teacher.full_name} — преподаватель школы робототехники и программирования Робокс в Липецке.`,
  };
}

export async function generateStaticParams() {
  try {
    const supabase = createSupabaseAdminClient();
    const { data: profiles } = await (supabase.from("profiles") as any)
      .select("slug")
      .eq("show_on_site", true)
      .not("slug", "is", null);

    return (profiles || []).map((p: any) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export default async function TeacherDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const teacher = await getTeacher(slug);

  if (!teacher) {
    notFound();
  }

  // Parse specialties into tags
  const specialtyTags = teacher.specialty
    ? teacher.specialty.split(/[;,]/).map((s: string) => s.trim()).filter(Boolean)
    : [];

  // Determine platform expertise from specialty text
  const platforms: string[] = [];
  const specLower = (teacher.specialty || "").toLowerCase();
  if (specLower.includes("lego") || specLower.includes("duplo") || specLower.includes("wedo") || specLower.includes("ev3") || specLower.includes("spike")) {
    platforms.push("LEGO Education");
  }
  if (specLower.includes("scratch")) platforms.push("Scratch");
  if (specLower.includes("python")) platforms.push("Python");
  if (specLower.includes("arduino") || specLower.includes("c/c++")) platforms.push("Arduino / C++");
  if (specLower.includes("программирование") || specLower.includes("алгоритми")) platforms.push("Алгоритмика");

  // Age groups
  const ageGroups: string[] = [];
  if (specLower.includes("дошкольник")) ageGroups.push("Дошкольники (5–7 лет)");
  if (specLower.includes("младш")) ageGroups.push("Младшие школьники (7–10 лет)");
  if (specLower.includes("старш")) ageGroups.push("Старшие школьники (10–14 лет)");
  if (ageGroups.length === 0) ageGroups.push("Все возрастные группы");

  const initials = teacher.full_name
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: teacher.full_name,
    jobTitle: "Преподаватель робототехники и программирования",
    description: teacher.public_bio || undefined,
    worksFor: {
      "@type": "EducationalOrganization",
      name: "Робокс",
      url: "https://robotics-lipetsk.ru",
    },
    url: `https://robotics-lipetsk.ru/teachers/${teacher.slug}`,
    knowsAbout: platforms,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section
        className="container"
        style={{ padding: "72px 20px 48px", maxWidth: "800px" }}
      >
        <Link
          href="/teachers"
          style={{
            color: "var(--color-primary)",
            fontWeight: 700,
            fontSize: "14px",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <ArrowLeft size={14} />
          Все преподаватели
        </Link>

        {/* Teacher Header */}
        <div
          style={{
            marginTop: "32px",
            display: "flex",
            gap: "32px",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: "160px",
              height: "160px",
              borderRadius: "20px",
              overflow: "hidden",
              background: teacher.avatar_url
                ? undefined
                : "linear-gradient(135deg, #EDE9FE, #DBEAFE)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {teacher.avatar_url ? (
              <img
                src={getMediaUrl(teacher.avatar_url)}
                alt={teacher.full_name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span
                style={{
                  fontSize: "3.5rem",
                  fontWeight: 800,
                  color: "#7C3AED",
                  fontFamily: "var(--font-geologica)",
                  opacity: 0.6,
                }}
              >
                {initials}
              </span>
            )}
          </div>

          {/* Name + Tags */}
          <div style={{ flex: 1, minWidth: "200px" }}>
            <p
              style={{
                color: "var(--color-primary)",
                fontWeight: 800,
                textTransform: "uppercase",
                fontSize: "12px",
                letterSpacing: "0.06em",
                marginBottom: "8px",
              }}
            >
              Преподаватель Робокс
            </p>
            <h1
              style={{
                fontFamily: "var(--font-geologica)",
                fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
                lineHeight: 1.1,
                color: "var(--color-text)",
                marginBottom: "16px",
              }}
            >
              {teacher.full_name}
            </h1>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                marginBottom: "16px",
              }}
            >
              {ageGroups.map((ag) => (
                <span
                  key={ag}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 12px",
                    borderRadius: "20px",
                    background: "var(--color-primary-soft, #EDE9FE)",
                    color: "var(--color-primary-dark, #7C3AED)",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  <Users size={12} />
                  {ag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bio */}
        {teacher.public_bio && (
          <div
            style={{
              marginTop: "36px",
              padding: "28px",
              borderRadius: "16px",
              background: "var(--color-surface, #fff)",
              border: "1px solid var(--color-border)",
            }}
          >
            <h2
              style={{
                fontSize: "1.1rem",
                fontWeight: 700,
                marginBottom: "12px",
                fontFamily: "var(--font-geologica)",
              }}
            >
              О преподавателе
            </h2>
            <p
              style={{
                fontSize: "var(--font-base, 1rem)",
                lineHeight: 1.7,
                color: "var(--color-text-muted)",
              }}
            >
              {teacher.public_bio}
            </p>
          </div>
        )}

        {/* Platforms */}
        {platforms.length > 0 && (
          <div
            style={{
              marginTop: "28px",
              padding: "28px",
              borderRadius: "16px",
              background: "var(--color-surface, #fff)",
              border: "1px solid var(--color-border)",
            }}
          >
            <h2
              style={{
                fontSize: "1.1rem",
                fontWeight: 700,
                marginBottom: "16px",
                fontFamily: "var(--font-geologica)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <BookOpen size={18} style={{ color: "var(--color-primary)" }} />
              Платформы и технологии
            </h2>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              {platforms.map((p) => (
                <span
                  key={p}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "12px",
                    background: "#F3F4F6",
                    color: "var(--color-text)",
                    fontSize: "var(--font-small)",
                    fontWeight: 600,
                  }}
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Specialty Details */}
        {specialtyTags.length > 0 && (
          <div
            style={{
              marginTop: "28px",
              padding: "28px",
              borderRadius: "16px",
              background: "var(--color-surface, #fff)",
              border: "1px solid var(--color-border)",
            }}
          >
            <h2
              style={{
                fontSize: "1.1rem",
                fontWeight: 700,
                marginBottom: "16px",
                fontFamily: "var(--font-geologica)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Award size={18} style={{ color: "var(--color-primary)" }} />
              Специализация
            </h2>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                display: "grid",
                gap: "8px",
              }}
            >
              {specialtyTags.map((tag: string, i: number) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    fontSize: "var(--font-small)",
                    lineHeight: 1.5,
                    color: "var(--color-text-muted)",
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "var(--color-primary)",
                      marginTop: "7px",
                      flexShrink: 0,
                    }}
                  />
                  {tag}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA */}
        <div
          style={{
            marginTop: "40px",
            padding: "32px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, var(--color-primary), #7C3AED)",
            color: "white",
            textAlign: "center",
          }}
        >
          <h3
            style={{
              fontSize: "1.3rem",
              fontWeight: 700,
              marginBottom: "12px",
              fontFamily: "var(--font-geologica)",
            }}
          >
            Запишитесь на пробное занятие
          </h3>
          <p
            style={{
              fontSize: "var(--font-small)",
              opacity: 0.9,
              marginBottom: "20px",
              maxWidth: "400px",
              margin: "0 auto 20px",
            }}
          >
            Бесплатное пробное занятие 90 минут. Познакомьтесь с преподавателем
            и выберите подходящую группу.
          </p>
          <Link
            href="/#lead-form"
            style={{
              display: "inline-block",
              padding: "12px 32px",
              borderRadius: "12px",
              background: "white",
              color: "var(--color-primary)",
              fontWeight: 700,
              textDecoration: "none",
              fontSize: "var(--font-small)",
            }}
          >
            Записаться →
          </Link>
        </div>
      </section>
    </>
  );
}
