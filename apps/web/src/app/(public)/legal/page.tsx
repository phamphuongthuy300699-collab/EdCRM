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
  const bankItems = data.showBankRequisites
    ? [
        { label: "Банк", value: data.bankName },
        { label: "ИНН банка", value: data.bankInn },
        { label: "БИК", value: data.bik },
        { label: "Номер счета", value: data.accountNumber },
        { label: "Корреспондентский счет", value: data.correspondentAccount },
        { label: "Адрес банка", value: data.bankAddress },
      ]
    : [];

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
          ...bankItems,
        ]}
      />
      <DynamicLegalSections bodyText={pageBlock.body} />
    </LegalPageShell>
  );
}
