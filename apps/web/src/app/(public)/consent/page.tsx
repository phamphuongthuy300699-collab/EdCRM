import React from "react";
import { buildPublicMetadata } from "@/shared/seo/public-metadata";
import { LegalPageShell, DynamicLegalSections } from "../LegalPageShell";
import { getDynamicPageBlock, getPublicLegalData } from "../legal-data";
import { getLegalPageDefault } from "@/shared/utils/legal-page-defaults";

export const revalidate = 300;

export const metadata = buildPublicMetadata({
  title: "Согласие на обработку персональных данных | Робокс Липецк",
  description: "Согласие на обработку персональных данных для родителей и учащихся школы Робокс Липецк.",
  path: "/consent",
});

export default async function ConsentPage() {
  const data = await getPublicLegalData();
  const fallback = getLegalPageDefault("legal.page.consent", data);
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
