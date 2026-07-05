import type { Metadata } from "next";
import { LegalPageShell, DynamicLegalSections } from "../LegalPageShell";
import { getPublicLegalData, getDynamicPageBlock } from "../legal-data";
import { getLegalPageDefault } from "@/shared/utils/legal-page-defaults";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Условия возврата | Робокс Липецк",
  description: "Правила обращения за возвратом оплаты за услуги школы робототехники Робокс.",
};

export default async function RefundPage() {
  const data = await getPublicLegalData();
  const fallback = getLegalPageDefault("legal.page.refund", data);
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
    </LegalPageShell>
  );
}
