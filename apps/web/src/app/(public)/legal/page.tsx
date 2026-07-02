import type { Metadata } from "next";
import { InfoGrid, LegalPageShell, LegalSection, PlaceholderNotice } from "../LegalPageShell";
import { getPublicLegalData } from "../legal-data";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Юридическая информация | Робокс Липецк",
  description: "Реквизиты, адреса и юридическая информация школы робототехники Робокс в Липецке.",
};

export default async function LegalPage() {
  const data = await getPublicLegalData();

  return (
    <LegalPageShell
      title="Юридическая информация"
      lead="Раздел с реквизитами организации, фактическим адресом, контактами и банковскими данными для проведения оплат и проверок интернет-эквайринга."
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
      <LegalSection title="Юридические основания">
        <p>
          Все платежные операции проводятся в соответствии с Правилами платежных систем и действующим законодательством Российской Федерации. Договор-оферта заключается в электронном виде и имеет полную юридическую силу.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
