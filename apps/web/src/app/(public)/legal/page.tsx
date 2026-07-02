import type { Metadata } from "next";
import { InfoGrid, LegalPageShell, DynamicLegalSections } from "../LegalPageShell";
import { getPublicLegalData, getDynamicPageBlock } from "../legal-data";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Юридическая информация | Робокс Липецк",
  description: "Реквизиты, адреса и юридическая информация школы робототехники Робокс в Липецке.",
};

export default async function LegalPage() {
  const data = await getPublicLegalData();
  const pageBlock = await getDynamicPageBlock(
    "legal.page.legal",
    "Юридическая информация",
    "Раздел с реквизитами организации, фактическим адресом, контактами и банковскими данными для проведения оплат и проверок интернет-эквайринга.",
    `### Юридические основания
Все платежные операции проводятся в соответствии с Правилами платежных систем и действующим законодательством Российской Федерации. Договор-оферта заключается в электронном виде и имеет полную юридическую силу.`
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
