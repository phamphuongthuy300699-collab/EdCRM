import type { Metadata } from "next";
import { InfoGrid, LegalPageShell, LegalSection, PlaceholderNotice } from "../LegalPageShell";
import { getPublicLegalData } from "../legal-data";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Контакты | Робокс Липецк",
  description: "Контактная информация, адреса проведения занятий и юридические реквизиты школы Робокс в Липецке.",
};

export default async function ContactsPage() {
  const data = await getPublicLegalData();

  return (
    <LegalPageShell
      title="Контакты"
      lead="Информация для родителей, партнёров и платёжного банка: адреса проведения занятий, телефоны, режим работы и реквизиты школы."
    >
      <PlaceholderNotice>{data.placeholderNotice}</PlaceholderNotice>

      {/* Branches Section */}
      <LegalSection title="Адреса проведения занятий (Филиалы)">
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
                </div>
              </div>
            ))
          ) : (
            <div style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>Адреса филиалов уточняются.</div>
          )}
        </div>
      </LegalSection>

      <LegalSection title="Юридические реквизиты">
        <p style={{ margin: "0 0 16px 0" }}>
          Официальные реквизиты индивидуального предпринимателя Юлдашева Рустама Хакимовича для заключения договоров-оферт и безналичных расчетов.
        </p>
        <InfoGrid
          items={[
            { label: "Сокращенное наименование", value: data.legalName },
            { label: "Полное наименование", value: data.fullName },
            { label: "ИНН", value: data.inn },
            { label: "ОГРН/ОГРНИП", value: data.ogrn },
            { label: "Юридический адрес", value: data.legalAddress },
            { label: "Телефон", value: data.phone },
            { label: "Email", value: data.email },
            { label: "Банк", value: data.bankName },
            { label: "ИНН Банка", value: data.bankInn },
            { label: "БИК", value: data.bik },
            { label: "Номер счета (Р/с)", value: data.accountNumber },
            { label: "Корреспондентский счет", value: data.correspondentAccount },
            { label: "Адрес банка", value: data.bankAddress },
          ]}
        />
      </LegalSection>
    </LegalPageShell>
  );
}
