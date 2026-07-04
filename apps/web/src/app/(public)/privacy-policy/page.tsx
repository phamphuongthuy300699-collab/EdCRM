import React from "react";
import { Metadata } from "next";
import { LegalPageShell, DynamicLegalSections } from "../LegalPageShell";
import { getDynamicPageBlock, getPublicLegalData } from "../legal-data";
import { getLegalPageDefault } from "@/shared/utils/legal-page-defaults";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Политика конфиденциальности | Робокс Липецк",
  description: "Политика конфиденциальности и обработки персональных данных в школе робототехники и программирования Робокс Липецк.",
  alternates: {
    canonical: "https://robotics-lipetsk.ru/privacy-policy",
  },
};

export default async function PrivacyPolicyPage() {
  const data = await getPublicLegalData();
  const fallback = getLegalPageDefault("legal.page.privacy_policy", data);
  const pageBlock = await getDynamicPageBlock(
    fallback.key,
    fallback.title,
    fallback.subtitle,
    fallback.body
  );

  return (
    <LegalPageShell title={pageBlock.title} lead={pageBlock.subtitle}>
      <DynamicLegalSections bodyText={pageBlock.body} />
    </LegalPageShell>
  );
}
