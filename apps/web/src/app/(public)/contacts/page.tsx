import type { Metadata } from "next";
import { InfoGrid, LegalPageShell, LegalSection, PlaceholderNotice } from "../LegalPageShell";
import { getPublicLegalData } from "../legal-data";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Контакты | Робокс48",
  description: "Контактная информация школы робототехники Робокс48 в Липецке.",
};

export default async function ContactsPage() {
  const data = await getPublicLegalData();

  return (
    <LegalPageShell
      title="Контакты"
      lead="Информация для родителей, партнёров и платёжного банка: адрес, телефон, режим работы и реквизиты школы."
    >
      <PlaceholderNotice>{data.placeholderNotice}</PlaceholderNotice>
      <InfoGrid
        items={[
          { label: "Название школы", value: data.schoolName },
          { label: "Город", value: data.city },
          { label: "Филиал", value: data.branchName },
          { label: "Адрес", value: data.actualAddress },
          { label: "Телефон", value: data.phone },
          { label: "Email", value: data.email },
          { label: "Режим работы", value: data.workHours },
        ]}
      />
      <LegalSection title="Реквизиты организации">
        <p>
          Полные юридические реквизиты ИП/ООО будут размещены после предоставления заказчиком. До замены placeholder-значений
          информация на этой странице используется как технический шаблон для проверки структуры сайта.
        </p>
        <InfoGrid
          items={[
            { label: "Полное наименование", value: data.fullName },
            { label: "ИНН", value: data.inn },
            { label: "ОГРН/ОГРНИП", value: data.ogrn },
            { label: "Банковские реквизиты", value: data.bankDetails },
          ]}
        />
      </LegalSection>
    </LegalPageShell>
  );
}
