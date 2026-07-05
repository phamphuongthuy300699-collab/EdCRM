import React from "react";
import { Metadata } from "next";
import LandingPageClient from "./LandingPageClient";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { getMediaUrl } from "@/shared/utils/media";
import { publicMapBranches } from "@/shared/utils/public-map";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", "robotics-lipetsk")
      .single();

    let title = "Робототехника и программирование для детей в Липецке | Робокс";
    let description = "Курсы робототехники, Scratch, Python и Arduino для детей 6–14 лет в Липецке. Бесплатное пробное занятие 90 минут! Запись в мини-группы до 8 человек.";

    if (org) {
      const { data: seoBlock } = await supabase
        .from("site_content_blocks")
        .select("title, subtitle")
        .eq("organization_id", org.id)
        .eq("block_key", "home.seo")
        .eq("status", "published")
        .single();
      
      if (seoBlock) {
        if (seoBlock.title) title = seoBlock.title;
        if (seoBlock.subtitle) description = seoBlock.subtitle;
      }
    }

    return {
      title,
      description,
      alternates: {
        canonical: "https://robotics-lipetsk.ru",
      },
    };
  } catch (e) {
    console.error("Error generating metadata dynamically:", e);
    return {
      title: "Робототехника и программирование для детей в Липецке | Робокс",
      description: "Курсы робототехники, Scratch, Python и Arduino для детей 6–14 лет в Липецке. Бесплатное пробное занятие 90 минут! Запись в мини-группы до 8 человек.",
      alternates: {
        canonical: "https://robotics-lipetsk.ru",
      },
    };
  }
}

