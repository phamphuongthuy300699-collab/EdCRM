import type { Metadata } from "next";
import Link from "next/link";
import { InfoGrid, LegalPageShell, LegalSection, PlaceholderNotice } from "../LegalPageShell";
import { getPublicLegalData } from "../legal-data";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { getMediaUrl } from "@/shared/utils/media";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Контакты | Робокс Липецк",
  description: "Контактная информация, адреса проведения занятий и юридические реквизиты школы Робокс в Липецке.",
};

function mediaPath(value: any) {
  return typeof value === "string" ? value : value?.path || "";
}

function mediaAlt(value: any, fallback: string) {
  if (typeof value === "object" && value?.alt) return value.alt;
  if (typeof value === "object" && value?.title) return value.title;
  return fallback;
}

function uniqueMediaItems(values: any[]) {
  const seen = new Set<string>();
  return values.filter((item) => {
    const path = mediaPath(item);
    if (!path || seen.has(path)) return false;
    seen.add(path);
    return true;
  });
}

export default async function ContactsPage() {
  const data = await getPublicLegalData();
  const page = data.contactsPage;

  let contactImages: any[] = [];
  try {
    const supabase = createSupabaseAdminClient();
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", "robotics-lipetsk")
      .single();

    if (org) {
      const { data: block } = await (supabase.from("site_content_blocks") as any)
        .select("*")
        .eq("organization_id", org.id)
        .eq("block_key", "contacts.media")
        .eq("status", "published")
        .maybeSingle();

      if (block?.content) {
        contactImages = uniqueMediaItems([
          block.content.mapImage,
          block.content.facadeImage,
          block.content.classroomImage,
          ...(Array.isArray(block.content.images) ? block.content.images : []),
        ]);
      }
    }
  } catch (err) {
    console.error("Failed to load contacts media block", err);
  }

  return (
    <LegalPageShell
      title={page.title || "Контакты"}
      lead={page.subtitle || "Свяжитесь с нами, выберите удобный филиал или запишитесь на пробное занятие."}
    >
      {page.notice && <PlaceholderNotice>{page.notice}</PlaceholderNotice>}

      <LegalSection title="Связаться со школой">
        <InfoGrid
          items={[
            { label: "Телефон", value: data.phone },
            { label: "Email", value: data.email },
          ]}
        />
      </LegalSection>

      {/* Branches Section */}
      {page.showBranches !== false && (
      <LegalSection title="Филиалы">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginTop: "16px" }}>
          {data.branches && data.branches.length > 0 ? (
            data.branches.map((b: any, idx: number) => (
              <div 
                key={idx} 
                style={{ 
                  background: "#F9FAFB", 
                  border: "1px solid var(--color-border)", 
                  borderRadius: "12px", 
                  padding: "20px", 
                  display: "flex", 
                  flexDirection: "column", 
                  gap: "12px" 
                }}
              >
                <h4 style={{ fontWeight: 800, fontSize: "15px", margin: 0, color: "var(--color-primary-dark)" }}>
                  {b.name}
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                    <MapPin size={16} style={{ color: "var(--color-primary)", marginTop: "2px", flexShrink: 0 }} />
                    <span>{b.address}</span>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <Phone size={16} style={{ color: "var(--color-primary)", flexShrink: 0 }} />
                    <span>{b.phone || data.phone}</span>
                  </div>
                  {b.email && (
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <Mail size={16} style={{ color: "var(--color-primary)", flexShrink: 0 }} />
                      <span>{b.email}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                    <Clock size={16} style={{ color: "var(--color-primary)", marginTop: "2px", flexShrink: 0 }} />
                    <span>{b.work_hours || "Понедельник — Суббота: 09:00 - 20:00"}</span>
                  </div>
                  {page.showMapLinks !== false && b.map_url && (
                    <a href={b.map_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-primary)", fontSize: "12px", fontWeight: 800 }}>
                      Открыть на карте
                    </a>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>Адреса филиалов уточняются.</div>
          )}
        </div>
      </LegalSection>
      )}

      {/* Classroom/Contacts Images Section */}
      {contactImages.length > 0 && (
        <LegalSection title="Фотографии наших классов">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginTop: "16px" }}>
            {contactImages.map((image, idx) => (
              <div
                key={idx}
                style={{
                  borderRadius: "12px",
                  overflow: "hidden",
                  border: "1px solid var(--color-border)",
                  height: "200px",
                  position: "relative"
                }}
              >
                <img
                  src={getMediaUrl(mediaPath(image))}
                  alt={mediaAlt(image, `Фото класса ${idx + 1}`)}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            ))}
          </div>
        </LegalSection>
      )}

      {page.showLegalSummary !== false && (
      <LegalSection title="Юридическая информация">
        <InfoGrid
          items={[
            { label: "Сокращенное наименование", value: data.legalName },
            { label: "ИНН", value: data.inn },
            { label: "ОГРН/ОГРНИП", value: data.ogrn },
            { label: "Телефон", value: data.phone },
            { label: "Email", value: data.email },
          ]}
        />
        <p style={{ margin: "16px 0 0 0", fontSize: "13px" }}>
          Полные реквизиты доступны на странице <Link href="/legal" style={{ color: "var(--color-primary)", fontWeight: 800 }}>Реквизиты</Link>.
        </p>
      </LegalSection>
      )}

      <LegalSection title={page.ctaTitle || "Записаться на пробное занятие"}>
        <div style={{ border: "1px solid var(--color-border)", borderRadius: "8px", padding: "20px", background: "#F9FAFB", display: "grid", gap: "12px" }}>
          <p style={{ margin: 0 }}>{page.ctaText || "Оставьте заявку, и администратор подберет удобную группу и филиал."}</p>
          <Link href={page.ctaHref || "/#lead-form"} style={{ color: "var(--color-primary)", fontWeight: 800 }}>
            Записаться
          </Link>
        </div>
      </LegalSection>
    </LegalPageShell>
  );
}
