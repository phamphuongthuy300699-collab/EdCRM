import type { Metadata } from "next";
import { InfoGrid, LegalPageShell, LegalSection, PlaceholderNotice } from "../LegalPageShell";
import { getPublicLegalData } from "../legal-data";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Юридическая информация | Робокс48",
  description: "Реквизиты, адреса и юридическая информация школы робототехники Робокс48.",
};

export default async function LegalPage() {
  const data = await getPublicLegalData();

  return (
    <LegalPageShell
      title="Юридическая информация"
      lead="Раздел с реквизитами организации, фактическим адресом, контактами и банковскими данными для проверки интернет-эквайринга."
    >
      <PlaceholderNotice>{data.placeholderNotice}</PlaceholderNotice>
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
      <LegalSection title="Источник данных">
        <p>
          Неизвестные реквизиты выводятся как placeholder. Значения можно заменить через блок
          <strong> legal.requisites </strong>
          в таблице <strong>site_content_blocks</strong> или через поля организации после их заполнения заказчиком.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
