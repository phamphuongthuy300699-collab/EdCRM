import type { Metadata } from "next";
import { InfoGrid, LegalPageShell, DynamicLegalSections } from "../LegalPageShell";
import { getPublicLegalData, getDynamicPageBlock } from "../legal-data";
import { getLegalPageDefault } from "@/shared/utils/legal-page-defaults";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Публичная оферта | Робокс Липецк",
  description: "Публичная оферта на оказание развивающих услуг школы робототехники и программирования Робокс.",
};

export default async function OfferPage() {
  const data = await getPublicLegalData();
  const fallback = getLegalPageDefault("legal.page.offer");
  const pageBlock = await getDynamicPageBlock(
    fallback.key,
    fallback.title,
    fallback.subtitle,
    fallback.body
  );

  return (
    <LegalPageShell
      title={pageBlock.title}
      lead={pageBlock.subtitle}
    >
      <DynamicLegalSections bodyText={pageBlock.body} />
      
      <section style={{ display: "grid", gap: "12px", marginTop: "28px" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--color-text)" }}>8. Реквизиты</h2>
        <InfoGrid
          items={[
            { label: "Организация", value: data.fullName },
            { label: "ИНН", value: data.inn },
            { label: "ОГРН/ОГРНИП", value: data.ogrn },
            { label: "Адрес", value: data.legalAddress },
            { label: "Телефон", value: data.phone },
            { label: "Email", value: data.email },
          ]}
        />
      </section>
    </LegalPageShell>
  );
}
