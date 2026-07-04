import type { Metadata } from "next";
import { InfoGrid, LegalPageShell, DynamicLegalSections } from "../LegalPageShell";
import { getPublicLegalData, getDynamicPageBlock } from "../legal-data";
import { getLegalPageDefault } from "@/shared/utils/legal-page-defaults";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Юридическая информация | Робокс Липецк",
  description: "Реквизиты, адреса и юридическая информация школы робототехники Робокс в Липецке.",
};

export default async function LegalPage() {
  const data = await getPublicLegalData();
  const fallback = getLegalPageDefault("legal.page.legal");
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
      <InfoGrid
        items={[
          { label: "Полное наименование", value: data.fullName },
          { label: "Юридическое наименование", value: data.legalName },
          { label: "ИНН", value: data.inn },
          { label: "ОГРН/ОГРНИП", value: data.ogrn },
          { label: "Юридический адрес", value: data.legalAddress },
          { label: "Фактический адрес", value: data.actualAddress },
          { label: "Телефон", value: data.phone },
          { label: "Email", value: data.email },
          { label: "Банковские реквизиты", value: data.bankDetails },
        ]}
      />
      <DynamicLegalSections bodyText={pageBlock.body} />
    </LegalPageShell>
  );
}