export default async function Page() {
  let initialCourses: any[] = [];
  let initialSchedule: any[] = [];
  let initialBlocks: any[] = [];
  let initialTeachers: any[] = [];
  let initialBranches: any[] = [];
  let initialTariffs: any[] = [];
  let orgPhone = "+7-994-777-48-48";
  let orgAddress = "ул. Артемова, д. 5а, оф. 126";

  let org: any = null;

  try {
    const supabase = createSupabaseAdminClient();
    const { data: orgData } = await supabase
      .from("organizations")
      .select("*")
      .eq("slug", "robotics-lipetsk")
      .single();
    
    org = orgData;

    if (org) {
      // 1. Fetch site content blocks
      const { data: blocks } = await supabase
        .from("site_content_blocks")
        .select("*")
        .eq("organization_id", org.id)
        .eq("status", "published");
      if (blocks) initialBlocks = blocks;

      // 2. Fetch courses
      const { data: courses } = await supabase
        .from("courses")
        .select("*")
        .eq("organization_id", org.id)
        .eq("is_public", true)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (courses) initialCourses = courses;

      const { data: branches } = await (supabase.from("branches") as any)
        .select("*")
        .eq("organization_id", org.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (branches) {
        initialBranches = publicMapBranches(branches);
        if (initialBranches[0]?.phone) orgPhone = initialBranches[0].phone;
        if (initialBranches[0]?.address) orgAddress = initialBranches[0].address;
      }

      const { data: teachers } = await (supabase.from("org_memberships") as any)
        .select(`
          role,
          is_active,
          profiles(id, full_name, avatar_url, specialty, public_bio, show_on_site, sort_order)
        `)
        .eq("organization_id", org.id)
        .eq("role", "teacher")
        .eq("is_active", true);
      if (teachers) {
        initialTeachers = teachers
          .map((item: any) => Array.isArray(item.profiles) ? item.profiles[0] : item.profiles)
          .filter((profile: any) => profile?.show_on_site)
          .sort((a: any, b: any) => (a.sort_order || 100) - (b.sort_order || 100))
          .map((profile: any) => ({
            name: profile.full_name,
            role: profile.specialty || "Наставник инженерной лаборатории",
            text: profile.public_bio,
            imageUrl: profile.avatar_url ? getMediaUrl(profile.avatar_url) : "",
            alt: profile.full_name,
          }));
      }

      // 3. Fetch groups & schedule rules
      const { data: groups } = await supabase
        .from("groups")
        .select(`
          id,
          title,
          age_from,
          age_to,
          capacity,
          show_on_site,
          course:courses(title),
          branch:branches(name, address),
          room:rooms(name),
          teacher:profiles(full_name),
          schedule_rules:group_schedule_rules(weekday, starts_at),
          enrollments(id, status)
        `)
        .eq("organization_id", org.id)
        .eq("show_on_site", true)
        .eq("status", "active")
        .order("sort_order", { ascending: true });

      if (groups) {
        const daysMap: Record<number, string> = {
          1: "Пн", 2: "Вт", 3: "Ср", 4: "Чт", 5: "Пт", 6: "Сб", 7: "Вс"
        };
        const fullDaysMap: Record<number, string> = {
          1: "Понедельник", 2: "Вторник", 3: "Среда", 4: "Четверг", 5: "Пятница", 6: "Суббота", 7: "Воскресенье"
        };

        initialSchedule = groups.map(g => {
          const activeEnrollments = g.enrollments?.filter((e: any) => e.status === "active")?.length || 0;
          const spots = g.capacity - activeEnrollments;

          const rules = g.schedule_rules || [];
          let timeStr = "Время уточняется";
          if (rules.length > 0) {
            // Sort by weekday
            const sortedRules = [...rules].sort((a: any, b: any) => a.weekday - b.weekday);
            const days = sortedRules.map((r: any) => sortedRules.length > 2 ? daysMap[r.weekday] : fullDaysMap[r.weekday]).filter(Boolean).join(" / ");
            const startsAt = sortedRules[0]?.starts_at ? sortedRules[0].starts_at.substring(0, 5) : "";
            timeStr = `${days} ${startsAt}`;
          }

          return {
            age: g.age_from && g.age_to ? `${g.age_from}–${g.age_to} лет` : "6–14 лет",
            course: (Array.isArray(g.course) ? g.course[0]?.title : (g.course as any)?.title) || g.title,
            time: timeStr,
            branch: (Array.isArray(g.branch) ? g.branch[0]?.name : (g.branch as any)?.name) || "",
            address: (Array.isArray(g.branch) ? g.branch[0]?.address : (g.branch as any)?.address) || "",
            room: (Array.isArray(g.room) ? g.room[0]?.name : (g.room as any)?.name) || "",
            teacher: (Array.isArray(g.teacher) ? g.teacher[0]?.full_name : (g.teacher as any)?.full_name) || "",
            spots: spots
          };
        });
      }

      // Fetch dynamic course tariffs
      const { data: tariffsData } = await supabase
        .from("course_tariffs")
        .select("*")
        .eq("organization_id", org.id)
        .eq("show_on_site", true)
        .order("sort_order", { ascending: true });
      if (tariffsData) initialTariffs = tariffsData;
    }
  } catch (e) {
    console.error("PUBLIC_DATA_LOAD_ERROR", e);
  }

  const jsonLdOrg = {
    "@context": "https://schema.org",
    "@type": ["EducationalOrganization", "LocalBusiness"],
    "@id": "https://robotics-lipetsk.ru/#organization",
    "name": "Робокс — школа робототехники и программирования в Липецке",
    "url": "https://robotics-lipetsk.ru",
    "logo": "https://robotics-lipetsk.ru/favicon.ico",
    "image": "https://robotics-lipetsk.ru/images/classroom_lipetsk.png",
    "description": "Робокс — школа инженерного мышления и программирования для детей 6–14 лет в Липецке. Сборка роботов, разработка игр, Scratch, Python, Arduino в мини-группах.",
    "telephone": orgPhone,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": orgAddress,
      "addressLocality": "Липецк",
      "postalCode": "398000",
      "addressCountry": "RU"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "52.6088",
      "longitude": "39.5992"
    },
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
      ],
      "opens": "09:00",
      "closes": "20:00"
    },
    "priceRange": "$$"
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
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
      />
      <LandingPageClient 
        initialCourses={initialCourses}
        initialSchedule={initialSchedule}
        initialBlocks={initialBlocks}
        initialTeachers={initialTeachers}
        initialBranches={initialBranches}
        orgDetails={org}
        initialTariffs={initialTariffs}
      />
    </>
  );
}
